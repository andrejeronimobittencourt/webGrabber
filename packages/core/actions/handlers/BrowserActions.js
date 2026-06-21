import { v4 as uuidv4 } from 'uuid'
import { present } from '../../infrastructure/presenter/present.js'
import constants from '../../utils/constants.js'
import { sanitizeString } from '../../utils/stringUtils.js'
import { pathJoin } from '../../utils/paths.js'
import { SelectorError } from '../../errors/ActionErrors.js'
import PuppeteerPageFactory from '../../infrastructure/PuppeteerPageFactory.js'

export default class BrowserActions {
	static register(actionList) {
		actionList.add('puppeteer', async (brain, page) => {
			const { func, func2, ...rest } = brain.run.params
			present([
				{ text: ': Puppeteer ', color: 'white', style: 'italic' },
				{ text: func, color: 'gray', style: 'italic' },
				{ text: func2 ? '.' + func2 : '', color: 'gray', style: 'italic' },
			], brain)

			try {
				if (func === 'newPage') {
					const pageKey = uuidv4()
					brain.run.params = { pageKey }
					await brain.perform('newPage')
					brain.learn(constants.inputKey, pageKey)
					return
				}
				const params = Object.values(rest)
				brain.learn(
					constants.inputKey,
					func2 ? await page[func][func2](...params) : await page[func](...params),
				)
			} catch (error) {
				const label = `Puppeteer ${func}${func2 ? `.${func2}` : ''}`
				throw new Error(`${label} failed: ${error.message}`)
			}
		})
		actionList.add('newPage', async (brain) => {
			const { pageKey } = brain.run.params
			if (!pageKey) {
				throw new Error("The 'newPage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.browser.pages
			const newPage = await PuppeteerPageFactory.create()
			pages[pageKey] = newPage
			brain.browser.pages = pages
			present([
				{ text: `New page created with key '${pageKey}'`, color: 'blue', style: 'bold' },
			], brain)
		})
		actionList.add('closePage', async (brain) => {
			const { pageKey } = brain.run.params
			if (!pageKey) {
				throw new Error("The 'closePage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.browser.pages
			const page = pages[pageKey]
			if (page) {
				await page.close()
				delete pages[pageKey]
				brain.browser.pages = pages
				present([
					{ text: `Page with key '${pageKey}' closed`, color: 'blue', style: 'bold' },
				], brain)
			} else {
				present([
					{ text: `Page with key '${pageKey}' not found`, color: 'red', style: 'bold' },
				], brain)
			}
		})
		actionList.add('switchPage', async (brain) => {
			const { pageKey } = brain.run.params
			if (!pageKey) {
				throw new Error("The 'switchPage' action requires a 'pageKey' parameter.")
			}
			const pages = brain.browser.pages
			const page = pages[pageKey]
			if (page) {
				await page.bringToFront()
				brain.browser.activePage = page
				present([
					{ text: `Switched to page with key '${pageKey}'`, color: 'blue', style: 'bold' },
				], brain)
			}
		})
		actionList.add('screenshot', async (brain, page) => {
			const { name, type, fullPage } = brain.run.params
			const validatedType = ['jpeg', 'png'].includes(type) ? type : 'png'
			const filename = `${sanitizeString(name)}.${validatedType}`
			const filePath = pathJoin(brain.fs.currentDir, filename)
			present([
				{ text: ': Taking screenshot ', color: 'white', style: 'italic' },
				{ text: name, color: 'gray', style: 'italic' },
			], brain)
			await page.screenshot({
				path: filePath,
				type: validatedType,
				fullPage: fullPage ? fullPage : true,
			})
		}, { serverBlocked: true })
		actionList.add('screenshotElement', async (brain, page) => {
			const { name, type, selector } = brain.run.params
			const validatedType = ['jpeg', 'png'].includes(type) ? type : 'png'
			const filename = `${sanitizeString(name)}.${validatedType}`
			const filePath = pathJoin(brain.fs.currentDir, filename)
			present([
				{ text: ': Taking screenshot of element ', color: 'white', style: 'italic' },
				{ text: name, color: 'gray', style: 'italic' },
			], brain)
			const elementHandle = await page.$(selector)

			if (!elementHandle) {
				throw new SelectorError('screenshotElement', selector)
			}

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
		}, { serverBlocked: true })
		actionList.add('getElements', async (brain, page) => {
			const { selector, attribute } = brain.run.params
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
			const { selectorParent, selectorChild, attribute } = brain.run.params
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
			const { selector } = brain.run.params
			const element = await page.$(selector)
			brain.learn(constants.inputKey, element ? true : false)
		})
	}
}
