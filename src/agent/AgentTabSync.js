import { v4 as uuidv4 } from 'uuid'

/** @type {WeakMap<import('puppeteer').Browser, (target: import('puppeteer').Target) => Promise<void>>} */
const browserListeners = new WeakMap()

/** @type {WeakSet<import('puppeteer').Page>} */
const popupBoundPages = new WeakSet()

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

	try {
		await page.bringToFront()
	} catch {
		// Tab may still be loading.
	}
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
