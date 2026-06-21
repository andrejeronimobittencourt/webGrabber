import PresenterBase from '../../../packages/core/infrastructure/presenter/PresenterBase.js'
import logger from '../../utils/logger.js'

/**
 * Server presenter that routes runtime messages to winston.
 */
export default class LoggerPresenter extends PresenterBase {
	/**
	 * @param {import('../../../packages/core/infrastructure/presenter/PresenterBase.js').TextSegment[]} textData
	 * @param {ReturnType<import('../../../packages/core/brain/BrainFactory.js').default['create']> | null} brain
	 */
	write(textData, brain) {
		const segments = this.prepareSegments(textData, brain)
		const message = this.segmentsToPlainText(segments).trimEnd()

		if (!message) return

		const payloadId = brain?.run.payloadId
		logger.debug(message, {
			event: 'grab_output',
			...(payloadId ? { requestId: payloadId } : {}),
		})
	}

	/**
	 * @param {Error | { message: string }} error
	 */
	error(error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.error(`ERROR: ${message}`, { event: 'grab_output_error' })
	}
}
