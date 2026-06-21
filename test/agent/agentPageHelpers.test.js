import test from 'node:test'
import assert from 'node:assert'
import { safePageTitle, tryBringToFront } from '../../src/agent/agentPageHelpers.js'

test('tryBringToFront ignores bringToFront failures', async () => {
	await tryBringToFront({
		async bringToFront() {
			throw new Error('Target closed')
		},
	})
})

test('safePageTitle returns empty string when title fails', async () => {
	const title = await safePageTitle({
		async title() {
			throw new Error('Target closed')
		},
	})

	assert.strictEqual(title, '')
})
