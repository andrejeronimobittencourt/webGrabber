import test from 'node:test'
import assert from 'node:assert'
import {
	attachPageVisionDescription,
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
	}

	const brain = { recall: () => null, run: { pageSnapshotCache: null, pageVisionCache: null } }

	const first = await observePage(page, brain)
	const cachedElements = brain.run.pageSnapshotCache?.elements

	const second = await observePage(page, brain)

	assert.strictEqual(collectCalls, 2)
	assert.strictEqual(brain.run.pageSnapshotCache?.elements, cachedElements)
	assert.deepStrictEqual(first.elements, second.elements)
})

test('attachPageVisionDescription reuses cached page description for unchanged fingerprint', async () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'true'

	try {
		let visionCalls = 0
		const page = {
			url: () => 'https://example.com',
			async title() {
				return 'Example'
			},
			evaluate: createSnapshotEvaluate(),
			async screenshot() {
				return 'viewport-image'
			},
		}
		const brain = { recall: () => null, run: { pageSnapshotCache: null, pageVisionCache: null } }
		const client = {
			visionModel: 'mock-vision',
			async describePageView() {
				visionCalls += 1
				return 'Example search page.'
			},
		}

		const observation = await observePage(page, brain)

		await attachPageVisionDescription(page, brain, observation, client, { hasNavigated: true })
		await attachPageVisionDescription(page, brain, observation, client, { hasNavigated: true })

		assert.strictEqual(visionCalls, 1)
		assert.strictEqual(observation.visualSummary, 'Example search page.')
		assert.strictEqual(brain.run.pageVisionCache?.description, 'Example search page.')
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})
