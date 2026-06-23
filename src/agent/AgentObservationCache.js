import { createHash } from 'crypto'

/** Agent tools that change page DOM, scroll, or viewport visuals. */
export const MUTATING_AGENT_TOOLS = new Set([
	'navigate',
	'click',
	'type',
	'pressKey',
	'screenshot',
	'inspectElement',
	'switchTab',
])

/**
 * @param {string} toolName
 * @returns {boolean}
 */
export function isMutatingAgentTool(toolName) {
	return MUTATING_AGENT_TOOLS.has(toolName)
}

/**
 * @param {string} value
 * @returns {string}
 */
export function hashContent(value) {
	const normalized = typeof value === 'string' ? value : JSON.stringify(value)
	return createHash('sha256').update(normalized).digest('hex')
}

/**
 * @typedef {Object} PageFingerprint
 * @property {string} url
 * @property {number} scrollX
 * @property {number} scrollY
 * @property {string} domSignature
 */

/**
 * @param {PageFingerprint} fingerprint
 * @returns {string}
 */
export function buildDomCacheKey(fingerprint) {
	return [
		fingerprint.url,
		String(fingerprint.scrollX),
		String(fingerprint.scrollY),
		hashContent(fingerprint.domSignature),
	].join('|')
}
