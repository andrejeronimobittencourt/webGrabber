import test from 'node:test'
import assert from 'node:assert'
import { safePageUrl } from '../packages/core/utils/safePageUrl.js'

test('safePageUrl returns the page URL when available', () => {
	const page = { url: () => 'https://example.com' }

	assert.strictEqual(safePageUrl(page), 'https://example.com')
})

test('safePageUrl returns unknown when page.url throws', () => {
	const page = {
		url() {
			throw new Error('Execution context was destroyed')
		},
	}

	assert.strictEqual(safePageUrl(page), 'unknown')
})
