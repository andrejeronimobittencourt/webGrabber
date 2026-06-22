import { v4 as uuidv4 } from 'uuid'
import { safeAgentPageUrl } from './waitForAgentPageSettle.js'

/** @type {WeakMap<import('puppeteer').Browser, (target: import('puppeteer').Target) => Promise<void>>} */
const browserListeners = new WeakMap()

/** @type {WeakSet<import('puppeteer').Page>} */
const popupBoundPages = new WeakSet()

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
 * @param {import('puppeteer').Page} page
 */
async function tryBringToFront(page) {
	try {
		await page.bringToFront()
	} catch {}
}

/**
 * @param {import('puppeteer').Page} page
 * @returns {Promise<string>}
 */
async function safePageTitle(page) {
	try {
		return await page.title()
	} catch {
		return ''
	}
}

/**
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {import('puppeteer').Page} page
 */
function bindPagePopupListener(brain, page) {
	if (popupBoundPages.has(page)) {
		return
	}

	popupBoundPages.add(page)
	page.on('popup', async (popup) => {
		await adoptAgentPage(brain, popup)
	})
}

/**
 * Register a tab on the brain and make it the active agent page.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {import('puppeteer').Page} page
 */
export async function adoptAgentPage(brain, page) {
	const pages = brain.browser.pages ?? {}
	const isTracked = Object.values(pages).some((tracked) => tracked === page)

	if (!isTracked) {
		pages[`agent-${uuidv4()}`] = page
		brain.browser.pages = pages
	}

	brain.browser.activePage = page
	bindPagePopupListener(brain, page)
	await tryBringToFront(page)
}

/**
 * Detect browser tabs opened during an action and follow the newest untracked page.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @returns {Promise<import('puppeteer').Page | undefined>}
 */
export async function syncAgentBrowserTabs(brain) {
	const current = brain.browser.activePage

	if (!current) {
		return current
	}

	const openPages = await current.browser().pages()
	const tracked = new Set(Object.values(brain.browser.pages ?? {}))
	const untrackedPages = openPages.filter((page) => !tracked.has(page))

	if (untrackedPages.length === 0) {
		return brain.browser.activePage
	}

	const newestPage = untrackedPages[untrackedPages.length - 1]
	await adoptAgentPage(brain, newestPage)

	return newestPage
}

/**
 * Follow popups and tabs opened by the active page during agent runs.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {import('puppeteer').Browser} browser
 */
export function bindAgentTabSync(brain, browser) {
	if (browserListeners.has(browser)) {
		return
	}

	const activePage = brain.browser.activePage

	if (activePage) {
		const pages = brain.browser.pages ?? {}
		const isTracked = Object.values(pages).some((tracked) => tracked === activePage)

		if (!isTracked) {
			pages.default = activePage
			brain.browser.pages = pages
		}

		bindPagePopupListener(brain, activePage)
	}

	/** @param {import('puppeteer').Target} target */
	const onTargetCreated = async (target) => {
		if (target.type() !== 'page') {
			return
		}

		const page = await target.page()

		if (!page) {
			return
		}

		const tracked = Object.values(brain.browser.pages ?? {})

		if (tracked.includes(page)) {
			return
		}

		await adoptAgentPage(brain, page)
	}

	browser.on('targetcreated', onTargetCreated)
	browserListeners.set(browser, onTargetCreated)
}

/**
 * @param {import('puppeteer').Browser} browser
 */
export function unbindAgentTabSync(browser) {
	const listener = browserListeners.get(browser)

	if (listener) {
		browser.off('targetcreated', listener)
		browserListeners.delete(browser)
	}
}

/**
 * Register any open browser tabs that are not yet tracked on the brain.
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 */
async function refreshAgentTabRegistry(brain) {
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

		tabs.push({
			tabKey,
			url: await safeAgentPageUrl(page),
			title: await safePageTitle(page),
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
		throw new Error(`Tab "${tabKey}" was not found.`)
	}

	await adoptAgentPage(brain, page)

	return {
		tabKey,
		url: await safeAgentPageUrl(page),
		title: await safePageTitle(page),
		active: true,
	}
}
