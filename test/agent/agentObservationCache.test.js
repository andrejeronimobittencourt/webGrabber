import test from 'node:test'
import assert from 'node:assert'
import {
	buildDomCacheKey,
	hashContent,
	isMutatingAgentTool,
} from '../../src/agent/AgentObservationCache.js'

test('isMutatingAgentTool identifies page-changing tools', () => {
	assert.strictEqual(isMutatingAgentTool('click'), true)
	assert.strictEqual(isMutatingAgentTool('paginateElements'), false)
	assert.strictEqual(isMutatingAgentTool('getElements'), false)
})

test('buildDomCacheKey is stable for the same fingerprint', () => {
	const fingerprint = {
		url: 'https://example.com',
		scrollX: 0,
		scrollY: 120,
		domSignature: '3|A:search|INPUT:q:Search',
	}

	assert.strictEqual(buildDomCacheKey(fingerprint), buildDomCacheKey(fingerprint))
})

test('hashContent returns sha256 hex', () => {
	assert.strictEqual(hashContent('test').length, 64)
})
