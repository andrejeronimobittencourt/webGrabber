/** Agent tools that require a prior pick before answering without navigation. */
export const PICK_CONTEXT_ACTIONS = new Set([
	'click',
	'getElements',
	'inspectElement',
	'paginateVisibleElements',
	'pressKey',
	'type',
])

/** Hint returned when the model must pick a target before continuing. */
export const PICK_ELEMENT_HINT =
	'Call pickElement with a selector from the observation before acting on it or giving your final answer.'

/**
 * @param {import('./AgentToolMapper.js').AgentStep[]} steps
 * @param {string | null | undefined} pickedSelector
 * @param {{ hasNavigated?: boolean }} [options]
 * @returns {boolean}
 */
export function mustPickBeforeAnswer(steps, pickedSelector, { hasNavigated = false } = {}) {
	if (pickedSelector) {
		return false
	}

	if (hasNavigated) {
		return true
	}

	return steps.some((step) => !step.error && PICK_CONTEXT_ACTIONS.has(step.action))
}

/**
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 */
export function clearPickedSelector(brain) {
	brain.run.pickedSelector = null
}

/**
 * @param {ReturnType<import('../../packages/core/brain/BrainFactory.js').default['create']>} brain
 * @param {string} selector
 */
export function setPickedSelector(brain, selector) {
	brain.run.pickedSelector = selector
}
