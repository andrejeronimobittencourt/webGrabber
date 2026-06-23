import test from 'node:test'
import assert from 'node:assert'
import AgentObservationCache, {
	buildDomCacheKey,
	buildVisionCacheKey,
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

test('buildVisionCacheKey incorporates screenshot hash', () => {
	const domKey = buildDomCacheKey({
		url: 'https://example.com',
		scrollX: 0,
		scrollY: 0,
		domSignature: '1|BUTTON:go',
	})

	assert.notStrictEqual(
		buildVisionCacheKey(domKey, 'screenshot-a'),
		buildVisionCacheKey(domKey, 'screenshot-b'),
	)
})

test('AgentObservationCache stores and clears vision entries', () => {
	const cache = new AgentObservationCache()
	const visionKey = 'vision-key'

	cache.setVision(visionKey, 'A search page.')

	assert.strictEqual(cache.hasVision(visionKey), true)
	assert.strictEqual(cache.getVision(visionKey), 'A search page.')

	cache.invalidate()

	assert.strictEqual(cache.hasVision(visionKey), false)
})

test('hashContent returns sha256 hex', () => {
	assert.strictEqual(hashContent('test').length, 64)
})
