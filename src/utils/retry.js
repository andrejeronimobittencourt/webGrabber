import { displayText } from './display.js'

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
	const {
		maxAttempts = 3,
		initialDelay = 1000,
		maxDelay = 10000,
		backoffMultiplier = 2,
		retryOn = () => true, // Function to determine if error is retryable
		onRetry = null, // Callback on retry
		brain = null,
	} = options

	let attempt = 0
	let delay = initialDelay

	while (attempt < maxAttempts) {
		try {
			return await fn()
		} catch (error) {
			attempt++

			// Check if we should retry this error
			if (!retryOn(error) || attempt >= maxAttempts) {
				throw error
			}

			// Calculate delay with exponential backoff
			const currentDelay = Math.min(delay, maxDelay)

			if (brain) {
				displayText(
					[
						{
							text: `: Retry ${attempt}/${maxAttempts} after ${currentDelay}ms`,
							color: 'yellow',
							style: 'italic',
						},
					],
					brain,
				)
			}

			// Call retry callback if provided
			if (onRetry) {
				await onRetry(error, attempt, currentDelay)
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, currentDelay))

			// Increase delay for next attempt
			delay *= backoffMultiplier
		}
	}
}

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (error) => {
	const retryableMessages = [
		'timeout',
		'ETIMEDOUT',
		'ECONNRESET',
		'ENOTFOUND',
		'ECONNREFUSED',
		'net::ERR_',
		'Navigation timeout',
	]

	const errorMessage = error.message || ''
	return retryableMessages.some((msg) => errorMessage.includes(msg))
}
