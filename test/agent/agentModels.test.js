import test from 'node:test'
import assert from 'node:assert'
import {
	isReasonThinkingEnabled,
	isVisionEnabled,
	resolveReasonModel,
	resolveReasoningEffort,
	resolveVisionModel,
} from '../../src/agent/agentModels.js'

const restoreEnv = (snapshot) => {
	for (const key of Object.keys(process.env)) {
		if (!(key in snapshot)) {
			delete process.env[key]
		}
	}
	Object.assign(process.env, snapshot)
}

test('resolveReasonModel uses AGENT_REASON_MODEL when set', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_REASON_MODEL = 'reason-model'

	try {
		assert.strictEqual(resolveReasonModel(), 'reason-model')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveReasonModel falls back to gemma4:latest', () => {
	const snapshot = { ...process.env }
	delete process.env.AGENT_REASON_MODEL

	try {
		assert.strictEqual(resolveReasonModel(), 'gemma4:latest')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveVisionModel returns reason model when vision enabled and no vision model set', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_VISION = 'true'
	process.env.AGENT_REASON_MODEL = 'reason-model'
	delete process.env.AGENT_VISION_MODEL

	try {
		assert.strictEqual(resolveVisionModel(), 'reason-model')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveVisionModel uses dedicated vision model when set', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_VISION = 'true'
	process.env.AGENT_REASON_MODEL = 'reason-model'
	process.env.AGENT_VISION_MODEL = 'vision-model'

	try {
		assert.strictEqual(resolveVisionModel(), 'vision-model')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveVisionModel is null when vision disabled', () => {
	const snapshot = { ...process.env }
	delete process.env.AGENT_VISION

	try {
		assert.strictEqual(resolveVisionModel(), null)
	} finally {
		restoreEnv(snapshot)
	}
})

test('isVisionEnabled reads AGENT_VISION', () => {
	const snapshot = { ...process.env }

	try {
		process.env.AGENT_VISION = 'true'
		assert.strictEqual(isVisionEnabled(), true)

		process.env.AGENT_VISION = 'false'
		assert.strictEqual(isVisionEnabled(), false)
	} finally {
		restoreEnv(snapshot)
	}
})

test('isReasonThinkingEnabled reads AGENT_REASON_THINKING', () => {
	const snapshot = { ...process.env }

	try {
		process.env.AGENT_REASON_THINKING = 'true'
		assert.strictEqual(isReasonThinkingEnabled(), true)

		delete process.env.AGENT_REASON_THINKING
		assert.strictEqual(isReasonThinkingEnabled(), false)
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveReasoningEffort returns null when thinking is disabled', () => {
	const snapshot = { ...process.env }
	delete process.env.AGENT_REASON_THINKING

	try {
		assert.strictEqual(resolveReasoningEffort(), null)
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveReasoningEffort defaults to medium when thinking is enabled', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_REASON_THINKING = 'true'
	delete process.env.AGENT_REASONING_EFFORT

	try {
		assert.strictEqual(resolveReasoningEffort(), 'medium')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveReasoningEffort reads AGENT_REASONING_EFFORT', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_REASON_THINKING = 'true'
	process.env.AGENT_REASONING_EFFORT = 'high'

	try {
		assert.strictEqual(resolveReasoningEffort(), 'high')
	} finally {
		restoreEnv(snapshot)
	}
})

test('resolveReasoningEffort rejects invalid effort values', () => {
	const snapshot = { ...process.env }
	process.env.AGENT_REASON_THINKING = 'true'
	process.env.AGENT_REASONING_EFFORT = 'turbo'

	try {
		assert.throws(() => resolveReasoningEffort(), /Invalid AGENT_REASONING_EFFORT/)
	} finally {
		restoreEnv(snapshot)
	}
})
