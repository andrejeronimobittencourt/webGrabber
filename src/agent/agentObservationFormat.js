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
 * Model-facing pagination summary for the current HTML chunk.
 * @param {PageObservation['htmlPage']} htmlPage
 */
export function formatHtmlPageForModel(htmlPage) {
	return {
		page: htmlPage.pageIndex + 1,
		totalPages: htmlPage.totalPages,
		totalLength: htmlPage.total,
		hasMore: htmlPage.hasMore,
		nextOffset: htmlPage.hasMore ? htmlPage.offset + htmlPage.limit : null,
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
		html: observation.html,
	}

	if (observation.htmlPage) {
		formatted.htmlPage = formatHtmlPageForModel(observation.htmlPage)
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
