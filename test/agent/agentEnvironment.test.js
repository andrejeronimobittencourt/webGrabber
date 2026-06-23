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

test('buildAgentSystemPrompt includes the run date and environment description', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21))

	assert.match(prompt, /Today's date is 2026-06-21\./)
	assert.match(prompt, /browser automation agent/)
	assert.match(prompt, /The user does not see the browser/)
	assert.match(prompt, /Tools are listed in the tools API/)
	assert.match(prompt, /elements\[\] entries have selector, text, and interactable/)
	assert.match(prompt, /click, type, and pressKey require interactable true/)
	assert.match(prompt, /elementsPage.hasMore is false/)
	assert.doesNotMatch(prompt, /inspectElement is available/)
	assert.doesNotMatch(prompt, /pickElement is required/)
	assert.match(prompt, /Vision disabled/)
})

test('buildAgentSystemPrompt includes export mode description when exporting', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21), { exportMode: true })

	assert.match(prompt, /Export mode: pickElement is required/)
})

test('buildAgentSystemPrompt states vision capability when available', () => {
	const prompt = buildAgentSystemPrompt(new Date(2026, 5, 21), { visionAvailable: true })

	assert.match(prompt, /Vision enabled/)
	assert.match(prompt, /visualSummary/)
	assert.match(prompt, /inspectElement is available/)
})

test('buildVisionConstraint returns unavailable messaging by default', () => {
	assert.strictEqual(buildVisionConstraint(false), VISION_UNAVAILABLE_CONSTRAINT)
})
