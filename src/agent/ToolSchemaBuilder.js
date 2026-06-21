import { DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL } from './AgentToolMapper.js'
import { DEFAULT_AGENT_ELEMENT_PAGE_SIZE } from './agentConfig.js'
import { BUILTIN_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {Object} AgentToolDefinition
 * @property {'function'} type
 * @property {{ name: string, description: string, parameters: object }} function
 */

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
			description:
				'Click an element matched by selector. Use a selector exactly as listed in elements.',
			parameters: {
				type: 'object',
				properties: {
					selector: {
						type: 'string',
						description: 'CSS selector copied from the elements cheatsheet.',
					},
					text: { type: 'string', description: 'Optional fuzzy text match.' },
					attribute: { type: 'string', description: 'Optional attribute name for matching.' },
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
			description:
				'Type text into an input element. Use a selector exactly as listed in elements.',
			parameters: {
				type: 'object',
				properties: {
					selector: {
						type: 'string',
						description: 'CSS selector copied from the elements cheatsheet.',
					},
					text: { type: 'string' },
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
			name: 'listElements',
			description:
				'Fetch another page of the interactive-element cheatsheet from the current observation. ' +
				'Use elementsPage.totalPages and pageIndex from observations; offset = pageIndex * limit. ' +
				'If the target is missing after all pages, reveal hidden UI with visible controls first—it will appear in a later observation.',
			parameters: {
				type: 'object',
				properties: {
					offset: {
						type: 'number',
						description: 'Optional zero-based element offset. Defaults to 0.',
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
			name: 'paginateVisibleElements',
			description:
				'Change the visibleElements page shown in the next observation. ' +
				'Use visibleElementsPage.totalPages and pageIndex; offset = pageIndex * limit. ' +
				'Call pickElement with one returned selector before acting on it or answering from it.',
			parameters: {
				type: 'object',
				properties: {
					tags: {
						type: 'array',
						items: { type: 'string' },
						description:
							'Optional primitive tags to scan, such as p, h1, span, div, li, time, or a.',
					},
					offset: {
						type: 'number',
						description: 'Optional zero-based visible element offset. Defaults to the current page.',
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
			name: 'pickElement',
			description:
				'Signal which element from the observation you are acting on or answering from. ' +
				'Required before click, type, inspectElement, pressKey, getElements, or your final answer.',
			parameters: {
				type: 'object',
				properties: {
					selector: {
						type: 'string',
						description: 'Selector copied exactly from the observation.',
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
			name: 'inspectElement',
			description:
				'Scroll a target into view, capture a focused screenshot, and return a vision summary. ' +
				'Use to confirm a target or reveal off-screen content before click or type.',
			parameters: {
				type: 'object',
				properties: {
					selector: { type: 'string', description: 'CSS selector from the cheatsheet.' },
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
				'Press a keyboard key. Prefer Enter after typing a search query instead of clicking submit buttons or guessed result links.',
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
						type: 'string',
						description: 'Optional selector to focus before pressing the key.',
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
			description:
				'List open browser tabs with tabKey, url, title, and which tab is active. ' +
				'Use when a click opened the wrong page, an ad, or a popup and you need to inspect another tab.',
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
			description:
				'Switch the active browser tab by tabKey from tabs in the observation or listTabs. ' +
				'Use to return to the search page or leave an ad/popup tab before continuing.',
			parameters: {
				type: 'object',
				properties: {
					tabKey: {
						type: 'string',
						description: 'Tab key from observation.tabs or listTabs.',
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
				'Read text or an attribute from the DOM when visibleElements is not enough. ' +
				'Call pickElement with the same selector first.',
			parameters: {
				type: 'object',
				properties: {
					selector: {
						type: 'string',
						description: 'Selector copied from the observation and already picked with pickElement.',
					},
					attribute: { type: 'string', description: 'Optional attribute to read.' },
				},
				required: ['selector'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'elementExists',
			description: 'Check whether an element exists on the page.',
			parameters: {
				type: 'object',
				properties: {
					selector: { type: 'string' },
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
			description: 'Capture a screenshot of the current page.',
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
	{
		type: 'function',
		function: {
			name: 'setVariable',
			description: 'Store a value in agent memory.',
			parameters: {
				type: 'object',
				properties: {
					key: { type: 'string' },
					value: {},
				},
				required: ['key', 'value'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'getVariable',
			description: 'Load a stored variable into the INPUT pipe.',
			parameters: {
				type: 'object',
				properties: {
					key: { type: 'string' },
					index: { type: 'number' },
				},
				required: ['key'],
				additionalProperties: false,
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'log',
			description: 'Write a runtime log message.',
			parameters: {
				type: 'object',
				properties: {
					message: { type: 'string' },
					color: { type: 'string' },
					background: { type: 'string' },
				},
				required: ['message'],
				additionalProperties: false,
			},
		},
	},
]

/**
 * Build OpenAI-compatible tool definitions for Ollama agent mode.
 * @param {{ dynamicTools?: AgentToolDefinition[] }} [options]
 * @returns {AgentToolDefinition[]}
 */
export function buildAgentTools({ dynamicTools = [] } = {}) {
	return [...AGENT_TOOL_DEFINITIONS, ...dynamicTools].map((tool) => ({
		type: tool.type,
		function: {
			name: tool.function.name,
			description: tool.function.description,
			parameters: structuredClone(tool.function.parameters),
		},
	}))
}

/**
 * @param {{ dynamicTools?: AgentToolDefinition[] }} [options]
 * @returns {string[]}
 */
export function listAgentToolNames({ dynamicTools = [] } = {}) {
	return [
		...BUILTIN_AGENT_TOOL_NAMES,
		...dynamicTools.map((tool) => tool.function.name),
	]
}
