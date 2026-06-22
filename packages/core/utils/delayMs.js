/**
 * Promise-based delay compatible with all Puppeteer page versions.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export async function delayMs(ms) {
	await new Promise((resolve) => setTimeout(resolve, ms))
}
