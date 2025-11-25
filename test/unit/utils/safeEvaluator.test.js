import test from 'node:test'
import assert from 'node:assert'
import { safeEvaluate, validateExpression } from '../../../src/utils/safeEvaluator.js'

test('safeEvaluate - evaluates simple expressions', () => {
	const context = { INPUT: 10 }
	const result = safeEvaluate('INPUT > 5', context)
	assert.strictEqual(result, true)
})

test('safeEvaluate - evaluates with built-in functions', () => {
	const context = { INPUT: [1, 2, 3] }
	const result = safeEvaluate('length(INPUT) == 3', context)
	assert.strictEqual(result, true)
})

test('safeEvaluate - handles includes function', () => {
	const context = { INPUT: ['hello', 'world'] }
	const result = safeEvaluate('includes(INPUT, "hello")', context)
	assert.strictEqual(result, true)
})

test('validateExpression - rejects dangerous patterns', () => {
	assert.strictEqual(validateExpression('require("fs")'), false)
	assert.strictEqual(validateExpression('eval("code")'), false)
	assert.strictEqual(validateExpression('process.exit()'), false)
	assert.strictEqual(validateExpression('__proto__'), false)
})

test('validateExpression - accepts safe expressions', () => {
	assert.strictEqual(validateExpression('INPUT > 5'), true)
	assert.strictEqual(validateExpression('length(INPUT) > 0'), true)
	assert.strictEqual(validateExpression('includes(INPUT, "test")'), true)
})

test('safeEvaluate - throws on invalid expression', () => {
	const context = { INPUT: 10 }
	assert.throws(
		() => {
			safeEvaluate('INVALID SYNTAX +++', context)
		},
		/Invalid expression/,
	)
})
