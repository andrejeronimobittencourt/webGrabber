import constants from '../../packages/core/utils/constants.js'
import { delayMs } from '../../packages/core/utils/delayMs.js'
import { SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { isVisionEnabled } from './agentModels.js'
import { resolveHtmlOffset, resolveHtmlPageSize } from './agentConfig.js'
import { buildDomCacheKey } from './AgentObservationCache.js'
import { listAgentTabs } from './agentTabs.js'

import {
	createDefaultHtmlPaginationState,
} from './interactiveElementList.js'

/** URLs treated as blank pre-navigate pages for vision and tab filtering. */
export const AGENT_BLANK_PAGE_URLS = new Set(['about:blank', 'chrome://newtab/'])

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isAgentPreNavigatePageUrl(url) {
	return AGENT_BLANK_PAGE_URLS.has(url)
}

/**
 * Whether a vision page description should be attached to the observation.
 * @param {import('puppeteer').Page} page
 * @param {boolean} [hasNavigated=false]
 * @returns {boolean}
 */
export function shouldAttachPageVision(page, hasNavigated = false) {
	if (!isVisionEnabled()) {
		return false
	}

	if (hasNavigated) {
		return true
	}

	return !isAgentPreNavigatePageUrl(page.url())
}

/** @deprecated Use shouldAttachPageVision */
export function shouldIncludePageScreenshot(page, hasNavigated = false) {
	return shouldAttachPageVision(page, hasNavigated)
}



/**
 * @typedef {Object} HtmlPageMeta
 * @property {number} pageIndex
 * @property {number} totalPages
 * @property {number} pageSize
 * @property {number} offset
 * @property {number} limit
 * @property {number} total
 * @property {boolean} hasMore
 */

/**
 * @typedef {Object} PageObservation
 * @property {string} url
 * @property {string} title
 * @property {string} html
 * @property {HtmlPageMeta} htmlPage
 * @property {string | null} pickedSelector
 * @property {string} [visualSummary]
 * @property {import('./agentTabs.js').AgentTabsSnapshot} [tabs]
 */

/**
 * @typedef {import('./AgentObservationCache.js').PageFingerprint} PageFingerprint
 */

/**
 * @typedef {Object} PageSnapshotCache
 * @property {string} key
 * @property {PageFingerprint} fingerprint
 * @property {string} html
 */

/**
 * @param {number} total
 * @param {number} offset
 * @param {number} limit
 * @returns {HtmlPageMeta}
 */
export function buildHtmlPageMeta(total, offset, limit) {
	const pageIndex = Math.floor(offset / limit)
	const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 0

	return {
		pageIndex,
		totalPages,
		pageSize: limit,
		offset,
		limit,
		total,
		hasMore: offset + limit < total,
	}
}

/**
 * @param {string} fullHtml
 * @param {number} offset
 * @param {number} limit
 * @returns {{ html: string, htmlPage: HtmlPageMeta }}
 */
export function sliceHtml(fullHtml, offset, limit) {
	return {
		html: fullHtml.slice(offset, offset + limit),
		htmlPage: buildHtmlPageMeta(fullHtml.length, offset, limit),
	}
}

/**
 * Collect scroll position, DOM fingerprint, and page elements in one browser round-trip.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{ scrollX: number, scrollY: number, domSignature: string }>}
 */
export async function collectPageDomSnapshot(page) {
	return page.evaluate(() => {
		const body = document.body
		if (!body) {
			return {
				scrollX: window.scrollX,
				scrollY: window.scrollY,
				domSignature: '0',
				html: '',
			}
		}

		const liveNodes = document.body.querySelectorAll('*')
		const hiddenIndices = new Set()
		const obscuredIndices = new Set()

		liveNodes.forEach((el, index) => {
			const tagName = el.tagName.toLowerCase()
			if (['script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'path'].includes(tagName)) {
				hiddenIndices.add(index)
				return
			}

			const style = window.getComputedStyle(el)
			if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
				hiddenIndices.add(index)
				return
			}
			const rect = el.getBoundingClientRect()
			if (rect.width === 0 || rect.height === 0) {
				hiddenIndices.add(index)
				return
			}
			
			if (['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') {
				const x = rect.left + rect.width / 2
				const y = rect.top + rect.height / 2
				
				if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
					const topEl = document.elementFromPoint(x, y)
					if (topEl && topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
						obscuredIndices.add(index)
					}
				}
			}
		})

		const clone = document.body.cloneNode(true)
		const clonedNodes = clone.querySelectorAll('*')

		const allowedAttributes = new Set([
			'id', 'name', 'type', 'class', 'href', 'src', 'alt', 
			'title', 'aria-label', 'placeholder', 'value', 'role', 'for', 'data-obscured'
		])

		for (let i = clonedNodes.length - 1; i >= 0; i--) {
			const node = clonedNodes[i]
			
			if (hiddenIndices.has(i)) {
				if (node.parentNode) node.remove()
				continue
			}

			if (obscuredIndices.has(i)) {
				node.setAttribute('data-obscured', 'true')
			}

			const attrs = Array.from(node.attributes)
			for (const attr of attrs) {
				if (!allowedAttributes.has(attr.name.toLowerCase())) {
					node.removeAttribute(attr.name)
				}
			}

			if (node.hasAttribute('class') && node.getAttribute('class').trim() === '') {
				node.removeAttribute('class')
			}
		}

		const treeWalker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT, null, false)
		const comments = []
		while(treeWalker.nextNode()) comments.push(treeWalker.currentNode)
		comments.forEach(node => node.remove())

		let html = clone.innerHTML
		html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()

		const domSignature = String(html.length) + '|' + html.slice(0, 50)

		return {
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			domSignature,
			html,
		}
	})
}

/**
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 */
export function clearPageSnapshotCache(brain) {
	brain.run.pageSnapshotCache = null
	brain.run.pageVisionCache = null
}

/** @deprecated Use clearPageSnapshotCache */
export function clearPageElementCache(brain) {
	clearPageSnapshotCache(brain)
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<PageSnapshotCache>}
 */
export async function getOrCollectPageSnapshot(page, brain) {
	const snapshot = await collectPageDomSnapshot(page)
	const fingerprint = {
		url: page.url(),
		scrollX: snapshot.scrollX,
		scrollY: snapshot.scrollY,
		domSignature: snapshot.domSignature,
	}
	const key = buildDomCacheKey(fingerprint)
	const cached = brain.run.pageSnapshotCache

	if (cached?.key === key) {
		return cached
	}

	brain.run.pageSnapshotCache = {
		key,
		fingerprint,
		html: snapshot.html,
	}

	return brain.run.pageSnapshotCache
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<string>}
 */
export async function getOrCollectPageHtml(page, brain) {
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	return pageSnapshot.html
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {{ offset?: number, limit?: number }} [options]
 * @returns {Promise<{ html: string, htmlPage: HtmlPageMeta }>}
 */
export async function collectPageHtml(page, brain, options = {}) {
	const offset = options.offset ?? 0
	const limit = options.limit ?? resolveHtmlPageSize()
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)

	return sliceHtml(pageSnapshot.html, offset, limit)
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ offset?: number, limit?: number }} params
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<{ offset: number, html: string, htmlPage: HtmlPageMeta }>}
 */
export async function paginateHtml(page, params = {}, brain) {
	const state = resolveInteractiveElementListState(createDefaultInteractiveElementListState(), params)
	const limit = params.limit ?? resolveHtmlPageSize()
	const offset = resolveHtmlOffset(state.offset)
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	const { html, htmlPage } = sliceHtml(pageSnapshot.html, offset, limit)

	return { offset, html, htmlPage }
}


/**
 * @param {import('puppeteer').Page} page
 * @param {import('./OllamaClient.js').default} client
 * @param {{ selector: string }} params
 * @returns {Promise<{ selector: string, tag: string, text: string, visualSummary?: string }>}
 */
export async function inspectElement(page, client, params) {
	const { selector } = params

	if (!selector?.trim()) {
		throw new Error('inspectElement requires a selector')
	}

	const handle = await page.$(selector)

	if (!handle) {
		throw new SelectorError('inspectElement', selector)
	}

	const elementMeta = await page.evaluate((elementSelector) => {
		const element = document.querySelector(elementSelector)

		if (!element) {
			throw new Error('Element not found')
		}

		element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })

		return {
			tag: element.tagName.toLowerCase(),
			text: (element.textContent || element.value || element.getAttribute('aria-label') || '')
				.trim()
				.slice(0, 120),
		}
	}, selector)

	await delayMs(300)

	/** @type {{ selector: string, tag: string, text: string, visualSummary?: string }} */
	const result = {
		selector,
		tag: elementMeta.tag,
		text: elementMeta.text,
	}

	if (client.visionModel && isVisionEnabled()) {
		const elementImage = await handle.screenshot({
			encoding: 'base64',
			type: 'jpeg',
		})

		result.visualSummary = await client.describeElementView(elementImage, {
			url: page.url(),
			title: await page.title(),
			selector,
			elementText: elementMeta.text,
		})
	}

	await handle.dispose()

	return result
}

/**
 * @typedef {Object} ObservePageOptions
 * @property {boolean} [hasNavigated]
 * @property {import('./interactiveElementList.js').HtmlPaginationState} [htmlPagination]
 */

/**
 * Capture structured page context for the agent loop.
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {ObservePageOptions} [options]
 * @returns {Promise<PageObservation>}
 */
export async function observePage(page, brain, options = {}) {
	const pageSize = resolveHtmlPageSize()
	const htmlPagination = options.htmlPagination ?? createDefaultHtmlPaginationState()
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	const { html, htmlPage } = sliceHtml(
		pageSnapshot.html,
		htmlPagination.offset,
		pageSize,
	)

	return {
		url: page.url(),
		title: await page.title(),
		html,
		htmlPage,
		pickedSelector: brain.run?.pickedSelector ?? null,
		tabs: await listAgentTabs(brain),
	}
}

/**
 * Attach a vision-generated page description when vision is enabled.
 * Reuses the cached description when the page fingerprint is unchanged.
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {PageObservation} observation
 * @param {import('./OllamaClient.js').default} client
 * @param {{ hasNavigated?: boolean }} [options]
 * @returns {Promise<PageObservation>}
 */
export async function attachPageVisionDescription(page, brain, observation, client, options = {}) {
	if (!client.visionModel || !shouldAttachPageVision(page, options.hasNavigated ?? true)) {
		return observation
	}

	const snapshotKey = brain.run.pageSnapshotCache?.key

	if (!snapshotKey) {
		return observation
	}

	const cachedVision = brain.run.pageVisionCache

	if (cachedVision?.key === snapshotKey) {
		observation.visualSummary = cachedVision.description
		return observation
	}

	const viewportImage = await page.screenshot({
		encoding: 'base64',
		type: 'jpeg',
		fullPage: false,
	})

	const description = await client.describePageView(viewportImage, {
		url: observation.url,
		title: observation.title,
		instruction: options.instruction,
		lastIntent: options.lastIntent,
	})

	brain.run.pageVisionCache = { key: snapshotKey, description }
	observation.visualSummary = description

	return observation
}
