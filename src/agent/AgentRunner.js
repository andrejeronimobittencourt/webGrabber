import Engine from '../../packages/core/Engine.js'
import constants from '../../packages/core/utils/constants.js'
import { present } from '../../packages/core/infrastructure/presenter/present.js'
import AgentPolicy from './AgentPolicy.js'
import AgentObservationCache, { isMutatingAgentTool } from './AgentObservationCache.js'
import { mapAgentToolToEngineAction } from './AgentToolMapper.js'
import {
	isObservationCacheEnabled,
	resolveElementPageSize,
	AGENT_QUIET_TOOLS,
	shouldRefreshKnownSelectorsAfterTool,
} from './agentConfig.js'
import { isAgentVisionAvailable } from './agentModels.js'
import {
	attributeProgressToRecentSteps,
	buildObservationFingerprint,
	buildRepeatedStalledActionFeedback,
	observationFingerprintsEqual,
} from './agentProgress.js'
import {
	clearPickedSelector,
	mustPickBeforeAnswer,
	PICK_ELEMENT_HINT,
	registerObservationSelectors,
	setPickedSelector,
} from './agentEnvironment.js'
import OllamaClient from './OllamaClient.js'
import { buildAgentTools } from './ToolSchemaBuilder.js'
import {
	buildDynamicAgentTools,
	buildDynamicToolRegistry,
	runDynamicAgentTool,
} from './agentDynamicTools.js'
import { loadGrabCatalog } from '../utils/loadGrabs.js'
import { exportAgentRunGrab } from './GrabExporter.js'
import {
	createDefaultInteractiveElementListState,
	resolveInteractiveElementListState,
} from './interactiveElementList.js'
import {
	buildElementsPageMeta,
	enrichObservationWithVision,
	inspectElement,
	isAgentPreNavigatePageUrl,
	paginateElements,
	observePage,
	refreshKnownSelectorsFromPage,
} from './observePage.js'
import { safeAgentPageUrl, waitForAgentPageSettle } from './waitForAgentPageSettle.js'
import {
	bindAgentTabSync,
	listAgentTabs,
	syncAgentBrowserTabs,
	switchAgentTab,
	unbindAgentTabSync,
} from './agentTabs.js'
import {
	buildAgentModelMessages,
	buildAgentToolResultForModel,
	EMPTY_ASSISTANT_NUDGE,
	formatAgentToolErrorForUser,
	formatAgentToolFeedbackForModel,
	hasAssistantToolCalls,
	isEmptyAssistantTurn,
	resolveAssistantAnswerText,
} from './agentMessages.js'

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
		const exportMode = Boolean(exportGrabName)
		const policy =
			this.#policyOptions.policy ??
			new AgentPolicy({ ...this.#policyOptions, dynamicRegistry, exportMode })

		const brain = this.#engine.createBrain()
		brain.run.agentMode = true
		brain.run.grabCatalog = grabCatalog
		brain.run.grabCallStack = []
		brain.run.elementList = createDefaultInteractiveElementListState()
		brain.run.pickedSelector = null
		/** @type {AgentRunResult['steps']} */
		const steps = []
		const visionAvailable = isAgentVisionAvailable(this.#client)
		const tools = buildAgentTools({ dynamicTools, visionAvailable, exportMode })
		/** @type {string[]} */
		let pendingFeedback = []

		let answer = null
		const observationCache = new AgentObservationCache()
		const cacheEnabled = isObservationCacheEnabled()
		const knownSelectors = new Set()
		let hasNavigated = false
		let lastAttributedStepIndex = 0
		let previousObservationFingerprint = null
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
					elementList: brain.run.elementList,
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
				registerObservationSelectors(knownSelectors, observation.elements)

				const currentObservationFingerprint = buildObservationFingerprint(
					/** @type {import('./observePage.js').PageObservation} */ (observation),
				)

				if (previousObservationFingerprint !== null) {
					const madeProgress = !observationFingerprintsEqual(
						previousObservationFingerprint,
						currentObservationFingerprint,
					)
					attributeProgressToRecentSteps(steps, lastAttributedStepIndex, madeProgress)
					lastAttributedStepIndex = steps.length

					const stalledActionFeedback = buildRepeatedStalledActionFeedback(steps)

					if (stalledActionFeedback) {
						pendingFeedback.push(stalledActionFeedback)
					}
				}

				previousObservationFingerprint = currentObservationFingerprint

				const feedback = [...pendingFeedback]
				pendingFeedback = []
				const modelMessages = buildAgentModelMessages({
					instruction,
					observation,
					steps,
					feedback,
					visionAvailable,
					exportMode,
				})

				const completion = await this.#client.chat(modelMessages, tools)
				const choice = completion.choices?.[0]

				if (!choice?.message) {
					throw new Error('Ollama returned no assistant message')
				}

				const assistantMessage = choice.message

				if (hasAssistantToolCalls(assistantMessage)) {
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
								elements: observation.elements,
								elementsPage: observation.elementsPage,
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
							} else if (toolName === 'paginateElements') {
								const nextState = resolveInteractiveElementListState(
									brain.run.elementList,
									params,
								)
								brain.run.elementList = nextState
								clearPickedSelector(brain)
								result = await paginateElements(page, {
									offset: nextState.offset,
									limit: params.limit,
								})
								registerObservationSelectors(knownSelectors, result.elements)
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
							pendingFeedback.push(
								formatAgentToolFeedbackForModel(toolName, error, knownSelectors),
							)
							result = buildAgentToolResultForModel(error, knownSelectors)
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
							pageUrl: page.url(),
							timestamp: new Date().toISOString(),
						})

						if (toolName === 'navigate' && !toolError) {
							hasNavigated = true
						}

						if (
							(shouldRefreshKnownSelectorsAfterTool(toolName) ||
								dynamicToolNames.has(toolName)) &&
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
							await refreshKnownSelectorsFromPage(
								brain.browser.activePage,
								brain,
								knownSelectors,
							)
						} else if (toolName === 'type' && !toolError && typeof params.selector === 'string') {
							knownSelectors.add(params.selector)
						}
					}

					if (usedMutatingTool) {
						observationCache.invalidate()
						brain.run.elementList = createDefaultInteractiveElementListState()
					}

					continue
				}

				if (isEmptyAssistantTurn(assistantMessage)) {
					present(
						[
							{ text: 'Agent: empty model response, retrying', color: 'yellow', style: 'bold' },
						],
						brain,
						{ force: true },
					)
					pendingFeedback.push(EMPTY_ASSISTANT_NUDGE)
					continue
				}

				const answerText = resolveAssistantAnswerText(assistantMessage)

				if (mustPickBeforeAnswer(steps, brain.run.pickedSelector, exportMode)) {
					pendingFeedback.push(PICK_ELEMENT_HINT)
					continue
				}

				answer = answerText
				break
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

