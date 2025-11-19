import { v4 as uuidv4 } from 'uuid'
import { ActionList } from './Actions.js'
import {
	sanitizeString,
	incrementIndentation,
	decrementIndentation,
	displayText,
	fsOperation,
	pathJoin,
	basePathJoin,
} from '../../utils/utils.js'
import constants from '../../utils/constants.js'
import readline from 'readline'
import axios from 'axios'
import cliProgress from 'cli-progress'
import PuppeteerPageFactory from '../wrappers/Puppeteer.js'

const WAITUNTIL = 'networkidle0'

export default class CoreActionList extends ActionList {
	constructor() {
		super()
		this.load()
	}

	load() {
		super.add('setVariable', async (brain) => {
			const { key, value } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Setting variable ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(key, value)
		})
		super.add('scrollWaitClick', async (brain, page) => {
			const { selector, ms = 2000 } = brain.recall(constants.paramsKey)
			// scroll to element
			await page.evaluate((selector) => {
				const element = document.querySelector(selector)
				element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
			}, selector)
			// wait for 2 seconds
			await page.waitForTimeout(ms)
			// Find the button and click it
			await page.click(selector)
		})
		super.add('transferVariable', async (brain) => {
			const { from, index, key, to } = brain.recall(constants.paramsKey)
			let value = brain.recall(from)
			displayText(
				[
					{ text: ': Transferring variable ', color: 'white', style: 'italic' },
					{ text: from, color: 'gray', style: 'italic' },
					{ text: ' to ', color: 'white', style: 'italic' },
					{ text: to, color: 'gray', style: 'italic' },
				],
				brain,
			)
			if (index !== undefined) value = value[index]
			else if (key !== undefined) {
				value = typeof value === 'string' ? JSON.parse(value) : value
				value = value[key]
			}
			brain.learn(to, value)
		})
		super.add('getVariable', async (brain) => {
			const { key, index } = brain.recall(constants.paramsKey)
			const value = brain.recall(key)
			displayText(
				[
					{ text: ': Getting variable ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(constants.inputKey, index !== undefined ? value[index] : value)
		})
		super.add('deleteVariable', async (brain) => {
			const { key } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Deleting variable ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.forget(key)
		})
		super.add('newPage', async (brain) => {
			const { pageKey } = brain.recall(constants.paramsKey)
			if (!pageKey) {
				throw new Error("The 'newPage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.recall(constants.pagesKey)
			const newPage = await PuppeteerPageFactory.create()
			pages[pageKey] = newPage
			brain.learn(constants.pagesKey, pages)
			displayText(
				[{ text: `New page created with key '${pageKey}'`, color: 'blue', style: 'bold' }],
				brain,
			)
		})
		super.add('closePage', async (brain) => {
			const { pageKey } = brain.recall(constants.paramsKey)
			if (!pageKey) {
				throw new Error("The 'closePage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.recall(constants.pagesKey)
			const page = pages[pageKey]
			if (page) {
				await page.close()
				delete pages[pageKey]
				brain.learn(constants.pagesKey, pages)
				displayText(
					[{ text: `Page with key '${pageKey}' closed`, color: 'blue', style: 'bold' }],
					brain,
				)
			} else {
				displayText(
					[{ text: `Page with key '${pageKey}' not found`, color: 'red', style: 'bold' }],
					brain,
				)
			}
		})
		super.add('switchPage', async (brain) => {
			const { pageKey } = brain.recall(constants.paramsKey)
			if (!pageKey) {
				throw new Error("The 'switchPage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.recall(constants.pagesKey)
			const page = pages[pageKey]
			if (page) {
				await page.bringToFront()
				brain.learn(constants.activePageKey, page)
				displayText(
					[{ text: `Switched to page with key '${pageKey}'`, color: 'blue', style: 'bold' }],
					brain,
				)
			}
		})
		super.add('puppeteer', async (brain, page) => {
			try {
				const { func, func2, ...rest } = brain.recall(constants.paramsKey)
				displayText(
					[
						{ text: ': Puppeteer ', color: 'white', style: 'italic' },
						{ text: func, color: 'gray', style: 'italic' },
						{ text: func2 ? '.' + func2 : '', color: 'gray', style: 'italic' },
					],
					brain,
				)
				if (func === 'newPage') {
					brain.learn(constants.paramsKey, { pageKey: uuidv4() })
					await brain.perform('newPage')
					return
				}
				const params = Object.values(rest)
				brain.learn(
					constants.inputKey,
					func2 ? await page[func][func2](...params) : await page[func](...params),
				)
			} catch (error) {
				throw new Error('Puppeteer function not found')
			}
		})
		super.add('userInput', async (brain) => {
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
		super.add('getExtension', async (brain) => {
			const { string } = brain.recall(constants.paramsKey)
			const extension = constants.path.extname(string)
			brain.learn(constants.inputKey, extension)
		})
		super.add('countStart', async (brain) => {
			const { key, value } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Starting count ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
					{ text: ' with value ', color: 'white', style: 'italic' },
					{ text: value ? value : 0, color: 'gray', style: 'italic' },
				],
				brain,
			)
			if (!value) brain.learn(key, 0)
			else brain.learn(key, value)
		})
		super.add('countIncrement', async (brain) => {
			const { key } = brain.recall(constants.paramsKey)
			const count = brain.recall(key) + 1
			displayText(
				[
					{ text: ': Incrementing count ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
					{ text: ' to ', color: 'white', style: 'italic' },
					{ text: count, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(key, count)
		})
		super.add('countDecrement', async (brain) => {
			const { key } = brain.recall(constants.paramsKey)
			const count = brain.recall(key) - 1
			displayText(
				[
					{ text: ': Decrementing count ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
					{ text: ' to ', color: 'white', style: 'italic' },
					{ text: count, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(key, count)
		})
		super.add('sleep', async (brain) => {
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
		super.add('setCurrentDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.recall(constants.paramsKey)
			dir = sanitizeString(dir)
			if (
				!fsOperation(
					constants.fsMethods.exists,
					pathJoin(brain.recall(constants.currentDirKey), dir),
				)
			)
				throw new Error(`Directory ${dir} does not exist`)
			displayText(
				[
					{ text: ': Setting current dir to ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(
				constants.currentDirKey,
				pathJoin(
					useBaseDir ? brain.recall(constants.baseDirKey) : brain.recall(constants.currentDirKey),
					dir,
				),
			)
		})
		super.add('setBaseDir', async (brain) => {
			const { dir } = brain.recall(constants.paramsKey)
			brain.learn(constants.baseDirKey, basePathJoin(`../resources/${dir}`))
			if (!fsOperation(constants.fsMethods.exists, brain.recall(constants.baseDirKey)))
				fsOperation(constants.fsMethods.mkdir, brain.recall(constants.baseDirKey))
		})
		super.add('resetCurrentDir', async (brain) => {
			brain.learn(constants.currentDirKey, brain.recall(constants.baseDirKey))
		})
		super.add('backToParentDir', async (brain) => {
			if (brain.recall(constants.currentDirKey) === brain.recall(constants.baseDirKey)) return
			brain.learn(
				constants.currentDirKey,
				brain.recall(constants.currentDirKey).split('/').slice(0, -1).join('/'),
			)
		})
		super.add('sanitizeString', async (brain) => {
			const { string } = brain.recall(constants.paramsKey)
			brain.learn(constants.inputKey, sanitizeString(string))
		})
		super.add('random', async (brain) => {
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
		super.add('uuid', async (brain) => {
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
		super.add('screenshot', async (brain, page) => {
			const { name, type, fullPage } = brain.recall(constants.paramsKey)
			const validatedType = ['jpeg', 'png'].includes(type) ? type : 'png'
			const filename = `${sanitizeString(name)}.${validatedType}`
			const filePath = pathJoin(brain.recall(constants.currentDirKey), filename)
			displayText(
				[
					{ text: ': Taking screenshot ', color: 'white', style: 'italic' },
					{ text: name, color: 'gray', style: 'italic' },
				],
				brain,
			)
			await page.screenshot({
				path: filePath,
				type: validatedType,
				fullPage: fullPage ? fullPage : true,
			})
		})
		super.add('screenshotElement', async (brain, page) => {
			const { name, type, selector } = brain.recall(constants.paramsKey)
			const validatedType = ['jpeg', 'png'].includes(type) ? type : 'png'
			const filename = `${sanitizeString(name)}.${validatedType}`
			const filePath = pathJoin(brain.recall(constants.currentDirKey), filename)
			displayText(
				[
					{ text: ': Taking screenshot of element ', color: 'white', style: 'italic' },
					{ text: name, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const elementHandle = await page.$(selector)

			const boxModel = await elementHandle.boxModel()
			const paddingLeft = boxModel.border[3].x - boxModel.margin[3].x
			const paddingRight = boxModel.margin[1].x - boxModel.border[1].x
			const paddingTop = boxModel.border[0].y - boxModel.margin[0].y
			const paddingBottom = boxModel.margin[2].y - boxModel.border[2].y
			const totalHeight = boxModel.height + paddingTop + paddingBottom

			await elementHandle.screenshot({
				path: filePath,
				clip: {
					x: boxModel.border[0].x,
					y: boxModel.border[0].y,
					width: boxModel.width - paddingLeft - paddingRight,
					height: totalHeight,
				},
			})
		})
		super.add('replaceString', async (brain) => {
			const { string, search, replace } = brain.recall(constants.paramsKey)
			brain.learn(constants.inputKey, string.replace(search, replace))
		})
		super.add('matchFromString', async (brain) => {
			const { regex, string } = brain.recall(constants.paramsKey)
			const regexMatch = new RegExp(regex, 'g')
			const match = regexMatch.exec(string)
			if (match) brain.learn(constants.inputKey, match[0])
			else brain.learn(constants.inputKey, '')
		})
		super.add('matchFromSelector', async (brain, page) => {
			const { selector, regex } = brain.recall(constants.paramsKey)
			let html = ''
			try {
				html = await page.$eval(selector, (el) => el.innerHTML)
			} catch (e) {
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
		super.add('elementExists', async (brain, page) => {
			const { selector } = brain.recall(constants.paramsKey)
			const element = await page.$(selector)
			brain.learn(constants.inputKey, element ? true : false)
		})
		super.add('getChildren', async (brain, page) => {
			const { selectorParent, selectorChild, attribute } = brain.recall(constants.paramsKey)
			const parents = await page.$$(selectorParent)
			const result = []
			for (const parent of parents) {
				const parentChildren = await parent.$$(selectorChild)
				if (parentChildren) {
					const children = []
					for (const child of parentChildren) {
						if (attribute)
							children.push(
								await page.evaluate(
									(element, attribute) => element.getAttribute(attribute),
									child,
									attribute,
								),
							)
						else children.push(await page.evaluate((element) => element.textContent, child))
					}
					result.push(children)
				}
			}
			brain.learn(constants.inputKey, result)
		})
		super.add('getElements', async (brain, page) => {
			const { selector, attribute } = brain.recall(constants.paramsKey)
			let content = []
			const elements = await page.$$(selector)
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i]
				if (attribute)
					content.push(
						await page.evaluate(
							(element, attribute) => element.getAttribute(attribute),
							element,
							attribute,
						),
					)
				else content.push(await page.evaluate((element) => element.textContent, element))
			}
			brain.learn(constants.inputKey, content)
		})
		super.add('appendToVariable', async (brain) => {
			const { key, value } = brain.recall(constants.paramsKey)
			let content = brain.recall(key)
			if (content === undefined) content = []
			content.push(value)
			displayText(
				[
					{ text: ': Appending to variable ', color: 'white', style: 'italic' },
					{ text: key, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(key, content)
		})
		super.add('login', async (brain, page) => {
			const {
				url,
				usernameSelector,
				username,
				passwordSelector,
				password,
				submitSelector,
				cookieName,
			} = brain.recall(constants.paramsKey)
			incrementIndentation(brain)
			const cookiesDir = pathJoin(brain.recall(constants.baseDirKey), 'cookies')
			if (fsOperation(constants.fsMethods.exists, `${cookiesDir}/cookies.json`)) {
				displayText([{ text: ': Loading cookies', style: 'italic' }], brain)
				const cookies = JSON.parse(
					fsOperation(constants.fsMethods.readFile, `${cookiesDir}/cookies.json`),
					'utf8',
				)
				const accessToken = cookieName
					? cookies.find((cookie) => cookie.name === cookieName)
					: cookies[0]
				if (new Date(accessToken.expires * 1000) > new Date()) {
					await page.setCookie(...cookies)
					displayText([{ text: ': Cookies loaded', style: 'italic' }], brain)
					decrementIndentation(brain)
					return
				} else {
					fsOperation(constants.fsMethods.unlink, `${cookiesDir}/cookies.json`)
					displayText([{ text: ': Cookies expired', style: 'italic' }], brain)
				}
			}
			brain.learn(constants.paramsKey, {
				url: url,
				func: 'goto',
				options: { waitUntil: WAITUNTIL },
			})
			await brain.perform('puppeteer', page)
			displayText([{ text: ': Page loaded', style: 'italic' }], brain)
			await page.waitForSelector(usernameSelector, { visible: true })
			brain.learn(constants.paramsKey, { selector: usernameSelector, text: username })
			await brain.perform('type', page)
			await page.waitForSelector(passwordSelector, { visible: true })
			brain.learn(constants.paramsKey, { selector: passwordSelector, text: password, secret: true })
			await brain.perform('type', page)
			displayText([{ text: ': Credentials entered', style: 'italic' }], brain)
			await page.waitForSelector(submitSelector, { visible: true })
			brain.learn(constants.paramsKey, { selector: submitSelector })
			await brain.perform('click', page)
			displayText([{ text: ': Login submitted', style: 'italic' }], brain)
			await page.waitForNavigation({
				waitUntil: WAITUNTIL,
			})
			const cookies = await page.cookies()
			if (cookies.length > 0) {
				// check if cookies dir exists
				if (!fsOperation(constants.fsMethods.exists, cookiesDir)) {
					brain.learn(constants.paramsKey, { dir: 'cookies', useBaseDir: true })
					await brain.perform('createDir', page)
				}
				fsOperation(
					constants.fsMethods.writeFile,
					`${cookiesDir}/cookies.json`,
					JSON.stringify(cookies),
					(err) => {
						if (err) throw err
						displayText([{ text: ': Cookies saved', style: 'italic' }], brain)
					},
				)
			}
			decrementIndentation(brain)
		})
		super.add('createDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.recall(constants.paramsKey)
			dir = sanitizeString(dir)
			displayText(
				[
					{ text: ': Creating directory ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const dirPath = pathJoin(
				useBaseDir ? brain.recall(constants.baseDirKey) : brain.recall(constants.currentDirKey),
				dir,
			)
			if (!fsOperation(constants.fsMethods.exists, dirPath))
				fsOperation(constants.fsMethods.mkdir, dirPath)
		})
		super.add('type', async (brain, page) => {
			const { selector, text, secret = false } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Typing ', color: 'white', style: 'italic' },
					{ text: secret ? '•••••' : text, color: 'gray', style: 'italic' },
				],
				brain,
			)
			await page.waitForSelector(selector, { visible: true })
			await page.type(selector, text)
		})
		super.add('if', async (brain) => {
			const { condition, actions } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Condition: ', style: 'italic' },
					{ text: condition, style: 'bold' },
				],
				brain,
			)
			if (eval(condition)) {
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
		})
		super.add('ifElse', async (brain) => {
			const { condition, actions, elseActions } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Condition: ', style: 'italic' },
					{ text: condition, style: 'bold' },
				],
				brain,
			)
			if (eval(condition)) {
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
		})
		super.add('createFile', async (brain) => {
			const { filename } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Creating file ', style: 'italic' },
					{ text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`, style: 'bold' },
				],
				brain,
			)
			fsOperation(
				constants.fsMethods.appendFile,
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				'',
			)
		})
		super.add('click', async (brain, page) => {
			const { selector, attribute, text } = brain.recall(constants.paramsKey)
			if (attribute || text) {
				const elements = await page.$$(selector)
				for (let i = 0; i < elements.length; i++) {
					const element = elements[i]
					if (attribute && text) {
						const content = await page.evaluate(
							(element, attribute) => element.getAttribute(attribute),
							element,
							attribute,
						)
						if (content === text) {
							await element.click()
							break
						}
					} else if (text) {
						const content = await page.evaluate((element) => element.textContent, element)
						if (content === text) {
							await element.click()
							break
						}
					}
				}
			} else {
				await page.waitForSelector(selector, { visible: true })
				await page.click(selector)
			}
		})
		super.add('clickAll', async (brain, page) => {
			const { selector } = brain.recall(constants.paramsKey)
			const elements = await page.$$(selector)
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i]
				await page.waitForFunction(
					(element) => {
						element.scrollIntoView()
						const { top, left, bottom, right } = element.getBoundingClientRect()
						return (
							top >= 0 &&
							left >= 0 &&
							bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
							right <= (window.innerWidth || document.documentElement.clientWidth)
						)
					},
					{},
					element,
				)
				await element.click()
			}
		})
		super.add('readFromText', async (brain) => {
			const { filename, breakLine = false } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Reading from file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = fsOperation(
				constants.fsMethods.readFile,
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				'utf8',
			)
			if (breakLine) {
				// add to brain using an array
				brain.learn(constants.inputKey, content.split('\n'))
			} else {
				// add to brain using a string
				brain.learn(constants.inputKey, content)
			}
		})
		super.add('fileExists', async (brain) => {
			const { filename } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Checking if file exists ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const exists = fsOperation(
				constants.fsMethods.exists,
				`${brain.recall(constants.currentDirKey)}/${filename}`,
			)
			brain.learn(constants.inputKey, exists)
		})
		super.add('deleteFile', async (brain) => {
			const { filename } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Deleting file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				fsOperation(
					constants.fsMethods.exists,
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				)
			)
				fsOperation(
					constants.fsMethods.unlink,
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				)
		})
		super.add('deleteFolder', async (brain) => {
			const { foldername } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Deleting folder ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${foldername}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				fsOperation(
					constants.fsMethods.exists,
					`${brain.recall(constants.currentDirKey)}/${foldername}`,
				)
			)
				fsOperation(
					constants.fsMethods.rmdir,
					`${brain.recall(constants.currentDirKey)}/${foldername}`,
					{ recursive: true },
				)
		})
		super.add('listFolders', async (brain) => {
			displayText(
				[
					{ text: ': Listing folders ', style: 'italic' },
					{ text: `${brain.recall(constants.currentDirKey)}`, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const folders = fsOperation(
				constants.fsMethods.readdir,
				brain.recall(constants.currentDirKey),
				{ withFileTypes: true },
			)
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name)
			brain.learn(constants.inputKey, folders)
		})
		super.add('checkStringInFile', async (brain) => {
			const { filename, string } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Checking if string is in file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = fsOperation(
				constants.fsMethods.readFile,
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				'utf8',
			)
			brain.learn(constants.inputKey, content.includes(string))
		})
		super.add('saveToText', async (brain) => {
			const { key, filename } = brain.recall(constants.paramsKey)
			const content = brain.recall(key)
			if (content) {
				displayText(
					[
						{ text: ': Saving ', color: 'white', style: 'italic' },
						{
							text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
							color: 'gray',
							style: 'italic',
						},
					],
					brain,
				)
				fsOperation(
					constants.fsMethods.writeFile,
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content,
				)
			}
		})
		super.add('appendToText', async (brain) => {
			const { key, filename } = brain.recall(constants.paramsKey)
			const content = brain.recall(key)
			if (content) {
				displayText(
					[
						{ text: ': Appending to ', color: 'white', style: 'italic' },
						{
							text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
							color: 'gray',
							style: 'italic',
						},
					],
					brain,
				)
				fsOperation(
					constants.fsMethods.appendFile,
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content + '\n',
				)
			}
		})
		super.add('download', async (brain) => {
			const { url, filename, host } = brain.recall(constants.paramsKey)
			const name = filename ?? url.split('/').pop()
			const sanitizedFilename = sanitizeString(name)
			const needsHost = !url.startsWith('http')

			displayText(
				[
					{ text: ': Downloading ', color: 'white', style: 'italic' },
					{ text: name, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const response = await axios({
				url: needsHost ? `${host}${url}` : url,
				method: 'GET',
				responseType: 'stream',
			})

			const writer = fsOperation(
				constants.fsMethods.createWriteStream,
				`${brain.recall(constants.currentDirKey)}/${sanitizedFilename}`,
			)

			const progressBar = new cliProgress.SingleBar(
				{
					format: ' {bar} {percentage}% | {value}/{total} MB',
					barCompleteChar: '\u2588',
					barIncompleteChar: '\u2591',
					hideCursor: true,
					gracefulExit: true,
				},
				cliProgress.Presets.shades_classic,
			)

			let current = 0

			progressBar.start(parseInt(response.headers['content-length'] / (1024 * 1024)), current)

			response.data.on('data', (chunk) => {
				current += chunk.length / (1024 * 1024)
				progressBar.update(parseInt(current))
			})

			response.data.pipe(writer)

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					progressBar.stop()
					resolve()
				})
				writer.on('error', reject)
			})
		})
		super.add('log', async (brain) => {
			const { text, color, background } = brain.recall(constants.paramsKey)
			displayText([{ text: `: ${text}`, color, background, style: 'italic' }], brain)
		})
		super.add('forEach', async (brain) => {
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
		super.add('for', async (brain) => {
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
		super.add('while', async (brain) => {
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
