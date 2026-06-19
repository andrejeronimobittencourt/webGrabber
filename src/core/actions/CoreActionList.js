import { ActionList } from './ActionRegistry.js'
import VariablesActions from './handlers/VariablesActions.js'
import InteractionActions from './handlers/InteractionActions.js'
import BrowserActions from './handlers/BrowserActions.js'
import FilesystemActions from './handlers/FilesystemActions.js'
import ControlActions from './handlers/ControlActions.js'
import MiscActions from './handlers/MiscActions.js'

export default class CoreActionList extends ActionList {
	constructor() {
		super()
		this.load()
	}

	load() {
		VariablesActions.register(this)
		InteractionActions.register(this)
		BrowserActions.register(this)
		FilesystemActions.register(this)
		ControlActions.register(this)
		MiscActions.register(this)
	}
}
