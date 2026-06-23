import test from 'node:test'
import assert from 'node:assert'
import {
	findSimilarAgentToolNames,
	levenshteinDistance,
	resolveAgentToolName,
	suggestAgentToolName,
} from '../../src/agent/agentToolNameResolver.js'

const allowedToolNames = [
	'navigate',
	'click',
	'type',
	'paginateElements',
	'getElements',
]

test('levenshteinDistance treats pagetinateElements as close to paginateElements', () => {
	assert.ok(levenshteinDistance('pagetinateElements', 'paginateElements') <= 3)
})

test('resolveAgentToolName auto-corrects pagetinateElements', () => {
	assert.strictEqual(
		resolveAgentToolName('pagetinateElements', allowedToolNames),
		'paginateElements',
	)
})

test('resolveAgentToolName preserves exact allowed tool names', () => {
	assert.strictEqual(resolveAgentToolName('click', allowedToolNames), 'click')
})

test('resolveAgentToolName normalizes case-insensitive matches', () => {
	assert.strictEqual(resolveAgentToolName('CLICK', allowedToolNames), 'click')
})

test('suggestAgentToolName returns a single close match for typos', () => {
	assert.strictEqual(
		suggestAgentToolName('pagetinateElements', allowedToolNames),
		'paginateElements',
	)
})

test('findSimilarAgentToolNames avoids ambiguous suggestions', () => {
	const similar = findSimilarAgentToolNames('getElement', allowedToolNames)

	assert.ok(similar.includes('getElements'))
})
