import test from 'node:test'
import assert from 'node:assert'
import { refreshKnownSelectorsFromPage } from '../../src/agent/observePage.js'

test('refreshKnownSelectorsFromPage rebuilds knownSelectors from the live page', async () => {
	const knownSelectors = new Set(['stale'])
	const page = {
		evaluate: async () => ({
			elements: [{ selector: 'input.search', text: '' }],
			total: 1,
		}),
	}

	await refreshKnownSelectorsFromPage(page, {
		run: { elementList: { offset: 0 } },
	}, knownSelectors)

	assert.strictEqual(knownSelectors.has('input.search'), true)
	assert.strictEqual(knownSelectors.has('stale'), false)
})
