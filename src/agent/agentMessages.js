import { ActionError, SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { MAX_TOOL_HISTORY_STEPS } from './agentConfig.js'
import { buildAgentSystemPrompt } from './agentEnvironment.js'
import { AgentValidationError } from './agentErrors.js'
import { formatObservationForModel } from './agentObservationFormat.js'

/** @typedef {import('./OllamaClient.js').OllamaChatMessage} OllamaChatMessage */
/** @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep */

const MAX_AVAILABLE_SELECTORS = 30

/** Nudge when the model returns neither tool calls nor answer text. */
export const EMPTY_ASSISTANT_NUDGE =
	'Last response had no tool calls and no answer text.'

/** Prefix for the current-page observation user turn. */
export const OBSERVATION_MESSAGE_PREFIX = 'Current page observation:\n'

/** Prefix for the compact tool-call history user turn. */
export const TOOL_HISTORY_MESSAGE_PREFIX = 'Tools called this run:\n'

/** Prefix for validation and stall notes from the previous step. */
export const FEEDBACK_MESSAGE_PREFIX = 'Last step:\n'

/**
 * @param {unknown} observation
 * @returns {string}
 */
export function buildObservationMessage(observation) {
	const payload = formatObservationForModel(
		/** @type {import('./observePage.js').PageObservation} */ (observation),
	)

	return `${OBSERVATION_MESSAGE_PREFIX}${JSON.stringify(payload)}`
}

/**
 * @param {AgentStep[]} steps
 * @returns {string}
 */
export function buildToolHistoryMessage(steps) {
	const recentSteps =
		steps.length > MAX_TOOL_HISTORY_STEPS
			? steps.slice(-MAX_TOOL_HISTORY_STEPS)
			: steps
	const history = recentSteps.map(({ action, params }) => ({
		tool: action,
		params,
	}))

	return `${TOOL_HISTORY_MESSAGE_PREFIX}${JSON.stringify(history)}`
}

/**
 * @param {string[]} feedback
 * @returns {string | null}
 */
export function buildFeedbackMessage(feedback) {
	if (feedback.length === 0) {
		return null
	}

	return `${FEEDBACK_MESSAGE_PREFIX}${feedback.join('\n')}`
}

/**
 * Build a fresh model payload each turn — no accumulated chat history.
 * @param {{ instruction: string, observation: unknown, steps?: AgentStep[], feedback?: string[], referenceDate?: Date, visionAvailable?: boolean, exportMode?: boolean }} options
 * @returns {OllamaChatMessage[]}
 */
export function buildAgentModelMessages({
	instruction,
	observation,
	steps = [],
	feedback = [],
	referenceDate = new Date(),
	visionAvailable = false,
	exportMode = false,
}) {
	/** @type {OllamaChatMessage[]} */
	const messages = [
		{ role: 'system', content: buildAgentSystemPrompt(referenceDate, { visionAvailable, exportMode }) },
		{ role: 'user', content: instruction },
	]

	if (steps.length > 0) {
		messages.push({ role: 'user', content: buildToolHistoryMessage(steps) })
	}

	const feedbackMessage = buildFeedbackMessage(feedback)

	if (feedbackMessage) {
		messages.push({ role: 'user', content: feedbackMessage })
	}

	messages.push({ role: 'user', content: buildObservationMessage(observation) })

	return messages
}

/**
 * @param {OllamaChatMessage} message
 * @returns {boolean}
 */
export function isObservationMessage(message) {
	return (
		message.role === 'user' &&
		typeof message.content === 'string' &&
		message.content.startsWith(OBSERVATION_MESSAGE_PREFIX)
	)
}

/**
 * Tool result payload returned to the reason model after a failed tool call.
 * @param {unknown} error
 * @param {Set<string>} knownSelectors
 * @returns {{ error: string, availableSelectors?: string[] }}
 */
export function buildAgentToolResultForModel(error, knownSelectors) {
	const message = error instanceof Error ? error.message : String(error)
	/** @type {{ error: string, availableSelectors?: string[], suggestedElements?: import('./observePage.js').PageElement[] }} */
	const result = { error: message }

	if (error instanceof AgentValidationError && knownSelectors.size > 0) {
		result.availableSelectors = [...knownSelectors].slice(0, MAX_AVAILABLE_SELECTORS)
	}

	if (error instanceof AgentValidationError && error.suggestedElements?.length) {
		result.suggestedElements = error.suggestedElements
	}

	return result
}

/**
 * Format tool failure feedback for the next model turn.
 * @param {string} toolName
 * @param {unknown} error
 * @param {Set<string>} knownSelectors
 * @returns {string}
 */
export function formatAgentToolFeedbackForModel(toolName, error, knownSelectors) {
	return `${toolName}: ${JSON.stringify(buildAgentToolResultForModel(error, knownSelectors))}`
}

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

/**
 * @param {OllamaChatMessage} message
 * @returns {boolean}
 */
export function hasAssistantToolCalls(message) {
	return Boolean(message.tool_calls?.length)
}

/**
 * Extract final answer text from an assistant message.
 * @param {OllamaChatMessage} message
 * @returns {string}
 */
export function resolveAssistantAnswerText(message) {
	if (typeof message.content === 'string') {
		return message.content.trim()
	}

	if (Array.isArray(message.content)) {
		return message.content
			.filter((part) => part?.type === 'text' && typeof part.text === 'string')
			.map((part) => part.text)
			.join('')
			.trim()
	}

	return ''
}

/**
 * @param {OllamaChatMessage} message
 * @returns {boolean}
 */
export function isEmptyAssistantTurn(message) {
	return !hasAssistantToolCalls(message) && !resolveAssistantAnswerText(message)
}
