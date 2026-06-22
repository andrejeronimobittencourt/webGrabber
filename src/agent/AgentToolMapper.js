/** Default navigation wait condition for agent tool calls. */
export const DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL = 'domcontentloaded'

/**
 * @typedef {Object} AgentStep
 * @property {string} action
 * @property {Record<string, unknown>} params
 * @property {*} [result]
 * @property {string | null} [error]
 * @property {boolean} [madeProgress]
 * @property {string} [pageUrl]
 * @property {string} [timestamp]
 */

/**
 * @typedef {Object} EngineActionMapping
 * @property {string} action
 * @property {Record<string, unknown>} params
 */

/**
 * Map a curated agent tool call to a core engine action and params.
 * @param {string} toolName
 * @param {Record<string, unknown>} params
 * @returns {EngineActionMapping}
 */
export function mapAgentToolToEngineAction(toolName, params) {
	if (toolName === 'navigate') {
		const waitUntil = params.waitUntil ?? DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL

		return {
			action: 'puppeteer',
			params: {
				func: 'goto',
				url: params.url,
				options: { waitUntil },
			},
		}
	}

	return {
		action: toolName,
		params,
	}
}
