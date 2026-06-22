import test from 'node:test'
import assert from 'node:assert'
import {
	buildAgentSystemPrompt,
	buildVisionConstraint,
	formatAgentRunDate,
	VISION_UNAVAILABLE_CONSTRAINT,
} from '../../src/agent/agentEnvironment.js'

test('formatAgentRunDate returns local YYYY-MM-DD', () => {
	assert.strictEqual(formatAgentRunDate(new Date(2026, 5, 21)), '2026-06-21')
})

test('buildAgentSystemPrompt includes the run date and environment constraints', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21))

	assert.match(prompt, /Today's date is 2026-06-21\./)
	assert.match(prompt, /browser automation agent/)
	assert.match(prompt, /The user cannot see the browser/)
	assert.match(prompt, /Only use tools from the provided tool list/)
	assert.match(prompt, /elements is the only allowed source of selectors/)
	assert.doesNotMatch(prompt, /inspectElement/)
	assert.match(prompt, /did not change the observation twice/)
	assert.match(prompt, /hasMore is false/)
	assert.doesNotMatch(prompt, /pickElement is required/)
	assert.match(prompt, /Vision is disabled/)
})

test('buildAgentSystemPrompt includes export pick constraint when exporting', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21), { exportMode: true })

	assert.match(prompt, /call pickElement/)
})

test('buildAgentSystemPrompt states vision capability when available', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21), { visionAvailable: true })

	assert.match(prompt, /Vision is enabled/)
	assert.match(prompt, /visualSummary/)
	assert.match(prompt, /inspectElement/)
})

test('buildVisionConstraint returns unavailable messaging by default', () => {
	assert.strictEqual(buildVisionConstraint(false), VISION_UNAVAILABLE_CONSTRAINT)
})
