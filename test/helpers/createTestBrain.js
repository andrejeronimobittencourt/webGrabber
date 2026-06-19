import BrainFactory from '../../src/core/brain/BrainFactory.js'
import { ActionListContainer } from '../../src/core/actions/ActionRegistry.js'

/**
 * Create a Brain instance via BrainFactory for unit tests.
 * @param {Map<string, *>} [memories]
 * @returns {ReturnType<typeof BrainFactory.create>}
 */
export const createTestBrain = (memories = new Map()) => {
	BrainFactory.init(memories, new ActionListContainer())
	return BrainFactory.create()
}
