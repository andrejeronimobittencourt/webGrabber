import { SELECTOR_NOT_IN_OBSERVATION } from './agentEnvironment.js'
import { AgentValidationError } from './agentErrors.js'
import { findElementsByText } from './agentObservationFormat.js'
import { validateGrabParameters } from '../../packages/core/grabParameters.js'
import { BUILTIN_AGENT_TOOL_NAMES, EXPORT_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {import('./agentDynamicTools.js').DynamicToolRegistryEntry} DynamicToolRegistryEntry
 */

const SELECTOR_ACTIONS = new Set([
	'click',
	'getElements',
	'inspectElement',
	'pressKey',
	'type',
])

const REQUIRED_SELECTOR_ACTIONS = new Set([
	'click',
	'getElements',
	'inspectElement',
	'type',
])

/**
 * Safety policy for agent tool execution.
 */
export default class AgentPolicy {
	#maxSteps
	#allowedHosts
	#dynamicRegistry
	#exportMode

	/**
	 * @param {{ maxSteps?: number, allowedHosts?: string[], dynamicRegistry?: Map<string, DynamicToolRegistryEntry>, exportMode?: boolean }} [options]
	 */
	constructor(options = {}) {
		this.#maxSteps =
			options.maxSteps ?? Number.parseInt(process.env.AGENT_MAX_STEPS ?? '30', 10)
		this.#allowedHosts =
			options.allowedHosts ??
			(process.env.AGENT_ALLOWED_HOSTS ?? '')
				.split(',')
				.map((host) => host.trim())
				.filter(Boolean)
		this.#dynamicRegistry = options.dynamicRegistry ?? new Map()
		this.#exportMode = options.exportMode ?? false
	}

	get maxSteps() {
		return this.#maxSteps
	}

	get allowedHosts() {
		return [...this.#allowedHosts]
	}

	/**
	 * @returns {string[]}
	 */
	listAllowedToolNames() {
		return [
			...BUILTIN_AGENT_TOOL_NAMES,
			...(this.#exportMode ? EXPORT_AGENT_TOOL_NAMES : []),
			...this.#dynamicRegistry.keys(),
		]
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isAllowedAction(name) {
		return (
			BUILTIN_AGENT_TOOL_NAMES.includes(name) ||
			(this.#exportMode && EXPORT_AGENT_TOOL_NAMES.includes(name)) ||
			this.#dynamicRegistry.has(name)
		)
	}

	/**
	 * @param {string} name
	 * @param {Record<string, unknown>} params
	 * @param {{ currentUrl?: string, knownSelectors?: Set<string>, elements?: import('./observePage.js').PageElement[], elementsPage?: { hasMore?: boolean } }} [context]
	 */
	validateAction(name, params, context = {}) {
		const dynamicEntry = this.#dynamicRegistry.get(name)

		if (dynamicEntry) {
			validateGrabParameters(params, dynamicEntry.parameterSchema)
			return
		}

		if (!this.isAllowedAction(name)) {
			throw AgentValidationError.actionNotAllowed(name, this.listAllowedToolNames())
		}

		if (name === 'navigate' && typeof params.url === 'string') {
			this.validateUrl(params.url)
		}

		if (name === 'switchTab' && typeof params.tabKey !== 'string') {
			throw AgentValidationError.invalidParams('switchTab', 'tabKey string is required')
		}

		if (name === 'paginateElements' && context.elementsPage?.hasMore === false) {
			throw AgentValidationError.paginationExhausted()
		}

		if (REQUIRED_SELECTOR_ACTIONS.has(name)) {
			this.validateRequiredSelector(name, params, context.elements ?? [])
		}

		if (
			(name === 'pickElement' || SELECTOR_ACTIONS.has(name)) &&
			typeof params.selector === 'string'
		) {
			this.validateObservationSelector(
				params.selector,
				context.knownSelectors,
				context.elements ?? [],
			)
		}
	}

	/**
	 * @param {string} toolName
	 * @param {Record<string, unknown>} params
	 * @param {import('./observePage.js').PageElement[]} elements
	 */
	validateRequiredSelector(toolName, params, elements) {
		const selector = typeof params.selector === 'string' ? params.selector.trim() : ''

		if (selector) {
			return
		}

		const textHint = typeof params.text === 'string' ? params.text : ''
		const suggestedElements = textHint ? findElementsByText(elements, textHint) : []

		throw AgentValidationError.missingSelector(toolName, suggestedElements)
	}

	/**
	 * @param {string} selector
	 * @param {Set<string> | undefined} knownSelectors
	 * @param {import('./observePage.js').PageElement[]} elements
	 */
	validateObservationSelector(selector, knownSelectors, elements = []) {
		if (!knownSelectors || knownSelectors.size === 0) {
			throw AgentValidationError.observationSelectorsEmpty(selector, SELECTOR_NOT_IN_OBSERVATION)
		}

		if (!knownSelectors.has(selector)) {
			const suggestedElements = findElementsByText(elements, selector)
			throw AgentValidationError.selectorNotInObservation(
				selector,
				SELECTOR_NOT_IN_OBSERVATION,
				suggestedElements,
			)
		}
	}

	/**
	 * @param {string} url
	 */
	validateUrl(url) {
		if (this.#allowedHosts.length === 0) {
			return
		}

		const hostname = new URL(url).hostname
		const allowed = this.#allowedHosts.some(
			(host) => hostname === host || hostname.endsWith(`.${host}`),
		)

		if (!allowed) {
			throw AgentValidationError.hostNotAllowed(hostname)
		}
	}
}
