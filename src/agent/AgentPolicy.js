/** @typedef {import('../../packages/core/brain/BrainFactory.js').default} BrainFactory */

import { CHEATSHEET_SELECTOR_REJECTION_HINT } from './agentCheatsheet.js'
import { AgentValidationError } from './agentErrors.js'

const ALLOWED_ACTIONS = new Set([
	'navigate',
	'click',
	'type',
	'pressKey',
	'listElements',
	'listVisibleElements',
	'inspectElement',
	'listTabs',
	'switchTab',
	'getElements',
	'elementExists',
	'screenshot',
	'setVariable',
	'getVariable',
	'log',
])

const KNOWN_SELECTOR_ACTIONS = new Set([
	'click',
	'type',
	'inspectElement',
	'pressKey',
	'getElements',
])

/**
 * Safety policy for agent tool execution.
 */
export default class AgentPolicy {
	#maxSteps
	#allowedHosts

	/**
	 * @param {{ maxSteps?: number, allowedHosts?: string[] }} [options]
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
		return ALLOWED_ACTIONS.has(name)
	}

	/**
	 * @param {string} name
	 * @param {Record<string, unknown>} params
	 * @param {{ currentUrl?: string, knownSelectors?: Set<string> }} [context]
	 */
	validateAction(name, params, context = {}) {
		if (!this.isAllowedAction(name)) {
			throw new Error(`Action "${name}" is not allowed in agent mode`)
		}

		if (name === 'navigate' && typeof params.url === 'string') {
			this.validateUrl(params.url)
		}

		if (name === 'switchTab' && typeof params.tabKey !== 'string') {
			throw new Error('switchTab requires a tabKey string')
		}

		if (KNOWN_SELECTOR_ACTIONS.has(name) && typeof params.selector === 'string') {
			this.validateCheatsheetSelector(params.selector, context.knownSelectors)
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
