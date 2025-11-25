import { Parser } from 'expr-eval'

/**
 * Safely evaluates conditional expressions without using eval()
 * @param {string} expression - The expression to evaluate
 * @param {Object} context - Variables available in the expression
 * @returns {boolean} Result of the expression
 */
export const safeEvaluate = (expression, context = {}) => {
	try {
		const parser = new Parser()

		// Define safe built-in functions
		const safeFunctions = {
			length: (arr) => (Array.isArray(arr) || typeof arr === 'string') ? arr.length : 0,
			includes: (arr, item) => Array.isArray(arr) ? arr.includes(item) : false,
			startsWith: (str, prefix) => typeof str === 'string' ? str.startsWith(prefix) : false,
			endsWith: (str, suffix) => typeof str === 'string' ? str.endsWith(suffix) : false,
			isEmpty: (val) =>
				val === null ||
				val === undefined ||
				val === '' ||
				(Array.isArray(val) && val.length === 0),
			isNull: (val) => val === null || val === undefined,
			matches: (str, pattern) =>
				typeof str === 'string' ? new RegExp(pattern).test(str) : false,
		}

		// Merge context with safe functions
		const evalContext = { ...context, ...safeFunctions }

		// Parse and evaluate
		return parser.evaluate(expression, evalContext)
	} catch (error) {
		throw new Error(`Invalid expression: ${expression}. ${error.message}`)
	}
}

/**
 * Validates that an expression is safe before evaluation
 * @param {string} expression - The expression to validate
 * @returns {boolean} True if expression is valid
 */
export const validateExpression = (expression) => {
	if (typeof expression !== 'string' || expression.trim() === '') {
		return false
	}

	// Check for dangerous patterns
	const dangerousPatterns = [
		/require\s*\(/,
		/import\s+/,
		/eval\s*\(/,
		/Function\s*\(/,
		/process\./,
		/__proto__/,
		/constructor/,
	]

	return !dangerousPatterns.some((pattern) => pattern.test(expression))
}
