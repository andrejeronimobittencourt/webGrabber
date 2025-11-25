import Chalk from '../classes/wrappers/Chalk.js'
import constants from './constants.js'

const TABSIZE = 2

/**
 * Display error message
 */
export const displayError = (error) => {
	displayText([{ text: `ERROR: ${error.message}`, color: 'red', style: 'bold' }])
}

/**
 * Display error and exit process
 */
export const displayErrorAndExit = (error) => {
	displayError(error)
	if (process.env.NODE_ENV === 'test') {
		throw error
	}
	process.exit(1)
}

/**
 * Display formatted text with optional indentation
 */
export const displayText = (textData, brain) => {
	if (!brain) {
		Chalk.write(textData)
	} else {
		const payloadId = brain.recall(constants.payloadIdKey)
		if (payloadId) {
			textData.unshift({ text: `${payloadId}: `, color: 'red', style: 'bold' })
		}
		Chalk.write([{ text: ' '.repeat(brain.recall(constants.indentationKey)) }, ...textData])
	}
}

/**
 * Reset indentation level
 */
export const resetIndentation = (brain) => {
	brain.learn(constants.indentationKey, 0)
}

/**
 * Increment indentation level
 */
export const incrementIndentation = (brain) => {
	brain.learn(constants.indentationKey, brain.recall(constants.indentationKey) + TABSIZE)
}

/**
 * Decrement indentation level
 */
export const decrementIndentation = (brain) => {
	brain.learn(constants.indentationKey, brain.recall(constants.indentationKey) - TABSIZE)
}
