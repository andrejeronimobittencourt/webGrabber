import test from 'node:test'
import assert from 'node:assert'
import AgentObservationCache from '../../src/agent/AgentObservationCache.js'
import {
	enrichObservationWithVision,
	observePage,
} from '../../src/agent/observePage.js'

function createSnapshotEvaluate(options = {}) {
	const {
		elements = [{ selector: 'input[name="q"]', text: 'Search', interactable: true }],
		domSignature = '1|INPUT:q:Search',
		onCollect,
	} = options

	return async (fn) => {
		const src = String(fn)

		if (src.includes('domSignature') || src.includes('collectSelector')) {
			onCollect?.()

			return {
				scrollX: 0,
				scrollY: 0,
				domSignature,
				elements,
			}
		}

		return { scrollX: 0, scrollY: 0, domSignature: '0', elements: [] }
	}
}

test('observePage reuses pageSnapshotCache for unchanged fingerprint', async () => {
	let collectCalls = 0
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		evaluate: createSnapshotEvaluate({
			onCollect: () => {
				collectCalls += 1
			},
		}),
		async screenshot() {
			return 'viewport-shot'
		},
	}

	const brain = { recall: () => null, run: { pageSnapshotCache: null } }

	const first = await observePage(page, brain, { includeScreenshot: false })
	const cachedElements = brain.run.pageSnapshotCache?.elements

	const second = await observePage(page, brain, { includeScreenshot: false })

	assert.strictEqual(collectCalls, 2)
	assert.strictEqual(brain.run.pageSnapshotCache?.elements, cachedElements)
	assert.deepStrictEqual(first.elements, second.elements)
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
