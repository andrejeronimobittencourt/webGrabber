import test from 'node:test'
import assert from 'node:assert'
import {
	buildElementsPageMeta,
	collectInteractiveElements,
	isAgentPreNavigatePageUrl,
	paginateElements,
	observePage,
	shouldAttachPageVision,
	shouldIncludePageScreenshot,
} from '../../src/agent/observePage.js'

function createSnapshotEvaluate(options = {}) {
	const { elements = [], domSignature = '0' } = options

	return async (fn) => {
		const src = String(fn)

		if (src.includes('domSignature') || src.includes('collectSelector')) {
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

function createBrain() {
	return { recall: () => null, run: { pageSnapshotCache: null, pageVisionCache: null } }
}

test('buildElementsPageMeta calculates totalPages and hasMore', () => {
	assert.deepStrictEqual(buildElementsPageMeta(312, 0, 100), {
		pageIndex: 0,
		totalPages: 4,
		pageSize: 100,
		offset: 0,
		limit: 100,
		total: 312,
		hasMore: true,
	})
})

test('buildElementsPageMeta handles empty totals', () => {
	assert.deepStrictEqual(buildElementsPageMeta(0, 0, 100), {
		pageIndex: 0,
		totalPages: 0,
		pageSize: 100,
		offset: 0,
		limit: 100,
		total: 0,
		hasMore: false,
	})
})

test('buildElementsPageMeta calculates pageIndex for later offsets', () => {
	const meta = buildElementsPageMeta(250, 200, 100)

	assert.strictEqual(meta.pageIndex, 2)
	assert.strictEqual(meta.totalPages, 3)
	assert.strictEqual(meta.hasMore, false)
})

test('collectInteractiveElements scopes collection to visible body content', async () => {
	/** @type {((args: object) => unknown) | null} */
	let browserCollector = null
	const page = {
		url: () => 'https://example.com',
		async evaluate(fn) {
			browserCollector = fn

			return { scrollX: 0, scrollY: 0, domSignature: '0', elements: [] }
		},
	}

	await collectInteractiveElements(page, createBrain())

	assert.ok(browserCollector)
	assert.match(String(browserCollector), /document\.body/)
	assert.match(String(browserCollector), /isCollectableBodyElement/)
	assert.match(String(browserCollector), /script, style, noscript, template, head/)
	assert.match(String(browserCollector), /readableSelector/)
})

test('collectInteractiveElements returns paginated elements with selectors', async () => {
	const page = {
		url: () => 'https://example.com',
		evaluate: createSnapshotEvaluate({
			elements: Array.from({ length: 5 }, (_, index) => ({
				selector: `#item-${index}`,
				text: `Item ${index}`,
				interactable: true,
			})),
		}),
	}

	const result = await collectInteractiveElements(page, createBrain(), { offset: 2, limit: 2 })

	assert.strictEqual(result.elements.length, 2)
	assert.strictEqual(result.elements[0].selector, '#item-2')
	assert.strictEqual(result.elementsPage.pageIndex, 1)
	assert.strictEqual(result.elementsPage.totalPages, 3)
	assert.strictEqual(result.elementsPage.total, 5)
	assert.strictEqual(result.elementsPage.hasMore, true)
})

test('paginateElements defaults offset to 0', async () => {
	const page = {
		url: () => 'https://example.com',
		evaluate: createSnapshotEvaluate({ elements: [] }),
	}
	const brain = createBrain()

	const result = await paginateElements(page, {}, brain)

	assert.strictEqual(result.offset, 0)
	assert.strictEqual(result.elements.length, 0)
	assert.strictEqual(result.elementsPage.pageIndex, 0)
})

test('paginateElements rejects a negative offset', async () => {
	const page = {
		url: () => 'https://example.com',
		evaluate: createSnapshotEvaluate({ elements: [] }),
	}
	const brain = createBrain()

	await assert.rejects(() => paginateElements(page, { offset: -1 }, brain), /non-negative integer/)
})

test('observePage returns a single elements list', async () => {
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		evaluate: createSnapshotEvaluate({
			domSignature: '2|TEXTAREA:q:|H1::Example Domain',
			elements: [
				{ selector: 'textarea[name="q"]', text: '', interactable: true },
				{ selector: 'h1', text: 'Example Domain', interactable: false },
			],
		}),
	}

	const observation = await observePage(page, createBrain(), {
		includeScreenshot: false,
	})

	assert.deepStrictEqual(observation.elements, [
		{ selector: 'textarea[name="q"]', text: '', interactable: true },
		{ selector: 'h1', text: 'Example Domain', interactable: false },
	])
})

test('shouldAttachPageVision skips pre-navigate blank pages', () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'true'

	try {
		const blankPage = { url: () => 'about:blank' }
		const livePage = { url: () => 'https://example.com' }

		assert.strictEqual(isAgentPreNavigatePageUrl('about:blank'), true)
		assert.strictEqual(shouldAttachPageVision(blankPage, false), false)
		assert.strictEqual(shouldAttachPageVision(blankPage, true), true)
		assert.strictEqual(shouldAttachPageVision(livePage, false), true)
		assert.strictEqual(shouldIncludePageScreenshot(blankPage, false), false)
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})

test('observePage does not attach visualSummary by itself', async () => {
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		evaluate: createSnapshotEvaluate(),
	}

	const observation = await observePage(page, createBrain())

	assert.strictEqual(observation.visualSummary, undefined)
})
