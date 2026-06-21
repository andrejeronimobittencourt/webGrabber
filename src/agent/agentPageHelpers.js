/**
 * @param {import('puppeteer').Page} page
 */
export async function tryBringToFront(page) {
	try {
		await page.bringToFront()
	} catch {}
}

/**
 * @param {import('puppeteer').Page} page
 * @returns {Promise<string>}
 */
export async function safePageTitle(page) {
	try {
		return await page.title()
	} catch {
		return ''
	}
}
