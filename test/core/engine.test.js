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

test('Engine.addCustomAction rejects importable names that collide with built-in agent tools', () => {
	const engine = new Engine()
	assert.throws(
		() =>
			engine.addCustomAction('navigate', async () => {}, {
				importable: true,
			}),
		/collides with a built-in agent tool/,
	)
})

test('Engine.listImportableCustomActions returns importable registrations only', () => {
	const engine = new Engine()
	engine.addCustomAction('localOnly', async () => {})
	engine.addCustomAction(
		'agentHelper',
		async () => {},
		{
			importable: true,
			description: 'Helper action',
		},
	)

	assert.deepStrictEqual(engine.listImportableCustomActions(), [
		{
			name: 'agentHelper',
			description: 'Helper action',
			parameters: undefined,
		},
	])
})
