import test from 'node:test'
import assert from 'node:assert'
import {
	attributeProgressToRecentSteps,
	buildObservationFingerprint,
	buildRepeatedStalledActionFeedback,
	buildToolAttemptKey,
	findRepeatedStalledAttempt,
	findConsecutiveSameToolOnSamePage,
	observationFingerprintsEqual,
} from '../../src/agent/agentProgress.js'

test('buildToolAttemptKey is stable regardless of param key order', () => {
	const left = buildToolAttemptKey('click', { selector: 'a', text: 'Go' })
	const right = buildToolAttemptKey('click', { text: 'Go', selector: 'a' })

	assert.strictEqual(left, right)
})

test('buildObservationFingerprint changes when elements change', () => {
	const before = buildObservationFingerprint({
		url: 'https://example.com',
		title: 'Example',
		elements: [{ selector: 'h1', text: 'Hello' }],
	})
	const after = buildObservationFingerprint({
		url: 'https://example.com',
		title: 'Example',
		elements: [{ selector: 'h1', text: 'Hello world' }],
	})

	assert.strictEqual(observationFingerprintsEqual(before, after), false)
})

test('findRepeatedStalledAttempt detects two identical stalled clicks', () => {
	/** @type {import('../../src/agent/AgentToolMapper.js').AgentStep[]} */
	const steps = [
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
	]

	assert.deepStrictEqual(findRepeatedStalledAttempt(steps), {
		action: 'click',
		params: { selector: 'button.search' },
		count: 2,
	})
})

test('findRepeatedStalledAttempt ignores repeats after progress', () => {
	/** @type {import('../../src/agent/AgentToolMapper.js').AgentStep[]} */
	const steps = [
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
		{
			action: 'navigate',
			params: { url: 'https://example.com/results' },
			madeProgress: true,
			error: null,
			timestamp: '',
		},
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
	]

	assert.strictEqual(findRepeatedStalledAttempt(steps), null)
})

test('buildRepeatedStalledActionFeedback returns runtime guidance', () => {
	const feedback = buildRepeatedStalledActionFeedback([
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
		{
			action: 'click',
			params: { selector: 'button.search' },
			madeProgress: false,
			error: null,
			timestamp: '',
		},
	])

	assert.match(String(feedback), /click with the same parameters was tried 2 times/)
	assert.match(String(feedback), /different tool or different parameters/)
})

test('findConsecutiveSameToolOnSamePage detects paginate loops on one page', () => {
	/** @type {import('../../src/agent/AgentToolMapper.js').AgentStep[]} */
	const steps = [
		{
			action: 'paginateElements',
			params: { offset: 0 },
			pageUrl: 'https://example.com/search',
			error: null,
			timestamp: '',
		},
		{
			action: 'paginateElements',
			params: { offset: 25 },
			pageUrl: 'https://example.com/search',
			error: null,
			timestamp: '',
		},
		{
			action: 'paginateElements',
			params: { offset: 50 },
			pageUrl: 'https://example.com/search',
			error: null,
			timestamp: '',
		},
	]

	assert.deepStrictEqual(findConsecutiveSameToolOnSamePage(steps), {
		action: 'paginateElements',
		count: 3,
		pageUrl: 'https://example.com/search',
	})
})

test('buildRepeatedStalledActionFeedback reports same-page tool loops', () => {
	const feedback = buildRepeatedStalledActionFeedback([
		{
			action: 'paginateElements',
			params: { offset: 0 },
			pageUrl: 'https://example.com',
			error: null,
			timestamp: '',
		},
		{
			action: 'paginateElements',
			params: { offset: 25 },
			pageUrl: 'https://example.com',
			error: null,
			timestamp: '',
		},
		{
			action: 'paginateElements',
			params: { offset: 50 },
			pageUrl: 'https://example.com',
			error: null,
			timestamp: '',
		},
	])

	assert.match(String(feedback), /paginateElements was called 3 times in a row on the same page/)
})

test('attributeProgressToRecentSteps marks only new steps', () => {
	/** @type {import('../../src/agent/AgentToolMapper.js').AgentStep[]} */
	const steps = [
		{ action: 'navigate', params: { url: 'https://example.com' }, error: null, timestamp: '' },
		{ action: 'click', params: { selector: 'a' }, error: null, timestamp: '' },
	]

	attributeProgressToRecentSteps(steps, 1, false)

	assert.strictEqual(steps[0].madeProgress, undefined)
	assert.strictEqual(steps[1].madeProgress, false)
})
