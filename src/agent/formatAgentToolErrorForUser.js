import { ActionError, SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { AgentValidationError } from './agentErrors.js'

/**
 * Short error text for agent CLI logs. Full errors stay in tool results for the model.
 * @param {unknown} error
 * @returns {string}
 */
export function formatAgentToolErrorForUser(error) {
	if (!(error instanceof Error)) {
		return String(error)
	}

	if (error instanceof AgentValidationError) {
		return error.userMessage
	}

	if (error instanceof SelectorError) {
		return 'Selector not found or not visible'
	}

	if (error instanceof ActionError) {
		return error.message.replace(/^\[[^\]]+\]\s*/, '')
	}

	return error.message
}
