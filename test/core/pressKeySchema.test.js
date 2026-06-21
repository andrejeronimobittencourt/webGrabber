import test from 'node:test'
import assert from 'node:assert'
import { validateActionParams } from '../../packages/core/schemas/actionSchemas.js'

test('pressKey accepts allowed keys', () => {
	const params = validateActionParams('pressKey', { key: 'Enter', selector: 'input[name="q"]' })

	assert.deepStrictEqual(params, { key: 'Enter', selector: 'input[name="q"]' })
})

test('pressKey rejects unknown keys', () => {
	assert.throws(
		() => validateActionParams('pressKey', { key: 'Meta' }),
		/Invalid parameters for action "pressKey"/,
	)
})
