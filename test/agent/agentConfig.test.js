import test from 'node:test'
import assert from 'node:assert'
import { resolveElementOffset } from '../../src/agent/agentConfig.js'

test('resolveElementOffset defaults missing values to 0', () => {
	assert.strictEqual(resolveElementOffset(undefined), 0)
	assert.strictEqual(resolveElementOffset(null), 0)
})

test('resolveElementOffset accepts zero', () => {
	assert.strictEqual(resolveElementOffset(0), 0)
})

test('resolveElementOffset rejects negative and non-integer values', () => {
	assert.throws(() => resolveElementOffset(-1), /non-negative integer/)
	assert.throws(() => resolveElementOffset(1.5), /non-negative integer/)
})
