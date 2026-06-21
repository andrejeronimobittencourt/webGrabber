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
 * @param {import('puppeteer').Page} page
 * @returns {Promise<PageFingerprint>}
 */
export async function computePageFingerprint(page) {
	const scroll = await page.evaluate(() => ({
		scrollX: window.scrollX,
		scrollY: window.scrollY,
	}))

	const domSignature = await page.evaluate(() => {
		const isInteractiveVisible = (element) => {
			if (element instanceof HTMLInputElement && element.type === 'hidden') {
				return false
			}

			const style = window.getComputedStyle(element)

			if (style.display === 'none' || style.visibility === 'hidden') {
				return false
			}

			if (Number.parseFloat(style.opacity) === 0) {
				return false
			}

			const rect = element.getBoundingClientRect()

			return rect.width > 0 && rect.height > 0
		}

		const nodes = document.querySelectorAll(
			'a, button, input, textarea, select, [role="button"]',
		)
		const visibleNodes = Array.from(nodes).filter(isInteractiveVisible)
		let signature = String(visibleNodes.length)

		for (const element of visibleNodes) {
			const text = (element.textContent || element.value || element.getAttribute('aria-label') || '')
				.trim()
				.slice(0, 40)
			signature += `|${element.tagName}:${element.id || ''}:${element.getAttribute('name') || ''}:${text}`
		}

		return signature
	})

	return {
		url: page.url(),
		scrollX: scroll.scrollX,
		scrollY: scroll.scrollY,
		domSignature,
	}
}

/**
 * Per-run cache for agent DOM cheatsheet pages and viewport vision summaries.
 */
export default class AgentObservationCache {
	#dom = new Map()
	#vision = new Map()

	/**
	 * @param {string} domCacheKey
	 * @returns {boolean}
	 */
	hasDom(domCacheKey) {
		return this.#dom.has(domCacheKey)
	}

	/**
	 * @param {string} domCacheKey
	 * @returns {{ elements: import('./observePage.js').PageElementSnapshot[], elementsPage: import('./observePage.js').ElementsPageMeta }}
	 */
	getDom(domCacheKey) {
		const entry = this.#dom.get(domCacheKey)

		if (!entry) {
			throw new Error(`DOM cache miss for key "${domCacheKey}"`)
		}

		return {
			elements: structuredClone(entry.elements),
			elementsPage: structuredClone(entry.elementsPage),
		}
	}

	/**
	 * @param {string} domCacheKey
	 * @param {{ elements: import('./observePage.js').PageElementSnapshot[], elementsPage: import('./observePage.js').ElementsPageMeta }} value
	 */
	setDom(domCacheKey, value) {
		this.#dom.set(domCacheKey, {
			elements: structuredClone(value.elements),
			elementsPage: structuredClone(value.elementsPage),
		})
	}

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
		this.#dom.clear()
		this.#vision.clear()
	}
}
