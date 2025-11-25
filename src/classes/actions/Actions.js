import { interpolation, displayText } from '../../utils/utils.js'
import constants from '../../utils/constants.js'
import { validateActionParams } from '../../schemas/actionSchemas.js'
import logger from '../../utils/logger.js'

class Action {
	#action

	constructor(action) {
		this.#action = action
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

	add(name, action) {
		if (!this.#list.has(name)) {
			this.#list.set(name, new Action(action))
		}
	}

	has(name) {
		return this.#list.has(name)
	}

	async run(name, brain, page) {
		const startTime = Date.now()

		logger.debug(`Starting action: ${name}`)

		displayText(
			[
				{ text: 'Running action : ', color: 'blue', style: 'bold' },
				{ text: name, color: 'whiteBright' },
			],
			brain,
		)

		if (brain.recall(constants.paramsKey)) {
			let params = brain.recall(constants.paramsKey)

			// First interpolate variables
			params = interpolation(params, brain)

			// Then validate parameters
			try {
				params = validateActionParams(name, params)
			} catch (validationError) {
				logger.error('Parameter validation failed', {
					action: name,
					error: validationError.message,
				})
				throw validationError
			}

			brain.learn(constants.paramsKey, params)
		}

		try {
			await this.#list.get(name).run(brain, page)

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
