import test from 'node:test'
import assert from 'node:assert'
import {
	buildElementsPageMeta,
	collectInteractiveElements,
	isAgentPreNavigatePageUrl,
	paginateElements,
	observePage,
	shouldIncludePageScreenshot,
} from '../../src/agent/observePage.js'

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
		async evaluate(fn, args) {
			browserCollector = fn

			return { elements: [], total: 0 }
		},
	}

	await collectInteractiveElements(page)

	assert.ok(browserCollector)
	assert.match(String(browserCollector), /document\.body/)
	assert.match(String(browserCollector), /isCollectableBodyElement/)
	assert.match(String(browserCollector), /script, style, noscript, template, head/)
	assert.match(String(browserCollector), /readableSelector/)
})

test('collectInteractiveElements returns paginated elements with selectors', async () => {
	const page = {
		async evaluate(_fn, { elementOffset, elementLimit }) {
			const all = Array.from({ length: 5 }, (_, index) => ({
				selector: `#item-${index}`,
				text: `Item ${index}`,
			}))

			return {
				elements: all.slice(elementOffset, elementOffset + elementLimit),
				total: all.length,
			}
		},
	}

	const result = await collectInteractiveElements(page, { offset: 2, limit: 2 })

	assert.strictEqual(result.elements.length, 2)
	assert.strictEqual(result.elements[0].selector, '#item-2')
	assert.strictEqual(result.elementsPage.pageIndex, 1)
	assert.strictEqual(result.elementsPage.totalPages, 3)
	assert.strictEqual(result.elementsPage.total, 5)
	assert.strictEqual(result.elementsPage.hasMore, true)
})

test('paginateElements defaults offset to 0', async () => {
	const page = {
		async evaluate(_fn, { elementOffset, elementLimit }) {
			assert.strictEqual(elementOffset, 0)
			assert.strictEqual(elementLimit, 25)

			return { elements: [], total: 0 }
		},
	}

	const result = await paginateElements(page, {})

	assert.strictEqual(result.offset, 0)
	assert.strictEqual(result.elements.length, 0)
	assert.strictEqual(result.elementsPage.pageIndex, 0)
})

test('paginateElements rejects a negative offset', async () => {
	const page = { async evaluate() {} }

	await assert.rejects(() => paginateElements(page, { offset: -1 }), /non-negative integer/)
})

test('observePage returns a single elements list', async () => {
	let fingerprintStep = 0
	const page = {
		url: () => 'https://example.com',
		async title() {
			return 'Example'
		},
		async evaluate(_fn, args) {
			if (typeof args?.elementOffset === 'number') {
				return {
					elements: [
						{ selector: 'textarea[name="q"]', text: '' },
						{ selector: 'h1', text: 'Example Domain' },
					],
					total: 2,
				}
			}

			fingerprintStep += 1
			if (fingerprintStep % 2 === 1) {
				return { scrollX: 0, scrollY: 0 }
			}

			return '2|TEXTAREA:q:|H1::Example Domain'
		},
	}

	const observation = await observePage(page, { recall: () => null }, {
		includeScreenshot: false,
	})

	assert.deepStrictEqual(observation.elements, [
		{ selector: 'textarea[name="q"]', text: '' },
		{ selector: 'h1', text: 'Example Domain' },
	])
	assert.strictEqual(observation.visibleElements, undefined)
})

test('shouldIncludePageScreenshot skips vision on pre-navigate blank pages', () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'true'

	try {
		const blankPage = { url: () => 'about:blank' }
		const livePage = { url: () => 'https://example.com' }

		assert.strictEqual(isAgentPreNavigatePageUrl('about:blank'), true)
		assert.strictEqual(shouldIncludePageScreenshot(blankPage, false), false)
		assert.strictEqual(shouldIncludePageScreenshot(blankPage, true), true)
		assert.strictEqual(shouldIncludePageScreenshot(livePage, false), true)
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})

test('observePage skips screenshot before first navigate', async () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'true'

	try {
		let screenshotCalls = 0
		let fingerprintStep = 0
		const page = {
			url: () => 'about:blank',
			async title() {
				return ''
			},
			async evaluate(_fn, args) {
				if (args && typeof args.elementOffset === 'number') {
					return { elements: [], total: 0 }
				}

				fingerprintStep += 1
				if (fingerprintStep % 2 === 1) {
					return { scrollX: 0, scrollY: 0 }
				}

				return '0'
			},
			async screenshot() {
				screenshotCalls += 1
				return 'viewport-shot'
			},
		}

		await observePage(page, { recall: () => null }, { hasNavigated: false, includeScreenshot: undefined })

		assert.strictEqual(screenshotCalls, 0)
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})
