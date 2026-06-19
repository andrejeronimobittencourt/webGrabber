import StyledConsole from '../StyledConsole.js'
import PresenterBase from './PresenterBase.js'

/**
 * CLI output adapter using chalk-colored console output.
 */
export default class CliPresenter extends PresenterBase {
	/**
	 * @param {import('./PresenterBase.js').TextSegment[]} textData
	 * @param {ReturnType<import('../../core/brain/BrainFactory.js').default['create']> | null} brain
	 */
	write(textData, brain) {
		const segments = this.prepareSegments(textData, brain)
		StyledConsole.write(segments)
	}
}
