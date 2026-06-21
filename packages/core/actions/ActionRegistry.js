import { interpolation } from '../utils/interpolation.js'
import { present } from '../infrastructure/presenter/present.js'
import { validateActionParams } from '../schemas/actionSchemas.js'
import { ActionError } from '../errors/ActionErrors.js'
import logger from '../utils/logger.js'

/**
 * @param {ReturnType<import('../brain/BrainFactory.js').default['create']>} brain
 * @param {'info' | 'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} meta
 */
function logActionRegistryEvent(brain, level, message, meta) {
	if (brain.run.agentMode) {
		logger.debug(message, meta)
		return
	}

	if (level === 'info') {
		logger.info(message, meta)
		return
	}

	logger.error(message, meta)
}

class Action {
	#action
	#serverBlocked
	#importable
	#description
	#parameters

	/**
	 * @param {Function} action
	 * @param {{ serverBlocked?: boolean, importable?: boolean, description?: string, parameters?: object }} [options]
	 */
	constructor(
		action,
		{ serverBlocked = false, importable = false, description, parameters } = {},
	) {
		this.#action = action
		this.#serverBlocked = serverBlocked
		this.#importable = importable
		this.#description = description
		this.#parameters = parameters
	}

	get serverBlocked() {
		return this.#serverBlocked
	}

	get importable() {
		return this.#importable
	}

	get description() {
		return this.#description
	}

	get parameters() {
		return this.#parameters
	}

	async run(brain, page) {
		await this.#action(brain, page)
	}
}

export class ActionList {
	#list

	constructor() {
		this.#list = new Map()
	}

	/**
	 * @param {string} name
	 * @param {Function} action
	 * @param {{ serverBlocked?: boolean, importable?: boolean, description?: string, parameters?: object }} [options]
	 */
	add(name, action, options = {}) {
		if (this.#list.has(name)) throw new Error(`Action ${name} already exists`)
		this.#list.set(name, new Action(action, options))
	}

	/**
	 * @returns {Array<{ name: string, description?: string, parameters?: object }>}
	 */
	listImportable() {
		/** @type {Array<{ name: string, description?: string, parameters?: object }>} */
		const entries = []

		for (const [name, action] of this.#list.entries()) {
			if (!action.importable) {
				continue
			}

			entries.push({
				name,
				description: action.description,
				parameters: action.parameters,
			})
		}

		return entries
	}

	has(name) {
		return this.#list.has(name)
	}

	async run(name, brain, page) {
		const entry = this.#list.get(name)
		if (brain.run.payloadId && entry.serverBlocked) throw new ActionError(name, 'not available in server mode')

		const startTime = Date.now()

		logger.debug(`Starting action: ${name}`)

		if (!brain.run.agentMode) {
			present(
				[
					{ text: 'Running action : ', color: 'blue', style: 'bold' },
					{ text: name, color: 'whiteBright' },
				],
				brain,
			)
		}

		if (brain.run.params) {
			let params = brain.run.params

			params = interpolation(params, brain)

			try {
				params = validateActionParams(name, params)
			} catch (validationError) {
				logActionRegistryEvent(brain, 'error', 'Parameter validation failed', {
					action: name,
					error: validationError.message,
				})
				throw validationError
			}

			brain.run.params = params
		}

		try {
			await entry.run(brain, page)

			const duration = Date.now() - startTime
			logActionRegistryEvent(brain, 'info', 'Action completed', {
				action: name,
				duration: `${duration}ms`,
			})
		} catch (error) {
			const duration = Date.now() - startTime
			logActionRegistryEvent(brain, 'error', 'Action failed', {
				action: name,
				duration: `${duration}ms`,
				error: error.message,
				stack: error.stack,
			})
			throw error
		}
	}
}

export class ActionListContainer {
	#container

	constructor() {
		this.#container = []
	}

	add(actionList) {
		this.#container.push(actionList)
	}

	async run(name, brain, page) {
		const actionList = this.#container.find((list) => list.has(name))
		if (!actionList) throw new Error(`Action ${name} not found`)
		await actionList.run(name, brain, page)
	}
}
