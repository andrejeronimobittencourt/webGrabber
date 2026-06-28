
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
	'Export mode: when you have the answer, respond with JSON {"answer":"your answer text","selector":"the CSS selector that contains the answer data"}. The selector field is required in export mode.'

/**
 * @param {boolean} exportMode
 * @param {boolean} [_visionAvailable=false]
 * @returns {string}
 */
export function buildAgentSystemConstraints(exportMode = false, _visionAvailable = false) {
	const parts = [
		// Identity and scope
		'You control a headless browser through tools. The user does not see the browser.',

		// Termination condition
		'End the run ONLY when the goal is fully achieved, or every reasonable avenue has been tried and failed.',

		// Persistence
		'After any failure, actively identify an alternative — a different URL, a different link to click, a different way to reach the same information. Never accept a dead end as final unless truly out of options.',

		// Situational self-awareness before acting
		'Before each action, assess the current situation: Is the page in a transitional or transient state (dropdown open, loading, partial render)? If so, your action must resolve or bypass that state first before pursuing the goal.',
		'Elements marked with data-obscured="true" are currently covered by another element (like a popup or overlay). You cannot interact with them. You must interact with the overlay (e.g. close it or accept it) to reveal them.',

		// Action-outcome discipline
		'After each action, verify it had the expected effect by checking whether the page changed. If a tool call produced no observable change, do NOT repeat it with the same parameters. Diagnose why it failed, then try something structurally different.',

		// Answer detection
		'If the goal answer is clearly visible in the html or visualSummary, call the `answer` tool immediately. Do NOT provide your final answer in plain text. You MUST use the `answer` tool to end the run.',

		// Navigate
		'A navigate timeout with a loaded page (html is non-empty) is recoverable — the page content is usable.',
		'Only navigate to URLs you have seen as links on a real page, OR start your search at a well-known search engine (e.g. https://www.google.com). Do NOT invent or guess other specific domains from memory.',

		// Tool discipline
		'Tools are listed in the tools API; names are case-sensitive.',
		'Every tool call must include a reason field that states: what you observed, what action you are taking, and what you expect the result to be.',
		'Tool history lists prior tool names, params, reasons, and failed/error when a step errored.',

		// Selector discipline
		'You MUST write valid CSS selectors targeting elements visible in the raw html chunk provided in the observation.',

		'You must use the native function calling API to execute tools. NEVER output tool calls as JSON in your message text.',
		'type replaces the entire field content — do not retype if the field already has the correct value.',

		// Pagination
		'htmlPage has page, totalPages, totalLength, hasMore, and nextOffset. If you do not see the element you need in the current html chunk, you MUST use paginateHtml (passing offset: htmlPage.nextOffset) to see more.',
		'paginateHtml is rejected when htmlPage.hasMore is false.',
		'DO NOT guess CSS selectors for elements that are not currently visible in the provided html chunk. If you suspect an element exists but you cannot see it, you MUST use paginateHtml to find it before interacting with it.',
		'Never call answer to give up on a page unless you have completely paginated through all html chunks and tried all alternatives.',
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

/** Factual note when a selector is not found. */
export const SELECTOR_NOT_FOUND =
	'Selector was not found on the page. If you expect it to be on the page, you MUST use paginateHtml to search for it in other chunks.'
