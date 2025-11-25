/**
 * Base error class for all action-related errors
 */
export class ActionError extends Error {
	constructor(actionName, message, context = {}) {
		super(`[${actionName}] ${message}`)
		this.name = 'ActionError'
		this.actionName = actionName
		this.context = context
		this.timestamp = new Date().toISOString()
	}

	toJSON() {
		return {
			name: this.name,
			actionName: this.actionName,
			message: this.message,
			context: this.context,
			timestamp: this.timestamp,
			stack: this.stack,
		}
	}
}

/**
 * Error for selector-related issues
 */
export class SelectorError extends ActionError {
	constructor(actionName, selector, context = {}) {
		super(actionName, `Selector not found or not visible: ${selector}`, {
			...context,
			selector,
		})
		this.name = 'SelectorError'
	}
}

/**
 * Error for network-related issues
 */
export class NetworkError extends ActionError {
	constructor(actionName, url, originalError, context = {}) {
		super(actionName, `Network request failed: ${url}`, {
			...context,
			url,
			originalError: originalError.message,
		})
		this.name = 'NetworkError'
	}
}

/**
 * Error for validation issues
 */
export class ValidationError extends ActionError {
	constructor(actionName, field, message, context = {}) {
		super(actionName, `Validation failed for "${field}": ${message}`, {
			...context,
			field,
		})
		this.name = 'ValidationError'
	}
}

/**
 * Error for file system operations
 */
export class FileSystemError extends ActionError {
	constructor(actionName, operation, path, originalError, context = {}) {
		super(actionName, `File system ${operation} failed: ${path}`, {
			...context,
			operation,
			path,
			originalError: originalError.message,
		})
		this.name = 'FileSystemError'
	}
}
