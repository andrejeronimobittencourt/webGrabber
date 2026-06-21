import { resolveGrabParameterSchema } from '../../packages/core/grabParameters.js'
import { BUILTIN_AGENT_TOOL_NAMES } from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @typedef {import('./ToolSchemaBuilder.js').AgentToolDefinition} AgentToolDefinition
 */

/**
 * @typedef {Object} DynamicToolRegistryEntry
 * @property {'grab' | 'custom'} kind
 * @property {string} [grabName]
 * @property {string} [actionName]
 * @property {object} parameterSchema
 */

/**
 * @param {string} grabName
 * @returns {string}
 */
export function sanitizeGrabToolName(grabName) {
	const sanitized = grabName.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
	return `grab_${sanitized}`
}

/**
 * @param {string} name
 * @returns {string}
 */
function defaultToolDescription(name) {
	return `Run the importable grab "${name}".`
}

/**
 * Build dynamic Ollama tool definitions from importable grabs and custom actions.
 * @param {{ grabs?: Array<{ name: string, description?: string, parameters?: object }>, customActions?: Array<{ name: string, description?: string, parameters?: object }> }} options
 * @returns {AgentToolDefinition[]}
 */
export function buildDynamicAgentTools({ grabs = [], customActions = [] } = {}) {
	/** @type {AgentToolDefinition[]} */
	const tools = []

	for (const grab of grabs) {
		const toolName = sanitizeGrabToolName(grab.name)

		if (BUILTIN_AGENT_TOOL_NAMES.includes(toolName)) {
			continue
		}

		tools.push({
			type: 'function',
			function: {
				name: toolName,
				description: grab.description ?? defaultToolDescription(grab.name),
				parameters: structuredClone(resolveGrabParameterSchema(grab.parameters)),
			},
		})
	}

	for (const action of customActions) {
		if (BUILTIN_AGENT_TOOL_NAMES.includes(action.name)) {
			continue
		}

		tools.push({
			type: 'function',
			function: {
				name: action.name,
				description: action.description ?? `Run the custom action "${action.name}".`,
				parameters: structuredClone(resolveGrabParameterSchema(action.parameters)),
			},
		})
	}

	return tools
}

/**
 * @param {AgentToolDefinition[]} dynamicTools
 * @param {{ grabs?: Array<{ name: string, parameters?: object }>, customActions?: Array<{ name: string, parameters?: object }> }} sources
 * @returns {Map<string, DynamicToolRegistryEntry>}
 */
export function buildDynamicToolRegistry(
	dynamicTools,
	{ grabs = [], customActions = [] } = {},
) {
	/** @type {Map<string, DynamicToolRegistryEntry>} */
	const registry = new Map()
	/** @type {Map<string, { name: string, parameters?: object }>} */
	const grabByToolName = new Map(
		grabs.map((grab) => [sanitizeGrabToolName(grab.name), grab]),
	)
	/** @type {Map<string, { name: string, parameters?: object }>} */
	const customByName = new Map(customActions.map((action) => [action.name, action]))

	for (const tool of dynamicTools) {
		const toolName = tool.function.name
		const grab = grabByToolName.get(toolName)

		if (grab) {
			registry.set(toolName, {
				kind: 'grab',
				grabName: grab.name,
				parameterSchema: resolveGrabParameterSchema(grab.parameters),
			})
			continue
		}

		const customAction = customByName.get(toolName)

		if (customAction) {
			registry.set(toolName, {
				kind: 'custom',
				actionName: customAction.name,
				parameterSchema: resolveGrabParameterSchema(customAction.parameters),
			})
		}
	}

	return registry
}
