import test from 'node:test'
import assert from 'node:assert'
import { refreshKnownSelectorsFromPage } from '../../src/agent/observePage.js'

function createSnapshotEvaluate(elements = []) {
	return async (fn) => {
		const src = String(fn)

		if (src.includes('domSignature') || src.includes('collectSelector')) {
			return {
				scrollX: 0,
				scrollY: 0,
				domSignature: '1|INPUT:search:',
				elements,
			}
		}

		return { scrollX: 0, scrollY: 0, domSignature: '0', elements: [] }
	}
}

test('refreshKnownSelectorsFromPage rebuilds knownSelectors from the live page', async () => {
	const knownSelectors = new Set(['stale'])
	const page = {
		url: () => 'https://example.com',
		evaluate: createSnapshotEvaluate([{ selector: 'input.search', text: '', interactable: true }]),
	}

	await refreshKnownSelectorsFromPage(page, {
		run: { elementList: { offset: 0 }, pageSnapshotCache: null },
	}, knownSelectors)

	assert.strictEqual(knownSelectors.has('input.search'), true)
	assert.strictEqual(knownSelectors.has('stale'), false)
})
