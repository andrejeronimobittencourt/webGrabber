import test from 'node:test'
import assert from 'node:assert'
import {
	DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL,
	mapAgentToolToEngineAction,
} from '../../src/agent/AgentToolMapper.js'

test('mapAgentToolToEngineAction defaults navigate waitUntil', () => {
	const mapped = mapAgentToolToEngineAction('navigate', { url: 'https://example.com' })

	assert.deepStrictEqual(mapped, {
		action: 'puppeteer',
		params: {
			func: 'goto',
			url: 'https://example.com',
			options: { waitUntil: DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL },
		},
	})
})

test('mapAgentToolToEngineAction preserves explicit navigate waitUntil', () => {
	const mapped = mapAgentToolToEngineAction('navigate', {
		url: 'https://example.com',
		waitUntil: 'networkidle0',
	})

	assert.deepStrictEqual(mapped.params.options, { waitUntil: 'networkidle0' })
})

test('mapAgentToolToEngineAction passes through non-navigate tools', () => {
	const params = { selector: 'h1' }
	const mapped = mapAgentToolToEngineAction('getElements', params)

	assert.deepStrictEqual(mapped, {
		action: 'getElements',
		params,
	})
})
