/**
 * Interpolate {{variable}} placeholders in a params object using brain memory.
 *
 * Rules:
 * - String values: each {{variable}} token is replaced with the recalled value.
 *   If the entire string IS a single token AND the recalled value is an object or
 *   array, the key is replaced with that value directly. If the recalled value is
 *   null or undefined the placeholder is left as-is.
 * - Array values: each item is recursively interpolated.
 * - Plain-object values: each own property is recursively interpolated (one level).
 * - Other value types are left unchanged.
 */

import isPlainObject from 'lodash/isPlainObject.js'

const INTERPOLATION_REGEX = /{{(.*?)}}/g
const SINGLE_TOKEN_REGEX = /^{{(.*?)}}$/

/**
 * @param {string} value
 * @param {ReturnType<import('../brain/BrainFactory.js').default['create']>} brain
 * @returns {*}
 */
function interpolateString(value, brain) {
	// If the whole string is exactly one token and recalls a non-primitive, replace entirely.
	const singleMatch = value.match(SINGLE_TOKEN_REGEX)
	if (singleMatch) {
		const variable = singleMatch[1].trim()
		const recalled = brain.recall(variable)
		if (recalled !== null && recalled !== undefined && (Array.isArray(recalled) || isPlainObject(recalled))) {
			return recalled
		}
	}

	// Otherwise do inline substitution for each {{token}}.
	return value.replace(INTERPOLATION_REGEX, (_match, rawVariable) => {
		const recalled = brain.recall(rawVariable.trim())
		// Only substitute primitives inline; leave complex types untouched.
		if (recalled === null || recalled === undefined) return _match
		if (Array.isArray(recalled) || isPlainObject(recalled)) return _match
		return recalled
	})
}

/**
 * @param {Record<string, unknown>} params
 * @param {ReturnType<import('../brain/BrainFactory.js').default['create']>} brain
 * @returns {Record<string, unknown>}
 */
export const interpolation = (params, brain) => {
	const result = { ...params }

	for (const [key, value] of Object.entries(result)) {
		if (typeof value === 'string') {
			result[key] = interpolateString(value, brain)
		} else if (Array.isArray(value)) {
			result[key] = value.map((item) => {
				if (typeof item === 'string') return interpolateString(item, brain)
				if (Array.isArray(item) || isPlainObject(item)) return interpolation(item, brain)
				return item
			})
		} else if (isPlainObject(value)) {
			// Recursively interpolate plain-object param values (e.g. nested options).
			result[key] = interpolation(/** @type {Record<string, unknown>} */ (value), brain)
		}
	}

	return result
}
