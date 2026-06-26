import test from 'node:test'
import assert from 'node:assert'
import { buildAgentTools, listAgentToolNames } from '../../src/agent/ToolSchemaBuilder.js'
import {
	BUILTIN_AGENT_TOOL_NAMES,
	EXPORT_AGENT_TOOL_NAMES,
	VISION_AGENT_TOOL_NAMES,
} from '../../packages/core/utils/builtinAgentToolNames.js'

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

test('every tool definition includes a required reason field', () => {
	const tools = buildAgentTools()

	for (const tool of tools) {
		const props = tool.function.parameters.properties
		const required = tool.function.parameters.required ?? []
		assert.ok(props.reason, `${tool.function.name} is missing a reason property`)
		assert.ok(required.includes('reason'), `${tool.function.name} does not require reason`)
	}
})

test('listAgentToolNames includes navigate and blocks raw puppeteer', () => {
	const names = listAgentToolNames()

	assert.deepStrictEqual([...names].sort(), [...BUILTIN_AGENT_TOOL_NAMES].sort())
	assert.ok(names.includes('navigate'))
	assert.ok(!names.includes('puppeteer'))
	assert.ok(!names.includes('login'))
	assert.ok(!names.includes('pickElement'))
	assert.ok(!names.includes('inspectElement'))
})

test('listAgentToolNames includes inspectElement only when vision is available', () => {
	const names = listAgentToolNames({ visionAvailable: true })

	assert.ok(names.includes('inspectElement'))
	assert.deepStrictEqual(
		[...names].sort(),
		[...BUILTIN_AGENT_TOOL_NAMES, ...VISION_AGENT_TOOL_NAMES].sort(),
	)
})

test('listAgentToolNames does not include pickElement even in export mode', () => {
	const names = listAgentToolNames({ exportMode: true })

	assert.ok(!names.includes('pickElement'))
	assert.deepStrictEqual(
		[...names].sort(),
		[...BUILTIN_AGENT_TOOL_NAMES, ...EXPORT_AGENT_TOOL_NAMES].sort(),
	)
})

test('navigate tool requires url and reason parameters', () => {
	const tools = buildAgentTools()
	const navigate = tools.find((tool) => tool.function.name === 'navigate')

	assert.ok(navigate)
	assert.ok(navigate.function.parameters.required.includes('url'))
	assert.ok(navigate.function.parameters.required.includes('reason'))
})

test('click tool requires selector and reason only', () => {
	const tools = buildAgentTools()
	const click = tools.find((tool) => tool.function.name === 'click')

	assert.ok(click)
	assert.ok(click.function.parameters.required.includes('selector'))
	assert.ok(click.function.parameters.required.includes('reason'))
	assert.strictEqual(click.function.parameters.properties.text, undefined)
})

test('paginateElements treats offset as optional but requires reason', () => {
	const tools = buildAgentTools()
	const paginateElements = tools.find((tool) => tool.function.name === 'paginateElements')

	assert.ok(paginateElements)
	assert.ok(!paginateElements.function.parameters.required.includes('offset'))
	assert.ok(paginateElements.function.parameters.required.includes('reason'))
	assert.match(
		paginateElements.function.parameters.properties.offset.description,
		/nextOffset/,
	)
})

test('pickElement is not present in any tool list', () => {
	assert.strictEqual(buildAgentTools().some((tool) => tool.function.name === 'pickElement'), false)
	assert.strictEqual(buildAgentTools({ exportMode: true }).some((tool) => tool.function.name === 'pickElement'), false)
})

test('buildAgentTools omits inspectElement when vision is disabled', () => {
	const tools = buildAgentTools({ visionAvailable: false })
	const screenshot = tools.find((tool) => tool.function.name === 'screenshot')

	assert.strictEqual(tools.some((tool) => tool.function.name === 'inspectElement'), false)
	assert.match(screenshot.function.description, /agent cannot see/)
})

test('buildAgentTools includes inspectElement when vision is enabled', () => {
	const tools = buildAgentTools({ visionAvailable: true })
	const screenshot = tools.find((tool) => tool.function.name === 'screenshot')
	const inspectElement = tools.find((tool) => tool.function.name === 'inspectElement')

	assert.ok(inspectElement)
	assert.match(inspectElement.function.description, /vision summary/)
	assert.match(screenshot.function.description, /for the user/)
})
