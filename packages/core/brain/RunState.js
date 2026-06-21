import { cloneScriptValue } from './ScriptMemory.js'

/**
 * Per-action and server request context for a grab run.
 */
export default class RunState {
	#params
	payloadId
	agentMode = false
	/** @type {string[]} */
	grabCallStack = []
	/** @type {import('../grabCatalog.js').default | null} */
	grabCatalog = null

	get params() {
		return this.#params
	}

	set params(value) {
		this.#params = value === undefined ? undefined : cloneScriptValue(value)
	}
}
