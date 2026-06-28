import { DEFAULT_AGENT_NAVIGATE_WAIT_UNTIL } from './AgentToolMapper.js'
import { DEFAULT_AGENT_HTML_PAGE_SIZE } from './agentConfig.js'
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

/**
 * Shared selector parameter descriptor — reused across tool definitions.
 * @type {{ type: string, description: string }}
 */
const SELECTOR_PARAM = {
	type: 'string',
	description: 'Valid CSS selector found in the current html observation.',
}

/**
 * Every tool call must include a reason explaining the intent.
 * Required in the schema so the model always provides deliberate justification.
 * @type {{ type: string, description: string }}
 */
const REASON_PARAM = {
	type: 'string',
	description: 'Why this action is being taken. Concisely explain the intent.',
}

/**
 * Inject the reason parameter as a required field into a tool's parameter schema.
 * Returns a new schema object — does not mutate the original.
 * @param {object} parameters
 * @returns {object}
 */
function withReason(parameters) {
	return {
		...parameters,
		properties: {
			...parameters.properties,
			reason: REASON_PARAM,
		},
		required: [...(parameters.required ?? []), 'reason'],
	}
}

/** @type {AgentToolDefinition[]} */
const AGENT_TOOL_DEFINITIONS = [
	{
		type: 'function',
		function: {
			name: 'navigate',
			description: 'Navigate the browser to a URL.',
			parameters: withReason({
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
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'click',
			description: 'Click the element matching selector.',
			parameters: withReason({
				type: 'object',
				properties: {
					selector: SELECTOR_PARAM,
				},
				required: ['selector'],
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'type',
			description: 'Type text into the element matching selector. Set pressEnter=true to immediately submit a form/search without needing a separate pressKey step.',
			parameters: withReason({
				type: 'object',
				properties: {
					selector: SELECTOR_PARAM,
					text: { type: 'string', description: 'Text to type into the element.' },
					secret: { type: 'boolean', description: 'Mask value in logs.' },
					pressEnter: { type: 'boolean', description: 'Press Enter immediately after typing.' },
				},
				required: ['selector', 'text'],
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'paginateHtml',
			description: 'Set the character offset for the next HTML observation chunk.',
			parameters: withReason({
				type: 'object',
				properties: {
					offset: {
						type: 'number',
						description: 'Zero-based character offset. Pass htmlPage.nextOffset when advancing.',
					},
					limit: {
						type: 'number',
						description: `Optional chunk size. Defaults to ${DEFAULT_AGENT_HTML_PAGE_SIZE}.`,
					},
				},
				required: ['offset'],
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'pressKey',
			description: 'Press a keyboard key. Optional selector focuses an element first.',
			parameters: withReason({
				type: 'object',
				properties: {
					key: {
						type: 'string',
						description: 'Key name (see Puppeteer keyboard.press). Use standard names like Enter, Tab, Escape, ArrowUp, ArrowDown, Home, End, PageUp, PageDown. For combos use format Control+A or Ctrl+Shift+V.',
					},
					selector: {
						...SELECTOR_PARAM,
						description: 'Optional CSS selector to focus before pressing the key.',
					},
				},
				required: ['key'],
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'listTabs',
			description: 'List open browser tabs and their tabKey values.',
			parameters: withReason({
				type: 'object',
				properties: {},
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'switchTab',
			description: 'Switch the active browser tab using tabKey from tabs.',
			parameters: withReason({
				type: 'object',
				properties: {
					tabKey: {
						type: 'string',
						description: 'tabKey from tabs or listTabs.',
					},
				},
				required: ['tabKey'],
				additionalProperties: false,
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'getElements',
			description: 'Read text or a DOM attribute from the element matching selector.',
			parameters: withReason({
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
			}),
		},
	},
	{
		type: 'function',
		function: {
			name: 'answer',
			description: 'Call this tool when you have achieved the goal or cannot proceed further. This ends the run.',
			parameters: withReason({
				type: 'object',
				properties: {
					text: { type: 'string', description: 'The final answer, conclusion, or extracted data.' },
					selector: {
						...SELECTOR_PARAM,
						description: 'Optional selector of the element containing the answer, if applicable.',
					},
				},
				required: ['text'],
				additionalProperties: false,
			}),
		},
	},
]

/**
 * Build the screenshot tool description based on whether vision is available.
 * When vision is disabled the agent cannot view the screenshot itself.
 * When vision is enabled the screenshot is for the user's reference.
 * @param {boolean} visionAvailable
 * @returns {string}
 */
function buildScreenshotDescription(visionAvailable) {
	return visionAvailable
		? 'Save a full-viewport or cropped page screenshot for the user; the agent can inspect it via inspectElement.'
		: 'Save a full-viewport or cropped page screenshot. The agent cannot see this screenshot directly.'
}

/**
 * Build the screenshot tool definition.
 * @param {boolean} visionAvailable
 * @returns {AgentToolDefinition}
 */
function buildScreenshotToolDefinition(visionAvailable) {
	return {
		type: 'function',
		function: {
			name: 'screenshot',
			description: buildScreenshotDescription(visionAvailable),
			parameters: withReason({
				type: 'object',
				properties: {
					name: { type: 'string' },
					type: { type: 'string', enum: ['jpeg', 'png'] },
					fullPage: { type: 'boolean' },
				},
				required: ['name'],
				additionalProperties: false,
			}),
		},
	}
}

/** @type {AgentToolDefinition} */
const INSPECT_ELEMENT_TOOL_DEFINITION = {
	type: 'function',
	function: {
		name: 'inspectElement',
		description: 'Scroll the element into view and return its text plus an optional vision summary.',
		parameters: withReason({
			type: 'object',
			properties: {
				selector: SELECTOR_PARAM,
			},
			required: ['selector'],
		}),
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
	exportMode: _exportMode = false,
} = {}) {
	const baseTools = [
		...AGENT_TOOL_DEFINITIONS,
		buildScreenshotToolDefinition(visionAvailable),
		...(visionAvailable ? [INSPECT_ELEMENT_TOOL_DEFINITION] : []),
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
