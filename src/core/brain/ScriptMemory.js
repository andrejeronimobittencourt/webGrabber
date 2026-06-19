import isPlainObject from 'lodash/isPlainObject.js'
import cloneDeep from 'lodash/cloneDeep.js'

/**
 * @param {*} value
 * @returns {*}
 */
export const cloneScriptValue = (value) => {
	if (value !== null && (Array.isArray(value) || isPlainObject(value))) return cloneDeep(value)
	return value
}

/**
 * Grab script variable store (user keys and INPUT pipe).
 */
export default class ScriptMemory {
	#store

	constructor() {
		this.#store = new Map()
	}

	/**
	 * @param {string} key
	 * @param {*} value
	 */
	learn(key, value) {
		this.#store.set(key, cloneScriptValue(value))
	}

	/**
	 * @param {string} key
	 * @returns {*}
	 */
	recall(key) {
		return this.#store.get(key)
	}

	/**
	 * @param {string} key
	 */
	forget(key) {
		this.#store.delete(key)
	}

	/**
	 * @param {Map<string, *>} memories
	 */
	sync(memories) {
		memories.forEach((value, key) => this.learn(key, value))
	}
}
