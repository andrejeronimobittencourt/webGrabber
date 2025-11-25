import { ActionList } from './Actions.js'
import VariablesActions from './core/variables.js'
import InteractionActions from './core/interaction.js'
import BrowserActions from './core/browser.js'
import FilesystemActions from './core/filesystem.js'
import ControlActions from './core/control.js'
import UtilsActions from './core/utils.js'

export default class CoreActionList extends ActionList {
	constructor() {
		super()
		this.load()
	}

	load() {
		// Register all action modules
		VariablesActions.register(this)
		InteractionActions.register(this)
		BrowserActions.register(this)
		FilesystemActions.register(this)
		ControlActions.register(this)
		UtilsActions.register(this)
	}
}
