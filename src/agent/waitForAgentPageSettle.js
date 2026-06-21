/**
 * Read the current page URL without throwing when the execution context is mid-navigation.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<string>}
 */
export async function safeAgentPageUrl(page) {
	try {
		return page.url()
	} catch {
		return 'unknown'
	}
}

/**
 * Wait for in-flight navigations and DOM stability before the next agent observation.
 * Retries through "execution context destroyed" errors while a navigation is underway.
 * @param {import('puppeteer').Page} page
 * @param {{ timeout?: number }} [options]
 */
export async function waitForAgentPageSettle(page, options = {}) {
	const timeout = options.timeout ?? 10_000
	const start = Date.now()

	while (Date.now() - start < timeout) {
		try {
			const readyState = await page.evaluate(() => document.readyState)

			if (readyState === 'complete' || readyState === 'interactive') {
				break
			}

			if (readyState !== 'loading') {
				break
			}
		} catch {
			// Navigation can temporarily destroy the execution context.
		}

		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	try {
		if (typeof page.waitForNetworkIdle === 'function') {
			await page.waitForNetworkIdle({ idleTime: 500, timeout: 3_000 })
		}
	} catch {
		// Best-effort network settle.
	}
}
