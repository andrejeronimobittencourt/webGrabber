import constants from '../../packages/core/utils/constants.js'
import { executeGrab } from '../../packages/core/grabExecution.js'
import { resolveGrabParameterSchema, validateGrabParameters } from '../../packages/core/grabParameters.js'
import {
	AGENT_RESERVED_TOOL_NAMES,
	BUILTIN_AGENT_TOOL_NAMES,
	EXPORT_AGENT_TOOL_NAMES,
} from '../../packages/core/utils/builtinAgentToolNames.js'

/**
 * @param {string} toolName
 * @returns {boolean}
 */
function isReservedAgentToolName(toolName) {
	return AGENT_RESERVED_TOOL_NAMES.includes(toolName)
}

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

		if (isReservedAgentToolName(toolName)) {
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
		if (isReservedAgentToolName(action.name)) {
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

/**
 * Execute a dynamic agent tool backed by an importable grab or custom action.
 * @param {Map<string, DynamicToolRegistryEntry>} registry
 * @param {string} toolName
 * @param {Record<string, unknown>} params
 * @param {{ brain: ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>, engine: import('../../packages/core/Engine.js').default, page: import('puppeteer').Page, grabCatalog: import('../../packages/core/grabCatalog.js').default }} context
 * @returns {Promise<unknown>}
 */
export async function runDynamicAgentTool(registry, toolName, params, context) {
	const entry = registry.get(toolName)

	if (!entry) {
		throw new Error(`Dynamic tool "${toolName}" is not registered`)
	}

	const validatedParams = validateGrabParameters(params, entry.parameterSchema)

	if (entry.kind === 'grab') {
		const { result } = await executeGrab(context.brain, entry.grabName, validatedParams, {
			grabCatalog: context.grabCatalog,
		})
		return result
	}

	context.brain.run.params = validatedParams
	await context.engine.perform(context.brain, entry.actionName, context.page)
	return context.brain.recall(constants.inputKey)
}
