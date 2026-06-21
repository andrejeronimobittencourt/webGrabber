import { present } from '../infrastructure/presenter/present.js'

/**
 * Retry a function with exponential backoff.
 * @param {Function} fn
 * @param {Object} [options]
 * @returns {Promise<*>}
 */
export const retryWithBackoff = async (fn, options = {}) => {
	const {
		maxAttempts = 3,
		initialDelay = 1000,
		maxDelay = 10000,
		backoffMultiplier = 2,
		retryOn = () => true,
		onRetry = null,
		brain = null,
	} = options

	let attempt = 0
	let delay = initialDelay

	while (attempt < maxAttempts) {
		try {
			return await fn()
		} catch (error) {
			attempt++

			if (!retryOn(error) || attempt >= maxAttempts) {
				throw error
			}

			const currentDelay = Math.min(delay, maxDelay)

			if (brain) {
				present(
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

			if (onRetry) {
				await onRetry(error, attempt, currentDelay)
			}

			await new Promise((resolve) => setTimeout(resolve, currentDelay))
			delay *= backoffMultiplier
		}
	}
}

/**
 * @param {Error} error
 * @returns {boolean}
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
