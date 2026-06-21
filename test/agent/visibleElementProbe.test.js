import test from 'node:test'
import assert from 'node:assert'
import { normalizeProbeTags } from '../../src/agent/visibleElementProbe.js'

test('normalizeProbeTags accepts primitive HTML tags', () => {
	assert.deepStrictEqual(normalizeProbeTags(['p', 'H1', 'span']), ['p', 'h1', 'span'])
})

test('normalizeProbeTags rejects empty tag lists', () => {
	assert.throws(() => normalizeProbeTags([]), /non-empty tags array/)
})

test('normalizeProbeTags rejects unsupported tags', () => {
	assert.throws(() => normalizeProbeTags(['script']), /not allowed/)
})
