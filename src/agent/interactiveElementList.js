import { resolveElementOffset } from './agentConfig.js'

/**
 * @typedef {Object} InteractiveElementListState
 * @property {number} offset
 */

/**
 * @returns {InteractiveElementListState}
 */
export function createDefaultInteractiveElementListState() {
	return { offset: 0 }
}

/**
 * @param {InteractiveElementListState} currentState
 * @param {{ offset?: number }} params
 * @returns {InteractiveElementListState}
 */
export function resolveInteractiveElementListState(currentState, params = {}) {
	return {
		offset:
			params.offset === undefined || params.offset === null
				? currentState.offset
				: resolveElementOffset(params.offset),
	}
}
