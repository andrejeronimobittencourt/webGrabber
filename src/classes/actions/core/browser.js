import { v4 as uuidv4 } from 'uuid'
import constants from '../../../utils/constants.js'
import { displayText, sanitizeString, pathJoin } from '../../../utils/utils.js'
import PuppeteerPageFactory from '../../wrappers/Puppeteer.js'

export default class BrowserActions {
	static register(actionList) {
		actionList.add('puppeteer', async (brain, page) => {
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
			} catch (_error) {
				// ignore
			}
		})
		actionList.add('newPage', async (brain) => {
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
		actionList.add('closePage', async (brain) => {
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
		actionList.add('switchPage', async (brain) => {
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
		actionList.add('screenshot', async (brain, page) => {
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
		actionList.add('screenshotElement', async (brain, page) => {
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
		actionList.add('getElements', async (brain, page) => {
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
		actionList.add('getChildren', async (brain, page) => {
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
		actionList.add('elementExists', async (brain, page) => {
			const { selector } = brain.recall(constants.paramsKey)
			const element = await page.$(selector)
			brain.learn(constants.inputKey, element ? true : false)
		})
	}
}
