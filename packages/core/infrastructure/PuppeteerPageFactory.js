import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'

/**
 * Build Puppeteer launch options from webGrabber config.
 * Strips webGrabber-only keys and defaults to a window-sized viewport in headful runs.
 * @param {Record<string, unknown>} options
 * @returns {Record<string, unknown>}
 */
export function buildPuppeteerLaunchOptions(options) {
	const { stealth: _stealth, adblocker: _adblocker, viewport, ...launchOptions } = options

	if (!viewport && launchOptions.defaultViewport === undefined) {
		launchOptions.defaultViewport = null
	}

	return launchOptions
}

class Puppeteer {
	#options
	#browser

	constructor(options) {
		this.#options = options
		this.#browser = null
	}

	async launch() {
		if (this.#options.stealth === true) puppeteer.use(StealthPlugin())
		if (this.#options.adblocker === true) puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
		this.#browser = await puppeteer.launch(buildPuppeteerLaunchOptions(this.#options))
	}

	get viewport() {
		return this.#options.viewport
	}

	get browser() {
		return this.#browser
	}

	async close() {
		await this.#browser.close()
	}
}

export default class PuppeteerPageFactory {
	static #puppeteer

	static async init(options) {
		this.#puppeteer = new Puppeteer(options)
		await this.#puppeteer.launch()
	}

	static async create() {
		const page = await this.#puppeteer.browser.newPage()
		const viewport = this.#puppeteer.viewport
		if (viewport) await page.setViewport(viewport)
		return page
	}

	static async close() {
		await this.#puppeteer.close()
	}
}
