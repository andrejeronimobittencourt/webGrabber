/**
 * Tests for export-mode answer parsing (replaces the removed mustPickBeforeAnswer / pickElement flow).
 * In export mode the model embeds the answer and selector as JSON:
 *   {"answer":"Example Domain","selector":"h1"}
 */
import test from 'node:test'
import assert from 'node:assert'
import { resolveAssistantAnswer } from '../../src/agent/agentMessages.js'

test('resolveAssistantAnswer extracts JSON answer and selector in export mode', () => {
	const message = {
		role: 'assistant',
		content: JSON.stringify({ answer: 'Example Domain', selector: 'h1.title' }),
	}
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'Example Domain')
	assert.strictEqual(result.selector, 'h1.title')
})

test('resolveAssistantAnswer returns null selector when JSON has no selector', () => {
	const message = {
		role: 'assistant',
		content: JSON.stringify({ answer: 'Some text' }),
	}
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'Some text')
	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer trims whitespace from extracted answer text', () => {
	const message = {
		role: 'assistant',
		content: JSON.stringify({ answer: '  trimmed  ', selector: 'p' }),
	}
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'trimmed')
})

test('resolveAssistantAnswer falls back to raw text when export-mode JSON is malformed', () => {
	const message = { role: 'assistant', content: 'not valid JSON' }
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'not valid JSON')
	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer returns plain text and null selector in non-export mode', () => {
	const message = { role: 'assistant', content: 'plain answer' }
	const result = resolveAssistantAnswer(message, false)

	assert.strictEqual(result.text, 'plain answer')
	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer ignores selector in non-export mode even when JSON is present', () => {
	const message = {
		role: 'assistant',
		content: JSON.stringify({ answer: 'Foo', selector: 'div' }),
	}
	// Non-export mode: returns raw JSON string, not parsed.
	const result = resolveAssistantAnswer(message, false)

	assert.strictEqual(result.selector, null)
})

test('resolveAssistantAnswer handles multi-part content arrays in export mode', () => {
	const message = {
		role: 'assistant',
		content: [
			{ type: 'text', text: JSON.stringify({ answer: 'Domain', selector: 'h1' }) },
		],
	}
	const result = resolveAssistantAnswer(message, true)

	assert.strictEqual(result.text, 'Domain')
	assert.strictEqual(result.selector, 'h1')
})
