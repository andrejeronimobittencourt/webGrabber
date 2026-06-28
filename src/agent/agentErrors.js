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
	 * @param {string} toolName
	 * @returns {AgentValidationError}
	 */
	static missingSelector(toolName) {
		return new AgentValidationError(
			`${toolName} requires a selector`,
			`${toolName}: missing selector parameter.`,
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
	 * @returns {AgentValidationError}
	 */
	static paginationExhausted() {
		return new AgentValidationError(
			'All elements are already listed',
			'paginateHtml rejected: htmlPage.hasMore is false.',
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
