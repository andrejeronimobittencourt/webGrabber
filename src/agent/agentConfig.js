/** Default number of interactive elements per observation page. */
export const DEFAULT_AGENT_ELEMENT_PAGE_SIZE = 25

/** Agent tools that are exploration-only and should not be exported to grabs. */
export const AGENT_ONLY_EXPORT_ACTIONS = new Set([
	'inspectElement',
	'paginateElements',
	'listTabs',
	'pickElement',
	'switchTab',
])

/** Agent tools omitted from normal CLI progress output. */
export const AGENT_QUIET_TOOLS = new Set(['pickElement'])

/** Agent tools that consume a pick for interaction rather than read-and-answer export. */
export const PICK_CONSUMING_ACTIONS = new Set(['click', 'inspectElement', 'pressKey', 'type'])

/** Agent tools after which knownSelectors should be rebuilt from the live page. */
export const KNOWN_SELECTOR_REFRESH_TOOLS = new Set([
	'click',
	'navigate',
	'pressKey',
	'switchTab',
])

/**
 * Resolve the interactive-element page size for agent observations.
 * @returns {number}
 */
export function resolveElementPageSize() {
	return Number.parseInt(
		process.env.AGENT_ELEMENT_PAGE_SIZE ?? String(DEFAULT_AGENT_ELEMENT_PAGE_SIZE),
		10,
	)
}

/**
 * Resolve a zero-based element list offset; defaults to 0 when omitted.
 * @param {number | undefined} offset
 * @returns {number}
 */
export function resolveElementOffset(offset) {
	if (offset === undefined || offset === null) {
		return 0
	}

	if (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset)) {
		throw new Error('Element offset must be a non-negative integer')
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
