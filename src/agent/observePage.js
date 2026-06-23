import constants from '../../packages/core/utils/constants.js'
import { delayMs } from '../../packages/core/utils/delayMs.js'
import { SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { isVisionEnabled } from './agentModels.js'
import { resolveElementOffset, resolveElementPageSize } from './agentConfig.js'
import { buildDomCacheKey } from './AgentObservationCache.js'
import { listAgentTabs } from './agentTabs.js'
import { registerObservationSelectors } from './agentEnvironment.js'
import {
	createDefaultInteractiveElementListState,
	resolveInteractiveElementListState,
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
 * @typedef {Object} PageElement
 * @property {string} selector
 * @property {string} text
 * @property {boolean} interactable
 */

/**
 * @typedef {Object} ElementsPageMeta
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
 * @property {PageElement[]} elements
 * @property {ElementsPageMeta} elementsPage
 * @property {string | null} pickedSelector
 * @property {*} lastResult
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
 * @property {PageElement[]} elements
 */

/**
 * @param {number} total
 * @param {number} offset
 * @param {number} limit
 * @returns {ElementsPageMeta}
 */
export function buildElementsPageMeta(total, offset, limit) {
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
 * @param {PageElement[]} allElements
 * @param {number} offset
 * @param {number} limit
 * @returns {{ elements: PageElement[], elementsPage: ElementsPageMeta }}
 */
export function slicePageElements(allElements, offset, limit) {
	return {
		elements: allElements.slice(offset, offset + limit),
		elementsPage: buildElementsPageMeta(allElements.length, offset, limit),
	}
}

/**
 * Collect scroll position, DOM fingerprint, and page elements in one browser round-trip.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{ scrollX: number, scrollY: number, domSignature: string, elements: PageElement[] }>}
 */
export async function collectPageDomSnapshot(page) {
	return page.evaluate(() => {
		const nonRenderedAncestorSelector = 'script, style, noscript, template, head'
		const interactiveSelector =
			'a, button, input, textarea, select, [role="button"]'
		const readableSelector =
			'h1, h2, h3, h4, h5, h6, p, li, label, time, td, th'
		const collectSelector = `${interactiveSelector}, ${readableSelector}`

		/**
		 * @param {Element} element
		 * @returns {string}
		 */
		const buildSelector = (element) => {
			if (element.id) {
				return `#${CSS.escape(element.id)}`
			}

			const name = element.getAttribute('name')
			if (name) {
				const tag = element.tagName.toLowerCase()
				return `${tag}[name="${name.replace(/"/g, '\\"')}"]`
			}

			const parts = []
			let current = element

			while (current && current.nodeType === 1 && parts.length < 4) {
				let part = current.tagName.toLowerCase()
				const parent = current.parentElement

				if (parent) {
					const siblings = Array.from(parent.children).filter(
						(child) => child.tagName === current.tagName,
					)

					if (siblings.length > 1) {
						part += `:nth-of-type(${siblings.indexOf(current) + 1})`
					}
				}

				parts.unshift(part)
				current = parent
			}

			return parts.join(' > ')
		}

		const isVisible = (element) => {
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

		/**
		 * @param {Element} element
		 * @returns {boolean}
		 */
		const isCollectableBodyElement = (element) => {
			const body = document.body

			if (!body || !body.contains(element)) {
				return false
			}

			return !element.closest(nonRenderedAncestorSelector)
		}

		const elementText = (element) =>
			(element.textContent || element.value || element.getAttribute('aria-label') || '')
				.trim()
				.slice(0, 120)

		const isInteractive = (element) => element.matches(interactiveSelector)

		const body = document.body

		if (!body) {
			return {
				scrollX: window.scrollX,
				scrollY: window.scrollY,
				domSignature: '0',
				elements: [],
			}
		}

		const seen = new Set()
		/** @type {Element[]} */
		const merged = []

		for (const element of body.querySelectorAll(collectSelector)) {
			if (seen.has(element)) {
				continue
			}

			seen.add(element)
			merged.push(element)
		}

		const candidates = merged
			.filter(isCollectableBodyElement)
			.filter(isVisible)
			.filter((element) => isInteractive(element) || elementText(element).length > 0)

		const candidateSet = new Set(candidates)
		const hasListedDescendant = new Set()

		for (const child of candidates) {
			let parent = child.parentElement

			while (parent && parent !== body) {
				if (candidateSet.has(parent)) {
					hasListedDescendant.add(parent)
					break
				}

				parent = parent.parentElement
			}
		}

		const leaves = candidates.filter((element) => !hasListedDescendant.has(element))
		const elements = leaves.map((element) => ({
			selector: buildSelector(element),
			text: elementText(element),
			interactable: isInteractive(element),
		}))

		let domSignature = String(leaves.length)

		for (const element of leaves) {
			const text = elementText(element).slice(0, 40)
			domSignature += `|${element.tagName}:${element.id || ''}:${element.getAttribute('name') || ''}:${text}`
		}

		return {
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			domSignature,
			elements,
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
		elements: snapshot.elements,
	}

	return brain.run.pageSnapshotCache
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<PageElement[]>}
 */
export async function getOrCollectAllPageElements(page, brain) {
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	return pageSnapshot.elements
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {{ offset?: number, limit?: number }} [options]
 * @returns {Promise<{ elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function collectPageElements(page, brain, options = {}) {
	const offset = options.offset ?? 0
	const limit = options.limit ?? resolveElementPageSize()
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)

	return slicePageElements(pageSnapshot.elements, offset, limit)
}

/**
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {{ offset?: number, limit?: number }} [options]
 * @returns {Promise<{ elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function collectInteractiveElements(page, brain, options = {}) {
	return collectPageElements(page, brain, options)
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ offset?: number, limit?: number }} params
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<{ offset: number, elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function paginateElements(page, params = {}, brain) {
	const state = resolveInteractiveElementListState(createDefaultInteractiveElementListState(), params)
	const limit = params.limit ?? resolveElementPageSize()
	const offset = resolveElementOffset(state.offset)
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	const { elements, elementsPage } = slicePageElements(pageSnapshot.elements, offset, limit)

	return { offset, elements, elementsPage }
}

/**
 * Rebuild knownSelectors from the live page after a page-changing action.
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {Set<string>} knownSelectors
 */
export async function refreshKnownSelectorsFromPage(page, brain, knownSelectors) {
	knownSelectors.clear()

	const limit = resolveElementPageSize()
	const elementState = brain.run.elementList ?? createDefaultInteractiveElementListState()
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	const { elements } = slicePageElements(pageSnapshot.elements, elementState.offset, limit)
	registerObservationSelectors(knownSelectors, elements)
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
 * @property {import('./interactiveElementList.js').InteractiveElementListState} [elementList]
 */

/**
 * Capture structured page context for the agent loop.
 * @param {import('puppeteer').Page} page
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {ObservePageOptions} [options]
 * @returns {Promise<PageObservation>}
 */
export async function observePage(page, brain, options = {}) {
	const pageSize = resolveElementPageSize()
	const elementList = options.elementList ?? createDefaultInteractiveElementListState()
	const pageSnapshot = await getOrCollectPageSnapshot(page, brain)
	const { elements, elementsPage } = slicePageElements(
		pageSnapshot.elements,
		elementList.offset,
		pageSize,
	)

	return {
		url: page.url(),
		title: await page.title(),
		elements,
		elementsPage,
		pickedSelector: brain.run?.pickedSelector ?? null,
		lastResult: brain.recall(constants.inputKey),
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
	})

	brain.run.pageVisionCache = { key: snapshotKey, description }
	observation.visualSummary = description

	return observation
}
