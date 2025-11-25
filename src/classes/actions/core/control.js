import constants from '../../../utils/constants.js'
import { incrementIndentation, decrementIndentation, displayText } from '../../../utils/display.js'
import { sanitizeString } from '../../../utils/utils.js'
import { safeEvaluate, validateExpression } from '../../../utils/safeEvaluator.js'

export default class ControlActions {
	static register(actionList) {
		actionList.add('if', async (brain) => {
			const { condition, actions } = brain.recall(constants.paramsKey)

			// Validate expression for safety
			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			displayText(
				[
					{ text: ': Condition: ', style: 'italic' },
					{ text: condition, style: 'bold' },
				],
				brain,
			)

			// Create safe context with available variables
			const context = {
				INPUT: brain.recall(constants.inputKey),
			}

			try {
				if (safeEvaluate(condition, context)) {
					displayText([{ text: ': Condition is true', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < actions.length; i++) {
						const action = actions[i]
						brain.learn(constants.paramsKey, action.params)
						await brain.perform(action.name, brain.recall(constants.activePageKey))
					}
					decrementIndentation(brain)
					displayText([{ text: ': End of if', style: 'italic' }], brain)
				} else {
					displayText([{ text: ': Condition is false', style: 'italic' }], brain)
				}
			} catch (error) {
				throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
			}
		})
		actionList.add('ifElse', async (brain) => {
			const { condition, actions, elseActions } = brain.recall(constants.paramsKey)

			// Validate expression for safety
			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			displayText(
				[
					{ text: ': Condition: ', style: 'italic' },
					{ text: condition, style: 'bold' },
				],
				brain,
			)

			// Create safe context with available variables
			const context = {
				INPUT: brain.recall(constants.inputKey),
			}

			try {
				if (safeEvaluate(condition, context)) {
					displayText([{ text: ': Condition is true', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < actions.length; i++) {
						const action = actions[i]
						brain.learn(constants.paramsKey, action.params)
						await brain.perform(action.name, brain.recall(constants.activePageKey))
					}
					decrementIndentation(brain)
					displayText([{ text: ': End of if', style: 'italic' }], brain)
				} else {
					displayText([{ text: ': Condition is false', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < elseActions.length; i++) {
						const action = elseActions[i]
						brain.learn(constants.paramsKey, action.params)
						await brain.perform(action.name, brain.recall(constants.activePageKey))
					}
					decrementIndentation(brain)
					displayText([{ text: ': End of if', style: 'italic' }], brain)
				}
			} catch (error) {
				throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
			}
		})
		actionList.add('for', async (brain) => {
			const { from, until, step, actions } = brain.recall(constants.paramsKey)
			incrementIndentation(brain)
			for (let i = from; i <= until; i += step) {
				displayText([{ text: `: [${i}/${until}]`, color: 'yellow', style: 'italic' }], brain)
				brain.learn(constants.inputKey, i)
				for (let action of actions) {
					brain.learn(constants.paramsKey, action.params)
					await brain.perform(action.name, brain.recall(constants.activePageKey))
				}
			}
			decrementIndentation(brain)
			displayText([{ text: ': End of for loop', color: 'yellow', style: 'italic' }], brain)
		})
		actionList.add('forEach', async (brain) => {
			const { key, actions } = brain.recall(constants.paramsKey)
			const value = brain.recall(key)
			const valueLength = value.length
			incrementIndentation(brain)
			for (let i = 0; i < value.length; i++) {
				displayText(
					[
						{ text: `: ${key}[${i + 1}/${valueLength}]`, color: 'yellow', style: 'italic' },
						{ text: `: ${sanitizeString(value[i])}`, color: 'white', style: 'italic' },
					],
					brain,
				)
				brain.learn(constants.inputKey, value[i])
				for (let action of actions) {
					brain.learn(constants.paramsKey, action.params)
					await brain.perform(action.name, brain.recall(constants.activePageKey))
				}
			}
			decrementIndentation(brain)
			displayText([{ text: ': End of forEach', color: 'yellow', style: 'italic' }], brain)
		})
		actionList.add('while', async (brain) => {
			const { condition, actions } = brain.recall(constants.paramsKey)
			incrementIndentation(brain)
			while (eval(condition)) {
				for (let action of actions) {
					brain.learn(constants.paramsKey, action.params)
					await brain.perform(action.name, brain.recall(constants.activePageKey))
				}
			}
			decrementIndentation(brain)
			displayText([{ text: ': End of while loop', color: 'yellow', style: 'italic' }], brain)
		})
	}
}
