import * as acorn from 'acorn'

/**
 * Comprehensive AST-based safe expression evaluator
 * Uses Acorn to parse and validate expressions before evaluation
 */

// Dangerous property names that should never be accessed
const BLOCKED_PROPERTIES = new Set([
	'__proto__',
	'constructor',
	'prototype',
	'eval',
	'Function',
	'require',
	'import',
	'process',
	'global',
	'globalThis',
])

// Safe built-in math and string/array methods
const SAFE_METHODS = new Set([
	// String methods
	'includes', 'startsWith', 'endsWith', 'toLowerCase', 'toUpperCase',
	'trim', 'trimStart', 'trimEnd', 'slice', 'substring', 'substr',
	'indexOf', 'lastIndexOf', 'charAt', 'charCodeAt', 'split',
	'replace', 'match', 'search', 'repeat', 'padStart', 'padEnd',
	// Array methods
	'length', 'join', 'concat', 'reverse', 'sort', 'filter', 'map',
	'reduce', 'some', 'every', 'find', 'findIndex', 'flat', 'flatMap',
	// Common
	'toString', 'valueOf',
])

/**
 * Validates that an AST node is safe to evaluate
 * @param {Object} node - Acorn AST node
 * @throws {Error} If node contains dangerous operations
 */
function validateAST(node) {
	if (!node) return

	switch (node.type) {
		case 'Literal':
			// Numbers, strings, booleans, null - always safe
			return

		case 'Identifier':
			// Variable references - safe (resolved from context)
			// But block dangerous global identifiers
			if (BLOCKED_PROPERTIES.has(node.name)) {
				throw new Error(`Access to identifier '${node.name}' is not allowed`)
			}
			return

		case 'UnaryExpression':
			// !, -, +, typeof
			if (['-', '+', '!', 'typeof'].includes(node.operator)) {
				validateAST(node.argument)
				return
			}
			throw new Error(`Unsafe unary operator: ${node.operator}`)

		case 'BinaryExpression':
		case 'LogicalExpression':
			// Arithmetic, comparison, logical operators
			validateAST(node.left)
			validateAST(node.right)
			return

		case 'ConditionalExpression':
			// Ternary operator: condition ? consequent : alternate
			validateAST(node.test)
			validateAST(node.consequent)
			validateAST(node.alternate)
			return

		case 'MemberExpression':
			// Property access: obj.prop or obj[expr]
			validateAST(node.object)

			// Check property name for dangerous patterns
			if (node.computed) {
				validateAST(node.property)
			} else if (node.property.type === 'Identifier') {
				const propName = node.property.name
				if (BLOCKED_PROPERTIES.has(propName)) {
					throw new Error(`Access to property '${propName}' is not allowed`)
				}
			}
			return

		case 'ArrayExpression':
			// Array literals: [1, 2, 3]
			node.elements.forEach(elem => {
				if (elem) validateAST(elem)
			})
			return

		case 'ObjectExpression':
			// Object literals: {a: 1, b: 2}
			node.properties.forEach(prop => {
				if (prop.type === 'Property') {
					validateAST(prop.key)
					validateAST(prop.value)
				} else {
					throw new Error('Spread properties are not allowed')
				}
			})
			return

		case 'CallExpression':
			// Function calls - validate it's a safe method
			validateAST(node.callee)
			node.arguments.forEach(arg => validateAST(arg))

			// Make sure we're only calling safe methods
			if (node.callee.type === 'MemberExpression') {
				const methodName = node.callee.property.name ||
					(node.callee.property.type === 'Literal' ? node.callee.property.value : null)

				if (methodName && !SAFE_METHODS.has(methodName) && !methodName.startsWith('get')) {
					// Allow Math.* methods
					if (node.callee.object.type === 'Identifier' && node.callee.object.name === 'Math') {
						return
					}
					throw new Error(`Method '${methodName}' is not whitelisted`)
				}
			} else if (node.callee.type === 'Identifier') {
				// Allow whitelisted standalone functions from context
				// These will be validated at runtime
				return
			} else {
				throw new Error('Only method calls and context functions are allowed')
			}
			return

		case 'TemplateLiteral':
			// Template strings: `hello ${name}`
			node.expressions.forEach(expr => validateAST(expr))
			return

		// Blocked node types
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
			throw new Error('Function definitions are not allowed')

		case 'AssignmentExpression':
			throw new Error('Assignments are not allowed')

		case 'UpdateExpression':
			throw new Error('Update expressions (++/--) are not allowed')

		case 'NewExpression':
			throw new Error('Object construction (new) is not allowed')

		case 'ThisExpression':
			throw new Error('The "this" keyword is not allowed')

		case 'SequenceExpression':
			throw new Error('Sequence expressions (comma operator) are not allowed')

		case 'ClassExpression':
			throw new Error('Class definitions are not allowed')

		default:
			throw new Error(`Unsupported expression type: ${node.type}`)
	}
}

/**
 * Evaluates a validated AST node
 * @param {Object} node - Acorn AST node
 * @param {Object} context - Variable context
 * @returns {*} Evaluation result
 */
function evaluateAST(node, context) {
	if (!node) return undefined

	switch (node.type) {
		case 'Literal':
			return node.value

		case 'Identifier':
			if (!(node.name in context)) {
				throw new Error(`Variable '${node.name}' is not defined`)
			}
			return context[node.name]

		case 'UnaryExpression':
			const arg = evaluateAST(node.argument, context)
			switch (node.operator) {
				case '-': return -arg
				case '+': return +arg
				case '!': return !arg
				case 'typeof': return typeof arg
				default: throw new Error(`Unknown unary operator: ${node.operator}`)
			}

		case 'BinaryExpression':
			const left = evaluateAST(node.left, context)
			const right = evaluateAST(node.right, context)
			switch (node.operator) {
				case '+': return left + right
				case '-': return left - right
				case '*': return left * right
				case '/': return left / right
				case '%': return left % right
				case '**': return left ** right
				case '==': return left == right
				case '!=': return left != right
				case '===': return left === right
				case '!==': return left !== right
				case '<': return left < right
				case '<=': return left <= right
				case '>': return left > right
				case '>=': return left >= right
				case 'in': return left in right
				default: throw new Error(`Unknown binary operator: ${node.operator}`)
			}

		case 'LogicalExpression':
			const leftLog = evaluateAST(node.left, context)
			if (node.operator === '&&') {
				return leftLog && evaluateAST(node.right, context)
			} else if (node.operator === '||') {
				return leftLog || evaluateAST(node.right, context)
			}
			throw new Error(`Unknown logical operator: ${node.operator}`)

		case 'ConditionalExpression':
			const test = evaluateAST(node.test, context)
			return test
				? evaluateAST(node.consequent, context)
				: evaluateAST(node.alternate, context)

		case 'MemberExpression':
			const obj = evaluateAST(node.object, context)
			const prop = node.computed
				? evaluateAST(node.property, context)
				: node.property.name

			if (obj == null) {
				throw new Error(`Cannot access property '${prop}' of ${obj}`)
			}
			return obj[prop]

		case 'ArrayExpression':
			return node.elements.map(elem =>
				elem ? evaluateAST(elem, context) : undefined
			)

		case 'ObjectExpression':
			const result = {}
			node.properties.forEach(prop => {
				const key = prop.key.type === 'Identifier'
					? prop.key.name
					: evaluateAST(prop.key, context)
				result[key] = evaluateAST(prop.value, context)
			})
			return result

		case 'CallExpression':
			const callee = evaluateAST(node.callee, context)
			if (typeof callee !== 'function') {
				throw new Error('Callee is not a function')
			}
			const args = node.arguments.map(arg => evaluateAST(arg, context))

			// For member expressions, bind the correct 'this'
			if (node.callee.type === 'MemberExpression') {
				const thisObj = evaluateAST(node.callee.object, context)
				return callee.apply(thisObj, args)
			}

			return callee(...args)

		case 'TemplateLiteral':
			let str = ''
			for (let i = 0; i < node.quasis.length; i++) {
				str += node.quasis[i].value.cooked
				if (i < node.expressions.length) {
					str += String(evaluateAST(node.expressions[i], context))
				}
			}
			return str

		default:
			throw new Error(`Cannot evaluate node type: ${node.type}`)
	}
}

/**
 * Safely evaluates a JavaScript expression
 * @param {string} expression - The expression to evaluate
 * @param {Object} context - Variables and functions available in the expression
 * @returns {*} Result of the expression
 * @throws {Error} If expression is invalid or unsafe
 */
export function safeEvaluate(expression, context = {}) {
	if (typeof expression !== 'string') {
		throw new Error('Expression must be a string')
	}

	if (expression.trim() === '') {
		throw new Error('Expression cannot be empty')
	}

	try {
		// Parse the expression into an AST
		const ast = acorn.parseExpressionAt(expression, 0, {
			ecmaVersion: 'latest',
		})

		// Validate the AST for safety
		validateAST(ast)

		// Add Math to context if not present
		const fullContext = {
			Math,
			...context,
		}

		// Evaluate the validated AST
		return evaluateAST(ast, fullContext)
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`Syntax error in expression: ${expression}. ${error.message}`)
		}
		throw error
	}
}

/**
 * Validates that an expression is syntactically valid and safe
 * @param {string} expression - The expression to validate
 * @returns {boolean} True if expression is valid and safe
 */
export function validateExpression(expression) {
	try {
		if (typeof expression !== 'string' || expression.trim() === '') {
			return false
		}

		const ast = acorn.parseExpressionAt(expression, 0, {
			ecmaVersion: 'latest',
		})

		validateAST(ast)
		return true
	} catch {
		return false
	}
}
