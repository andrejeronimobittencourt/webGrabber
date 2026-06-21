import test from 'node:test'
import assert from 'node:assert'
import Engine from '../../packages/core/Engine.js'

test('Engine.createBrain throws before init', () => {
	const engine = new Engine()
	assert.throws(() => engine.createBrain(), /Engine must be initialized/)
})

test('Engine.addCustomAction throws when action is not a function', () => {
	const engine = new Engine()
	assert.throws(
		() => engine.addCustomAction('bad', 'not-a-function'),
		/Action bad must be a function/,
	)
})

test('Engine.addCustomAction throws on duplicate registration', () => {
	const engine = new Engine()
	engine.addCustomAction('custom', async () => {})
	assert.throws(
		() => engine.addCustomAction('custom', async () => {}),
		/Action custom already exists/,
	)
})
