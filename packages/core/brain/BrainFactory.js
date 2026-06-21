import ScriptMemory from './ScriptMemory.js'
import PresenterState from './PresenterState.js'
import BrowserState from './BrowserState.js'
import FilesystemState from './FilesystemState.js'
import RunState from './RunState.js'

class Brain {
	#script
	#muscleMemory
	#presenter
	#browser
	#fs
	#run

	constructor() {
		this.#script = new ScriptMemory()
		this.#presenter = new PresenterState()
		this.#browser = new BrowserState()
		this.#fs = new FilesystemState()
		this.#run = new RunState()
	}

	get presenter() {
		return this.#presenter
	}

	get browser() {
		return this.#browser
	}

	get fs() {
		return this.#fs
	}

	get run() {
		return this.#run
	}

	/**
	 * @param {string} key
	 * @param {*} value
	 */
	learn(key, value) {
		this.#script.learn(key, value)
	}

	/**
	 * @param {string} key
	 * @returns {*}
	 */
	recall(key) {
		return this.#script.recall(key)
	}

	/**
	 * @param {string} key
	 */
	forget(key) {
		this.#script.forget(key)
	}

	/**
	 * @param {Map<string, *>} memories
	 */
	sync(memories) {
		this.#script.sync(memories)
	}

	/**
	 * @param {import('../actions/ActionRegistry.js').ActionListContainer} actions
	 */
	mimic(actions) {
		this.#muscleMemory = actions
	}

	/**
	 * @param {string} name
	 * @param {import('puppeteer').Page} page
	 */
	async perform(name, page) {
		await this.#muscleMemory.run(name, this, page)
	}
}

export default class BrainFactory {
	static #memories
	static #actions

	/**
	 * Register process-level env memories and the shared action registry.
	 * @param {Map<string, *>} memories
	 * @param {import('../actions/ActionRegistry.js').ActionListContainer} actions
	 */
	static init(memories, actions) {
		this.#memories = memories
		this.#actions = actions
	}

	/**
	 * Create a per-run Brain instance.
	 * @returns {Brain}
	 */
	static create() {
		const brain = new Brain()
		brain.sync(this.#memories)
		brain.mimic(this.#actions)
		return brain
	}
}
