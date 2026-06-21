import test from 'node:test'
import assert from 'node:assert'
import GrabCatalog, {
	collectLiteralRunGrabTargets,
	detectGrabCycle,
	validateGrabCatalog,
} from '../packages/core/grabCatalog.js'

const baseGrab = (name, actions, overrides = {}) => ({
	name,
	importable: false,
	actions,
	...overrides,
})

test('collectLiteralRunGrabTargets finds nested runGrab literals', () => {
	const targets = collectLiteralRunGrabTargets([
		{
			name: 'runGrab',
			params: {
				grab: 'child-grab',
				params: { username: '{{USERNAME}}' },
			},
		},
		{
			name: 'if',
			params: {
				condition: 'true',
				actions: [{ name: 'runGrab', params: { grab: 'nested-grab' } }],
			},
		},
	])

	assert.deepStrictEqual(targets, ['child-grab', 'nested-grab'])
})

test('collectLiteralRunGrabTargets skips interpolated grab names', () => {
	const targets = collectLiteralRunGrabTargets([
		{ name: 'runGrab', params: { grab: '{{TARGET_GRAB}}' } },
	])

	assert.deepStrictEqual(targets, [])
})

test('validateGrabCatalog rejects missing literal runGrab targets', () => {
	assert.throws(
		() =>
			validateGrabCatalog([
				baseGrab('parent', [{ name: 'runGrab', params: { grab: 'missing-child' } }]),
			]),
		/references missing grab "missing-child"/,
	)
})

test('validateGrabCatalog rejects non-importable literal runGrab targets', () => {
	assert.throws(
		() =>
			validateGrabCatalog([
				baseGrab('entry', [{ name: 'runGrab', params: { grab: 'entry-child' } }]),
				baseGrab('entry-child', [{ name: 'log', params: { message: 'child' } }]),
			]),
		/references non-importable grab "entry-child"/,
	)
})

test('validateGrabCatalog rejects static cycles', () => {
	assert.throws(
		() =>
			validateGrabCatalog([
				baseGrab('a', [{ name: 'runGrab', params: { grab: 'b' } }], { importable: true }),
				baseGrab('b', [{ name: 'runGrab', params: { grab: 'a' } }], { importable: true }),
			]),
		/Circular grab call detected: a → b → a/,
	)
})

test('detectGrabCycle returns null for acyclic importable graph', () => {
	const cycle = detectGrabCycle([
		baseGrab('a', [{ name: 'runGrab', params: { grab: 'b' } }], { importable: true }),
		baseGrab('b', [{ name: 'log', params: { message: 'ok' } }], { importable: true }),
	])

	assert.strictEqual(cycle, null)
})

test('GrabCatalog lists importable grabs only', () => {
	const catalog = new GrabCatalog([
		baseGrab('entry', [{ name: 'log', params: { message: 'entry' } }]),
		baseGrab('helper', [{ name: 'log', params: { message: 'helper' } }], { importable: true }),
	])

	assert.strictEqual(catalog.get('helper')?.importable, true)
	assert.strictEqual(catalog.listImportable().length, 1)
})
