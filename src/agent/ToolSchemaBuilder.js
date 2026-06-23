import { DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL } from './AgentToolMapper.js'
import { DEFAULT_AGENT_ELEMENT_PAGE_SIZE } from './agentConfig.js'
import {
	BUILTIN_AGENT_TOOL_NAMES,
	EXPORT_AGENT_TOOL_NAMES,
	VISION_AGENT_TOOL_NAMES,
} from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {Object} AgentToolDefinition
 * @property {'function'} type
 * @property {{ name: string, description: string, parameters: object }} function
 */

const SELECTOR_PARAM = {
	type: 'string',
	description: 'Selector from elements[].selector in the current observation.',
}

/** @type {AgentToolDefinition[]} */
const AGENT_TOOL_DEFINITIONS = [
	{
		type: 'function',
		function: {
			name: 'navigate',
			description: 'Navigate the browser to a URL.',
			parameters: {
				type: 'object',
				properties: {
					url: { type: 'string', description: 'Full URL to open.' },
					waitUntil: {
						type: 'string',
						enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
						description:
							`Optional navigation wait condition. Defaults to ${DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL}.`,
					},
				},
				required: ['url'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'click',
			description: 'Click the element matching selector.',
			parameters: {
				type: 'object',
				properties: {
					selector: SELECTOR_PARAM,
				},
				required: ['selector'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'type',
			description: 'Type text into the element matching selector.',
			parameters: {
				type: 'object',
				properties: {
					selector: SELECTOR_PARAM,
					text: { type: 'string', description: 'Text to type into the element.' },
					secret: { type: 'boolean', description: 'Mask value in logs.' },
				},
				required: ['selector', 'text'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'paginateElements',
			description: 'Set the elements slice offset for the next observation.',
			parameters: {
				type: 'object',
				properties: {
					offset: {
						type: 'number',
						description: 'Zero-based element offset. elementsPage.nextOffset when advancing.',
					},
					limit: {
						type: 'number',
						description: `Optional page size. Defaults to ${DEFAULT_AGENT_ELEMENT_PAGE_SIZE}.`,
					},
				},
				required: [],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'pressKey',
			description: 'Press a keyboard key. Optional selector focuses an element first.',
			parameters: {
				type: 'object',
				properties: {
					key: {
						type: 'string',
						enum: [
							'Enter',
							'Tab',
							'Escape',
							'Backspace',
							'ArrowUp',
							'ArrowDown',
							'ArrowLeft',
							'ArrowRight',
							'Home',
							'End',
							'PageUp',
							'PageDown',
						],
					},
					selector: {
						...SELECTOR_PARAM,
						description: 'Optional selector from elements to focus before pressing the key.',
					},
				},
				required: ['key'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'listTabs',
			description: 'List open browser tabs and their tabKey values.',
			parameters: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'switchTab',
			description: 'Switch the active browser tab using tabKey from tabs.',
			parameters: {
				type: 'object',
				properties: {
					tabKey: {
						type: 'string',
						description: 'tabKey from tabs or listTabs.',
					},
				},
				required: ['tabKey'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'getElements',
			description:
				'Read text or a DOM attribute from the element matching selector. Output appears in lastResult.',
			parameters: {
				type: 'object',
				properties: {
					selector: SELECTOR_PARAM,
					attribute: {
						type: 'string',
						description: 'Optional attribute name (for example href). Omit to read text content.',
					},
				},
				required: ['selector'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'screenshot',
			description:
				'Save a screenshot file for the user. The agent cannot see the file; the observation is unchanged.',
			parameters: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					type: { type: 'string', enum: ['jpeg', 'png'] },
					fullPage: { type: 'boolean' },
				},
				required: ['name'],
				additionalProperties: false,
			},
		},
	},
]

/** @type {AgentToolDefinition} */
const INSPECT_ELEMENT_TOOL_DEFINITION = {
	type: 'function',
	function: {
		name: 'inspectElement',
		description: 'Scroll the element into view and return its text plus an optional vision summary.',
		parameters: {
			type: 'object',
			properties: {
				selector: SELECTOR_PARAM,
			},
			required: ['selector'],
			additionalProperties: false,
		},
	},
}

/** @type {AgentToolDefinition} */
const PICK_ELEMENT_TOOL_DEFINITION = {
	type: 'function',
	function: {
		name: 'pickElement',
		description: 'Export mode: record the selector used for the final answer.',
		parameters: {
			type: 'object',
			properties: {
				selector: SELECTOR_PARAM,
			},
			required: ['selector'],
			additionalProperties: false,
		},
	},
}

/**
 * Build OpenAI-compatible tool definitions for Ollama agent mode.
 * @param {{ dynamicTools?: AgentToolDefinition[], visionAvailable?: boolean, exportMode?: boolean }} [options]
 * @returns {AgentToolDefinition[]}
 */
export function buildAgentTools({
	dynamicTools = [],
	visionAvailable = false,
	exportMode = false,
} = {}) {
	const baseTools = [
		...AGENT_TOOL_DEFINITIONS,
		...(visionAvailable ? [INSPECT_ELEMENT_TOOL_DEFINITION] : []),
		...(exportMode ? [PICK_ELEMENT_TOOL_DEFINITION] : []),
	]

	return [...baseTools, ...dynamicTools].map((tool) => ({
		type: tool.type,
		function: {
			name: tool.function.name,
			description: tool.function.description,
			parameters: structuredClone(tool.function.parameters),
		},
	}))
}

/**
 * @param {{ dynamicTools?: AgentToolDefinition[], exportMode?: boolean, visionAvailable?: boolean }} [options]
 * @returns {string[]}
 */
export function listAgentToolNames({
	dynamicTools = [],
	exportMode = false,
	visionAvailable = false,
} = {}) {
	return [
		...BUILTIN_AGENT_TOOL_NAMES,
		...(visionAvailable ? VISION_AGENT_TOOL_NAMES : []),
		...(exportMode ? EXPORT_AGENT_TOOL_NAMES : []),
		...dynamicTools.map((tool) => tool.function.name),
	]
}
