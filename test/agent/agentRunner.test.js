import test from 'node:test'
import assert from 'node:assert'
import AgentRunner from '../../src/agent/AgentRunner.js'
import AgentPolicy from '../../src/agent/AgentPolicy.js'
import GrabCatalog from '../../packages/core/grabCatalog.js'
import CliPresenter from '../../src/infrastructure/presenter/CliPresenter.js'
import { setPresenter } from '../../src/infrastructure/presenter/present.js'

class MockOllamaClient {
	#responses
	#callCount = 0
	visionModel = 'mock-vision'

	/**
	 * @param {Array<{ message: object }>} responses
	 */
	constructor(responses) {
		this.#responses = responses
	}

	async chat() {
		const response = this.#responses[this.#callCount]
		this.#callCount += 1

		if (!response) {
			throw new Error('No mock Ollama response configured')
		}

		return { choices: [response] }
	}

	async describePageScreenshot() {
		return 'Focused element summary.'
	}
}

class MockPage {
	#url = 'about:blank'
	#fingerprintStep = 0

	url() {
		return this.#url
	}

	setUrl(url) {
		this.#url = url
	}

	async bringToFront() {}

	async title() {
		return 'Mock Page'
	}

	async evaluate(_fn, args) {
		if (args && typeof args.elementOffset === 'number') {
			if (args.elementOffset === 0) {
				return {
					elements: [
						{ selector: 'textarea[name="q"]', text: '' },
						{ selector: 'h1', text: 'Example Domain' },
						{ selector: 'p', text: 'More information...' },
					],
					total: 3,
				}
			}

			const total = 150
			const element = {
				selector: `#item-${args.elementOffset}`,
				text: `Item ${args.elementOffset}`,
			}

			return {
				elements: args.elementOffset >= total ? [] : [element].slice(0, args.elementLimit),
				total,
			}
		}

		this.#fingerprintStep += 1
		if (this.#fingerprintStep % 2 === 1) {
			return { scrollX: 0, scrollY: 0 }
		}

		return '1|A:home:Home'
	}

	async screenshot() {
		return 'mock-screenshot'
	}

	async waitForTimeout() {}

	on() {}

	async $() {
		return {
			async screenshot() {
				return 'element-screenshot'
			},
			async dispose() {},
		}
	}

	browser() {
		const page = this

		return {
			on() {},
			off() {},
			async pages() {
				return [page]
			},
		}
	}
}

function createMockEngine(options = {}) {
	const page = new MockPage()

	return {
		async init() {},
		listImportableCustomActions() {
			return []
		},
		createBrain() {
			return {
				browser: { activePage: page, pages: {} },
				presenter: { verbose: 1, indentation: 0 },
				run: { params: {} },
				recall: () => 'extracted-value',
				async perform() {},
			}
		},
		async bootBrowser(brain) {
			brain.browser.activePage = page
		},
		async cleanup() {},
		async close() {},
		async perform(brain, name, page) {
			if (name === 'getElements' && options.failGetElements) {
				throw new Error('Tool execution failed')
			}
			await brain.perform(name, page)
		},
	}
}

const mockLoadGrabCatalog = async () => new GrabCatalog([])

function createRunnerOptions(overrides = {}) {
	return {
		engine: createMockEngine(),
		loadGrabCatalog: mockLoadGrabCatalog,
		...overrides,
	}
}

test('AgentRunner returns final answer after tool execution', async () => {
	const runner = new AgentRunner(createRunnerOptions({
		policy: new AgentPolicy({ maxSteps: 5 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'getElements',
								arguments: JSON.stringify({ selector: 'h1' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'The h1 text is extracted-value.',
				},
			},
		]),
	}))

	const result = await runner.run('Get the h1 text')

	assert.strictEqual(result.answer, 'The h1 text is extracted-value.')
	assert.strictEqual(result.steps.length, 1)
	assert.strictEqual(result.steps[0].action, 'getElements')
	assert.strictEqual(result.memory.input, 'extracted-value')
})

test('AgentRunner rejects empty instruction', async () => {
	const runner = new AgentRunner(createRunnerOptions({
		client: new MockOllamaClient([]),
	}))

	await assert.rejects(() => runner.run('   '), /Agent instruction is required/)
})

test('AgentRunner feeds tool errors back to the model and continues', async () => {
	const runner = new AgentRunner(createRunnerOptions({
		engine: createMockEngine({ failGetElements: true }),
		policy: new AgentPolicy({ maxSteps: 5 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'getElements',
								arguments: JSON.stringify({ selector: 'h1' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Recovered after the failed tool.',
				},
			},
		]),
	}))

	const result = await runner.run('Try and recover')

	assert.strictEqual(result.answer, 'Recovered after the failed tool.')
	assert.strictEqual(result.steps.length, 1)
	assert.strictEqual(result.steps[0].error, 'Tool execution failed')
	assert.deepStrictEqual(result.steps[0].result, { error: 'Tool execution failed' })
})

test('AgentRunner feeds observation validation errors back to the model and continues', async () => {
	const page = new MockPage()
	page.evaluate = async (_fn, args) => {
		if (args && typeof args.elementOffset === 'number') {
			return {
				elements: [{ selector: 'input[name="q"]', text: '' }],
				total: 1,
			}
		}

		return { scrollX: 0, scrollY: 0 }
	}

	const engine = createMockEngine()
	engine.createBrain = () => ({
		browser: { activePage: page, pages: { default: page } },
		presenter: { verbose: 1, indentation: 0 },
		run: { params: {}, agentMode: true },
		recall: () => null,
		async perform() {},
	})

	const runner = new AgentRunner(createRunnerOptions({
		engine,
		policy: new AgentPolicy({ maxSteps: 5 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'click',
								arguments: JSON.stringify({
									selector: 'div:nth-of-type(2) > div > a',
								}),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Used getElements on the results tab instead.',
				},
			},
		]),
	}))

	const result = await runner.run('Search and read the first result')

	assert.strictEqual(result.answer, 'Used getElements on the results tab instead.')
	assert.strictEqual(result.steps.length, 1)
	assert.match(result.steps[0].error ?? '', /not in the current observation/)
	assert.match(result.steps[0].error ?? '', /div:nth-of-type\(2\)/)
	assert.deepStrictEqual(result.steps[0].result.error, result.steps[0].error)
	assert.ok(Array.isArray(result.steps[0].result.availableSelectors))
	assert.ok(result.steps[0].result.availableSelectors.length > 0)
})

test('AgentRunner logs sanitized tool errors without selectors', async () => {
	const page = new MockPage()
	page.evaluate = async (_fn, args) => {
		if (args && typeof args.elementOffset === 'number') {
			return {
				elements: [{ selector: 'input[name="q"]', text: '' }],
				total: 1,
			}
		}

		return { scrollX: 0, scrollY: 0 }
	}

	const engine = createMockEngine()
	engine.createBrain = () => ({
		browser: { activePage: page, pages: { default: page } },
		presenter: { verbose: 1, indentation: 0 },
		run: { params: {}, agentMode: true },
		recall: () => null,
		async perform() {},
	})

	const runner = new AgentRunner(createRunnerOptions({
		engine,
		policy: new AgentPolicy({ maxSteps: 5 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'click',
								arguments: JSON.stringify({
									selector: 'div:nth-of-type(2) > div > a',
								}),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Recovered.',
				},
			},
		]),
	}))

	setPresenter(new CliPresenter())
	const originalLog = console.log
	/** @type {string[]} */
	const outputs = []

	console.log = (msg) => {
		outputs.push(String(msg))
	}

	try {
		await runner.run('Search and read the first result')
	} finally {
		console.log = originalLog
	}

	const combinedOutput = outputs.join('\n')
	assert.match(combinedOutput, /Agent tool failed:/)
	assert.match(combinedOutput, /Selector is not in the current observation/)
	assert.doesNotMatch(combinedOutput, /div:nth-of-type\(2\)/)
})

test('AgentRunner executes switchTab as an agent-native tool', async () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'false'

	const searchPage = new MockPage()
	searchPage.setUrl('https://duckduckgo.com/')
	const adPage = new MockPage()
	adPage.setUrl('https://ad.example.com/')

	try {
		const engine = createMockEngine()
		engine.createBrain = () => ({
			browser: {
				activePage: adPage,
				pages: { default: searchPage, 'agent-ad': adPage },
			},
			presenter: { verbose: 1, indentation: 0 },
			run: { params: {}, agentMode: true },
			recall: () => null,
			async perform() {},
		})

		const runner = new AgentRunner(createRunnerOptions({
			engine,
			policy: new AgentPolicy({ maxSteps: 5 }),
			client: new MockOllamaClient([
				{
					message: {
						role: 'assistant',
						tool_calls: [
							{
								id: 'call-1',
								type: 'function',
								function: {
									name: 'switchTab',
									arguments: JSON.stringify({ tabKey: 'default' }),
								},
							},
						],
					},
				},
				{
					message: {
						role: 'assistant',
						content: 'Back on the search tab.',
					},
				},
			]),
		}))

		const result = await runner.run('Switch back to search')

		assert.strictEqual(result.answer, 'Back on the search tab.')
		assert.strictEqual(result.steps[0].action, 'switchTab')
		assert.strictEqual(result.steps[0].result.tabKey, 'default')
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})

test('AgentRunner skips page vision before first navigate', async () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'true'

	try {
		let visionCalls = 0
		const page = new MockPage()
		const client = new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'navigate',
								arguments: JSON.stringify({ url: 'https://example.com' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Navigation complete.',
				},
			},
		])
		client.describePageScreenshot = async () => {
			visionCalls += 1
			return 'Example homepage.'
		}

		const engine = createMockEngine()
		engine.createBrain = () => ({
			browser: { activePage: page, pages: { default: page } },
			presenter: { verbose: 1, indentation: 0 },
			run: { params: {}, agentMode: true },
			recall: () => null,
			async perform() {},
		})
		engine.perform = async (_brain, name) => {
			if (name === 'puppeteer' || name === 'navigate') {
				page.setUrl('https://example.com')
			}
		}

		const runner = new AgentRunner(createRunnerOptions({
			engine,
			policy: new AgentPolicy({ maxSteps: 5 }),
			client,
		}))

		await runner.run('Go to example.com')

		assert.strictEqual(visionCalls, 1)
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})

test('AgentRunner executes paginateElements as an agent-native tool', async () => {
	const previousVision = process.env.AGENT_VISION
	process.env.AGENT_VISION = 'false'

	try {
		const runner = new AgentRunner(createRunnerOptions({
			policy: new AgentPolicy({ maxSteps: 5 }),
			client: new MockOllamaClient([
				{
					message: {
						role: 'assistant',
						tool_calls: [
							{
								id: 'call-1',
								type: 'function',
								function: {
									name: 'paginateElements',
									arguments: JSON.stringify({ offset: 100 }),
								},
							},
						],
					},
				},
				{
					message: {
						role: 'assistant',
						content: 'Found the target on page 2.',
					},
				},
			]),
		}))

		const result = await runner.run('Find item on page 2')

		assert.strictEqual(result.answer, 'Found the target on page 2.')
		assert.strictEqual(result.steps[0].action, 'paginateElements')
		assert.ok(result.steps[0].result.elementsPage)
	} finally {
		if (previousVision === undefined) {
			delete process.env.AGENT_VISION
		} else {
			process.env.AGENT_VISION = previousVision
		}
	}
})

test('AgentRunner requires pickElement before answering during export', async () => {
	const engine = createMockEngine()
	engine.perform = async (brain, name) => {
		if (name === 'puppeteer' || name === 'navigate') {
			brain.browser.activePage.setUrl('https://example.com')
		}
	}

	const runner = new AgentRunner(createRunnerOptions({
		engine,
		policy: new AgentPolicy({ maxSteps: 8, exportMode: true }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'navigate',
								arguments: JSON.stringify({ url: 'https://example.com' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Example Domain',
				},
			},
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-2',
							type: 'function',
							function: {
								name: 'pickElement',
								arguments: JSON.stringify({ selector: 'h1' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Example Domain',
				},
			},
		]),
	}))

	const result = await runner.run('Return the page heading', {
		exportGrabName: 'heading-export',
		exportOverwrite: true,
	})

	assert.strictEqual(result.answer, 'Example Domain')
	assert.strictEqual(result.steps[0].action, 'navigate')
	assert.strictEqual(result.steps[1].action, 'pickElement')
})

test('AgentRunner allows type without pickElement after navigate', async () => {
	const engine = createMockEngine()
	engine.perform = async (brain, name) => {
		if (name === 'puppeteer' || name === 'navigate') {
			brain.browser.activePage.setUrl('https://duckduckgo.com')
		}
	}

	const runner = new AgentRunner(createRunnerOptions({
		engine,
		policy: new AgentPolicy({ maxSteps: 6 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-1',
							type: 'function',
							function: {
								name: 'navigate',
								arguments: JSON.stringify({ url: 'https://duckduckgo.com' }),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-2',
							type: 'function',
							function: {
								name: 'type',
								arguments: JSON.stringify({
									selector: 'textarea[name="q"]',
									text: 'world cup 2026',
								}),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					tool_calls: [
						{
							id: 'call-3',
							type: 'function',
							function: {
								name: 'pressKey',
								arguments: JSON.stringify({
									key: 'Enter',
									selector: 'textarea[name="q"]',
								}),
							},
						},
					],
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Typed the search query.',
				},
			},
		]),
	}))

	const result = await runner.run('Search duckduckgo')

	assert.strictEqual(result.steps[1].action, 'type')
	assert.strictEqual(result.steps[1].error, null)
	assert.strictEqual(result.answer, 'Typed the search query.')
})

test('AgentRunner retries when the model returns an empty assistant turn', async () => {
	const runner = new AgentRunner(createRunnerOptions({
		policy: new AgentPolicy({ maxSteps: 5 }),
		client: new MockOllamaClient([
			{
				message: {
					role: 'assistant',
					content: '',
					reasoning: 'Thinking only, no answer yet.',
				},
			},
			{
				message: {
					role: 'assistant',
					content: 'Recovered after empty response.',
				},
			},
		]),
	}))

	const result = await runner.run('Return a short answer')

	assert.strictEqual(result.answer, 'Recovered after empty response.')
	assert.strictEqual(result.steps.length, 0)
})
