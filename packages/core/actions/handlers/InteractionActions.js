import constants from '../../utils/constants.js'
import { decrementIndentation, incrementIndentation, present } from '../../infrastructure/presenter/present.js'
import { pathJoin } from '../../utils/paths.js'
import { FileSystem } from '../../utils/FileSystem.js'
import { SelectorError, NetworkError } from '../../errors/ActionErrors.js'
import { retryWithBackoff, isRetryableError } from '../../utils/retry.js'

const WAITUNTIL = 'networkidle0'

export default class InteractionActions {
	static register(actionList) {
		actionList.add('click', async (brain, page) => {
			const { selector, attribute, text } = brain.run.params

			const performClick = async () => {
				try {
					if (attribute || text) {
						const elements = await page.$$(selector)

						if (elements.length === 0) {
							throw new SelectorError('click', selector, { attribute, text })
						}

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
									return
								}
							} else if (text) {
								const content = await page.evaluate((element) => element.textContent, element)
								if (content === text) {
									await element.click()
									return
								}
							}
						}

						throw new SelectorError('click', selector, {
							attribute,
							text,
							reason: 'No matching element found',
						})
					} else {
						await page.waitForSelector(selector, { visible: true, timeout: 5000 })
						await page.click(selector)
					}
				} catch (error) {
					if (error instanceof SelectorError) {
						throw error
					}

					let pageUrl = 'unknown'
					try {
						pageUrl = page.url()
					} catch {
						// Navigation may have destroyed the execution context.
					}

					throw new SelectorError('click', selector, {
						originalError: error.message,
						pageUrl,
					})
				}
			}

			await retryWithBackoff(performClick, {
				maxAttempts: 3,
				initialDelay: 1000,
				retryOn: isRetryableError,
				brain,
			})
		})
		actionList.add('clickAll', async (brain, page) => {
			const { selector } = brain.run.params
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
		actionList.add('scrollWaitClick', async (brain, page) => {
			const { selector, ms = 2000 } = brain.run.params
			await page.evaluate((selector) => {
				const element = document.querySelector(selector)
				element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
			}, selector)
			await page.waitForTimeout(ms)
			await page.click(selector)
		})
		actionList.add('type', async (brain, page) => {
			const { selector, text, secret = false } = brain.run.params

			const performType = async () => {
				try {
					present([
						{ text: ': Typing ', color: 'white', style: 'italic' },
						{ text: secret ? '•••••' : text, color: 'gray', style: 'italic' },
					], brain)
					await page.waitForSelector(selector, { visible: true, timeout: 5000 })
					await page.type(selector, text)
				} catch (error) {
					let pageUrl = 'unknown'
					try {
						pageUrl = page.url()
					} catch {
						// Navigation may have destroyed the execution context.
					}

					throw new SelectorError('type', selector, {
						originalError: error.message,
						pageUrl,
					})
				}
			}

			await retryWithBackoff(performType, {
				maxAttempts: 3,
				initialDelay: 1000,
				retryOn: isRetryableError,
				brain,
			})
		})
		actionList.add('pressKey', async (brain, page) => {
			const { key, selector } = brain.run.params

			if (selector) {
				await page.waitForSelector(selector, { visible: true, timeout: 5000 })
				await page.focus(selector)
			}

			await page.keyboard.press(key)
		})
		actionList.add('login', async (brain, page) => {
			const {
				url,
				usernameSelector,
				username,
				passwordSelector,
				password,
				submitSelector,
				cookieName,
			} = brain.run.params

			const performLogin = async () => {
				incrementIndentation(brain)
				const cookiesDir = pathJoin(brain.fs.baseDir, 'cookies')
				if (FileSystem.exists(`${cookiesDir}/cookies.json`)) {
					present([{ text: ': Loading cookies', style: 'italic' }], brain)
					const cookies = JSON.parse(
						await FileSystem.readFile(`${cookiesDir}/cookies.json`, 'utf8'),
					)
					const accessToken = cookieName
						? cookies.find((cookie) => cookie.name === cookieName)
						: cookies[0]
					if (accessToken && new Date(accessToken.expires * 1000) > new Date()) {
						await page.setCookie(...cookies)
						present([{ text: ': Cookies loaded', style: 'italic' }], brain)
						decrementIndentation(brain)
						return
					} else {
						await FileSystem.unlink(`${cookiesDir}/cookies.json`)
						present([{ text: ': Cookies expired', style: 'italic' }], brain)
					}
				}

				try {
					brain.run.params = {
						url: url,
						func: 'goto',
						options: { waitUntil: WAITUNTIL },
					}
					await brain.perform('puppeteer', page)
					present([{ text: ': Page loaded', style: 'italic' }], brain)

					await page.waitForSelector(usernameSelector, { visible: true, timeout: 10000 })
					brain.run.params = { selector: usernameSelector, text: username }
					await brain.perform('type', page)

					await page.waitForSelector(passwordSelector, { visible: true, timeout: 5000 })
					brain.run.params = {
						selector: passwordSelector,
						text: password,
						secret: true,
					}
					await brain.perform('type', page)

					present([{ text: ': Credentials entered', style: 'italic' }], brain)
					await page.waitForSelector(submitSelector, { visible: true, timeout: 5000 })
					brain.run.params = { selector: submitSelector }
					await brain.perform('click', page)

					present([{ text: ': Login submitted', style: 'italic' }], brain)
					await page.waitForNavigation({
						waitUntil: WAITUNTIL,
						timeout: 30000,
					})

					const cookies = await page.cookies()
					if (cookies.length > 0) {
						if (!FileSystem.exists(cookiesDir)) {
							brain.run.params = { dir: 'cookies', useBaseDir: true }
							await brain.perform('createDir', page)
						}
						await FileSystem.writeFile(
							`${cookiesDir}/cookies.json`,
							JSON.stringify(cookies),
						)
						present([{ text: ': Cookies saved', style: 'italic' }], brain)
					}
					decrementIndentation(brain)
				} catch (error) {
					decrementIndentation(brain)
					throw new NetworkError('login', url, error)
				}
			}

			await retryWithBackoff(performLogin, {
				maxAttempts: 3,
				initialDelay: 2000,
				retryOn: isRetryableError,
				brain,
			})
		}, { serverBlocked: true })
	}
}
