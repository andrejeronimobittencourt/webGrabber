import Engine from '../../packages/core/Engine.js'
import constants from '../../packages/core/utils/constants.js'
import { present } from '../../packages/core/infrastructure/presenter/present.js'
import AgentPolicy from './AgentPolicy.js'
import { isMutatingAgentTool } from './AgentObservationCache.js'
import { mapAgentToolToEngineAction } from './AgentToolMapper.js'
import {
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
	registerObservationSelectors,
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
	clearPageSnapshotCache,
	attachPageVisionDescription,
	inspectElement,
	isAgentPreNavigatePageUrl,
	paginateElements,
	observePage,
	refreshKnownSelectorsFromPage,
} from './observePage.js'
import { resolveAgentToolName } from './agentToolNameResolver.js'
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
	EXPORT_ANSWER_SELECTOR_NUDGE,
	formatAgentToolErrorForUser,
	formatAgentToolFeedbackForModel,
	hasAssistantToolCalls,
	isEmptyAssistantTurn,
	resolveAssistantAnswer,
} from './agentMessages.js'

/**
 * @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep
 * @typedef {Object} AgentRunResult
 * @property {string} answer
 * @property {string | null} answerSelector
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
		const visionAvailable = isAgentVisionAvailable(this.#client)
		const policy =
			this.#policyOptions.policy ??
			new AgentPolicy({
				...this.#policyOptions,
				dynamicRegistry,
				exportMode,
				visionAvailable,
			})

		const brain = this.#engine.createBrain()
		brain.run.agentMode = true
		brain.run.grabCatalog = grabCatalog
		brain.run.grabCallStack = []
		brain.run.elementList = createDefaultInteractiveElementListState()
		/** @type {AgentRunResult['steps']} */
		const steps = []
		const tools = buildAgentTools({ dynamicTools, visionAvailable, exportMode })
		/** @type {string[]} */
		let pendingFeedback = []

		let answer = null
		/** @type {string | null} */
		let answerSelector = null
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
					brain,
					hasNavigated,
					elementList: brain.run.elementList,
					instruction,
					lastIntent: steps.at(-1)?.reason,
				}

				let observation
				try {
					observation = await attachPageVisionDescription(
						page,
						brain,
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
				knownSelectors.clear()
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
					const allowedToolNames = policy.listAllowedToolNames()
					const resolvedToolCalls = assistantMessage.tool_calls.map((toolCall) => {
						const rawToolName = toolCall.function.name
						const toolName =
							resolveAgentToolName(rawToolName, allowedToolNames) ?? rawToolName

						return {
							rawToolName,
							toolName,
							params: JSON.parse(toolCall.function.arguments || '{}'),
						}
					})
					const usedMutatingTool = resolvedToolCalls.some(({ toolName }) =>
						isMutatingAgentTool(toolName) || dynamicToolNames.has(toolName),
					)

					for (const { rawToolName, toolName, params: rawParams } of resolvedToolCalls) {
						const page = brain.browser.activePage

						// Extract reason before dispatch — it is a meta-field for history,
						// not a parameter the action handlers should receive.
						const { reason: stepReason, ...params } = rawParams

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
							} else if (toolName === 'paginateElements') {
								const nextState = resolveInteractiveElementListState(
									brain.run.elementList,
									params,
								)
								brain.run.elementList = nextState
								result = await paginateElements(page, {
									offset: nextState.offset,
									limit: params.limit,
								}, brain)
								observation.elements = result.elements
								observation.elementsPage = result.elementsPage
								knownSelectors.clear()
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
							reason: typeof stepReason === 'string' ? stepReason : undefined,
							result,
							error: toolError,
							pageUrl: page.url(),
							timestamp: new Date().toISOString(),
							...(rawToolName !== toolName ? { requestedAction: rawToolName } : {}),
						})

						if (toolName === 'navigate' && !toolError) {
							hasNavigated = true
						}

						if (
							(shouldRefreshKnownSelectorsAfterTool(toolName) ||
								dynamicToolNames.has(toolName)) &&
							!toolError
						) {
							knownSelectors.clear()
							await syncAgentBrowserTabs(brain)

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
						clearPageSnapshotCache(brain)
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

				const { text: answerText, selector: resolvedSelector } = resolveAssistantAnswer(
					assistantMessage,
					exportMode,
				)

				if (exportMode && !resolvedSelector) {
					// Nudge the model to re-answer with the required selector field.
					pendingFeedback.push(EXPORT_ANSWER_SELECTOR_NUDGE)
					continue
				}

				answer = answerText
				answerSelector = resolvedSelector
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
				answerSelector,
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
					answerSelector,
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

