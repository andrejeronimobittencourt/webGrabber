import test from 'node:test'
import assert from 'node:assert'
import { ActionList } from '../src/core/actions/ActionRegistry.js'
import { createTestBrain } from './helpers/createTestBrain.js'

test('ActionList allows serverBlocked action in CLI runs', async () => {
	const list = new ActionList()
	let ran = false
	list.add('cliOnly', async () => {
		ran = true
	}, { serverBlocked: true })

	const brain = createTestBrain()
	await list.run('cliOnly', brain, null)
	assert.strictEqual(ran, true)
})

test('ActionList rejects serverBlocked action when payloadId is set', async () => {
	const list = new ActionList()
	list.add('cliOnly', async () => {}, { serverBlocked: true })

	const brain = createTestBrain()
	brain.run.payloadId = 'req-1'

	await assert.rejects(
		() => list.run('cliOnly', brain, null),
		/\[cliOnly\] not available in server mode/,
	)
})

test('ActionList allows actions without serverBlocked flag in server runs', async () => {
	const list = new ActionList()
	let ran = false
	list.add('allowed', async () => {
		ran = true
	})

	const brain = createTestBrain()
	brain.run.payloadId = 'req-1'
	await list.run('allowed', brain, null)
	assert.strictEqual(ran, true)
})
