import test from 'node:test'
import assert from 'node:assert'
import {
	buildAgentModelMessages,
	buildObservationMessage,
	buildToolHistoryMessage,
	EMPTY_ASSISTANT_NUDGE,
	isObservationMessage,
	resolveAssistantAnswer,
} from '../../src/agent/agentMessages.js'

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
			{ action: 'navigate', params: { url: 'https://example.com' }, reason: 'Go to the target page', result: {}, error: null, timestamp: '' },
			{ action: 'click', params: { selector: 'a' }, reason: 'Follow the link', result: {}, error: null, timestamp: '' },
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
	assert.match(String(messages[2].content), /"tool":"navigate"/)
	assert.match(String(messages[2].content), /"tool":"click"/)
	// History contains only tool, params, and reason — never result or error.
	assert.doesNotMatch(String(messages[2].content), /"result"/)
	assert.doesNotMatch(String(messages[2].content), /"error"/)
	assert.match(String(messages[2].content), /"reason":"Go to the target page"/)
	assert.match(String(messages[3].content), /^Last step:\n/)
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

test('buildToolHistoryMessage includes tool names and params only — no result or error', () => {
	const message = buildToolHistoryMessage([
		{
			action: 'type',
			params: { selector: '#q', text: 'hello' },
			reason: 'Fill in the search field',
			result: { ignored: true },
			error: 'should not appear',
			timestamp: '',
		},
	])

	assert.match(message, /"tool":"type"/)
	assert.match(message, /"selector":"#q"/)
	assert.match(message, /"reason":"Fill in the search field"/)
	assert.doesNotMatch(message, /ignored/)
	assert.doesNotMatch(message, /should not appear/)
})

test('buildAgentModelMessages carries runtime feedback constants', () => {
	const messages = buildAgentModelMessages({
		instruction: 'Answer from visible text',
		observation: { url: 'https://example.com', elements: [] },
		feedback: [EMPTY_ASSISTANT_NUDGE],
	})

	const feedbackContent = String(messages.at(-2)?.content)

	assert.match(feedbackContent, /Last step:\n/)
	assert.match(feedbackContent, /Last response had no tool calls/)
})

test('resolveAssistantAnswer extracts text and selector in export mode', () => {
	const message = { role: 'assistant', content: JSON.stringify({ answer: 'Example Domain', selector: 'h1' }) }
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'Example Domain')
	assert.strictEqual(result.selector, 'h1')
})

test('resolveAssistantAnswer falls back to raw text in export mode when selector is missing', () => {
	const message = { role: 'assistant', content: JSON.stringify({ answer: 'Example Domain' }) }
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'Example Domain')
	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer falls back to raw text in export mode when JSON is malformed', () => {
	const message = { role: 'assistant', content: 'plain text answer' }
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'plain text answer')
	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer returns plain text with null selector in non-export mode', () => {
	const message = { role: 'assistant', content: 'plain answer' }
	const result = resolveAssistantAnswer(message, false)

	assert.strictEqual(result.text, 'plain answer')
	assert.strictEqual(result.selector, null)
})
