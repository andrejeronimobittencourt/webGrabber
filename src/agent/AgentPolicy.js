import { AgentValidationError } from './agentErrors.js'
import { validateGrabParameters } from '../../packages/core/grabParameters.js'
import { BUILTIN_AGENT_TOOL_NAMES, EXPORT_AGENT_TOOL_NAMES, VISION_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'
import { suggestAgentToolName } from './agentToolNameResolver.js'

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

const INTERACTION_SELECTOR_ACTIONS = new Set([
	'click',
	'pressKey',
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
	#visionAvailable
	#allowedToolNames
	#allowedToolNameSet

	/**
	 * @param {{ maxSteps?: number, allowedHosts?: string[], dynamicRegistry?: Map<string, DynamicToolRegistryEntry>, exportMode?: boolean, visionAvailable?: boolean }} [options]
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
		this.#visionAvailable = options.visionAvailable ?? false
		this.#allowedToolNames = [
			...BUILTIN_AGENT_TOOL_NAMES,
			...(this.#visionAvailable ? VISION_AGENT_TOOL_NAMES : []),
			...(this.#exportMode ? EXPORT_AGENT_TOOL_NAMES : []),
			...this.#dynamicRegistry.keys(),
		]
		this.#allowedToolNameSet = new Set(this.#allowedToolNames)
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
		return this.#allowedToolNames
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isAllowedAction(name) {
		return this.#allowedToolNameSet.has(name)
	}

	/**
	 * @param {string} toolName
	 * @param {Record<string, unknown>} params
	 */
	validateRequiredSelector(toolName, params) {
		const selector = typeof params.selector === 'string' ? params.selector.trim() : ''

		if (selector) {
			return
		}

		throw AgentValidationError.missingSelector(toolName)
	}

	/**
	 * @param {string} name
	 * @param {Record<string, unknown>} params
	 * @param {{ currentUrl?: string, knownSelectors?: Set<string>, htmlPage?: { hasMore?: boolean } }} [context]
	 */
	validateAction(name, params, context = {}) {
		const dynamicEntry = this.#dynamicRegistry.get(name)

		if (dynamicEntry) {
			validateGrabParameters(params, dynamicEntry.parameterSchema)
			return
		}

		if (!this.isAllowedAction(name)) {
			throw AgentValidationError.actionNotAllowed(
				name,
				this.#allowedToolNames,
				suggestAgentToolName(name, this.#allowedToolNames),
			)
		}

		if (name === 'navigate' && typeof params.url === 'string') {
			this.validateUrl(params.url)
		}

		if (name === 'switchTab' && typeof params.tabKey !== 'string') {
			throw AgentValidationError.invalidParams('switchTab', 'tabKey string is required')
		}

		if (name === 'paginateHtml' && context.htmlPage?.hasMore === false) {
			throw AgentValidationError.paginationExhausted()
		}

		if (REQUIRED_SELECTOR_ACTIONS.has(name)) {
			this.validateRequiredSelector(name, params)
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
