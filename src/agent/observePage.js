import constants from '../../packages/core/utils/constants.js'
import { SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { isVisionEnabled } from './agentModels.js'
import { isObservationCacheEnabled, resolveElementOffset, resolveElementPageSize } from './agentConfig.js'
import {
	buildDomCacheKey,
	buildVisionCacheKey,
	computePageFingerprint,
} from './AgentObservationCache.js'
import { listAgentTabs } from './agentTabs.js'
import { registerObservationSelectors } from './agentEnvironment.js'
import {
	createDefaultInteractiveElementListState,
	resolveInteractiveElementListState,
} from './interactiveElementList.js'

/** URLs where viewport vision is skipped until the agent navigates. */
const PRE_NAVIGATE_PAGE_URLS = new Set(['about:blank', 'chrome://newtab/'])

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isAgentPreNavigatePageUrl(url) {
	return PRE_NAVIGATE_PAGE_URLS.has(url)
}

/**
 * Whether the agent loop should capture a viewport screenshot for vision analysis.
 * @param {import('puppeteer').Page} page
 * @param {boolean} [hasNavigated=false]
 * @returns {boolean}
 */
export function shouldIncludePageScreenshot(page, hasNavigated = false) {
	if (!isVisionEnabled()) {
		return false
	}

	if (hasNavigated) {
		return true
	}

	return !isAgentPreNavigatePageUrl(page.url())
}

/**
 * @typedef {import('./AgentObservationCache.js').default} AgentObservationCache
 */

/**
 * @typedef {Object} PageElement
 * @property {string} selector
 * @property {string} text
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
 * @property {string} [screenshot]
 * @property {string} [visualSummary]
 * @property {import('./agentTabs.js').AgentTabsSnapshot} [tabs]
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
 * @param {import('puppeteer').Page} page
 * @param {{ offset?: number, limit?: number }} [options]
 * @returns {Promise<{ elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function collectPageElements(page, options = {}) {
	const offset = options.offset ?? 0
	const limit = options.limit ?? resolveElementPageSize()

	const { elements, total } = await page.evaluate(
		({ elementOffset, elementLimit }) => {
			const nonRenderedAncestorSelector = 'script, style, noscript, template, head'
			const interactiveSelector =
				'a, button, input, textarea, select, [role="button"]'
			const readableSelector =
				'h1, h2, h3, h4, h5, h6, p, li, label, time, td, th'

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
				return { elements: [], total: 0 }
			}

			const seen = new Set()
			/** @type {Element[]} */
			const merged = []

			for (const element of body.querySelectorAll(
				`${interactiveSelector}, ${readableSelector}`,
			)) {
				if (seen.has(element)) {
					continue
				}

				seen.add(element)
				merged.push(element)
			}

			const all = merged
				.filter(isCollectableBodyElement)
				.filter(isVisible)
				.filter((element) => isInteractive(element) || elementText(element).length > 0)
				.filter(
					(element) =>
						!merged.some((other) => other !== element && element.contains(other)),
				)
				.map((element) => ({
					selector: buildSelector(element),
					text: elementText(element),
				}))

			return {
				elements: all.slice(elementOffset, elementOffset + elementLimit),
				total: all.length,
			}
		},
		{
			elementOffset: offset,
			elementLimit: limit,
		},
	)

	return {
		elements,
		elementsPage: buildElementsPageMeta(total, offset, limit),
	}
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ offset?: number, limit?: number }} [options]
 * @returns {Promise<{ elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function collectInteractiveElements(page, options = {}) {
	return collectPageElements(page, options)
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ offset?: number, limit?: number }} params
 * @returns {Promise<{ offset: number, elements: PageElement[], elementsPage: ElementsPageMeta }>}
 */
export async function paginateElements(page, params = {}) {
	const state = resolveInteractiveElementListState(createDefaultInteractiveElementListState(), params)
	const limit = params.limit ?? resolveElementPageSize()
	const offset = resolveElementOffset(state.offset)
	const { elements, elementsPage } = await collectPageElements(page, { offset, limit })

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
	const { elements } = await collectPageElements(page, {
		offset: elementState.offset,
		limit,
	})
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

	await page.evaluate((elementSelector) => {
		const element = document.querySelector(elementSelector)

		if (!element) {
			throw new Error('Element not found')
		}

		element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })
	}, selector)

	await page.waitForTimeout(300)

	const elementMeta = await page.evaluate((elementSelector) => {
		const element = document.querySelector(elementSelector)

		if (!element) {
			throw new Error('Element not found')
		}

		return {
			tag: element.tagName.toLowerCase(),
			text: (element.textContent || element.value || element.getAttribute('aria-label') || '')
				.trim()
				.slice(0, 120),
		}
	}, selector)

	/** @type {{ selector: string, tag: string, text: string, visualSummary?: string }} */
	const result = {
		selector,
		tag: elementMeta.tag,
		text: elementMeta.text,
	}

	if (client.visionModel && isVisionEnabled()) {
		const screenshot = await handle.screenshot({
			encoding: 'base64',
			type: 'jpeg',
		})

		result.visualSummary = await client.describePageScreenshot(screenshot, {
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
 * @property {boolean} [includeScreenshot]
 * @property {boolean} [hasNavigated]
 * @property {AgentObservationCache} [cache]
 * @property {boolean} [cacheEnabled]
 * @property {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} [brain]
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
	const includeScreenshot =
		options.includeScreenshot ??
		shouldIncludePageScreenshot(page, options.hasNavigated ?? true)
	const cacheEnabled = options.cacheEnabled ?? isObservationCacheEnabled()
	const pageSize = resolveElementPageSize()
	const fingerprint = await computePageFingerprint(page)
	const elementList = options.elementList ?? createDefaultInteractiveElementListState()
	const domCacheKey = `${buildDomCacheKey(fingerprint)}|e:${elementList.offset}`

	let elements
	let elementsPage
	let domCached = false

	if (cacheEnabled && options.cache?.hasDom(domCacheKey)) {
		;({ elements, elementsPage } = options.cache.getDom(domCacheKey))
		domCached = true
	} else {
		;({ elements, elementsPage } = await collectPageElements(page, {
			offset: elementList.offset,
			limit: pageSize,
		}))

		if (cacheEnabled && options.cache) {
			options.cache.setDom(domCacheKey, { elements, elementsPage })
		}
	}

	/** @type {PageObservation} */
	const observation = {
		url: page.url(),
		title: await page.title(),
		elements,
		elementsPage,
		pickedSelector: options.brain?.run?.pickedSelector ?? null,
		lastResult: brain.recall(constants.inputKey),
		tabs: await listAgentTabs(brain),
	}

	if (includeScreenshot) {
		observation.screenshot = await page.screenshot({
			encoding: 'base64',
			type: 'jpeg',
			fullPage: false,
		})
	}

	observation._cacheMeta = {
		domCacheKey,
		domCached,
		visionCached: false,
	}

	return observation
}

/**
 * @typedef {Object} EnrichObservationOptions
 * @property {AgentObservationCache} [cache]
 * @property {boolean} [cacheEnabled]
 * @property {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} [brain]
 */

/**
 * @param {PageObservation} observation
 * @param {import('./OllamaClient.js').default} client
 * @param {EnrichObservationOptions} [options]
 */
export async function enrichObservationWithVision(observation, client, options = {}) {
	const cacheEnabled = options.cacheEnabled ?? isObservationCacheEnabled()
	const cacheMeta = observation._cacheMeta

	delete observation._cacheMeta

	if (!observation.screenshot || !client.visionModel) {
		delete observation.screenshot
		return observation
	}

	const visionCacheKey = cacheMeta
		? buildVisionCacheKey(cacheMeta.domCacheKey, observation.screenshot)
		: null

	if (visionCacheKey && cacheEnabled && options.cache?.hasVision(visionCacheKey)) {
		observation.visualSummary = options.cache.getVision(visionCacheKey)
	} else {
		observation.visualSummary = await client.describePageScreenshot(observation.screenshot, {
			url: observation.url,
			title: observation.title,
		})

		if (cacheEnabled && options.cache) {
			options.cache.setVision(visionCacheKey, observation.visualSummary)
		}
	}

	delete observation.screenshot

	return observation
}
