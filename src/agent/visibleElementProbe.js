/** Primitive HTML tags included in the default visible-element observation list. */
export const DEFAULT_VISIBLE_PROBE_TAGS = [
	'a',
	'button',
	'div',
	'h1',
	'h2',
	'h3',
	'label',
	'li',
	'p',
	'span',
	'time',
]

/** Primitive HTML tags the agent may request when paginating visible elements. */
export const ALLOWED_VISIBLE_PROBE_TAGS = new Set([
	'a',
	'article',
	'button',
	'div',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'label',
	'li',
	'ol',
	'p',
	'section',
	'span',
	'strong',
	'td',
	'th',
	'time',
	'ul',
])

/**
 * @typedef {Object} VisibleElementListState
 * @property {string[]} tags
 * @property {number} offset
 */

/**
 * @returns {VisibleElementListState}
 */
export function createDefaultVisibleElementListState() {
	return {
		tags: [...DEFAULT_VISIBLE_PROBE_TAGS],
		offset: 0,
	}
}

/**
 * @param {unknown} tags
 * @returns {string[]}
 */
export function normalizeProbeTags(tags) {
	if (!Array.isArray(tags) || tags.length === 0) {
		throw new Error('paginateVisibleElements requires a non-empty tags array')
	}

	/** @type {string[]} */
	const normalized = []

	for (const tag of tags) {
		const value = String(tag).trim().toLowerCase()

		if (!value) {
			continue
		}

		if (!ALLOWED_VISIBLE_PROBE_TAGS.has(value)) {
			throw new Error(
				`Tag "${value}" is not allowed. Use primitive HTML tags such as p, h1, span, div, li, or time.`,
			)
		}

		normalized.push(value)
	}

	if (normalized.length === 0) {
		throw new Error('paginateVisibleElements requires at least one valid tag')
	}

	return [...new Set(normalized)]
}

/**
 * @param {VisibleElementListState} currentState
 * @param {{ tags?: string[], offset?: number }} params
 * @returns {VisibleElementListState}
 */
export function resolveVisibleElementListState(currentState, params = {}) {
	return {
		tags: params.tags ? normalizeProbeTags(params.tags) : currentState.tags,
		offset:
			params.offset === undefined || params.offset === null
				? currentState.offset
				: params.offset,
	}
}
