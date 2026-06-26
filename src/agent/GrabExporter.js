import { AGENT_ONLY_EXPORT_ACTIONS } from './agentConfig.js'
import { mapAgentToolToEngineAction } from './AgentToolMapper.js'
import { grabSchema, formatGrabValidationError } from '../../packages/core/schemas/grabSchema.js'
import { FileSystem } from '../../packages/core/utils/FileSystem.js'
import { pathJoin, rootPathJoin } from '../../packages/core/utils/paths.js'

/** @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep */
/** @typedef {import('./agentDynamicTools.js').DynamicToolRegistryEntry} DynamicToolRegistryEntry */

/**
 * @param {AgentStep} step
 * @param {Map<string, DynamicToolRegistryEntry> | undefined} dynamicRegistry
 * @returns {{ name: string, params: object }}
 */
function mapStepToGrabAction(step, dynamicRegistry) {
	const dynamicEntry = dynamicRegistry?.get(step.action)

	if (dynamicEntry?.kind === 'grab') {
		const params = { grab: dynamicEntry.grabName }

		if (step.params && Object.keys(step.params).length > 0) {
			params.params = step.params
		}

		return { name: 'runGrab', params }
	}

	if (dynamicEntry?.kind === 'custom') {
		return {
			name: dynamicEntry.actionName,
			params: step.params ?? {},
		}
	}

	const mapped = mapAgentToolToEngineAction(step.action, step.params)

	return {
		name: mapped.action,
		params: mapped.params,
	}
}

/**
 * Append a `getElements` action for the given selector if one does not already
 * exist in the action list for that selector.
 * @param {Array<{ name: string, params: object }>} actions
 * @param {string} selector
 */
function appendGetElementsIfAbsent(actions, selector) {
	const alreadyPresent = actions.some(
		(action) => action.name === 'getElements' && action.params?.selector === selector,
	)
	if (!alreadyPresent) {
		actions.push({ name: 'getElements', params: { selector } })
	}
}

/**
 * Convert an agent audit log into a replayable grab config.
 *
 * When an `answerSelector` is provided (from the export-mode answer JSON), a
 * `getElements` action is synthesized at the end of the grab — unless the run
 * already explicitly called `getElements` with that selector.
 *
 * @param {AgentStep[]} steps
 * @param {{ name?: string, description?: string, dynamicRegistry?: Map<string, DynamicToolRegistryEntry>, answerSelector?: string | null }} [options]
 * @returns {{ name: string, description: string, actions: Array<{ name: string, params: object }> }}
 */
export function exportGrabFromSteps(steps, options = {}) {
	const name = options.name ?? 'agent-export'
	const description = options.description ?? 'Exported from an agent run'
	const answerSelector = options.answerSelector ?? null

	/** @type {Array<{ name: string, params: object }>} */
	const actions = []

	for (const step of steps) {
		if (step.error || AGENT_ONLY_EXPORT_ACTIONS.has(step.action)) {
			continue
		}

		actions.push(mapStepToGrabAction(step, options.dynamicRegistry))
	}

	if (answerSelector) {
		appendGetElementsIfAbsent(actions, answerSelector)
	}

	return { name, description, actions }
}

/**
 * Resolve the JSON file path for an exported grab name.
 * @param {string} grabName
 * @returns {string}
 */
export function resolveExportedGrabFilePath(grabName) {
	return pathJoin(rootPathJoin('grabs'), `${grabName}.json`)
}

/**
 * Fail fast when an export target already exists and overwrite is disabled.
 * @param {string} grabName
 * @param {{ overwrite?: boolean }} [options]
 * @returns {string} Absolute path to the grab file
 */
export function assertExportGrabNameAvailable(grabName, { overwrite = false } = {}) {
	const filePath = resolveExportedGrabFilePath(grabName)

	if (FileSystem.exists(filePath) && !overwrite) {
		throw new Error(
			`Grab "${grabName}" already exists at ${filePath}. Use --overwrite to replace it.`,
		)
	}

	return filePath
}

/**
 * Validate and write an exported grab JSON file under grabs/.
 * @param {{ name: string, description?: string, actions: Array<{ name: string, params: object }> }} grabConfig
 * @param {{ overwrite?: boolean }} [options]
 * @returns {Promise<string>} Absolute path to the written grab file
 */
export async function writeExportedGrabToFile(grabConfig, { overwrite = false } = {}) {
	const result = grabSchema.safeParse(grabConfig)

	if (!result.success) {
		throw new Error(formatGrabValidationError(result.error, grabConfig.name))
	}

	const validated = result.data
	const filePath = assertExportGrabNameAvailable(validated.name, { overwrite })

	await FileSystem.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`)

	return filePath
}

/**
 * Build and write a grab exported from a completed agent run.
 * @param {{ steps: AgentStep[], instruction: string, exportGrabName: string, exportOverwrite?: boolean, dynamicRegistry?: Map<string, DynamicToolRegistryEntry>, answerSelector?: string | null }} options
 * @returns {Promise<string>} Absolute path to the written grab file
 */
export async function exportAgentRunGrab(options) {
	const {
		steps,
		instruction,
		exportGrabName,
		exportOverwrite = false,
		dynamicRegistry,
		answerSelector = null,
	} = options

	const grabConfig = exportGrabFromSteps(steps, {
		name: exportGrabName,
		description: instruction,
		dynamicRegistry,
		answerSelector,
	})

	if (grabConfig.actions.length === 0) {
		throw new Error('Agent run produced no exportable actions')
	}

	return writeExportedGrabToFile(grabConfig, { overwrite: exportOverwrite })
}
