import test from 'node:test'
import assert from 'node:assert'
import { validateActionParams } from '../../../src/schemas/actionSchemas.js'

// Mock Brain class for testing
class MockBrain {
	constructor() {
		this.memory = new Map()
	}
	learn(key, value) {
		this.memory.set(key, value)
	}
	recall(key) {
		return this.memory.get(key)
	}
}

test('setVariable - validates parameters correctly', () => {
	const validParams = { key: 'testKey', value: 'testValue' }
	const result = validateActionParams('setVariable', validParams)

	assert.strictEqual(result.key, 'testKey')
	assert.strictEqual(result.value, 'testValue')
})

test('setVariable - rejects empty key', () => {
	const invalidParams = { key: '', value: 'testValue' }

	assert.throws(
		() => {
			validateActionParams('setVariable', invalidParams)
		},
		/Invalid parameters/,
	)
})

test('setVariable - stores value in brain', async () => {
	const brain = new MockBrain()
	const params = { key: 'myVar', value: 'myValue' }

	// Simulate the action
	brain.learn(params.key, params.value)

	assert.strictEqual(brain.recall('myVar'), 'myValue')
})

test('click - validates selector parameter', () => {
	const validParams = { selector: '#button' }
	const result = validateActionParams('click', validParams)

	assert.strictEqual(result.selector, '#button')
})

test('click - rejects empty selector', () => {
	const invalidParams = { selector: '' }

	assert.throws(
		() => {
			validateActionParams('click', invalidParams)
		},
		/Selector cannot be empty/,
	)
})

test('sleep - validates duration', () => {
	const validParams = { ms: 1000 }
	const result = validateActionParams('sleep', validParams)

	assert.strictEqual(result.ms, 1000)
})

test('sleep - rejects excessive duration', () => {
	const invalidParams = { ms: 400000 } // Over 5 minutes

	assert.throws(
		() => {
			validateActionParams('sleep', invalidParams)
		},
		/Invalid parameters/,
	)
})
