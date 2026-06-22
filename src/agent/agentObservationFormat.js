/** @typedef {import('./observePage.js').PageObservation} PageObservation */
/** @typedef {import('./observePage.js').PageElement} PageElement */

const BLANK_TAB_URLS = new Set(['about:blank', 'chrome://newtab/'])

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasMeaningfulLastResult(value) {
	if (value === null || value === undefined) {
		return false
	}

	if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
		return false
	}

	return true
}

/**
 * @param {import('./agentTabs.js').AgentTabsSnapshot | undefined} tabs
 * @returns {import('./agentTabs.js').AgentTabsSnapshot | undefined}
 */
export function formatObservationTabs(tabs) {
	if (!tabs?.tabs?.length) {
		return undefined
	}

	const meaningfulTabs = tabs.tabs.filter(
		(tab) => tab.active || !BLANK_TAB_URLS.has(tab.url),
	)

	if (meaningfulTabs.length <= 1) {
		const active = meaningfulTabs.find((tab) => tab.active) ?? meaningfulTabs[0]

		if (!active || BLANK_TAB_URLS.has(active.url)) {
			return undefined
		}

		return { activeTabKey: active.tabKey, tabs: [active] }
	}

	return {
		activeTabKey: tabs.activeTabKey,
		tabs: meaningfulTabs,
	}
}

/**
 * Model-facing pagination summary for the current elements slice.
 * @param {PageObservation['elementsPage']} elementsPage
 */
export function formatElementsPageForModel(elementsPage) {
	return {
		page: elementsPage.pageIndex + 1,
		totalPages: elementsPage.totalPages,
		totalElements: elementsPage.total,
		hasMore: elementsPage.hasMore,
		nextOffset: elementsPage.hasMore ? elementsPage.offset + elementsPage.limit : null,
	}
}

/**
 * Shrink and clarify the observation payload sent to the model.
 * @param {PageObservation} observation
 */
export function formatObservationForModel(observation) {
	/** @type {Record<string, unknown>} */
	const formatted = {
		url: observation.url,
		title: observation.title,
		elements: observation.elements,
	}

	if (observation.elementsPage) {
		formatted.elementsPage = formatElementsPageForModel(observation.elementsPage)
	}

	if (observation.visualSummary) {
		formatted.visualSummary = observation.visualSummary
	}

	if (hasMeaningfulLastResult(observation.lastResult)) {
		formatted.lastResult = observation.lastResult
	}

	const tabs = formatObservationTabs(observation.tabs)

	if (tabs) {
		formatted.tabs = tabs
	}

	if (observation.pickedSelector) {
		formatted.pickedSelector = observation.pickedSelector
	}

	return formatted
}

/**
 * Find elements whose visible text matches a query (case-insensitive).
 * @param {PageElement[]} elements
 * @param {string} text
 * @returns {PageElement[]}
 */
export function findElementsByText(elements, text) {
	const query = text.trim().toLowerCase()

	if (!query) {
		return []
	}

	return elements.filter((element) => element.text.toLowerCase().includes(query))
}
