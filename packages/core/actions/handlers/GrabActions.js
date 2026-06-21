import { executeGrab } from '../../grabExecution.js'
import { ActionError } from '../../errors/ActionErrors.js'

export default class GrabActions {
	static register(actionList) {
		actionList.add('runGrab', async (brain) => {
			const { grab, params = {} } = brain.run.params
			const grabCatalog = brain.run.grabCatalog

			if (!grabCatalog) {
				throw new ActionError('runGrab', 'Grab catalog is not initialized for this run')
			}

			await executeGrab(brain, grab, params, { grabCatalog })
		})
	}
}
