/** Primitive HTML tags the agent may request via listVisibleElements. */
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
 * @param {unknown} tags
 * @returns {string[]}
 */
export function normalizeProbeTags(tags) {
	if (!Array.isArray(tags) || tags.length === 0) {
		throw new Error('listVisibleElements requires a non-empty tags array')
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
		throw new Error('listVisibleElements requires at least one valid tag')
	}

	return [...new Set(normalized)]
}
