import { v4 as uuidv4 } from 'uuid'
import { adoptAgentPage } from './AgentTabSync.js'
import { safePageTitle, tryBringToFront } from './agentPageHelpers.js'
import { safeAgentPageUrl } from './waitForAgentPageSettle.js'

/**
 * @typedef {Object} AgentTabSnapshot
 * @property {string} tabKey
 * @property {string} url
 * @property {string} title
 * @property {boolean} active
 */

/**
 * @typedef {Object} AgentTabsSnapshot
 * @property {string | null} activeTabKey
 * @property {AgentTabSnapshot[]} tabs
 */

/**
 * Register any open browser tabs that are not yet tracked on the brain.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 */
export async function refreshAgentTabRegistry(brain) {
	const activePage = brain.browser?.activePage

	if (!activePage) {
		return
	}

	const openPages = await activePage.browser().pages()
	const pages = { ...(brain.browser.pages ?? {}) }
	const tracked = new Set(Object.values(pages))

	for (const page of openPages) {
		if (!tracked.has(page)) {
			pages[`agent-${uuidv4()}`] = page
			tracked.add(page)
		}
	}

	brain.browser.pages = pages
}

/**
 * List open tabs with URLs, titles, and the active tab key.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<AgentTabsSnapshot>}
 */
export async function listAgentTabs(brain) {
	const activePage = brain.browser?.activePage

	if (!activePage) {
		return { activeTabKey: null, tabs: [] }
	}

	await refreshAgentTabRegistry(brain)

	const pages = brain.browser.pages ?? {}
	/** @type {AgentTabSnapshot[]} */
	const tabs = []
	let activeTabKey = null

	for (const [tabKey, page] of Object.entries(pages)) {
		if (!page) {
			continue
		}

		const active = page === activePage

		if (active) {
			activeTabKey = tabKey
		}

		let title = await safePageTitle(page)

		tabs.push({
			tabKey,
			url: await safeAgentPageUrl(page),
			title,
			active,
		})
	}

	return { activeTabKey, tabs }
}

/**
 * Switch the agent to a previously opened tab.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {string} tabKey
 * @returns {Promise<AgentTabSnapshot>}
 */
export async function switchAgentTab(brain, tabKey) {
	await refreshAgentTabRegistry(brain)

	const page = brain.browser.pages?.[tabKey]

	if (!page) {
		throw new Error(
			`Tab "${tabKey}" was not found. Call listTabs or read tabs from the observation to see open tabKey values.`,
		)
	}

	await adoptAgentPage(brain, page)

	return {
		tabKey,
		url: await safeAgentPageUrl(page),
		title: await safePageTitle(page),
		active: true,
	}
}
