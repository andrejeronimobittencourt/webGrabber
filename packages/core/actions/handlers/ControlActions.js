import constants from '../../utils/constants.js'
import { decrementIndentation, incrementIndentation, present } from '../../infrastructure/presenter/present.js'
import { sanitizeString } from '../../utils/stringUtils.js'
import { safeEvaluate, validateExpression } from '../../utils/safeEvaluator.js'

/**
 * Build a safe condition evaluator bound to the current brain state.
 * @param {string} condition
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
 * @returns {() => boolean}
 */
function buildConditionEvaluator(condition, brain) {
	return () => {
		const context = { INPUT: brain.recall(constants.inputKey) }
		try {
			return safeEvaluate(condition, context)
		} catch (error) {
			throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`)
		}
	}
}

/**
 * Execute an action list in sequence, using the active browser page.
 * @param {Array<{ name: string, params: object }>} actions
 * @param {ReturnType<import('../../brain/BrainFactory.js').default['create']>} brain
 */
async function runActionList(actions, brain) {
	for (const action of actions) {
		brain.run.params = action.params
		await brain.perform(action.name, brain.browser.activePage)
	}
}

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

			const evaluate = buildConditionEvaluator(condition, brain)

			if (evaluate()) {
				present([{ text: ': Condition is true', style: 'italic' }], brain)
				incrementIndentation(brain)
				try {
					await runActionList(actions, brain)
				} finally {
					decrementIndentation(brain)
				}
				present([{ text: ': End of if', style: 'italic' }], brain)
			} else {
				present([{ text: ': Condition is false', style: 'italic' }], brain)
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

			const evaluate = buildConditionEvaluator(condition, brain)

			if (evaluate()) {
				present([{ text: ': Condition is true', style: 'italic' }], brain)
				incrementIndentation(brain)
				try {
					await runActionList(actions, brain)
				} finally {
					decrementIndentation(brain)
				}
				present([{ text: ': End of if', style: 'italic' }], brain)
			} else {
				present([{ text: ': Condition is false', style: 'italic' }], brain)
				incrementIndentation(brain)
				try {
					await runActionList(elseActions, brain)
				} finally {
					decrementIndentation(brain)
				}
				present([{ text: ': End of else', style: 'italic' }], brain)
			}
		})

		actionList.add('for', async (brain) => {
			const { from, until, step, actions } = brain.run.params

			if (step === 0) {
				throw new Error("The 'for' action requires a non-zero 'step' value to prevent infinite loops.")
			}

			incrementIndentation(brain)
			try {
				for (let i = from; i <= until; i += step) {
					present([
						{ text: `: [${i}/${until}]`, color: 'yellow', style: 'italic' },
					], brain)
					brain.learn(constants.inputKey, i)
					await runActionList(actions, brain)
				}
			} finally {
				decrementIndentation(brain)
			}
			present([{ text: ': End of for loop', color: 'yellow', style: 'italic' }], brain)
		})

		actionList.add('forEach', async (brain) => {
			const { key, actions } = brain.run.params
			const value = brain.recall(key)

			if (!Array.isArray(value)) {
				throw new Error(
					`The 'forEach' action requires '${key}' to be an array, but got ${value === null ? 'null' : typeof value}.`,
				)
			}

			const valueLength = value.length
			incrementIndentation(brain)
			try {
				for (let i = 0; i < valueLength; i++) {
					present(
						[
							{ text: `: ${key}[${i + 1}/${valueLength}]`, color: 'yellow', style: 'italic' },
							{ text: `: ${sanitizeString(value[i], brain)}`, color: 'white', style: 'italic' },
						],
						brain,
					)
					brain.learn(constants.inputKey, value[i])
					await runActionList(actions, brain)
				}
			} finally {
				decrementIndentation(brain)
			}
			present([{ text: ': End of forEach', color: 'yellow', style: 'italic' }], brain)
		})

		actionList.add('while', async (brain) => {
			const { condition, actions } = brain.run.params

			if (!validateExpression(condition)) {
				throw new Error(`Invalid or potentially unsafe condition: ${condition}`)
			}

			const evaluate = buildConditionEvaluator(condition, brain)

			incrementIndentation(brain)
			try {
				while (evaluate()) {
					await runActionList(actions, brain)
				}
			} finally {
				decrementIndentation(brain)
			}
			present([{ text: ': End of while loop', color: 'yellow', style: 'italic' }], brain)
		})
	}
}
