/** Default number of HTML characters per observation page. */
export const DEFAULT_AGENT_HTML_PAGE_SIZE = 100000

/** Agent tools that are exploration-only and should not be exported to grabs. */
export const AGENT_ONLY_EXPORT_ACTIONS = new Set([
	'inspectElement',
	'paginateHtml',
	'listTabs',
	'switchTab',
	'answer',
])

/** Agent tools omitted from normal CLI progress output. */
export const AGENT_QUIET_TOOLS = new Set(['answer'])

/** Agent tools that consume a pick for interaction rather than read-and-answer export. */
export const PICK_CONSUMING_ACTIONS = new Set(['click', 'inspectElement', 'pressKey', 'type'])

/** Agent tools after which knownSelectors should be rebuilt from the live page. */
export const KNOWN_SELECTOR_REFRESH_TOOLS = new Set([
	'click',
	'navigate',
	'pressKey',
	'switchTab',
	'type',
])

/** How many consecutive calls of the same tool on one page URL trigger loop feedback. */
export const CONSECUTIVE_SAME_TOOL_PAGE_THRESHOLD = 3

/** Maximum tool-call history entries included in each model turn. */
export const MAX_TOOL_HISTORY_STEPS = 50

/** Tools monitored for same-page repetition loops. */
export const PAGE_LOOP_MONITOR_TOOLS = new Set([
	'click',
	'getElements',
	'inspectElement',
	'paginateHtml',
	'pressKey',
])

/** Tool result string shown after a successful mutating tool that yields no result object. */
const MUTATING_TOOL_SUCCESS_HINT = '(no result shown; see next observation for effect)'

/** Tools whose success output should not clutter the agent prompt. */
export const SKIP_RESULT_TOOLS = new Set([
	'navigate',
	'click',
	'type',
	'pressKey',
	'screenshot',
	'inspectElement',
	'switchTab',
])

/**
 * Resolve the interactive-element page size for agent observations.
 * @returns {number}
 */
export function resolveHtmlPageSize() {
	return Number.parseInt(
		process.env.AGENT_HTML_PAGE_SIZE ?? String(DEFAULT_AGENT_HTML_PAGE_SIZE),
		10,
	)
}

/**
 * Resolve a zero-based element list offset; defaults to 0 when omitted.
 * @param {number | undefined} offset
 * @returns {number}
 */
export function resolveHtmlOffset(offset) {
	if (offset === undefined || offset === null) {
		return 0
	}

	if (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset)) {
		throw new Error('HTML offset must be a non-negative integer')
	}

	return offset
}

/**
 * @returns {boolean}
 */
export function isObservationCacheEnabled() {
	const value = process.env.AGENT_CACHE_OBSERVATIONS

	if (value === undefined) {
		return true
	}

	return value === 'true'
}

/**
 * @param {string} toolName
 * @returns {boolean}
 */
export function shouldRefreshKnownSelectorsAfterTool(toolName) {
	return KNOWN_SELECTOR_REFRESH_TOOLS.has(toolName)
}
