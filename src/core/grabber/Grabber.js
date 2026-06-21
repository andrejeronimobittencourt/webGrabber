import GrabListFactory from './GrabListFactory.js'
import Engine from '../../../packages/core/Engine.js'
import { present } from '../../../packages/core/infrastructure/presenter/present.js'
import { loadGrabs } from '../../utils/loadGrabs.js'
import { parseModeAndGrabName } from '../../utils/cliArgs.js'
import constants from '../../../packages/core/utils/constants.js'

export default class Grabber {
	#engine

	constructor() {
		this.#engine = new Engine()
	}

	/**
	 * Register a custom action handler.
	 * @param {string} name
	 * @param {Function} action
	 * @param {{ serverBlocked?: boolean }} [options]
	 */
	addCustomAction(name, action, options = {}) {
		this.#engine.addCustomAction(name, action, options)
	}

	/**
	 * Initialize the grabber runtime and Puppeteer browser.
	 * @param {object} [puppeteerOptions={}]
	 */
	async init(puppeteerOptions = {}) {
		await this.#engine.init(puppeteerOptions)
		present([{ text: 'Grabber initialized', color: 'green', style: 'bold' }])
	}

	async loadGrabList(grabList, grabName = null) {
		const grabs = await loadGrabs({ grabName })
		grabs.forEach((grab) => grabList.add(grab))
		if (grabList.isEmpty()) throw new Error('No grabs found nor provided')
		present([{ text: 'Grab configs loaded', color: 'green', style: 'bold' }])
	}

	/**
	 * Execute one or more grabs.
	 * @param {{ id: string, body: object } | null} [payload=null] Server-mode inline grab payload.
	 * @returns {Promise<{ result: unknown } | void>} Returns `{ result }` in server mode; void in CLI mode.
	 */
	async grab(payload = null) {
		const { helpMode, grabName } = parseModeAndGrabName()
		const brain = this.#engine.createBrain()

		try {
			const grabList = await this.#resolveGrabList(payload, grabName, brain)

			if (helpMode) {
				this.#runHelpMode(grabList, grabName)
			} else {
				await this.#engine.bootBrowser(brain)
				await this.#runGrabActions(brain, grabList, grabName, payload)
			}
		} finally {
			await this.#engine.cleanup(brain)
		}

		present([{ text: 'Grabber finished', color: 'green', style: 'bold' }])

		if (!payload) {
			await this.#engine.close()
			present([{ text: 'Grabber closed', color: 'green', style: 'bold' }])
			return
		}

		return this.#buildResult(brain)
	}

	async #resolveGrabList(payload, grabName, brain) {
		const grabList = GrabListFactory.create()

		if (payload) {
			grabList.add(payload.body)
			brain.run.payloadId = payload.id
		} else {
			await this.loadGrabList(grabList, grabName)
			if (grabName && !grabList.has(grabName)) throw new Error(`Grab ${grabName} not found`)
		}

		return grabList
	}

	#runHelpMode(grabList, grabName) {
		for (const grab of grabList.list) {
			if (!grabName || grabName === grab.name) {
				present(
					[
						{ text: 'Grab : ', color: 'blue', style: 'bold' },
						{ text: `${grab.name}\n`, color: 'whiteBright' },
						{ text: 'Description : ', color: 'blue', style: 'bold' },
						{ text: grab.description, color: 'whiteBright' },
					],
				)
			}
		}
	}

	async #runGrabActions(brain, grabList, grabName, payload) {
		const asyncActions = []

		for (const grab of grabList.list) {
			if (grabName && grabName !== grab.name && !payload) continue

			brain.presenter.verbose = grab.verbose ?? 1
			brain.presenter.indentation = 0
			present([{ text: `Grabbing ${grab.name}`, color: 'green', style: 'bold' }], brain)
			brain.run.params = { dir: grab.name }
			await brain.perform('setBaseDir')
			await brain.perform('resetCurrentDir')

			for (const action of grab.actions) {
				brain.run.params = action.params || {}
				const activePage = brain.browser.activePage
				if (action.await === false) {
					asyncActions.push(brain.perform(action.name, activePage))
				} else {
					await brain.perform(action.name, activePage)
				}
			}
		}

		if (asyncActions.length > 0) await Promise.all(asyncActions)
	}

	#buildResult(brain) {
		return { result: brain.recall(constants.inputKey) }
	}
}
