import test from 'node:test'
import assert from 'node:assert'
import AgentObservationCache from '../../src/agent/AgentObservationCache.js'
import {
	enrichObservationWithVision,
	observePage,
} from '../../src/agent/observePage.js'

test('observePage reuses cached DOM cheatsheet for unchanged fingerprint', async () => {
	let interactiveCollectCalls = 0
	let visibleCollectCalls = 0
	let fingerprintStep = 0
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		async evaluate(_fn, args) {
			if (args?.collectionMode === 'interactive') {
				interactiveCollectCalls += 1
				return {
					elements: [
						{
							index: 0,
							selector: 'input[name="q"]',
							tag: 'input',
							text: 'Search',
							href: null,
							type: 'search',
							name: 'q',
							id: null,
						},
					],
					total: 1,
				}
			}

			if (args?.collectionMode === 'tags') {
				visibleCollectCalls += 1
				return { elements: [], total: 0 }
			}

			fingerprintStep += 1
			if (fingerprintStep % 2 === 1) {
				return { scrollX: 0, scrollY: 0 }
			}

			return '1|INPUT:q:Search'
		},
		async screenshot() {
			return 'viewport-shot'
		},
	}

	const cache = new AgentObservationCache()
	const brain = { recall: () => null }

	await observePage(page, brain, { cache, cacheEnabled: true, includeScreenshot: false })
	await observePage(page, brain, { cache, cacheEnabled: true, includeScreenshot: false })

	assert.strictEqual(interactiveCollectCalls, 1)
	assert.strictEqual(visibleCollectCalls, 2)
})

test('enrichObservationWithVision reuses cached visual summary', async () => {
	const cache = new AgentObservationCache()
	let visionCalls = 0
	const client = {
		visionModel: 'mock-vision',
		async describePageScreenshot() {
			visionCalls += 1
			return 'Viewport summary.'
		},
	}

	await enrichObservationWithVision(
		{
			url: 'https://example.com',
			title: 'Example',
			screenshot: 'viewport-shot',
			_cacheMeta: {
				domCacheKey: 'dom-key',
				domCached: false,
				visionCached: false,
			},
		},
		client,
		{ cache, cacheEnabled: true },
	)

	await enrichObservationWithVision(
		{
			url: 'https://example.com',
			title: 'Example',
			screenshot: 'viewport-shot',
			_cacheMeta: {
				domCacheKey: 'dom-key',
				domCached: true,
				visionCached: false,
			},
		},
		client,
		{ cache, cacheEnabled: true },
	)

	assert.strictEqual(visionCalls, 1)
})
