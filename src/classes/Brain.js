import cloneDeep from 'lodash/cloneDeep.js'
import constants from '../utils/constants.js'

class Brain {
	#memory
	#muscleMemory

	constructor() {
		this.#memory = new Map()
	}

	learn(key, value) {
		if (key === constants.pagesKey || key === constants.activePageKey) this.#memory.set(key, value)
		else if (typeof value === 'object') this.#memory.set(key, cloneDeep(value))
		else this.#memory.set(key, value)
	}
	recall(key) {
		return this.#memory.get(key)
	}
	forget(key) {
		this.#memory.delete(key)
	}
	sync(memories) {
		memories.forEach((value, key) => this.learn(key, value))
	}
	mimic(actions) {
		this.#muscleMemory = actions
	}
	async perform(name, page) {
		await this.#muscleMemory.run(name, this, page)
	}
}

export default class BrainFactory {
	static #memories
	static #actions

	static init(memories, actions) {
		this.#memories = memories
		this.#actions = actions
	}

	static create() {
		const brain = new Brain()
		brain.sync(this.#memories)
		brain.mimic(this.#actions)
		return brain
	}
}
