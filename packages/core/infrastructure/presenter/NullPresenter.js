import PresenterBase from './PresenterBase.js'

/**
 * Default no-op presenter used until the app layer injects a real adapter.
 */
export default class NullPresenter extends PresenterBase {
	/**
	 * @param {import('./PresenterBase.js').TextSegment[]} _textData
	 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']> | null} _brain
	 */
	write(_textData, _brain) {}
}
