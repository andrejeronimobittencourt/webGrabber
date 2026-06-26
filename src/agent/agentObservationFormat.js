import { AGENT_BLANK_PAGE_URLS } from './observePage.js'

/** @typedef {import('./observePage.js').PageObservation} PageObservation */
/** @typedef {import('./observePage.js').PageElement} PageElement */


/**
 * @param {import('./agentTabs.js').AgentTabsSnapshot | undefined} tabs
 * @returns {import('./agentTabs.js').AgentTabsSnapshot | undefined}
 */
export function formatObservationTabs(tabs) {
	if (!tabs?.tabs?.length) {
		return undefined
	}

	const meaningfulTabs = tabs.tabs.filter(
		(tab) => tab.active || !AGENT_BLANK_PAGE_URLS.has(tab.url),
	)

	if (meaningfulTabs.length <= 1) {
		const active = meaningfulTabs.find((tab) => tab.active) ?? meaningfulTabs[0]

		if (!active || AGENT_BLANK_PAGE_URLS.has(active.url)) {
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
	const elements = [...(observation.elements ?? [])].sort(
		(left, right) => Number(right.interactable) - Number(left.interactable),
	)

	/** @type {Record<string, unknown>} */
	const formatted = {
		url: observation.url,
		title: observation.title,
		elements,
	}

	if (observation.elementsPage) {
		formatted.elementsPage = formatElementsPageForModel(observation.elementsPage)
	}

	if (observation.visualSummary) {
		formatted.visualSummary = observation.visualSummary
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
