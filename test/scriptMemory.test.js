import test from 'node:test'
import assert from 'node:assert'
import ScriptMemory from '../src/core/brain/ScriptMemory.js'
import constants from '../src/utils/constants.js'

test('ScriptMemory clones objects on learn', () => {
	const memory = new ScriptMemory()
	const source = { nested: { count: 1 } }

	memory.learn('OBJ', source)
	source.nested.count = 2

	assert.strictEqual(memory.recall('OBJ').nested.count, 1)
})

test('ScriptMemory sync loads env memories', () => {
	const memory = new ScriptMemory()

	memory.sync(new Map([['TARGET_URL', 'https://example.com']]))

	assert.strictEqual(memory.recall('TARGET_URL'), 'https://example.com')
})

test('ScriptMemory stores INPUT pipe separately from runtime state', () => {
	const memory = new ScriptMemory()

	memory.learn(constants.inputKey, 'page title')

	assert.strictEqual(memory.recall(constants.inputKey), 'page title')
})
