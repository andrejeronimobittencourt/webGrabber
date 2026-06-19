import { cloneScriptValue } from './ScriptMemory.js'

/**
 * Per-action and server request context for a grab run.
 */
export default class RunState {
	#params
	payloadId

	get params() {
		return this.#params
	}

	set params(value) {
		this.#params = value === undefined ? undefined : cloneScriptValue(value)
	}
}
