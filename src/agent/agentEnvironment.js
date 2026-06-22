/**
 * @typedef {import('./observePage.js').PageElement} PageElement
 */

/** Constraint when vision summaries are available in observations. */
export const VISION_AVAILABLE_CONSTRAINT =
	'Vision is enabled: observations may include visualSummary; inspectElement may return a vision summary.'

/** Constraint when the model cannot see page images. */
export const VISION_UNAVAILABLE_CONSTRAINT =
	'Vision is disabled: you cannot see screenshots or images. Read elements and use getElements when you need DOM attributes. ' +
	'screenshot only saves a file for the user and does not update your observation.'

/**
 * @param {boolean} visionAvailable
 * @returns {string}
 */
export function buildVisionConstraint(visionAvailable) {
	return visionAvailable ? VISION_AVAILABLE_CONSTRAINT : VISION_UNAVAILABLE_CONSTRAINT
}

/** Hard constraints stated once in the agent system prompt. */
const AGENT_SYSTEM_CONSTRAINTS =
	'You control a headless browser through tools. The user cannot see the browser. ' +
	'Finish by replying with plain text only (no tool calls). ' +
	'Only use tools from the provided tool list. ' +
	'Tool history lists prior tool names and params only — not their results. Check lastResult in the observation for the most recent tool output. ' +
	'elements is the only allowed source of selectors: each item has selector and text. Copy selector exactly; do not invent or modify selectors. ' +
	'click, type, getElements, and inspectElement always require selector from the current elements list. Text labels are not selectors. ' +
	'When elementsPage.hasMore is true, call paginateElements with nextOffset to load more elements. ' +
	'Do not call paginateElements when elementsPage.hasMore is false. ' +
	'Answer from element text when it already contains the information; use getElements only for attributes or text not shown in elements. ' +
	'If the same tool call with identical parameters did not change the observation twice, do not repeat it; try a different tool or parameters. ' +
	'If you call the same tool repeatedly on one page without navigating, switch to a different tool or approach.'

const EXPORT_AGENT_SYSTEM_CONSTRAINTS =
	'Export mode: call pickElement with the answer selector before a final reply when getElements was not used.'

/**
 * @param {boolean} exportMode
 * @returns {string}
 */
export function buildAgentSystemConstraints(exportMode = false) {
	if (!exportMode) {
		return AGENT_SYSTEM_CONSTRAINTS
	}

	return `${AGENT_SYSTEM_CONSTRAINTS} ${EXPORT_AGENT_SYSTEM_CONSTRAINTS}`
}

/**
 * @param {Date} date
 * @returns {string} Local calendar date in YYYY-MM-DD form.
 */
export function formatAgentRunDate(date) {
	return date.toLocaleDateString('en-CA')
}

/**
 * Build the agent system prompt for a run.
 * @param {Date} [referenceDate]
 * @param {{ visionAvailable?: boolean, exportMode?: boolean }} [options]
 * @returns {string}
 */
export function buildAgentSystemPrompt(
	referenceDate = new Date(),
	{ visionAvailable = false, exportMode = false } = {},
) {
	return (
		`You are a browser automation agent. Today's date is ${formatAgentRunDate(referenceDate)}. ` +
		`${buildAgentSystemConstraints(exportMode)} ${buildVisionConstraint(visionAvailable)}`
	)
}

/** Constraint returned to the model when a selector is not in the current observation. */
export const SELECTOR_NOT_IN_OBSERVATION =
	'Use a selector copied exactly from elements in the current observation.'

/** Runtime constraint when pickElement is required before a final answer during export. */
export const PICK_ELEMENT_HINT =
	'pickElement is required before a final answer when getElements was not used.'

/**
 * Register selectors from an observation element list for policy validation.
 * @param {Set<string>} knownSelectors
 * @param {PageElement[]} elements
 */
export function registerObservationSelectors(knownSelectors, elements) {
	for (const element of elements) {
		knownSelectors.add(element.selector)
	}
}

/**
 * @param {import('./AgentToolMapper.js').AgentStep[]} steps
 * @returns {boolean}
 */
function hasSuccessfulGetElements(steps) {
	return steps.some((step) => !step.error && step.action === 'getElements')
}

/**
 * Whether pickElement is required before a final answer during grab export.
 * @param {import('./AgentToolMapper.js').AgentStep[]} steps
 * @param {string | null | undefined} pickedSelector
 * @param {boolean} [exportMode=false]
 * @returns {boolean}
 */
export function mustPickBeforeAnswer(steps, pickedSelector, exportMode = false) {
	if (!exportMode) {
		return false
	}

	if (pickedSelector) {
		return false
	}

	if (hasSuccessfulGetElements(steps)) {
		return false
	}

	return steps.some((step) => !step.error && step.action === 'navigate')
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
