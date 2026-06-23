/** @typedef {import('./observePage.js').PageElement} PageElement */

/**
 * Agent validation error with separate CLI and model-facing messages.
 */
export class AgentValidationError extends Error {
	/** @type {string} */
	userMessage

	/** @type {PageElement[] | undefined} */
	suggestedElements

	/**
	 * @param {string} userMessage Short text for CLI logs.
	 * @param {string} modelMessage Full text returned to the reason model.
	 * @param {{ suggestedElements?: PageElement[] }} [options]
	 */
	constructor(userMessage, modelMessage, options = {}) {
		super(modelMessage)
		this.name = 'AgentValidationError'
		this.userMessage = userMessage
		this.suggestedElements = options.suggestedElements
	}

	/**
	 * @param {string} selector
	 * @param {string} hint
	 * @returns {AgentValidationError}
	 */
	static observationSelectorsEmpty(selector, hint) {
		return new AgentValidationError(
			'Selector is not in the observation yet',
			`Selector "${selector}" is not in elements[]. ${hint}`,
		)
	}

	/**
	 * @param {string} selector
	 * @param {string} hint
	 * @param {PageElement[]} [suggestedElements]
	 * @returns {AgentValidationError}
	 */
	static selectorNotInObservation(selector, hint, suggestedElements = []) {
		return new AgentValidationError(
			'Selector is not in the current observation',
			`Selector "${selector}" is not in elements[]. ${hint}`,
			{ suggestedElements },
		)
	}

	/**
	 * @param {string} toolName
	 * @param {PageElement[]} [suggestedElements]
	 * @returns {AgentValidationError}
	 */
	static missingSelector(toolName, suggestedElements = []) {
		return new AgentValidationError(
			`${toolName} requires a selector`,
			`${toolName}: missing selector parameter.`,
			{ suggestedElements },
		)
	}

	/**
	 * @param {string} toolName
	 * @param {string} detail
	 * @returns {AgentValidationError}
	 */
	static invalidParams(toolName, detail) {
		return new AgentValidationError(
			`${toolName} received invalid parameters`,
			`${toolName}: ${detail}`,
		)
	}

	/**
	 * @param {string} hostname
	 * @returns {AgentValidationError}
	 */
	static hostNotAllowed(hostname) {
		return new AgentValidationError(
			`Host "${hostname}" is not allowed`,
			`Host "${hostname}" is not allowed by AGENT_ALLOWED_HOSTS.`,
		)
	}

	/**
	 * @param {string} toolName
	 * @param {string} selector
	 * @returns {AgentValidationError}
	 */
	static notInteractable(toolName, selector) {
		return new AgentValidationError(
			'Element is not interactable',
			`${toolName}: elements[].interactable is false for "${selector}".`,
		)
	}

	/**
	 * @returns {AgentValidationError}
	 */
	static paginationExhausted() {
		return new AgentValidationError(
			'All elements are already listed',
			'paginateElements rejected: elementsPage.hasMore is false.',
		)
	}

	/**
	 * @param {string} name
	 * @param {string[]} allowedToolNames
	 * @param {string | null} suggestedToolName
	 * @returns {AgentValidationError}
	 */
	static actionNotAllowed(name, allowedToolNames, suggestedToolName) {
		const suggestion = suggestedToolName
			? ` Nearest tool name: "${suggestedToolName}".`
			: ` Allowed tools: ${allowedToolNames.join(', ')}.`

		return new AgentValidationError(
			`Action "${name}" is not allowed in agent mode`,
			`Tool "${name}" is not in the tool list.${suggestion}`,
		)
	}
}
