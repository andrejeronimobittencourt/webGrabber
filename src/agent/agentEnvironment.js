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
	'Export mode: when you have the answer, respond with JSON {"answer":"your answer text","selector":"the CSS selector from elements[] that contains the answer data"}. The selector field is required in export mode.'

/**
 * @param {boolean} exportMode
 * @param {boolean} [_visionAvailable=false]
 * @returns {string}
 */
export function buildAgentSystemConstraints(exportMode = false, _visionAvailable = false) {
	const parts = [
		'You control a headless browser through tools. The user does not see the browser.',
		'A run ends with a plain-text reply (or export-mode JSON answer) and no tool calls.',
		'If the answer is clearly visible in elements[] or visualSummary, DO NOT call any more tools. Answer immediately.',
		'Tools are listed in the tools API; names are case-sensitive.',
		'Every tool call must include a reason field explaining why the action is taken.',
		'Tool history lists prior tool names, params, and reasons — not results.',
		'elements[] entries have selector, text, and interactable.',
		'NEVER guess or hallucinate CSS selectors. You MUST copy them exactly from elements[].',
		'Tool selectors must EXACTLY match elements[].selector from the current observation.',
		'click, type, and pressKey require interactable true.',
		'getElements and inspectElement accept any selector from elements.',
		'elementsPage has page, totalPages, totalElements, hasMore, and nextOffset.',
		'paginateElements is rejected when elementsPage.hasMore is false.',
	]

	if (exportMode) {
		parts.push(EXPORT_MODE_DESCRIPTION)
	}

	return parts.join('\n')
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
