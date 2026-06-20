import { interpolation } from '../../utils/interpolation.js'
import { present } from '../../infrastructure/presenter/present.js'
import { validateActionParams } from '../../schemas/actionSchemas.js'
import { ActionError } from '../../errors/ActionErrors.js'
import logger from '../../utils/logger.js'

class Action {
	#action
	#serverBlocked

	/**
	 * @param {Function} action
	 * @param {{ serverBlocked?: boolean }} [options]
	 */
	constructor(action, { serverBlocked = false } = {}) {
		this.#action = action
		this.#serverBlocked = serverBlocked
	}

	get serverBlocked() {
		return this.#serverBlocked
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
	 * @param {{ serverBlocked?: boolean }} [options]
	 */
	add(name, action, options = {}) {
		if (this.#list.has(name)) throw new Error(`Action ${name} already exists`)
		this.#list.set(name, new Action(action, options))
	}

	has(name) {
		return this.#list.has(name)
	}

	async run(name, brain, page) {
		const entry = this.#list.get(name)
		if (brain.run.payloadId && entry.serverBlocked) throw new ActionError(name, 'not available in server mode')

		const startTime = Date.now()

		logger.debug(`Starting action: ${name}`)

		present(
			[
				{ text: 'Running action : ', color: 'blue', style: 'bold' },
				{ text: name, color: 'whiteBright' },
			],
			brain,
		)

		if (brain.run.params) {
			let params = brain.run.params

			params = interpolation(params, brain)

			try {
				params = validateActionParams(name, params)
			} catch (validationError) {
				logger.error('Parameter validation failed', {
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
			logger.info('Action completed', {
				action: name,
				duration: `${duration}ms`,
			})
		} catch (error) {
			const duration = Date.now() - startTime
			logger.error('Action failed', {
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
