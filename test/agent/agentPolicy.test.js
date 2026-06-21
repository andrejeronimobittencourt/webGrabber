import test from 'node:test'
import assert from 'node:assert'
import AgentPolicy from '../../src/agent/AgentPolicy.js'

test('AgentPolicy allows curated actions', () => {
	const policy = new AgentPolicy()
	assert.strictEqual(policy.isAllowedAction('navigate'), true)
	assert.strictEqual(policy.isAllowedAction('click'), true)
	assert.strictEqual(policy.isAllowedAction('listElements'), true)
	assert.strictEqual(policy.isAllowedAction('listVisibleElements'), true)
	assert.strictEqual(policy.isAllowedAction('inspectElement'), true)
	assert.strictEqual(policy.isAllowedAction('listTabs'), true)
	assert.strictEqual(policy.isAllowedAction('switchTab'), true)
	assert.strictEqual(policy.isAllowedAction('pressKey'), true)
	assert.strictEqual(policy.isAllowedAction('puppeteer'), false)
	assert.strictEqual(policy.isAllowedAction('login'), false)
})

test('AgentPolicy rejects blocked actions', () => {
	const policy = new AgentPolicy()
	assert.throws(
		() => policy.validateAction('puppeteer', { func: 'goto', url: 'https://example.com' }),
		/not allowed in agent mode/,
	)
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

test('AgentPolicy rejects selectors outside the cheatsheet', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	assert.throws(
		() =>
			policy.validateAction('type', { selector: 'textarea[name="csi"]', text: 'test' }, {
				knownSelectors,
			}),
		/not in the current element list/,
	)
})

test('AgentPolicy allows selectors from the cheatsheet', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	assert.doesNotThrow(() =>
		policy.validateAction('type', { selector: 'textarea[name="q"]', text: 'test' }, {
			knownSelectors,
		}),
	)
})

test('AgentPolicy rejects getElements selectors outside known element lists', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['p.result'])

	assert.throws(
		() =>
			policy.validateAction('getElements', { selector: 'div.guessed' }, {
				knownSelectors,
			}),
		/not in the current element list/,
	)
})

test('AgentPolicy allows getElements selectors from listVisibleElements', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['p.result'])

	assert.doesNotThrow(() =>
		policy.validateAction('getElements', { selector: 'p.result' }, {
			knownSelectors,
		}),
	)
})
