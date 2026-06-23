import test from 'node:test'
import assert from 'node:assert'
import {
	safeAgentPageUrl,
	waitForAgentPageSettle,
} from '../../src/agent/waitForAgentPageSettle.js'

test('safeAgentPageUrl returns unknown when page.url throws', async () => {
	const page = {
		url() {
			throw new Error('Execution context was destroyed, most likely because of a navigation.')
		},
	}

	assert.strictEqual(await safeAgentPageUrl(page), 'unknown')
})

test('waitForAgentPageSettle retries through destroyed execution contexts', async () => {
	let waitCalls = 0
	const page = {
		async waitForFunction() {
			waitCalls += 1

			if (waitCalls < 3) {
				throw new Error('Execution context was destroyed, most likely because of a navigation.')
			}
		},
	}

	await waitForAgentPageSettle(page, { timeout: 2_000 })

	assert.ok(waitCalls >= 3)
})
