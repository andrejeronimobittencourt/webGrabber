import constants from '../../utils/constants.js'

/** @type {import('./PresenterBase.js').default | null} */
let presenter = null

/** @type {boolean} */
let serverMode = false

/**
 * Set the process-wide presenter (CLI or server logger).
 * @param {import('./PresenterBase.js').default} nextPresenter
 */
export const setPresenter = (nextPresenter) => {
	presenter = nextPresenter
}

/**
 * When true, grab `verbose` is ignored and all presenter output is kept.
 * @param {boolean} enabled
 */
export const setServerMode = (enabled) => {
	serverMode = enabled
}

/**
 * @typedef {Object} PresentOptions
 * @property {boolean} [force] When true, output is shown even when grab verbose is 0 (e.g. log action).
 */

/**
 * @param {import('./PresenterBase.js').TextSegment[]} textData
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']> | null} [brain]
 * @param {PresentOptions} [options]
 */
export const present = (textData, brain = null, options = {}) => {
	if (!presenter) {
		return
	}

	if (!serverMode && !options.force && brain?.presenter.verbose === 0) {
		return
	}

	presenter.write(textData, brain)
}

/**
 * @param {Error | { message: string }} error
 */
export const presentError = (error) => {
	if (!presenter) {
		return
	}

	presenter.error(error)
}

/**
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
 */
export const resetIndentation = (brain) => {
	if (presenter) {
		presenter.resetIndentation(brain)
		return
	}

	brain.presenter.indentation = 0
}

/**
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
 */
export const incrementIndentation = (brain) => {
	if (presenter) {
		presenter.incrementIndentation(brain)
		return
	}

	brain.presenter.indentation += constants.indentStep
}

/**
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
 */
export const decrementIndentation = (brain) => {
	if (presenter) {
		presenter.decrementIndentation(brain)
		return
	}

	brain.presenter.indentation -= constants.indentStep
}
