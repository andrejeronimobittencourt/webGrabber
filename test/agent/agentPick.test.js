import test from 'node:test'
import assert from 'node:assert'
import { mustPickBeforeAnswer } from '../../src/agent/agentEnvironment.js'

test('mustPickBeforeAnswer requires pick after navigate when exporting', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'navigate', params: { url: 'https://example.com' } }], null, true),
		true,
	)
})

test('mustPickBeforeAnswer skips pick requirement outside export mode', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'navigate', params: { url: 'https://example.com' } }], null, false),
		false,
	)
})

test('mustPickBeforeAnswer allows answer after getElements without pick', () => {
	assert.strictEqual(
		mustPickBeforeAnswer(
			[
				{ action: 'navigate', params: { url: 'https://example.com' } },
				{ action: 'getElements', params: { selector: 'h1' } },
			],
			null,
			true,
		),
		false,
	)
})

test('mustPickBeforeAnswer clears once a pick is active', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'navigate', params: { url: 'https://example.com' } }], 'h1', true),
		false,
	)
})

test('mustPickBeforeAnswer allows answers without navigate', () => {
	assert.strictEqual(mustPickBeforeAnswer([], null, true), false)
})
