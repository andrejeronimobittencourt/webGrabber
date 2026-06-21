import test from 'node:test'
import assert from 'node:assert'
import { buildAgentTools, listAgentToolNames } from '../../src/agent/ToolSchemaBuilder.js'
import { BUILTIN_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'

test('buildAgentTools returns OpenAI-compatible tool definitions', () => {
	const tools = buildAgentTools()

	assert.ok(tools.length > 0)
	for (const tool of tools) {
		assert.strictEqual(tool.type, 'function')
		assert.ok(tool.function.name)
		assert.ok(tool.function.description)
		assert.strictEqual(tool.function.parameters.type, 'object')
	}
})

test('listAgentToolNames includes navigate and blocks raw puppeteer', () => {
	const names = listAgentToolNames()

	assert.deepStrictEqual([...names].sort(), [...BUILTIN_AGENT_TOOL_NAMES].sort())
	assert.ok(names.includes('navigate'))
	assert.ok(!names.includes('puppeteer'))
	assert.ok(!names.includes('login'))
})

test('navigate tool requires url parameter', () => {
	const tools = buildAgentTools()
	const navigate = tools.find((tool) => tool.function.name === 'navigate')

	assert.ok(navigate)
	assert.deepStrictEqual(navigate.function.parameters.required, ['url'])
})

test('listElements and paginateVisibleElements treat offset as optional', () => {
	const tools = buildAgentTools()
	const listElements = tools.find((tool) => tool.function.name === 'listElements')
	const paginateVisibleElements = tools.find(
		(tool) => tool.function.name === 'paginateVisibleElements',
	)
	const pickElement = tools.find((tool) => tool.function.name === 'pickElement')

	assert.ok(listElements)
	assert.ok(paginateVisibleElements)
	assert.ok(pickElement)
	assert.deepStrictEqual(listElements.function.parameters.required, [])
	assert.deepStrictEqual(paginateVisibleElements.function.parameters.required, [])
	assert.deepStrictEqual(pickElement.function.parameters.required, ['selector'])
	assert.match(
		listElements.function.parameters.properties.offset.description,
		/Defaults to 0/,
	)
	assert.match(
		paginateVisibleElements.function.parameters.properties.offset.description,
		/Defaults to the current page/,
	)
})
