import { ActionError, SelectorError } from '../../packages/core/errors/ActionErrors.js'
import { MAX_TOOL_HISTORY_STEPS, SKIP_RESULT_TOOLS } from './agentConfig.js'
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
export const OBSERVATION_MESSAGE_PREFIX = '--- SYSTEM ENVIRONMENT STATE: CURRENT PAGE OBSERVATION ---\n'

/** Prefix for the compact tool-call history user turn. */
export const TOOL_HISTORY_MESSAGE_PREFIX = '--- SYSTEM ENVIRONMENT STATE: TOOL EXECUTION HISTORY ---\n'

/** Prefix for validation and stall notes from the previous step. */
export const FEEDBACK_MESSAGE_PREFIX = '--- SYSTEM ENVIRONMENT STATE: FEEDBACK FROM LAST ACTION ---\n'


/**
 * @param {unknown} observation
 * @returns {string}
 */
export function buildObservationMessage(observation) {
	const payload = formatObservationForModel(
		/** @type {import('./observePage.js').PageObservation} */ (observation),
	)

	const isErrorPage =
		typeof observation.url === 'string' && observation.url.startsWith('chrome-error://')

	const prefix = isErrorPage
		? 'Navigation hard-failed: the URL could not be loaded (DNS error or unreachable host). Do NOT guess another URL. Go back to a known working page and find a real link to follow.\n'
		: ''

	return `${prefix}${OBSERVATION_MESSAGE_PREFIX}${JSON.stringify(payload)}`
}

/**
 * Build a compact tool-history entry. Contains the tool name, params,
 * reason, and — critically — a failed flag when the step errored so the
 * model understands it must correct course rather than blindly continuing.
 * Results are excluded; the model learns from the next observation instead.
 * @param {AgentStep} step
 * @returns {{ tool: string, params: Record<string, unknown>, reason?: string, failed?: true }}
 */
function buildToolHistoryEntry(step) {
	const { reason, ...actionParams } = step.params ?? {}
	const entry = { tool: step.action, params: actionParams }

	if (step.reason) {
		entry.reason = step.reason
	} else if (typeof reason === 'string' && reason) {
		// Backwards-compat: reason may have been stored inside params on older steps.
		entry.reason = reason
	}

	if (step.error) {
		entry.failed = true
		entry.error = step.error
	}

	return entry
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

	const history = recentSteps.map(buildToolHistoryEntry)

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
		{ role: 'user', content: `--- USER GOAL ---\n${instruction}` },
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
	if (message.tool_calls && message.tool_calls.length > 0) {
		return true
	}

	// Graceful fallback for models like Gemma that sometimes emit JSON instead of native API calls
	const content = extractRawContent(message)
	if (!content) return false

	try {
		const startIndex = content.indexOf('{')
		const endIndex = content.lastIndexOf('}')
		
		if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
			const jsonStr = content.slice(startIndex, endIndex + 1)
			const parsed = JSON.parse(jsonStr)
			
			if (parsed && typeof parsed === 'object' && typeof parsed.tool === 'string') {
				message.tool_calls = [{
					function: {
						name: parsed.tool,
						arguments: JSON.stringify(parsed.params || {})
					}
				}]
				return true
			}
		}
	} catch (e) {
		// Ignore parsing errors, it wasn't a valid tool JSON block
	}

	return false
}

/**
 * @typedef {{ text: string, selector: string | null }} AssistantAnswer
 */

/**
 * Extract the raw string content from an assistant message regardless of format.
 * @param {OllamaChatMessage} message
 * @returns {string}
 */
function extractRawContent(message) {
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
	return !hasAssistantToolCalls(message) && !extractRawContent(message)
}
