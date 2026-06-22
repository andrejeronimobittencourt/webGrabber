import test from 'node:test'
import assert from 'node:assert'
import {
	AGENT_ONLY_EXPORT_ACTIONS,
	AGENT_QUIET_TOOLS,
	PICK_CONSUMING_ACTIONS,
	shouldRefreshKnownSelectorsAfterTool,
} from '../../src/agent/agentConfig.js'

test('agent tool catalog keeps pickElement export-only and quiet', () => {
	assert.strictEqual(AGENT_ONLY_EXPORT_ACTIONS.has('pickElement'), true)
	assert.strictEqual(AGENT_QUIET_TOOLS.has('pickElement'), true)
	assert.strictEqual(PICK_CONSUMING_ACTIONS.has('pickElement'), false)
})

test('agent tool catalog treats click as pick-consuming', () => {
	assert.strictEqual(PICK_CONSUMING_ACTIONS.has('click'), true)
	assert.strictEqual(AGENT_ONLY_EXPORT_ACTIONS.has('click'), false)
})

test('shouldRefreshKnownSelectorsAfterTool refreshes after navigation, not after type', () => {
	assert.strictEqual(shouldRefreshKnownSelectorsAfterTool('navigate'), true)
	assert.strictEqual(shouldRefreshKnownSelectorsAfterTool('click'), true)
	assert.strictEqual(shouldRefreshKnownSelectorsAfterTool('pressKey'), true)
	assert.strictEqual(shouldRefreshKnownSelectorsAfterTool('type'), false)
	assert.strictEqual(shouldRefreshKnownSelectorsAfterTool('paginateElements'), false)
})
