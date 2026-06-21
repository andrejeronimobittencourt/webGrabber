import test from 'node:test'
import assert from 'node:assert'
import {
	buildDynamicAgentTools,
	buildDynamicToolRegistry,
	sanitizeGrabToolName,
} from '../../src/agent/agentDynamicTools.js'

test('sanitizeGrabToolName prefixes and normalizes grab names', () => {
	assert.strictEqual(sanitizeGrabToolName('login-flow'), 'grab_login_flow')
})

test('buildDynamicAgentTools exposes importable grabs only from provided list', () => {
	const tools = buildDynamicAgentTools({
		grabs: [
			{
				name: 'login-flow',
				description: 'Log in',
				importable: true,
				parameters: {
					type: 'object',
					properties: {
						username: { type: 'string' },
					},
					required: ['username'],
					additionalProperties: false,
				},
			},
		],
		customActions: [
			{
				name: 'fetchToken',
				description: 'Fetch token',
				parameters: {
					type: 'object',
					properties: {},
					additionalProperties: false,
				},
			},
		],
	})

	assert.strictEqual(tools.length, 2)
	assert.strictEqual(tools[0].function.name, 'grab_login_flow')
	assert.strictEqual(tools[1].function.name, 'fetchToken')
})

test('buildDynamicToolRegistry maps tool names to grab and custom entries', () => {
	const grabs = [
		{
			name: 'login-flow',
			parameters: {
				type: 'object',
				properties: { username: { type: 'string' } },
				required: ['username'],
				additionalProperties: false,
			},
		},
	]
	const customActions = [
		{
			name: 'fetchToken',
			parameters: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
		},
	]
	const dynamicTools = buildDynamicAgentTools({ grabs, customActions })
	const registry = buildDynamicToolRegistry(dynamicTools, { grabs, customActions })

	assert.strictEqual(registry.get('grab_login_flow')?.kind, 'grab')
	assert.strictEqual(registry.get('grab_login_flow')?.grabName, 'login-flow')
	assert.strictEqual(registry.get('fetchToken')?.kind, 'custom')
})
