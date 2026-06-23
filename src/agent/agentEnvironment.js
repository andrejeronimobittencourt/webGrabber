/**
 * @typedef {import('./observePage.js').PageElement} PageElement
 */

/** Vision capability description when vision tools and summaries are available. */
export const VISION_AVAILABLE_CONSTRAINT =
	'Vision enabled. Observations may include visualSummary (page description). inspectElement is available.'

/** Vision capability description when vision is disabled. */
export const VISION_UNAVAILABLE_CONSTRAINT =
	'Vision disabled. Observations have no visualSummary.'

/**
 * @param {boolean} visionAvailable
 * @returns {string}
 */
export function buildVisionConstraint(visionAvailable) {
	return visionAvailable ? VISION_AVAILABLE_CONSTRAINT : VISION_UNAVAILABLE_CONSTRAINT
}

const EXPORT_MODE_DESCRIPTION =
	'Export mode: pickElement is required before a final answer when getElements was not used.'

/**
 * @param {boolean} exportMode
 * @param {boolean} [_visionAvailable=false]
 * @returns {string}
 */
export function buildAgentSystemConstraints(exportMode = false, _visionAvailable = false) {
	const parts = [
		'You control a headless browser through tools. The user does not see the browser.',
		'A run ends with a plain-text reply and no tool calls.',
		'Tools are listed in the tools API; names are case-sensitive.',
		'Tool history lists prior tool names and params only, not results.',
		'lastResult in the observation holds the latest tool output.',
		'Observations include url, title, elements, elementsPage, lastResult, tabs, and pickedSelector when set.',
		'elements[] entries have selector, text, and interactable.',
		'Tool selectors must match elements[].selector exactly.',
		'click, type, and pressKey require interactable true.',
		'getElements and inspectElement accept any selector from elements.',
		'elementsPage has page, totalPages, totalElements, hasMore, and nextOffset.',
		'paginateElements is rejected when elementsPage.hasMore is false.',
	]

	if (exportMode) {
		parts.push(EXPORT_MODE_DESCRIPTION)
	}

	return parts.join(' ')
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
		`${buildAgentSystemConstraints(exportMode, visionAvailable)} ${buildVisionConstraint(visionAvailable)}`
	)
}

/** Factual note when a selector is not in the current observation. */
export const SELECTOR_NOT_IN_OBSERVATION = 'Selector is not in elements[].'

/** Export-mode requirement surfaced when a final answer is blocked. */
export const PICK_ELEMENT_HINT = EXPORT_MODE_DESCRIPTION

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
