import constants from '../../utils/constants.js'
import { present } from '../../infrastructure/presenter/present.js'

export default class VariablesActions {
	static register(actionList) {
		actionList.add('setVariable', async (brain) => {
			const { key, value } = brain.run.params
			present([
				{ text: ': Setting variable ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
			], brain)
			brain.learn(key, value)
		})
		actionList.add('getVariable', async (brain) => {
			const { key, index } = brain.run.params
			const value = brain.recall(key)
			present([
				{ text: ': Getting variable ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
			], brain)
			brain.learn(constants.inputKey, index !== undefined ? value[index] : value)
		})
		actionList.add('deleteVariable', async (brain) => {
			const { key } = brain.run.params
			present([
				{ text: ': Deleting variable ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
			], brain)
			brain.forget(key)
		})
		actionList.add('transferVariable', async (brain) => {
			const { from, index, key, to } = brain.run.params
			let value = brain.recall(from)
			present([
				{ text: ': Transferring variable ', color: 'white', style: 'italic' },
				{ text: from, color: 'gray', style: 'italic' },
				{ text: ' to ', color: 'white', style: 'italic' },
				{ text: to, color: 'gray', style: 'italic' },
			], brain)
			if (index !== undefined) value = value[index]
			else if (key !== undefined) {
				value = typeof value === 'string' ? JSON.parse(value) : value
				value = value[key]
			}
			brain.learn(to, value)
		})
		actionList.add('appendToVariable', async (brain) => {
			const { key, value } = brain.run.params
			let content = brain.recall(key)
			if (content === undefined) content = []
			else if (!Array.isArray(content)) content = [content]
			content.push(value)
			present([
				{ text: ': Appending to variable ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
			], brain)
			brain.learn(key, content)
		})
		actionList.add('countStart', async (brain) => {
			const { key, value } = brain.run.params
			present([
				{ text: ': Starting count ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
				{ text: ' with value ', color: 'white', style: 'italic' },
				{ text: value ? value : 0, color: 'gray', style: 'italic' },
			], brain)
			if (!value) brain.learn(key, 0)
			else brain.learn(key, value)
		})
		actionList.add('countIncrement', async (brain) => {
			const { key } = brain.run.params
			const count = brain.recall(key) + 1
			present([
				{ text: ': Incrementing count ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
				{ text: ' to ', color: 'white', style: 'italic' },
				{ text: count, color: 'gray', style: 'italic' },
			], brain)
			brain.learn(key, count)
		})
		actionList.add('countDecrement', async (brain) => {
			const { key } = brain.run.params
			const count = brain.recall(key) - 1
			present([
				{ text: ': Decrementing count ', color: 'white', style: 'italic' },
				{ text: key, color: 'gray', style: 'italic' },
				{ text: ' to ', color: 'white', style: 'italic' },
				{ text: count, color: 'gray', style: 'italic' },
			], brain)
			brain.learn(key, count)
		})
	}
}
