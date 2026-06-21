import test from 'node:test'
import assert from 'node:assert'
import {
	AGENT_ONLY_EXPORT_ACTIONS,
	AGENT_QUIET_TOOLS,
	PICK_CONSUMING_ACTIONS,
} from '../../src/agent/agentToolCatalog.js'

test('agent tool catalog keeps pickElement export-only and quiet', () => {
	assert.strictEqual(AGENT_ONLY_EXPORT_ACTIONS.has('pickElement'), true)
	assert.strictEqual(AGENT_QUIET_TOOLS.has('pickElement'), true)
	assert.strictEqual(PICK_CONSUMING_ACTIONS.has('pickElement'), false)
})

test('agent tool catalog treats click as pick-consuming', () => {
	assert.strictEqual(PICK_CONSUMING_ACTIONS.has('click'), true)
	assert.strictEqual(AGENT_ONLY_EXPORT_ACTIONS.has('click'), false)
})
