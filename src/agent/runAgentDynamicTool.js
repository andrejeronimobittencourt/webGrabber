import constants from '../../packages/core/utils/constants.js'
import { executeGrab } from '../../packages/core/grabExecution.js'
import { validateGrabParameters } from '../../packages/core/grabParameters.js'

/**
 * @typedef {import('./agentDynamicTools.js').DynamicToolRegistryEntry} DynamicToolRegistryEntry
 */

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
