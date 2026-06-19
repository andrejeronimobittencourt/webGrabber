import { ActionList } from './ActionRegistry.js'

export default class CustomActionList extends ActionList {
	constructor() {
		super()
	}

	add(name, action) {
		super.add(name, action)
	}
}
