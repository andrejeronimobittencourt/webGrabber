/**
 * Read `page.url()` without throwing when navigation destroyed the execution context.
 * @param {import('puppeteer').Page} page
 * @returns {string}
 */
export function safePageUrl(page) {
	try {
		return page.url()
	} catch {
		return 'unknown'
	}
}
