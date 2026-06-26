import BrainFactory from './brain/BrainFactory.js'
import PuppeteerPageFactory from './infrastructure/PuppeteerPageFactory.js'
import { ActionListContainer } from './actions/ActionRegistry.js'
import CoreActionList from './actions/CoreActionList.js'
import CustomActionList from './actions/CustomActionList.js'
import { present } from './infrastructure/presenter/present.js'
import constants from './utils/constants.js'
import { AGENT_RESERVED_TOOL_NAMES } from './utils/builtinAgentToolNames.js'

/**
 * Shared browser automation engine bootstrap used by Grabber and AgentRunner.
 */
export default class Engine {
	#coreActionList
	#customActionList
	#initialized = false

	constructor() {
		this.#coreActionList = new CoreActionList()
		this.#customActionList = new CustomActionList()
	}

	/**
	 * Register a custom action handler.
	 * @param {string} name
	 * @param {Function} action
	 * @param {{ serverBlocked?: boolean, importable?: boolean, description?: string, parameters?: object }} [options]
	 */
	addCustomAction(name, action, options = {}) {
		if (typeof action !== 'function') throw new Error(`Action ${name} must be a function`)
		if (this.#coreActionList.has(name) || this.#customActionList.has(name)) {
			throw new Error(`Action ${name} already exists`)
		}

		if (options.importable && AGENT_RESERVED_TOOL_NAMES.includes(name)) {
			throw new Error(`Action ${name} collides with a built-in agent tool`)
		}

		this.#customActionList.add(name, action, options)
	}


	/**
	 * @returns {Array<{ name: string, description?: string, parameters?: object }>}
	 */
	listImportableCustomActions() {
		return this.#customActionList.listImportable()
	}

	/**
	 * Initialize the engine runtime and Puppeteer browser.
	 * @param {object} [puppeteerOptions={}]
	 * @param {{ quiet?: boolean }} [options]
	 */
	async init(puppeteerOptions = {}, { quiet = false } = {}) {
		const memories = new Map()
		for (const [key, value] of Object.entries(process.env)) {
			if (key.startsWith(constants.grabberPrefix)) {
				memories.set(key.replace(constants.grabberPrefix, ''), value)
			}
		}

		const actions = new ActionListContainer()
		actions.add(this.#coreActionList)
		actions.add(this.#customActionList)
		BrainFactory.init(memories, actions)
		await PuppeteerPageFactory.init(puppeteerOptions)
		this.#initialized = true

		if (!quiet) {
			present([{ text: 'Engine initialized', color: 'green', style: 'bold' }])
		}
	}


	/**
	 * Create a per-run Brain instance.
	 * @returns {ReturnType<typeof BrainFactory.create>}
	 */
	createBrain() {
		if (!this.#initialized) {
			throw new Error('Engine must be initialized before creating a brain')
		}
		return BrainFactory.create()
	}


	/**
	 * Boot the default browser page on a brain instance.
	 * @param {ReturnType<typeof BrainFactory.create>} brain
	 */
	async bootBrowser(brain) {
		const defaultPage = await PuppeteerPageFactory.create()
		const pages = { default: defaultPage }
		brain.browser.pages = pages
		brain.browser.activePage = defaultPage
	}


	/**
	 * Close all pages tracked on a brain instance.
	 * @param {ReturnType<typeof BrainFactory.create>} brain
	 */
	async cleanup(brain) {
		const pages = brain.browser.pages
		if (pages) {
			for (const key in pages) {
				try {
					await pages[key].close()
				} catch (e) {
					// Fail-safe closure preventions for stale pages
				}
			}
		}
	}


	/**
	 * Close the shared Puppeteer browser instance.
	 * @param {{ quiet?: boolean }} [options]
	 */
	async close({ quiet = false } = {}) {
		await PuppeteerPageFactory.close()
		this.#initialized = false
		if (!quiet) {
			present([{ text: 'Engine closed', color: 'green', style: 'bold' }])
		}
	}


	/**
	 * Execute an action on a brain instance.
	 * @param {ReturnType<typeof BrainFactory.create>} brain
	 * @param {string} name
	 * @param {import('puppeteer').Page} page
	 */
	async perform(brain, name, page) {
		await brain.perform(name, page)
	}
}
