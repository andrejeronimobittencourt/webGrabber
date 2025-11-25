import test from 'node:test'
import assert from 'node:assert'
import { safeEvaluate, validateExpression } from '../src/utils/safeEvaluator.js'

test('safeEvaluator - Basic Arithmetic', async (t) => {
	await t.test('addition', () => {
		assert.strictEqual(safeEvaluate('2 + 3'), 5)
	})

	await t.test('subtraction', () => {
		assert.strictEqual(safeEvaluate('10 - 7'), 3)
	})

	await t.test('multiplication', () => {
		assert.strictEqual(safeEvaluate('4 * 5'), 20)
	})

	await t.test('division', () => {
		assert.strictEqual(safeEvaluate('20 / 4'), 5)
	})

	await t.test('modulo', () => {
		assert.strictEqual(safeEvaluate('10 % 3'), 1)
	})

	await t.test('exponentiation', () => {
		assert.strictEqual(safeEvaluate('2 ** 8'), 256)
	})

	await t.test('complex expression', () => {
		assert.strictEqual(safeEvaluate('2 + 3 * 4 - 5'), 9)
	})
})

test('safeEvaluator - Comparisons', async (t) => {
	await t.test('greater than', () => {
		assert.strictEqual(safeEvaluate('5 > 3'), true)
		assert.strictEqual(safeEvaluate('2 > 5'), false)
	})

	await t.test('less than', () => {
		assert.strictEqual(safeEvaluate('3 < 5'), true)
	})

	await t.test('equality', () => {
		assert.strictEqual(safeEvaluate('5 === 5'), true)
		assert.strictEqual(safeEvaluate('5 !== 3'), true)
	})

	await t.test('with variables', () => {
		assert.strictEqual(safeEvaluate('a > 10', { a: 15 }), true)
		assert.strictEqual(safeEvaluate('a === b', { a: 5, b: 5 }), true)
	})
})

test('safeEvaluator - Logical Operations', async (t) => {
	await t.test('AND operator', () => {
		assert.strictEqual(safeEvaluate('true && true'), true)
		assert.strictEqual(safeEvaluate('true && false'), false)
	})

	await t.test('OR operator', () => {
		assert.strictEqual(safeEvaluate('false || true'), true)
		assert.strictEqual(safeEvaluate('false || false'), false)
	})

	await t.test('NOT operator', () => {
		assert.strictEqual(safeEvaluate('!true'), false)
		assert.strictEqual(safeEvaluate('!false'), true)
	})

	await t.test('complex logical', () => {
		assert.strictEqual(safeEvaluate('a > 5 && b < 10', { a: 7, b: 8 }), true)
	})
})

test('safeEvaluator - Ternary Operator', async (t) => {
	await t.test('basic ternary', () => {
		assert.strictEqual(safeEvaluate('true ? "yes" : "no"'), 'yes')
		assert.strictEqual(safeEvaluate('false ? "yes" : "no"'), 'no')
	})

	await t.test('with variables', () => {
		assert.strictEqual(safeEvaluate('a > 10 ? "high" : "low"', { a: 15 }), 'high')
		assert.strictEqual(safeEvaluate('a > 10 ? "high" : "low"', { a: 5 }), 'low')
	})
})

test('safeEvaluator - Arrays', async (t) => {
	await t.test('array literal', () => {
		assert.deepStrictEqual(safeEvaluate('[1, 2, 3]'), [1, 2, 3])
	})

	await t.test('array access', () => {
		assert.strictEqual(safeEvaluate('arr[0]', { arr: [10, 20, 30] }), 10)
		assert.strictEqual(safeEvaluate('arr[2]', { arr: [10, 20, 30] }), 30)
	})

	await t.test('array length', () => {
		assert.strictEqual(safeEvaluate('arr.length', { arr: [1, 2, 3] }), 3)
	})

	await t.test('array includes', () => {
		assert.strictEqual(safeEvaluate('arr.includes(2)', { arr: [1, 2, 3] }), true)
		assert.strictEqual(safeEvaluate('arr.includes(5)', { arr: [1, 2, 3] }), false)
	})

	await t.test('array indexOf', () => {
		assert.strictEqual(safeEvaluate('arr.indexOf(2)', { arr: [1, 2, 3] }), 1)
	})
})

test('safeEvaluator - Objects', async (t) => {
	await t.test('object literal', () => {
		assert.deepStrictEqual(safeEvaluate('{a: 1, b: 2}'), { a: 1, b: 2 })
	})

	await t.test('property access', () => {
		assert.strictEqual(safeEvaluate('obj.name', { obj: { name: 'test' } }), 'test')
	})

	await t.test('bracket access', () => {
		assert.strictEqual(safeEvaluate('obj["key"]', { obj: { key: 'value' } }), 'value')
	})

	await t.test('nested access', () => {
		assert.strictEqual(
			safeEvaluate('obj.nested.value', { obj: { nested: { value: 42 } } }),
			42
		)
	})
})

test('safeEvaluator - String Operations', async (t) => {
	await t.test('string concatenation', () => {
		assert.strictEqual(safeEvaluate('"hello" + " " + "world"'), 'hello world')
	})

	await t.test('string includes', () => {
		assert.strictEqual(safeEvaluate('str.includes("test")', { str: 'this is a test' }), true)
	})

	await t.test('string toLowerCase', () => {
		assert.strictEqual(safeEvaluate('str.toLowerCase()', { str: 'HELLO' }), 'hello')
	})

	await t.test('string slice', () => {
		assert.strictEqual(safeEvaluate('str.slice(0, 5)', { str: 'hello world' }), 'hello')
	})

	await t.test('template literal', () => {
		assert.strictEqual(safeEvaluate('`Hello ${name}`', { name: 'World' }), 'Hello World')
	})
})

test('safeEvaluator - Math Operations', async (t) => {
	await t.test('Math.abs', () => {
		assert.strictEqual(safeEvaluate('Math.abs(-5)'), 5)
	})

	await t.test('Math.max', () => {
		assert.strictEqual(safeEvaluate('Math.max(1, 5, 3)'), 5)
	})

	await t.test('Math.min', () => {
		assert.strictEqual(safeEvaluate('Math.min(1, 5, 3)'), 1)
	})

	await t.test('Math.round', () => {
		assert.strictEqual(safeEvaluate('Math.round(4.7)'), 5)
	})

	await t.test('Math.floor', () => {
		assert.strictEqual(safeEvaluate('Math.floor(4.7)'), 4)
	})
})

test('safeEvaluator - Complex Real World Examples', async (t) => {
	await t.test('check array not empty and first element', () => {
		const context = { arr: [{ value: 15 }, { value: 5 }] }
		assert.strictEqual(safeEvaluate('arr.length > 0 && arr[0].value > 10', context), true)
	})

	await t.test('string validation', () => {
		const context = { email: 'user@example.com' }
		assert.strictEqual(safeEvaluate('email.includes("@") && email.length > 5', context), true)
	})

	await t.test('conditional based on multiple checks', () => {
		const context = { status: 'active', count: 5 }
		assert.strictEqual(
			safeEvaluate('status === "active" ? count * 2 : count', context),
			10
		)
	})
})

test('safeEvaluator - Security: Block Dangerous Operations', async (t) => {
	await t.test('block eval', () => {
		assert.throws(() => safeEvaluate('eval("1 + 1")'), /not allowed|not whitelisted|not defined/)
	})

	await t.test('block Function constructor', () => {
		assert.throws(() => safeEvaluate('Function("return 1")()'), /not allowed|Only method calls|not defined/)
	})

	await t.test('block __proto__ access', () => {
		assert.throws(() => safeEvaluate('obj.__proto__', { obj: {} }), /not allowed/)
	})

	await t.test('block constructor access', () => {
		assert.throws(() => safeEvaluate('obj.constructor', { obj: {} }), /not allowed/)
	})

	await t.test('block prototype access', () => {
		assert.throws(() => safeEvaluate('obj.prototype', { obj: {} }), /not allowed/)
	})

	await t.test('block function definitions', () => {
		assert.throws(() => safeEvaluate('() => 1'), /Function definitions/)
	})

	await t.test('block arrow functions', () => {
		assert.throws(() => safeEvaluate('x => x + 1'), /Function definitions/)
	})

	await t.test('block assignments', () => {
		assert.throws(() => safeEvaluate('a = 5'), /Assignments/)
	})

	await t.test('block update expressions', () => {
		assert.throws(() => safeEvaluate('a++'), /Update expressions/)
	})

	await t.test('block new operator', () => {
		assert.throws(() => safeEvaluate('new Date()'), /Object construction/)
	})
})

test('validateExpression', async (t) => {
	await t.test('valid expressions', () => {
		assert.strictEqual(validateExpression('2 + 2'), true)
		assert.strictEqual(validateExpression('a > 5'), true)
		assert.strictEqual(validateExpression('arr.includes(1)'), true)
	})

	await t.test('invalid expressions', () => {
		assert.strictEqual(validateExpression(''), false)
		assert.strictEqual(validateExpression('Function("test")'), false)
		assert.strictEqual(validateExpression('() => 1'), false)
	})
})
