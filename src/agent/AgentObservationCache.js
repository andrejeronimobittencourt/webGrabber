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

/**
 * @param {string} domCacheKey
 * @param {string} screenshotBase64
 * @returns {string}
 */
export function buildVisionCacheKey(domCacheKey, screenshotBase64) {
	return `${domCacheKey}|${hashContent(screenshotBase64)}`
}

/**
 * Per-run cache for viewport vision summaries.
 */
export default class AgentObservationCache {
	#vision = new Map()

	/**
	 * @param {string} visionCacheKey
	 * @returns {boolean}
	 */
	hasVision(visionCacheKey) {
		return this.#vision.has(visionCacheKey)
	}

	/**
	 * @param {string} visionCacheKey
	 * @returns {string}
	 */
	getVision(visionCacheKey) {
		const summary = this.#vision.get(visionCacheKey)

		if (typeof summary !== 'string') {
			throw new Error(`Vision cache miss for key "${visionCacheKey}"`)
		}

		return summary
	}

	/**
	 * @param {string} visionCacheKey
	 * @param {string} visualSummary
	 */
	setVision(visionCacheKey, visualSummary) {
		this.#vision.set(visionCacheKey, visualSummary)
	}

	invalidate() {
		this.#vision.clear()
	}
}
