import constants from '../../utils/constants.js'
import { decrementIndentation, incrementIndentation, present } from '../../infrastructure/presenter/present.js'
import { sanitizeString } from '../../utils/stringUtils.js'
import { safeEvaluate, validateExpression } from '../../utils/safeEvaluator.js'

export default class ControlActions {
	static register(actionList) {
		actionList.add('if', async (brain) => {
			const { condition, actions } = brain.run.params

			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			present([
				{ text: ': Condition: ', style: 'italic' },
				{ text: condition, style: 'bold' },
			], brain)

			const context = {
				INPUT: brain.recall(constants.inputKey),
			}

			try {
				if (safeEvaluate(condition, context)) {
					present([{ text: ': Condition is true', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < actions.length; i++) {
						const action = actions[i]
						brain.run.params = action.params
						await brain.perform(action.name, brain.browser.activePage)
					}
					decrementIndentation(brain)
					present([{ text: ': End of if', style: 'italic' }], brain)
				} else {
					present([{ text: ': Condition is false', style: 'italic' }], brain)
				}
			} catch (error) {
				throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
			}
		})
		actionList.add('ifElse', async (brain) => {
			const { condition, actions, elseActions } = brain.run.params

			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			present([
				{ text: ': Condition: ', style: 'italic' },
				{ text: condition, style: 'bold' },
			], brain)

			const context = {
				INPUT: brain.recall(constants.inputKey),
			}

			try {
				if (safeEvaluate(condition, context)) {
					present([{ text: ': Condition is true', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < actions.length; i++) {
						const action = actions[i]
						brain.run.params = action.params
						await brain.perform(action.name, brain.browser.activePage)
					}
					decrementIndentation(brain)
					present([{ text: ': End of if', style: 'italic' }], brain)
				} else {
					present([{ text: ': Condition is false', style: 'italic' }], brain)
					incrementIndentation(brain)
					for (let i = 0; i < elseActions.length; i++) {
						const action = elseActions[i]
						brain.run.params = action.params
						await brain.perform(action.name, brain.browser.activePage)
					}
					decrementIndentation(brain)
					present([{ text: ': End of if', style: 'italic' }], brain)
				}
			} catch (error) {
				throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
			}
		})
		actionList.add('for', async (brain) => {
			const { from, until, step, actions } = brain.run.params
			incrementIndentation(brain)
			for (let i = from; i <= until; i += step) {
				present([
					{ text: `: [${i}/${until}]`, color: 'yellow', style: 'italic' },
				], brain)
				brain.learn(constants.inputKey, i)
				for (const action of actions) {
					brain.run.params = action.params
					await brain.perform(action.name, brain.browser.activePage)
				}
			}
			decrementIndentation(brain)
			present([{ text: ': End of for loop', color: 'yellow', style: 'italic' }], brain)
		})
		actionList.add('forEach', async (brain) => {
			const { key, actions } = brain.run.params
			const value = brain.recall(key)
			const valueLength = value.length
			incrementIndentation(brain)
			for (let i = 0; i < value.length; i++) {
				present(
					[
						{ text: `: ${key}[${i + 1}/${valueLength}]`, color: 'yellow', style: 'italic' },
						{ text: `: ${sanitizeString(value[i], brain)}`, color: 'white', style: 'italic' },
					],
					brain,
				)
				brain.learn(constants.inputKey, value[i])
				for (const action of actions) {
					brain.run.params = action.params
					await brain.perform(action.name, brain.browser.activePage)
				}
			}
			decrementIndentation(brain)
			present([{ text: ': End of forEach', color: 'yellow', style: 'italic' }], brain)
		})
		actionList.add('while', async (brain) => {
			const { condition, actions } = brain.run.params

			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			incrementIndentation(brain)

			const evaluateCondition = () => {
				const context = {
					INPUT: brain.recall(constants.inputKey),
				}
				try {
					return safeEvaluate(condition, context)
				} catch (error) {
					throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
				}
			}

			while (evaluateCondition()) {
				for (const action of actions) {
					brain.run.params = action.params
					await brain.perform(action.name, brain.browser.activePage)
				}
			}
			decrementIndentation(brain)
			present([{ text: ': End of while loop', color: 'yellow', style: 'italic' }], brain)
		})
	}
}
