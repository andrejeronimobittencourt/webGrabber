import test from 'node:test'
import assert from 'node:assert'
import {
	findElementsByText,
	formatElementsPageForModel,
	formatObservationForModel,
	formatObservationTabs,
} from '../../src/agent/agentObservationFormat.js'

test('formatElementsPageForModel exposes page and nextOffset', () => {
	const formatted = formatElementsPageForModel({
		offset: 25,
		limit: 25,
		total: 80,
		pageIndex: 1,
		totalPages: 4,
		hasMore: true,
	})

	assert.deepStrictEqual(formatted, {
		page: 2,
		totalPages: 4,
		totalElements: 80,
		hasMore: true,
		nextOffset: 50,
	})
})

test('formatObservationForModel omits empty lastResult and blank tabs', () => {
	const formatted = formatObservationForModel({
		url: 'https://example.com',
		title: 'Example',
		elements: [{ selector: 'h1', text: 'Hello', interactable: false }],
		elementsPage: {
			offset: 0,
			limit: 25,
			total: 1,
			pageIndex: 0,
			totalPages: 1,
			hasMore: false,
		},
		lastResult: {},
		pickedSelector: null,
		tabs: {
			activeTabKey: 'tab-1',
			tabs: [
				{ tabKey: 'tab-1', url: 'about:blank', title: '', active: true },
			],
		},
	})

	assert.strictEqual(formatted.lastResult, undefined)
	assert.strictEqual(formatted.pickedSelector, undefined)
	assert.strictEqual(formatted.tabs, undefined)
	assert.deepStrictEqual(formatted.elementsPage, {
		page: 1,
		totalPages: 1,
		totalElements: 1,
		hasMore: false,
		nextOffset: null,
	})
})

test('formatObservationTabs keeps multiple meaningful tabs', () => {
	const formatted = formatObservationTabs({
		activeTabKey: 'tab-2',
		tabs: [
			{ tabKey: 'tab-1', url: 'https://example.com', title: 'A', active: false },
			{ tabKey: 'tab-2', url: 'https://example.org', title: 'B', active: true },
		],
	})

	assert.strictEqual(formatted?.tabs.length, 2)
})

test('findElementsByText matches case-insensitively', () => {
	const elements = [
		{ selector: 'a.one', text: 'Portugal', interactable: true },
		{ selector: 'a.two', text: 'Spain', interactable: true },
	]

	assert.deepStrictEqual(findElementsByText(elements, 'port'), [elements[0]])
})
