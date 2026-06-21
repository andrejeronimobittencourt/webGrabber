import { CHEATSHEET_SELECTOR_REJECTION_HINT } from './agentCheatsheet.js'
import { PICK_ELEMENT_HINT } from './agentPick.js'
import { AgentValidationError } from './agentErrors.js'
import { validateGrabParameters } from '../../packages/core/grabParameters.js'
import { BUILTIN_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {import('./agentDynamicTools.js').DynamicToolRegistryEntry} DynamicToolRegistryEntry
 */

const KNOWN_SELECTOR_ACTIONS = new Set([
	'click',
	'type',
	'inspectElement',
	'pressKey',
	'getElements',
	'pickElement',
])

/**
 * Safety policy for agent tool execution.
 */
export default class AgentPolicy {
	#maxSteps
	#allowedHosts
	#dynamicRegistry

	/**
	 * @param {{ maxSteps?: number, allowedHosts?: string[], dynamicRegistry?: Map<string, DynamicToolRegistryEntry> }} [options]
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
	}

	get maxSteps() {
		return this.#maxSteps
	}

	get allowedHosts() {
		return [...this.#allowedHosts]
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isAllowedAction(name) {
		return BUILTIN_AGENT_TOOL_NAMES.includes(name) || this.#dynamicRegistry.has(name)
	}

	/**
	 * @param {string} name
	 * @param {Record<string, unknown>} params
	 * @param {{ currentUrl?: string, knownSelectors?: Set<string>, pickedSelector?: string | null }} [context]
	 */
	validateAction(name, params, context = {}) {
		const dynamicEntry = this.#dynamicRegistry.get(name)

		if (dynamicEntry) {
			validateGrabParameters(params, dynamicEntry.parameterSchema)
			return
		}

		if (!this.isAllowedAction(name)) {
			throw new Error(`Action "${name}" is not allowed in agent mode`)
		}

		if (name === 'navigate' && typeof params.url === 'string') {
			this.validateUrl(params.url)
		}

		if (name === 'switchTab' && typeof params.tabKey !== 'string') {
			throw new Error('switchTab requires a tabKey string')
		}

		if (name === 'pickElement' && typeof params.selector === 'string') {
			this.validateCheatsheetSelector(params.selector, context.knownSelectors)
			return
		}

		if (KNOWN_SELECTOR_ACTIONS.has(name) && typeof params.selector === 'string') {
			this.validateCheatsheetSelector(params.selector, context.knownSelectors)
			this.validatePickedSelector(name, params.selector, context.pickedSelector)
		}
	}

	/**
	 * @param {string} actionName
	 * @param {string} selector
	 * @param {string | null | undefined} pickedSelector
	 */
	validatePickedSelector(actionName, selector, pickedSelector) {
		if (actionName === 'pickElement') {
			return
		}

		if (!pickedSelector) {
			throw AgentValidationError.pickRequired(PICK_ELEMENT_HINT)
		}

		if (selector !== pickedSelector) {
			throw AgentValidationError.pickMismatch(selector, pickedSelector, PICK_ELEMENT_HINT)
		}
	}

	/**
	 * @param {string} selector
	 * @param {Set<string> | undefined} knownSelectors
	 */
	validateCheatsheetSelector(selector, knownSelectors) {
		if (!knownSelectors || knownSelectors.size === 0) {
			throw AgentValidationError.cheatsheetEmpty(selector, CHEATSHEET_SELECTOR_REJECTION_HINT)
		}

		if (!knownSelectors.has(selector)) {
			throw AgentValidationError.cheatsheetUnknown(selector, CHEATSHEET_SELECTOR_REJECTION_HINT)
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
			throw new Error(`Host "${hostname}" is not allowed by AGENT_ALLOWED_HOSTS`)
		}
	}
}
