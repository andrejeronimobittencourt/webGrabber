import StyledConsole from '../StyledConsole.js'
import PresenterBase from '../../../packages/core/infrastructure/presenter/PresenterBase.js'

/**
 * CLI output adapter using chalk-colored console output.
 */
export default class CliPresenter extends PresenterBase {
	/**
	 * @param {import('../../../packages/core/infrastructure/presenter/PresenterBase.js').TextSegment[]} textData
	 * @param {ReturnType<import('../../../packages/core/brain/BrainFactory.js').default['create']> | null} brain
	 */
	write(textData, brain) {
		const segments = this.prepareSegments(textData, brain)
		StyledConsole.write(segments)
	}
}
