import Engine from '../../packages/core/Engine.js'
import constants from '../../packages/core/utils/constants.js'
import { present } from '../../packages/core/infrastructure/presenter/present.js'
import AgentPolicy from './AgentPolicy.js'
import AgentObservationCache, { isMutatingAgentTool } from './AgentObservationCache.js'
import { mapAgentToolToEngineAction } from './AgentToolMapper.js'
import { isObservationCacheEnabled, resolveElementPageSize } from './agentConfig.js'
import {
	AGENT_CHEATSHEET_SYSTEM_GUIDANCE,
	AGENT_FINAL_ANSWER_GUIDANCE,
	OBSERVATION_EXPLORATION_NOTE,
	registerCheatsheetSelectors,
} from './agentCheatsheet.js'
import OllamaClient from './OllamaClient.js'
import { buildAgentTools } from './ToolSchemaBuilder.js'
import {
	buildDynamicAgentTools,
	buildDynamicToolRegistry,
} from './agentDynamicTools.js'
import { runDynamicAgentTool } from './runAgentDynamicTool.js'
import { loadGrabCatalog } from '../utils/loadGrabs.js'
import { createDefaultVisibleElementListState, resolveVisibleElementListState } from './visibleElementProbe.js'
import {
	buildElementsPageMeta,
	enrichObservationWithVision,
	inspectElement,
	isAgentPreNavigatePageUrl,
	listElements,
	observePage,
	paginateVisibleElements,
} from './observePage.js'
import { safeAgentPageUrl, waitForAgentPageSettle } from './waitForAgentPageSettle.js'
import {
	bindAgentTabSync,
	syncAgentBrowserTabs,
	unbindAgentTabSync,
} from './AgentTabSync.js'
import { listAgentTabs, switchAgentTab } from './agentTabs.js'
import { AGENT_QUIET_TOOLS } from './agentToolCatalog.js'
import {
	clearPickedSelector,
	mustPickBeforeAnswer,
	PICK_ELEMENT_HINT,
	setPickedSelector,
} from './agentPick.js'
import { formatAgentToolErrorForUser } from './formatAgentToolErrorForUser.js'
import { exportAgentRunGrab } from './GrabExporter.js'

const AGENT_SYSTEM_PROMPT =
	'You are a browser automation agent for webGrabber. ' +
	'Use the provided tools to complete the user task. ' +
	AGENT_FINAL_ANSWER_GUIDANCE +
	'When the task is complete, stop calling tools and reply with the answer only—no preamble, summary of steps, or formatting flourishes. ' +
	AGENT_CHEATSHEET_SYSTEM_GUIDANCE

/**
 * @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep
 * @typedef {Object} AgentRunResult
 * @property {string} answer
 * @property {AgentStep[]} steps
 * @property {{ input: * }} memory
 */

/**
 * Observe-plan-act agent loop backed by the shared Engine and local Ollama.
 */
export default class AgentRunner {
	#engine
	#client
	#policyOptions
	#loadGrabCatalog

	/**
	 * @param {{ policy?: AgentPolicy, client?: OllamaClient, engine?: Engine, maxSteps?: number, allowedHosts?: string[], loadGrabCatalog?: typeof loadGrabCatalog }} [options]
	 */
	constructor(options = {}) {
		this.#engine = options.engine ?? new Engine()
		this.#client = options.client ?? new OllamaClient(options)
		this.#policyOptions = options
		this.#loadGrabCatalog = options.loadGrabCatalog ?? loadGrabCatalog
	}

	/**
	 * Initialize the shared engine and browser runtime.
	 * @param {object} [puppeteerOptions={}]
	 */
	async init(puppeteerOptions = {}) {
		await this.#engine.init(puppeteerOptions, { quiet: true })
	}

	/**
	 * Run an agent task from a natural-language instruction.
	 * @param {string} instruction
	 * @param {{ exportGrabName?: string | null, exportOverwrite?: boolean }} [options]
	 * @returns {Promise<AgentRunResult & { exportedGrabPath?: string }>}
	 */
	async run(instruction, { exportGrabName = null, exportOverwrite = false } = {}) {
		if (!instruction?.trim()) {
			throw new Error('Agent instruction is required')
		}

		present([{ text: 'Agent taking control', color: 'green', style: 'bold' }])
		present([{ text: instruction, color: 'whiteBright' }], null, { force: true })

		const grabCatalog = await this.#loadGrabCatalog({ warnOnInvalid: false })
		const importableGrabs = grabCatalog.listImportable()
		const importableCustomActions = this.#engine.listImportableCustomActions()
		const dynamicTools = buildDynamicAgentTools({
			grabs: importableGrabs,
			customActions: importableCustomActions,
		})
		const dynamicRegistry = buildDynamicToolRegistry(dynamicTools, {
			grabs: importableGrabs,
			customActions: importableCustomActions,
		})
		const dynamicToolNames = new Set(dynamicRegistry.keys())
		const policy =
			this.#policyOptions.policy ??
			new AgentPolicy({ ...this.#policyOptions, dynamicRegistry })

		const brain = this.#engine.createBrain()
		brain.run.agentMode = true
		brain.run.grabCatalog = grabCatalog
		brain.run.grabCallStack = []
		brain.run.visibleElementList = createDefaultVisibleElementListState()
		brain.run.pickedSelector = null
		/** @type {AgentRunResult['steps']} */
		const steps = []
		const tools = buildAgentTools({ dynamicTools })
		/** @type {import('./OllamaClient.js').OllamaChatMessage[]} */
		const messages = [
			{
				role: 'system',
				content: AGENT_SYSTEM_PROMPT,
			},
			{ role: 'user', content: instruction },
		]

		let answer = null
		const observationCache = new AgentObservationCache()
		const cacheEnabled = isObservationCacheEnabled()
		const knownSelectors = new Set()
		let hasNavigated = false
		/** @type {import('puppeteer').Browser | null} */
		let agentBrowser = null

		try {
			await this.#engine.bootBrowser(brain)
			brain.run.params = { dir: 'agent-run' }
			await this.#engine.perform(brain, 'setBaseDir', brain.browser.activePage)
			await this.#engine.perform(brain, 'resetCurrentDir', brain.browser.activePage)
			agentBrowser = brain.browser.activePage.browser()
			bindAgentTabSync(brain, agentBrowser)

			for (let stepIndex = 0; stepIndex < policy.maxSteps; stepIndex += 1) {
				const page = brain.browser.activePage

				if (!hasNavigated && !isAgentPreNavigatePageUrl(page.url())) {
					hasNavigated = true
				}

				const observeOptions = {
					cache: observationCache,
					cacheEnabled,
					brain,
					hasNavigated,
					visibleElementList: brain.run.visibleElementList,
				}

				let observation
				try {
					observation = await enrichObservationWithVision(
						await observePage(page, brain, observeOptions),
						this.#client,
						observeOptions,
					)
				} catch (error) {
					const observationError =
						error instanceof Error ? error.message : String(error)
					observation = {
						url: await safeAgentPageUrl(page),
						title: '',
						elements: [],
						elementsPage: buildElementsPageMeta(0, 0, resolveElementPageSize()),
						visibleElements: [],
						visibleElementsPage: buildElementsPageMeta(0, 0, resolveElementPageSize()),
						pickedSelector: brain.run.pickedSelector,
						lastResult: brain.recall(constants.inputKey),
						tabs: { activeTabKey: null, tabs: [] },
						observationError,
					}
					present(
						[
							{ text: 'Agent observe failed: ', color: 'red', style: 'bold' },
							{
								text: formatAgentToolErrorForUser(error),
								color: 'whiteBright',
							},
						],
						brain,
						{ force: true },
					)
				}
				registerCheatsheetSelectors(knownSelectors, observation.elements)
				registerCheatsheetSelectors(knownSelectors, observation.visibleElements)
				messages.push({
					role: 'user',
					content:
						`Current page observation:\n${JSON.stringify(observation, null, 2)}\n\n` +
						OBSERVATION_EXPLORATION_NOTE,
				})

				const completion = await this.#client.chat(messages, tools)
				const choice = completion.choices?.[0]

				if (!choice?.message) {
					throw new Error('Ollama returned no assistant message')
				}

				const assistantMessage = choice.message
				messages.push(assistantMessage)

				if (assistantMessage.tool_calls?.length) {
					const usedMutatingTool = assistantMessage.tool_calls.some((toolCall) =>
						isMutatingAgentTool(toolCall.function.name) ||
						dynamicToolNames.has(toolCall.function.name),
					)

					for (const toolCall of assistantMessage.tool_calls) {
						const toolName = toolCall.function.name
						const params = JSON.parse(toolCall.function.arguments || '{}')
						const page = brain.browser.activePage

						if (!AGENT_QUIET_TOOLS.has(toolName)) {
							present(
								[
									{ text: 'Agent tool: ', color: 'blue', style: 'bold' },
									{ text: toolName, color: 'whiteBright' },
								],
								brain,
							)
						}

						let result
						let toolError = null

						try {
							policy.validateAction(toolName, params, {
								currentUrl: page.url(),
								knownSelectors,
								pickedSelector: brain.run.pickedSelector,
							})

							if (dynamicRegistry.has(toolName)) {
								result = await runDynamicAgentTool(dynamicRegistry, toolName, params, {
									brain,
									engine: this.#engine,
									page,
									grabCatalog,
								})
							} else if (toolName === 'pickElement') {
								setPickedSelector(brain, params.selector)
								result = { selector: params.selector, picked: true }
							} else if (toolName === 'paginateVisibleElements') {
								const nextState = resolveVisibleElementListState(
									brain.run.visibleElementList,
									params,
								)
								brain.run.visibleElementList = nextState
								clearPickedSelector(brain)
								result = await paginateVisibleElements(page, {
									tags: nextState.tags,
									offset: nextState.offset,
									limit: params.limit,
								})
								registerCheatsheetSelectors(knownSelectors, result.elements)
							} else if (toolName === 'listElements') {
								result = await listElements(page, params)
								registerCheatsheetSelectors(knownSelectors, result.elements)
							} else if (toolName === 'listTabs') {
								result = await listAgentTabs(brain)
							} else if (toolName === 'switchTab') {
								result = await switchAgentTab(brain, params.tabKey)
							} else if (toolName === 'inspectElement') {
								result = await inspectElement(page, this.#client, params)
							} else {
								const mapped = mapAgentToolToEngineAction(toolName, params)
								brain.run.params = mapped.params
								await this.#engine.perform(brain, mapped.action, page)
								result = brain.recall(constants.inputKey)
							}
						} catch (error) {
							toolError = error instanceof Error ? error.message : String(error)
							result = { error: toolError }
							present(
								[
									{ text: 'Agent tool failed: ', color: 'red', style: 'bold' },
									{
										text: formatAgentToolErrorForUser(error),
										color: 'whiteBright',
									},
								],
								brain,
								{ force: true },
							)
						}

						steps.push({
							action: toolName,
							params,
							result,
							error: toolError,
							timestamp: new Date().toISOString(),
						})

						if (toolName === 'navigate' && !toolError) {
							hasNavigated = true
						}

						if (
							(isMutatingAgentTool(toolName) || dynamicToolNames.has(toolName)) &&
							!toolError
						) {
							clearPickedSelector(brain)
							knownSelectors.clear()
							const pageBeforeSync = brain.browser.activePage
							await syncAgentBrowserTabs(brain)

							if (brain.browser.activePage !== pageBeforeSync) {
								knownSelectors.clear()
							}

							await waitForAgentPageSettle(brain.browser.activePage)
						}

						messages.push({
							role: 'tool',
							tool_call_id: toolCall.id,
							content: JSON.stringify(result ?? null),
						})
					}

					if (usedMutatingTool) {
						observationCache.invalidate()
						knownSelectors.clear()
					}

					continue
				}

				if (assistantMessage.content?.trim()) {
					if (mustPickBeforeAnswer(steps, brain.run.pickedSelector, { hasNavigated })) {
						messages.push({
							role: 'user',
							content: PICK_ELEMENT_HINT,
						})
						continue
					}

					answer = assistantMessage.content.trim()
					break
				}

				throw new Error('Ollama returned neither tool calls nor a final answer')
			}

			if (!answer) {
				throw new Error(`Agent run exceeded max steps (${policy.maxSteps})`)
			}

			present(
				[
					{ text: 'Agent answer: ', color: 'green', style: 'bold' },
					{ text: answer, color: 'whiteBright' },
				],
				brain,
				{ force: true },
			)

			/** @type {AgentRunResult & { exportedGrabPath?: string }} */
			const runResult = {
				answer,
				steps,
				memory: {
					input: brain.recall(constants.inputKey),
				},
			}

			if (exportGrabName) {
				runResult.exportedGrabPath = await exportAgentRunGrab({
					steps,
					instruction,
					exportGrabName,
					exportOverwrite,
					dynamicRegistry,
				})

				present(
					[
						{ text: 'Exported grab: ', color: 'green', style: 'bold' },
						{ text: runResult.exportedGrabPath, color: 'whiteBright' },
					],
					brain,
					{ force: true },
				)
			}

			return runResult
		} finally {
			if (agentBrowser) {
				unbindAgentTabSync(agentBrowser)
			}

			await this.#engine.cleanup(brain)
			await this.#engine.close({ quiet: true })
		}
	}
}

