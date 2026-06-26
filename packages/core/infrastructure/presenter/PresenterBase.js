import constants from '../../utils/constants.js'

/**
 * @typedef {Object} TextSegment
 * @property {string} text
 * @property {string} [color]
 * @property {string} [background]
 * @property {string} [style]
 */

/**
 * Base class for CLI and server presenters.
 */
export default class PresenterBase {
	/**
	 * @param {TextSegment[]} textData
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']> | null} brain
	 */
	write(_textData, _brain) {
		throw new Error(`${this.constructor.name} must implement write()`)
	}

	/**
	 * @param {Error | { message: string }} error
	 */
	error(error) {
		const message = error instanceof Error ? error.message : String(error)
		this.write([{ text: `ERROR: ${message}`, color: 'red', style: 'bold' }], null)
	}

	/**
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
	 */
	resetIndentation(brain) {
		brain.presenter.indentation = 0
	}

	/**
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
	 */
	incrementIndentation(brain) {
		brain.presenter.indentation += constants.indentStep
	}

	/**
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
	 */
	decrementIndentation(brain) {
		brain.presenter.indentation = Math.max(0, brain.presenter.indentation - constants.indentStep)
	}

	/**
	 * @param {TextSegment[]} textData
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']> | null} brain
	 * @returns {TextSegment[]}
	 */
	prepareSegments(textData, brain) {
		const segments = [...textData]

		if (brain) {
			const payloadId = brain.run.payloadId
			if (payloadId) {
				segments.unshift({ text: `${payloadId}: `, color: 'red', style: 'bold' })
			}

			const indent = brain.presenter.indentation
			if (indent > 0) {
				segments.unshift({ text: ' '.repeat(indent) })
			}
		}

		return segments
	}

	/**
	 * @param {TextSegment[]} segments
	 * @returns {string}
	 */
	segmentsToPlainText(segments) {
		return segments.map((segment) => segment.text).join('')
	}
}
