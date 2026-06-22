import test from 'node:test'
import assert from 'node:assert'
import {
	buildAgentModelMessages,
	buildObservationMessage,
	buildToolHistoryMessage,
	EMPTY_ASSISTANT_NUDGE,
	isObservationMessage,
} from '../../src/agent/agentMessages.js'
import { PICK_ELEMENT_HINT } from '../../src/agent/agentEnvironment.js'

test('buildObservationMessage prefixes JSON observation payload', () => {
	const message = buildObservationMessage({ url: 'https://example.com', elements: [] })

	assert.match(message, /^Current page observation:\n/)
	assert.match(message, /"url":"https:\/\/example.com"/)
})

test('buildAgentModelMessages sends structured context without chat history', () => {
	const messages = buildAgentModelMessages({
		instruction: 'Go to example.com',
		observation: { url: 'https://example.com', elements: [] },
		steps: [
			{ action: 'navigate', params: { url: 'https://example.com' }, result: {}, error: null, timestamp: '' },
			{ action: 'click', params: { selector: 'a' }, result: {}, error: null, timestamp: '' },
		],
		feedback: ['click: {"error":"Selector is not in the current observation."}'],
		referenceDate: new Date(2026, 5, 21),
	})

	assert.strictEqual(messages.some((message) => message.role === 'assistant'), false)
	assert.strictEqual(messages.some((message) => message.role === 'tool'), false)
	assert.strictEqual(messages[0].role, 'system')
	assert.match(String(messages[0].content), /Today's date is 2026-06-21/)
	assert.strictEqual(messages[1].content, 'Go to example.com')
	assert.match(String(messages[2].content), /^Tools called this run:\n/)
	assert.match(String(messages[2].content), /"tool": "navigate"/)
	assert.match(String(messages[2].content), /"tool": "click"/)
	assert.doesNotMatch(String(messages[2].content), /"result"/)
	assert.match(String(messages[3].content), /^Feedback from last step:/)
	assert.match(String(messages[4].content), /^Current page observation:\n/)
	assert.strictEqual(messages.filter(isObservationMessage).length, 1)
})

test('buildAgentModelMessages omits tool history and feedback when empty', () => {
	const messages = buildAgentModelMessages({
		instruction: 'Go to example.com',
		observation: { url: 'about:blank', elements: [] },
	})

	assert.strictEqual(messages.length, 3)
	assert.strictEqual(messages[1].content, 'Go to example.com')
	assert.match(String(messages[2].content), /^Current page observation:\n/)
})

test('buildToolHistoryMessage includes tool names and params only', () => {
	const message = buildToolHistoryMessage([
		{
			action: 'type',
			params: { selector: '#q', text: 'hello' },
			result: { ignored: true },
			error: 'should not appear',
			timestamp: '',
		},
	])

	assert.match(message, /"tool": "type"/)
	assert.match(message, /"selector": "#q"/)
	assert.doesNotMatch(message, /ignored/)
	assert.doesNotMatch(message, /should not appear/)
})

test('buildAgentModelMessages carries runtime feedback constants', () => {
	const messages = buildAgentModelMessages({
		instruction: 'Answer from visible text',
		observation: { url: 'https://example.com', elements: [] },
		feedback: [EMPTY_ASSISTANT_NUDGE, PICK_ELEMENT_HINT],
	})

	const feedbackContent = String(messages.at(-2)?.content)

	assert.match(feedbackContent, /Feedback from last step:/)
	assert.match(feedbackContent, /Last response had no tool calls/)
	assert.match(feedbackContent, /pickElement is required/)
})
