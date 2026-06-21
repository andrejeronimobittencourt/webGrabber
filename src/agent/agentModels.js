/**
 * @param {{ reasonModel?: string, visionModel?: string }} [options]
 * @returns {string}
 */
export function resolveReasonModel(options = {}) {
	return options.reasonModel ?? process.env.AGENT_REASON_MODEL ?? 'gemma4:latest'
}

/** @type {Set<string>} */
const REASONING_EFFORTS = new Set(['high', 'medium', 'low', 'max'])

/**
 * @returns {boolean}
 */
export function isReasonThinkingEnabled() {
	return process.env.AGENT_REASON_THINKING === 'true'
}

/**
 * Ollama reasoning_effort for the reason model when AGENT_REASON_THINKING=true.
 * @returns {string | null}
 */
export function resolveReasoningEffort() {
	if (!isReasonThinkingEnabled()) {
		return null
	}

	const effort = process.env.AGENT_REASONING_EFFORT ?? 'medium'

	if (!REASONING_EFFORTS.has(effort)) {
		throw new Error(
			`Invalid AGENT_REASONING_EFFORT "${effort}". Use high, medium, low, or max.`,
		)
	}

	return effort
}

/**
 * @param {{ reasonModel?: string, visionModel?: string }} [options]
 * @returns {string | null}
 */
export function resolveVisionModel(options = {}) {
	const visionEnabled = process.env.AGENT_VISION === 'true'
	const explicitVision = options.visionModel ?? process.env.AGENT_VISION_MODEL

	if (explicitVision) {
		return explicitVision
	}

	if (visionEnabled) {
		return resolveReasonModel(options)
	}

	return null
}

/**
 * @returns {boolean}
 */
export function isVisionEnabled() {
	return process.env.AGENT_VISION === 'true'
}
