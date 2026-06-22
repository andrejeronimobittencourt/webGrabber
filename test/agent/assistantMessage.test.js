import test from 'node:test'
import assert from 'node:assert'
import {
	hasAssistantToolCalls,
	isEmptyAssistantTurn,
	resolveAssistantAnswerText,
} from '../../src/agent/agentMessages.js'

test('resolveAssistantAnswerText returns trimmed string content', () => {
	assert.strictEqual(
		resolveAssistantAnswerText({ role: 'assistant', content: '  Brazil vs Spain  ' }),
		'Brazil vs Spain',
	)
})

test('resolveAssistantAnswerText joins text parts from array content', () => {
	assert.strictEqual(
		resolveAssistantAnswerText({
			role: 'assistant',
			content: [{ type: 'text', text: 'Done.' }],
		}),
		'Done.',
	)
})

test('resolveAssistantAnswerText ignores reasoning-only fields', () => {
	assert.strictEqual(
		resolveAssistantAnswerText({
			role: 'assistant',
			content: '',
			reasoning: 'Let me think about the search results.',
		}),
		'',
	)
})

test('hasAssistantToolCalls detects tool calls', () => {
	assert.strictEqual(
		hasAssistantToolCalls({
			role: 'assistant',
			tool_calls: [{ id: '1', type: 'function', function: { name: 'click', arguments: '{}' } }],
		}),
		true,
	)
})

test('isEmptyAssistantTurn is true without tools or answer text', () => {
	assert.strictEqual(
		isEmptyAssistantTurn({ role: 'assistant', content: '   ' }),
		true,
	)
})
