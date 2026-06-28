import constants from '../../utils/constants.js'
import { decrementIndentation, incrementIndentation, present } from '../../infrastructure/presenter/present.js'
import { pathJoin } from '../../utils/paths.js'
import { FileSystem } from '../../utils/FileSystem.js'
import { SelectorError, NetworkError } from '../../errors/ActionErrors.js'
import { retryWithBackoff, isRetryableError } from '../../utils/retry.js'
import { safePageUrl } from '../../utils/safePageUrl.js'
import { delayMs } from '../../utils/delayMs.js'

const WAITUNTIL = 'networkidle0'

async function resolveActionConfig(page, brain) {
	const config = { timeout: 5000, maxAttempts: 3 }

	if (brain.run.agentMode) {
		const readyState = await page.evaluate(() => document.readyState).catch(() => 'complete')
		if (readyState === 'complete') {
			config.timeout = 5000
			config.maxAttempts = 1
		}
	}

	if (brain.run.params.timeout !== undefined) {
		config.timeout = brain.run.params.timeout
	}

	if (brain.run.params.maxAttempts !== undefined) {
		config.maxAttempts = brain.run.params.maxAttempts
	}

	return config
}

export default class InteractionActions {
	static register(actionList) {
		actionList.add('click', async (brain, page) => {
			const { selector, attribute, text } = brain.run.params
			const config = await resolveActionConfig(page, brain)

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
						let clicked = false
						try {
							await page.waitForSelector(selector, { visible: true, timeout: config.timeout })
							
							// Execute physical click (for sites that require trusted events)
							await page.click(selector).catch(() => {})
							
							// ALWAYS execute native JS click to bypass invisible ad overlays
							clicked = await page.evaluate((sel) => {
								const el = document.querySelector(sel)
								if (el) {
									el.click()
									return true
								}
								return false
							}, selector)
						} catch {
							// Fallback if waitForSelector fails (e.g., Shadow DOM)
							clicked = await page.evaluate((sel) => {
								const el = document.querySelector(sel)
								if (el) {
									el.click()
									return true
								}
								return false
							}, selector)
						}
						if (!clicked) {
							throw new SelectorError('click', selector, {
								originalError: 'Selector not found or not visible',
								pageUrl: safePageUrl(page),
							})
						}
					}
				} catch (error) {
					if (error instanceof SelectorError) {
						throw error
					}

					throw new SelectorError('click', selector, {
						originalError: error.message,
						pageUrl: safePageUrl(page),
					})
				}
			}

			await retryWithBackoff(performClick, {
				maxAttempts: config.maxAttempts,
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
			await delayMs(ms)
			await page.click(selector)
		})
		actionList.add('type', async (brain, page) => {
			const { selector, text, secret = false, pressEnter = false } = brain.run.params
			const config = await resolveActionConfig(page, brain)

			const performType = async () => {
				try {
					present([
						{ text: ': Typing ', color: 'white', style: 'italic' },
						{ text: secret ? '•••••' : text, color: 'gray', style: 'italic' },
					], brain)
					await page.waitForSelector(selector, { visible: true, timeout: config.timeout })
					if (brain.run.agentMode) {
						// Triple-click selects all existing text so typing replaces it instead of appending.
						await page.click(selector, { clickCount: 3 })
					}
					await page.type(selector, text)
					if (pressEnter) {
						await delayMs(300)
						await Promise.all([
							page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {}),
							page.keyboard.press('Enter')
						])
						await delayMs(1500)
					}
				} catch (error) {
					throw new SelectorError('type', selector, {
						originalError: error.message,
						pageUrl: safePageUrl(page),
					})
				}
			}

			await retryWithBackoff(performType, {
				maxAttempts: config.maxAttempts,
				initialDelay: 1000,
				retryOn: isRetryableError,
				brain,
			})
		})
		actionList.add('pressKey', async (brain, page) => {
			const { key, selector } = brain.run.params
			const config = await resolveActionConfig(page, brain)

			if (selector) {
				await page.waitForSelector(selector, { visible: true, timeout: config.timeout })
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
