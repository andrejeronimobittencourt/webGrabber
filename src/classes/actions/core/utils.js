import constants from '../../../utils/constants.js'
import { displayText, sanitizeString } from '../../../utils/utils.js'
import readline from 'readline'
import { v4 as uuidv4 } from 'uuid'

export default class UtilsActions {
	static register(actionList) {
		actionList.add('userInput', async (brain) => {
			const { query } = brain.recall(constants.paramsKey)
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			})

			const prompt = (query) => new Promise((resolve) => rl.question(query, resolve))

			await (async () => {
				try {
					const input = await prompt(' '.repeat(brain.recall(constants.indentationKey)) + query)
					brain.learn(constants.inputKey, input)
					rl.close()
				} catch (e) {
					throw new Error(e)
				}
			})()
		})
		actionList.add('log', async (brain) => {
			const { message, color, background } = brain.recall(constants.paramsKey)
			displayText([{ text: `: ${message}`, color, background, style: 'italic' }], brain)
		})
		actionList.add('sleep', async (brain) => {
			const { ms } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Sleeping ', color: 'white', style: 'italic' },
					{ text: ms, color: 'gray', style: 'italic' },
					{ text: ' ms', color: 'white', style: 'italic' },
				],
				brain,
			)
			await new Promise((resolve) => setTimeout(resolve, ms))
		})
		actionList.add('sanitizeString', async (brain) => {
			const { string } = brain.recall(constants.paramsKey)
			brain.learn(constants.inputKey, sanitizeString(string))
		})
		actionList.add('replaceString', async (brain) => {
			const { string, search, replace } = brain.recall(constants.paramsKey)
			brain.learn(constants.inputKey, string.replace(search, replace))
		})
		actionList.add('matchFromString', async (brain) => {
			const { regex, string } = brain.recall(constants.paramsKey)
			const regexMatch = new RegExp(regex, 'g')
			const match = regexMatch.exec(string)
			if (match) brain.learn(constants.inputKey, match[0])
			else brain.learn(constants.inputKey, '')
		})
		actionList.add('matchFromSelector', async (brain, page) => {
			const { selector, regex, attribute } = brain.recall(constants.paramsKey)
			let html = ''
			try {
				if (attribute) {
					html = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute)
				} else {
					html = await page.$eval(selector, (el) => el.innerHTML)
				}
			} catch (_e) {
				displayText([{ text: ': No element found', color: 'gray', style: 'italic' }], brain)
			}
			const regexMatch = new RegExp(regex, 'g')
			const matches = []
			let match = regexMatch.exec(html)
			while (match) {
				matches.push(match[0])
				match = regexMatch.exec(html)
			}
			brain.learn(constants.inputKey, matches)
		})
		actionList.add('random', async (brain) => {
			const { min, max } = brain.recall(constants.paramsKey)
			const minNumber = Number(min)
			const maxNumber = Number(max)
			displayText(
				[
					{ text: ': Generating random number between ', color: 'white', style: 'italic' },
					{ text: minNumber, color: 'gray', style: 'italic' },
					{ text: ' and ', color: 'white', style: 'italic' },
					{ text: maxNumber, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(
				constants.inputKey,
				Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber,
			)
		})
		actionList.add('uuid', async (brain) => {
			const uuid = uuidv4()
			brain.learn(constants.inputKey, uuid)
			displayText(
				[
					{ text: ': Generating uuid ', color: 'white', style: 'italic' },
					{ text: uuid, color: 'gray', style: 'italic' },
				],
				brain,
			)
		})
		actionList.add('getExtension', async (brain) => {
			const { string } = brain.recall(constants.paramsKey)
			const extension = constants.path.extname(string)
			brain.learn(constants.inputKey, extension)
		})
	}
}
