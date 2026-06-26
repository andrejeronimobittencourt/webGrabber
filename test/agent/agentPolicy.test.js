import test from 'node:test'
import assert from 'node:assert'
import AgentPolicy from '../../src/agent/AgentPolicy.js'
import { AgentValidationError } from '../../src/agent/agentErrors.js'

test('AgentPolicy allows curated actions', () => {
	const policy = new AgentPolicy()
	assert.strictEqual(policy.isAllowedAction('navigate'), true)
	assert.strictEqual(policy.isAllowedAction('click'), true)
	assert.strictEqual(policy.isAllowedAction('paginateElements'), true)
	assert.strictEqual(policy.isAllowedAction('inspectElement'), false)
	assert.strictEqual(new AgentPolicy({ visionAvailable: true }).isAllowedAction('inspectElement'), true)
	assert.strictEqual(policy.isAllowedAction('listTabs'), true)
	assert.strictEqual(policy.isAllowedAction('switchTab'), true)
	assert.strictEqual(policy.isAllowedAction('pressKey'), true)
	assert.strictEqual(policy.isAllowedAction('puppeteer'), false)
	assert.strictEqual(policy.isAllowedAction('login'), false)
})

test('AgentPolicy rejects blocked actions', () => {
	const policy = new AgentPolicy()

	try {
		policy.validateAction('puppeteer', { func: 'goto', url: 'https://example.com' })
		assert.fail('Expected puppeteer to be rejected')
	} catch (error) {
		assert.match(error instanceof Error ? error.message : '', /not in the tool list/)
	}
})

test('AgentPolicy blocked action error lists provided tools for the model', () => {
	const policy = new AgentPolicy()

	try {
		policy.validateAction('scroll', {})
		assert.fail('Expected scroll to be rejected')
	} catch (error) {
		assert.match(error instanceof Error ? error.message : '', /Tool "scroll" is not in the tool list/)
		assert.match(error instanceof Error ? error.message : '', /Allowed tools:/)
		assert.match(error instanceof Error ? error.message : '', /navigate/)
		assert.match(error instanceof Error ? error.message : '', /pressKey/)
	}
})

test('AgentPolicy validates dynamic importable grab tools', () => {
	const dynamicRegistry = new Map([
		[
			'grab_login_flow',
			{
				kind: 'grab',
				grabName: 'login-flow',
				parameterSchema: {
					type: 'object',
					properties: { username: { type: 'string' } },
					required: ['username'],
					additionalProperties: false,
				},
			},
		],
	])
	const policy = new AgentPolicy({ dynamicRegistry })

	assert.strictEqual(policy.isAllowedAction('grab_login_flow'), true)
	assert.doesNotThrow(() =>
		policy.validateAction('grab_login_flow', { username: 'ada' }),
	)
	assert.throws(
		() => policy.validateAction('grab_login_flow', {}),
		/Missing required parameter "username"/,
	)
})

test('AgentPolicy enforces AGENT_ALLOWED_HOSTS for navigate', () => {
	const previous = process.env.AGENT_ALLOWED_HOSTS
	process.env.AGENT_ALLOWED_HOSTS = 'example.com'

	try {
		const policy = new AgentPolicy()
		assert.doesNotThrow(() =>
			policy.validateAction('navigate', { url: 'https://example.com/page' }),
		)
		assert.throws(
			() => policy.validateAction('navigate', { url: 'https://evil.test/page' }),
			/not allowed by AGENT_ALLOWED_HOSTS/,
		)
	} finally {
		if (previous === undefined) {
			delete process.env.AGENT_ALLOWED_HOSTS
		} else {
			process.env.AGENT_ALLOWED_HOSTS = previous
		}
	}
})

test('AgentPolicy reads max steps default', () => {
	const policy = new AgentPolicy()
	assert.strictEqual(policy.maxSteps, 30)
})

test('AgentPolicy rejects click without selector', () => {
	const policy = new AgentPolicy()
	const elements = [{ selector: 'a.link', text: 'Portugal' }]

	assert.throws(
		() =>
			policy.validateAction('click', { text: 'Portugal' }, {
				knownSelectors: new Set(['a.link']),
				elements,
			}),
		/missing selector parameter/,
	)
})

test('AgentPolicy suggests elements when click omits selector but passes text', () => {
	const policy = new AgentPolicy()
	const elements = [{ selector: 'a.link', text: 'Portugal' }]

	try {
		policy.validateAction('click', { text: 'Portugal' }, {
			knownSelectors: new Set(['a.link']),
			elements,
		})
		assert.fail('Expected missing selector error')
	} catch (error) {
		assert.ok(error instanceof AgentValidationError)
		assert.strictEqual(error.suggestedElements?.length, 1)
	}
})

test('AgentPolicy rejects paginateElements when hasMore is false', () => {
	const policy = new AgentPolicy()

	assert.throws(
		() =>
			policy.validateAction('paginateElements', { offset: 25 }, {
				elementsPage: { hasMore: false },
			}),
		/hasMore is false/,
	)
})

test('AgentPolicy rejects selectors outside the observation', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	assert.throws(
		() =>
			policy.validateAction('type', { selector: 'textarea[name="csi"]', text: 'test' }, {
				knownSelectors,
			}),
		/elements\[\]/,
	)
})

test('AgentPolicy allows selectors from the observation without pickElement', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	assert.doesNotThrow(() =>
		policy.validateAction('type', { selector: 'textarea[name="q"]', text: 'test' }, {
			knownSelectors,
			elements: [{ selector: 'textarea[name="q"]', text: '', interactable: true }],
		}),
	)
})

test('AgentPolicy rejects interaction tools on readable-only elements', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['h1'])
	const elements = [{ selector: 'h1', text: 'Example Domain', interactable: false }]

	assert.throws(
		() =>
			policy.validateAction('click', { selector: 'h1' }, {
				knownSelectors,
				elements,
			}),
		/interactable is false/,
	)
})

test('AgentPolicy allows inspectElement on readable-only elements', () => {
	const policy = new AgentPolicy({ visionAvailable: true })
	const knownSelectors = new Set(['p.result'])
	const elements = [{ selector: 'p.result', text: 'Portugal vs Uzbekistan', interactable: false }]

	assert.doesNotThrow(() =>
		policy.validateAction('inspectElement', { selector: 'p.result' }, {
			knownSelectors,
			elements,
		}),
	)
})

test('AgentPolicy rejects getElements selectors outside the observation', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['p.result'])

	assert.throws(
		() =>
			policy.validateAction('getElements', { selector: 'div.guessed' }, {
				knownSelectors,
			}),
		/elements\[\]/,
	)
})

