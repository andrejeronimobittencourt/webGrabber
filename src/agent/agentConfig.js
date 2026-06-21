/** Default number of interactive elements per cheatsheet page. */
export const DEFAULT_AGENT_ELEMENT_PAGE_SIZE = 100

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
