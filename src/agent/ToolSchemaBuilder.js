import { DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL } from './AgentToolMapper.js'
import { DEFAULT_AGENT_ELEMENT_PAGE_SIZE } from './agentConfig.js'
import {
	BUILTIN_AGENT_TOOL_NAMES,
	EXPORT_AGENT_TOOL_NAMES,
} from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {Object} AgentToolDefinition
 * @property {'function'} type
 * @property {{ name: string, description: string, parameters: object }} function
 */

const SELECTOR_PARAM = {
	type: 'string',
	description: 'Exact selector string copied from elements[].selector in the current observation.',
}

/** @type {AgentToolDefinition[]} */
const AGENT_TOOL_DEFINITIONS = [
	{
		type: 'function',
		function: {
			name: 'navigate',
			description: 'Open a URL in the browser. Updates the observation on the next turn.',
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
			description:
				'Click an element. Requires selector from elements; element text is not a valid click target.',
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
			description: 'Type text into an input or textarea identified by selector from elements.',
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
			description:
				'Change which elements slice appears in the next observation. Use elementsPage.nextOffset when hasMore is true.',
			parameters: {
				type: 'object',
				properties: {
					offset: {
						type: 'number',
						description:
							'Zero-based element offset for the next observation. Use elementsPage.nextOffset to advance.',
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
			name: 'inspectElement',
			description:
				'Scroll an element into view and return its text. Vision is not enabled—no image summary.',
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
			name: 'pressKey',
			description:
				'Press a keyboard key. Optionally focus an element first using selector from elements.',
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
						description:
							'Optional. Exact selector from elements to focus before pressing the key.',
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
			description: 'Switch the active browser tab using tabKey from tabs in the observation.',
			parameters: {
				type: 'object',
				properties: {
					tabKey: {
						type: 'string',
						description: 'tabKey from observation.tabs or listTabs.',
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
				'Read text or a DOM attribute not already available in elements[].text. Result appears in lastResult next turn.',
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
				'Save a screenshot file for the user only. Does not change your observation and you cannot see the image.',
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
const PICK_ELEMENT_TOOL_DEFINITION = {
	type: 'function',
	function: {
		name: 'pickElement',
		description:
			'Export only: record which elements selector your final answer came from when getElements was not used.',
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

const VISION_TOOL_DESCRIPTIONS = {
	inspectElement:
		'Scroll an element into view and return its text plus a vision summary of the element.',
	screenshot:
		'Save a screenshot file for the user. Does not update your observation—read elements instead.',
}

/**
 * Build OpenAI-compatible tool definitions for Ollama agent mode.
 * @param {{ dynamicTools?: AgentToolDefinition[], visionAvailable?: boolean, exportMode?: boolean }} [options]
 * @returns {AgentToolDefinition[]}
 */
export function buildAgentTools({ dynamicTools = [], visionAvailable = false, exportMode = false } = {}) {
	const baseTools = exportMode
		? [...AGENT_TOOL_DEFINITIONS, PICK_ELEMENT_TOOL_DEFINITION]
		: AGENT_TOOL_DEFINITIONS

	return [...baseTools, ...dynamicTools].map((tool) => {
		const description =
			visionAvailable && tool.function.name in VISION_TOOL_DESCRIPTIONS
				? VISION_TOOL_DESCRIPTIONS[tool.function.name]
				: tool.function.description

		return {
			type: tool.type,
			function: {
				name: tool.function.name,
				description,
				parameters: structuredClone(tool.function.parameters),
			},
		}
	})
}

/**
 * @param {{ dynamicTools?: AgentToolDefinition[], exportMode?: boolean }} [options]
 * @returns {string[]}
 */
export function listAgentToolNames({ dynamicTools = [], exportMode = false } = {}) {
	return [
		...BUILTIN_AGENT_TOOL_NAMES,
		...(exportMode ? EXPORT_AGENT_TOOL_NAMES : []),
		...dynamicTools.map((tool) => tool.function.name),
	]
}
