import test from 'node:test'
import assert from 'node:assert'
import { mustPickBeforeAnswer, PICK_CONTEXT_ACTIONS } from '../../src/agent/agentPick.js'

test('mustPickBeforeAnswer requires a pick after selector-context actions', () => {
	assert.strictEqual(
		mustPickBeforeAnswer(
			[
				{ action: 'navigate', params: { url: 'https://example.com' } },
				{ action: 'getElements', params: { selector: 'h1' } },
			],
			null,
		),
		true,
	)
})

test('mustPickBeforeAnswer requires a pick after navigate', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'navigate', params: { url: 'https://example.com' } }], null, {
			hasNavigated: true,
		}),
		true,
	)
})

test('mustPickBeforeAnswer allows pre-navigate answers without a pick', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'navigate', params: { url: 'https://example.com' } }], null),
		false,
	)
})

test('mustPickBeforeAnswer clears once a pick is active', () => {
	assert.strictEqual(
		mustPickBeforeAnswer([{ action: 'getElements', params: { selector: 'h1' } }], 'h1'),
		false,
	)
})

test('PICK_CONTEXT_ACTIONS includes paginateVisibleElements', () => {
	assert.strictEqual(PICK_CONTEXT_ACTIONS.has('paginateVisibleElements'), true)
})
