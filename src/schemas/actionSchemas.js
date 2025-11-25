import { z } from 'zod'
import * as variables from './actions/variables.js'
import * as interaction from './actions/interaction.js'
import * as browser from './actions/browser.js'
import * as filesystem from './actions/filesystem.js'
import * as control from './actions/control.js'
import * as utils from './actions/utils.js'

export const actionSchemas = {
	// Variables & Counters
	setVariable: variables.setVariable,
	getVariable: variables.getVariable,
	deleteVariable: variables.deleteVariable,
	transferVariable: variables.transferVariable,
	appendToVariable: variables.appendToVariable,
	countStart: variables.countStart,
	countIncrement: variables.countIncrement,
	countDecrement: variables.countDecrement,
	// Interaction
	click: interaction.click,
	clickAll: interaction.clickAll,
	scrollWaitClick: interaction.scrollWaitClick,
	type: interaction.type,
	login: interaction.login,
	// Browser & Elements
	puppeteer: browser.puppeteer,
	screenshot: browser.screenshot,
	screenshotElement: browser.screenshotElement,
	newPage: browser.newPage,
	closePage: browser.closePage,
	switchPage: browser.switchPage,
	getElements: browser.getElements,
	getChildren: browser.getChildren,
	elementExists: browser.elementExists,
	// File System
	setBaseDir: filesystem.setBaseDir,
	setCurrentDir: filesystem.setCurrentDir,
	resetCurrentDir: filesystem.resetCurrentDir,
	backToParentDir: filesystem.backToParentDir,
	createDir: filesystem.createDir,
	deleteFolder: filesystem.deleteFolder,
	listFolders: filesystem.listFolders,
	createFile: filesystem.createFile,
	readFromText: filesystem.readFromText,
	saveToText: filesystem.saveToText,
	appendToText: filesystem.appendToText,
	deleteFile: filesystem.deleteFile,
	fileExists: filesystem.fileExists,
	checkStringInFile: filesystem.checkStringInFile,
	download: filesystem.download,
	// Control Flow
	if: control.if_,
	ifElse: control.ifElse,
	for: control.for_,
	forEach: control.forEach,
	while: control.while_,
	// Utilities
	sanitizeString: utils.sanitizeString,
	replaceString: utils.replaceString,
	matchFromString: utils.matchFromString,
	matchFromSelector: utils.matchFromSelector,
	sleep: utils.sleep,
	log: utils.log,
	random: utils.random,
	uuid: utils.uuid,
	getExtension: utils.getExtension,
	userInput: utils.userInput,
}

export const validateActionParams = (actionName, params) => {
	const schema = actionSchemas[actionName]
	if (!schema) return params

	try {
		return schema.parse(params)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
			throw new Error(`Invalid parameters for action "${actionName}": ${issues}`)
		}
		throw error
	}
}
