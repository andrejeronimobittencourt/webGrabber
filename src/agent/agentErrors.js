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
			`Selector "${selector}" is not in the observation yet. ${hint}`,
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
			`Selector "${selector}" is not in the current observation. ${hint}`,
			{ suggestedElements },
		)
	}

	/**
	 * @param {string} toolName
	 * @param {PageElement[]} [suggestedElements]
	 * @returns {AgentValidationError}
	 */
	static missingSelector(toolName, suggestedElements = []) {
		const suffix =
			suggestedElements.length > 0
				? ' Pass selector from elements; see suggestedElements.'
				: ' Pass selector copied exactly from an elements entry.'

		return new AgentValidationError(
			`${toolName} requires a selector`,
			`${toolName} requires selector from the current elements list.${suffix}`,
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
			`Host "${hostname}" is not allowed by AGENT_ALLOWED_HOSTS`,
		)
	}

	/**
	 * @returns {AgentValidationError}
	 */
	static paginationExhausted() {
		return new AgentValidationError(
			'All elements are already listed',
			'paginateElements cannot run because elementsPage.hasMore is false. Read the current elements or use another tool.',
		)
	}

	/**
	 * @param {string} name
	 * @param {string[]} allowedToolNames
	 * @returns {AgentValidationError}
	 */
	static actionNotAllowed(name, allowedToolNames) {
		return new AgentValidationError(
			`Action "${name}" is not allowed in agent mode`,
			`Action "${name}" is not allowed. Use only the provided tools: ${allowedToolNames.join(', ')}.`,
		)
	}
}
