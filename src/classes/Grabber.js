import GrabListFactory from './GrabList.js'
import PuppeteerPageFactory from './wrappers/Puppeteer.js'
import { ActionListContainer } from './actions/Actions.js'
import CoreActionList from './actions/CoreActionList.js'
import CustomActionList from './actions/CustomActionList.js'
import BrainFactory from './Brain.js'
import {
	getGrabList,
	displayError,
	displayErrorAndExit,
	displayText,
	resetIndentation,
	parseModeAndGrabName,
} from '../utils/utils.js'
import constants from '../utils/constants.js'

export default class Grabber {
	#coreActionList
	#customActionList

	constructor() {
		this.#coreActionList = new CoreActionList()
		this.#customActionList = new CustomActionList()
	}

	addCustomAction(name, action) {
		if (typeof action !== 'function') displayErrorAndExit(`Action ${name} must be a function`)
		if (this.#coreActionList.has(name) || this.#customActionList.has(name))
			displayErrorAndExit(`Action ${name} already exists`)
		this.#customActionList.add(name, action)
	}

	async init(puppeteerOptions = {}) {
		try {
			// for each process.env add to memory
			const memories = new Map()
			for (const [key, value] of Object.entries(process.env)) {
				// if starts with GRABBER_ add to memory but remove GRABBER_
				if (key.startsWith(constants.grabberPrefix))
					memories.set(key.replace(constants.grabberPrefix, ''), value)
			}
			const actions = new ActionListContainer()
			actions.add(this.#coreActionList)
			actions.add(this.#customActionList)
			BrainFactory.init(memories, actions)
			await PuppeteerPageFactory.init(puppeteerOptions)
			displayText([{ text: 'Grabber initialized', color: 'green', style: 'bold' }])
		} catch (error) {
			displayErrorAndExit(error)
		}
	}

	async loadGrabList(grabList) {
		try {
			const grabs = await getGrabList()
			grabs.forEach((grab) => grabList.add(grab))
			// if grabList is empty then throw error
			if (grabList.isEmpty()) throw new Error('No grabs found nor provided')
			displayText([{ text: 'Grab configs loaded', color: 'green', style: 'bold' }])
		} catch (error) {
			displayErrorAndExit(error)
		}
	}

	async grab(payload = null) {
		const { helpMode, grabName } = parseModeAndGrabName()
		const brain = BrainFactory.create()
		const grabList = GrabListFactory.create()
		if (payload) {
			grabList.add(payload.body)
			brain.learn(constants.payloadIdKey, payload.id)
		} else {
			await this.loadGrabList(grabList)
			if (grabName && !grabList.has(grabName))
				displayErrorAndExit(new Error(`Grab ${grabName} not found`))
		}
		try {
			if (!helpMode) {
				const defaultPage = await PuppeteerPageFactory.create()
				const pages = { default: defaultPage }
				brain.learn(constants.pagesKey, pages)
				brain.learn(constants.activePageKey, defaultPage)
			}
			const asyncActions = []
			for (const grab of grabList.list) {
				if (helpMode) {
					if (!grabName || grabName === grab.name) {
						displayText([
							{ text: 'Grab : ', color: 'blue', style: 'bold' },
							{ text: grab.name + '\n', color: 'whiteBright' },
							{ text: 'Description : ', color: 'blue', style: 'bold' },
							{ text: grab.description, color: 'whiteBright' },
						])
					}
					continue
				}
				if (grabName && grabName !== grab.name && !payload) continue
				displayText([{ text: `Grabbing ${grab.name}`, color: 'green', style: 'bold' }])
				resetIndentation(brain)
				brain.learn(constants.paramsKey, { dir: grab.name })
				await brain.perform('setBaseDir')
				await brain.perform('resetCurrentDir')
				for (const action of grab.actions) {
					brain.learn(constants.paramsKey, action.params || {})
					const activePage = brain.recall(constants.activePageKey)
					if (action['await'] === false) asyncActions.push(brain.perform(action.name, activePage))
					else await brain.perform(action.name, activePage)
				}
			}
			if (asyncActions.length > 0) {
				await Promise.all(asyncActions)
			}
		} catch (error) {
			displayError(error)
		}
		const pages = brain.recall(constants.pagesKey)
		if (pages) {
			for (const key in pages) {
				await pages[key].close()
			}
		}
		displayText([{ text: 'Grabber finished', color: 'green', style: 'bold' }])
		if (!payload) {
			await PuppeteerPageFactory.close()
			displayText([{ text: 'Grabber closed', color: 'green', style: 'bold' }])
		} else return { result: brain.recall(constants.inputKey) }
	}
}
