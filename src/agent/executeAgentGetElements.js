import { mapAgentToolToEngineAction } from './AgentToolMapper.js'
import constants from '../../packages/core/utils/constants.js'

/**
 * Execute getElements for an agent tool call and return the extracted value.
 * @param {object} context
 * @param {import('../../packages/core/Engine.js').default} context.engine
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} context.brain
 * @param {import('puppeteer').Page} context.page
 * @param {import('./AgentPolicy.js').default} context.policy
 * @param {Set<string>} context.knownSelectors
 * @param {string | null | undefined} context.pickedSelector
 * @param {string} context.selector
 * @returns {Promise<*>}
 */
export async function executeAgentGetElements({
	engine,
	brain,
	page,
	policy,
	knownSelectors,
	pickedSelector,
	selector,
}) {
	policy.validateAction('getElements', { selector }, { knownSelectors, pickedSelector })

	const mapped = mapAgentToolToEngineAction('getElements', { selector })
	brain.run.params = mapped.params
	await engine.perform(brain, mapped.action, page)

	return brain.recall(constants.inputKey)
}
