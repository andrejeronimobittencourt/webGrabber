import CliPresenter from './CliPresenter.js'

/** @type {import('./PresenterBase.js').default} */
let presenter = new CliPresenter()

/** @type {boolean} */
let serverMode = false

/**
 * Set the process-wide output adapter (CLI or server logger).
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
 * @param {ReturnType<import('../../core/brain/BrainFactory.js').default['create']> | null} [brain]
 * @param {PresentOptions} [options]
 */
export const present = (textData, brain = null, options = {}) => {
	if (!serverMode && !options.force && brain?.presenter.verbose === 0) {
		return
	}

	presenter.write(textData, brain)
}

/**
 * @param {Error | { message: string }} error
 */
export const presentError = (error) => {
	presenter.error(error)
}

/**
 * @param {ReturnType<import('../../core/brain/BrainFactory.js').default['create']>} brain
 */
export const resetIndentation = (brain) => {
	presenter.resetIndentation(brain)
}

/**
 * @param {ReturnType<import('../../core/brain/BrainFactory.js').default['create']>} brain
 */
export const incrementIndentation = (brain) => {
	presenter.incrementIndentation(brain)
}

/**
 * @param {ReturnType<import('../../core/brain/BrainFactory.js').default['create']>} brain
 */
export const decrementIndentation = (brain) => {
	presenter.decrementIndentation(brain)
}
