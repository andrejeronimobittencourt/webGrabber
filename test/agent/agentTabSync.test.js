import test from 'node:test'
import assert from 'node:assert'
import {
	adoptAgentPage,
	bindAgentTabSync,
	syncAgentBrowserTabs,
	unbindAgentTabSync,
} from '../../src/agent/agentTabs.js'

test('adoptAgentPage registers and activates a new tab', async () => {
	const brain = {
		browser: {
			pages: { default: { id: 'default' } },
			activePage: { id: 'default', bringToFront: async () => {} },
		},
	}
	const newPage = {
		id: 'results',
		bringToFront: async () => {},
		on() {},
	}

	await adoptAgentPage(brain, newPage)

	assert.strictEqual(brain.browser.activePage, newPage)
	assert.ok(Object.values(brain.browser.pages).includes(newPage))
})

test('syncAgentBrowserTabs follows an untracked browser page', async () => {
	const defaultPage = {
		id: 'default',
		browser: () => browser,
	}
	const resultsPage = {
		id: 'results',
		bringToFront: async () => {},
		on() {},
	}
	const browser = {
		async pages() {
			return [defaultPage, resultsPage]
		},
		on() {},
		off() {},
	}
	defaultPage.browser = () => browser

	const brain = {
		browser: {
			pages: { default: defaultPage },
			activePage: defaultPage,
		},
	}

	await syncAgentBrowserTabs(brain)

	assert.strictEqual(brain.browser.activePage, resultsPage)
})

test('bindAgentTabSync adopts pages created via targetcreated', async () => {
	const defaultPage = {
		id: 'default',
		bringToFront: async () => {},
		on() {},
	}
	const browser = {
		/** @type {((target: { type: () => string, page: () => Promise<{ id: string, bringToFront: () => Promise<void>, on: () => void }> }) => Promise<void>) | null} */
		targetListener: null,
		on(_event, listener) {
			this.targetListener = listener
		},
		off(_event, listener) {
			if (this.targetListener === listener) {
				this.targetListener = null
			}
		},
	}
	const brain = {
		browser: {
			pages: { default: defaultPage },
			activePage: defaultPage,
		},
	}

	bindAgentTabSync(brain, browser)

	const popupPage = {
		id: 'popup',
		bringToFront: async () => {},
		on() {},
	}

	await browser.targetListener?.({
		type: () => 'page',
		page: async () => popupPage,
	})

	assert.strictEqual(brain.browser.activePage, popupPage)

	unbindAgentTabSync(browser)
	assert.strictEqual(browser.targetListener, null)
})
