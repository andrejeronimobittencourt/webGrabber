import constants from '../../../utils/constants.js'
import { displayText, incrementIndentation, decrementIndentation } from '../../../utils/display.js'
import { pathJoin } from '../../../utils/paths.js'
import { FileSystem } from '../../../utils/fileSystem.js'
import { SelectorError, NetworkError } from '../../../errors/ActionErrors.js'
import { retryWithBackoff, isRetryableError } from '../../../utils/retry.js'

const WAITUNTIL = 'networkidle0'

export default class InteractionActions {
	static register(actionList) {
		actionList.add('click', async (brain, page) => {
			const { selector, attribute, text } = brain.recall(constants.paramsKey)

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
					throw new SelectorError('click', selector, {
						originalError: error.message,
						pageUrl: await page.url(),
					})
				}
			}

			// Retry with backoff for retryable errors
			await retryWithBackoff(performClick, {
				maxAttempts: 3,
				initialDelay: 1000,
				retryOn: isRetryableError,
				brain,
			})
		})
		actionList.add('clickAll', async (brain, page) => {
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
		actionList.add('scrollWaitClick', async (brain, page) => {
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
		actionList.add('type', async (brain, page) => {
			const { selector, text, secret = false } = brain.recall(constants.paramsKey)

			const performType = async () => {
				try {
					displayText(
						[
							{ text: ': Typing ', color: 'white', style: 'italic' },
							{ text: secret ? '•••••' : text, color: 'gray', style: 'italic' },
						],
						brain,
					)
					await page.waitForSelector(selector, { visible: true, timeout: 5000 })
					await page.type(selector, text)
				} catch (error) {
					throw new SelectorError('type', selector, {
						originalError: error.message,
						pageUrl: await page.url(),
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
		actionList.add('login', async (brain, page) => {
			const {
				url,
				usernameSelector,
				username,
				passwordSelector,
				password,
				submitSelector,
				cookieName,
			} = brain.recall(constants.paramsKey)

			const performLogin = async () => {
				incrementIndentation(brain)
				const cookiesDir = pathJoin(brain.recall(constants.baseDirKey), 'cookies')
				if (FileSystem.exists(`${cookiesDir}/cookies.json`)) {
					displayText([{ text: ': Loading cookies', style: 'italic' }], brain)
					const cookies = JSON.parse(
						await FileSystem.readFile(`${cookiesDir}/cookies.json`, 'utf8'),
					)
					const accessToken = cookieName
						? cookies.find((cookie) => cookie.name === cookieName)
						: cookies[0]
					if (accessToken && new Date(accessToken.expires * 1000) > new Date()) {
						await page.setCookie(...cookies)
						displayText([{ text: ': Cookies loaded', style: 'italic' }], brain)
						decrementIndentation(brain)
						return
					} else {
						await FileSystem.unlink(`${cookiesDir}/cookies.json`)
						displayText([{ text: ': Cookies expired', style: 'italic' }], brain)
					}
				}

				try {
					brain.learn(constants.paramsKey, {
						url: url,
						func: 'goto',
						options: { waitUntil: WAITUNTIL },
					})
					await brain.perform('puppeteer', page)
					displayText([{ text: ': Page loaded', style: 'italic' }], brain)

					await page.waitForSelector(usernameSelector, { visible: true, timeout: 10000 })
					brain.learn(constants.paramsKey, { selector: usernameSelector, text: username })
					await brain.perform('type', page)

					await page.waitForSelector(passwordSelector, { visible: true, timeout: 5000 })
					brain.learn(constants.paramsKey, {
						selector: passwordSelector,
						text: password,
						secret: true,
					})
					await brain.perform('type', page)

					displayText([{ text: ': Credentials entered', style: 'italic' }], brain)
					await page.waitForSelector(submitSelector, { visible: true, timeout: 5000 })
					brain.learn(constants.paramsKey, { selector: submitSelector })
					await brain.perform('click', page)

					displayText([{ text: ': Login submitted', style: 'italic' }], brain)
					await page.waitForNavigation({
						waitUntil: WAITUNTIL,
						timeout: 30000,
					})

					const cookies = await page.cookies()
					if (cookies.length > 0) {
						if (!FileSystem.exists(cookiesDir)) {
							brain.learn(constants.paramsKey, { dir: 'cookies', useBaseDir: true })
							await brain.perform('createDir', page)
						}
						await FileSystem.writeFile(
							`${cookiesDir}/cookies.json`,
							JSON.stringify(cookies),
						)
						displayText([{ text: ': Cookies saved', style: 'italic' }], brain)
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
		})
	}
}
