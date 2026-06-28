import { resolveHtmlOffset } from './agentConfig.js'

/**
 * @typedef {Object} HtmlPaginationState
 * @property {number} offset
 */

/**
 * @returns {HtmlPaginationState}
 */
export function createDefaultHtmlPaginationState() {
	return { offset: 0 }
}

/**
 * @param {HtmlPaginationState} currentState
 * @param {{ offset?: number }} params
 * @returns {HtmlPaginationState}
 */
export function resolveHtmlPaginationState(currentState, params = {}) {
	return {
		offset:
			params.offset === undefined || params.offset === null
				? currentState.offset
				: resolveHtmlOffset(params.offset),
	}
}
