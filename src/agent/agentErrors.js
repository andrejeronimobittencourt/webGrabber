/**
 * Agent validation error with separate CLI and model-facing messages.
 */
export class AgentValidationError extends Error {
	/** @type {string} */
	userMessage

	/**
	 * @param {string} userMessage Short text for CLI logs.
	 * @param {string} modelMessage Full text returned to the reason model.
	 */
	constructor(userMessage, modelMessage) {
		super(modelMessage)
		this.name = 'AgentValidationError'
		this.userMessage = userMessage
	}

	/**
	 * @param {string} selector
	 * @param {string} hint
	 * @returns {AgentValidationError}
	 */
	static cheatsheetEmpty(selector, hint) {
		return new AgentValidationError(
			'Selector is not in the element list yet',
			`Selector "${selector}" is not in the element list yet. ${hint}`,
		)
	}

	/**
	 * @param {string} selector
	 * @param {string} hint
	 * @returns {AgentValidationError}
	 */
	static cheatsheetUnknown(selector, hint) {
		return new AgentValidationError(
			'Selector is not in the current element list',
			`Selector "${selector}" is not in the current element list. ${hint}`,
		)
	}
}
