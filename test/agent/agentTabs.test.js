import test from 'node:test'
import assert from 'node:assert'
import { listAgentTabs, switchAgentTab } from '../../src/agent/agentTabs.js'

test('listAgentTabs returns tracked tabs with active flag', async () => {
	const searchPage = {
		url: () => 'https://duckduckgo.com/',
		async title() {
			return 'DuckDuckGo'
		},
		browser: () => browser,
	}
	const adPage = {
		url: () => 'https://ad.example.com/',
		async title() {
			return 'Ad'
		},
		bringToFront: async () => {},
		on() {},
		browser: () => browser,
	}
	const browser = {
		async pages() {
			return [searchPage, adPage]
		},
	}

	const brain = {
		browser: {
			pages: { default: searchPage },
			activePage: adPage,
		},
	}

	const snapshot = await listAgentTabs(brain)

	assert.strictEqual(snapshot.tabs.length, 2)
	assert.ok(snapshot.tabs.some((tab) => tab.tabKey === 'default' && tab.url.includes('duckduckgo')))
	assert.ok(snapshot.tabs.some((tab) => tab.tabKey.startsWith('agent-') && tab.url.includes('ad.example')))
	assert.strictEqual(snapshot.activeTabKey?.startsWith('agent-'), true)
})

test('switchAgentTab activates a previous tab by tabKey', async () => {
	const searchPage = {
		url: () => 'https://duckduckgo.com/',
		async title() {
			return 'DuckDuckGo'
		},
		bringToFront: async () => {},
		on() {},
	}
	const adPage = {
		url: () => 'https://ad.example.com/',
		async title() {
			return 'Ad'
		},
		bringToFront: async () => {},
		on() {},
		browser: () => ({
			async pages() {
				return [searchPage, adPage]
			},
		}),
	}
	const brain = {
		browser: {
			pages: { default: searchPage, 'agent-ad': adPage },
			activePage: adPage,
		},
	}

	const result = await switchAgentTab(brain, 'default')

	assert.strictEqual(brain.browser.activePage, searchPage)
	assert.strictEqual(result.tabKey, 'default')
	assert.strictEqual(result.active, true)
	assert.match(result.url, /duckduckgo/)
})

test('switchAgentTab rejects unknown tab keys', async () => {
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		browser: () => ({
			async pages() {
				return [page]
			},
		}),
	}
	const brain = {
		browser: {
			pages: { default: page },
			activePage: page,
		},
	}

	await assert.rejects(() => switchAgentTab(brain, 'missing-tab'), /not found/)
})
