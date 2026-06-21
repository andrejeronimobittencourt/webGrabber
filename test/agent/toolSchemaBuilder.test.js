import test from 'node:test'
import assert from 'node:assert'
import { buildAgentTools, listAgentToolNames } from '../../src/agent/ToolSchemaBuilder.js'

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

	assert.ok(names.includes('navigate'))
	assert.ok(names.includes('getElements'))
	assert.ok(names.includes('listElements'))
	assert.ok(names.includes('listVisibleElements'))
	assert.ok(names.includes('inspectElement'))
	assert.ok(names.includes('pressKey'))
	assert.ok(!names.includes('puppeteer'))
	assert.ok(!names.includes('login'))
})

test('navigate tool requires url parameter', () => {
	const tools = buildAgentTools()
	const navigate = tools.find((tool) => tool.function.name === 'navigate')

	assert.ok(navigate)
	assert.deepStrictEqual(navigate.function.parameters.required, ['url'])
})

test('listElements and listVisibleElements treat offset as optional with default 0', () => {
	const tools = buildAgentTools()
	const listElements = tools.find((tool) => tool.function.name === 'listElements')
	const listVisibleElements = tools.find((tool) => tool.function.name === 'listVisibleElements')

	assert.ok(listElements)
	assert.ok(listVisibleElements)
	assert.deepStrictEqual(listElements.function.parameters.required, [])
	assert.deepStrictEqual(listVisibleElements.function.parameters.required, ['tags'])
	assert.match(
		listElements.function.parameters.properties.offset.description,
		/Defaults to 0/,
	)
	assert.match(
		listVisibleElements.function.parameters.properties.offset.description,
		/Defaults to 0/,
	)
})
