import { mapAgentToolToEngineAction } from './AgentToolMapper.js'

/** @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep */

/** Agent tools that are exploration-only and should not be exported to grabs. */
export const AGENT_ONLY_EXPORT_ACTIONS = new Set([
	'listElements',
	'listVisibleElements',
	'inspectElement',
	'listTabs',
	'switchTab',
])

/**
 * Convert an agent audit log into a replayable grab config.
 * @param {AgentStep[]} steps
 * @param {{ name?: string, description?: string }} [options]
 * @returns {{ name: string, description: string, actions: Array<{ name: string, params: object }> }}
 */
export function exportGrabFromSteps(steps, options = {}) {
	const name = options.name ?? 'agent-export'
	const description = options.description ?? 'Exported from an agent run'

	const actions = steps
		.filter((step) => !step.error && !AGENT_ONLY_EXPORT_ACTIONS.has(step.action))
		.map((step) => {
			const mapped = mapAgentToolToEngineAction(step.action, step.params)

			return {
				name: mapped.action,
				params: mapped.params,
			}
		})

	return {
		name,
		description,
		actions,
	}
}
