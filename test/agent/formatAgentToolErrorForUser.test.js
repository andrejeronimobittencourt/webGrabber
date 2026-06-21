import test from 'node:test'
import assert from 'node:assert'
import { SelectorError } from '../../packages/core/errors/ActionErrors.js'
import AgentPolicy from '../../src/agent/AgentPolicy.js'
import { formatAgentToolErrorForUser } from '../../src/agent/formatAgentToolErrorForUser.js'

test('formatAgentToolErrorForUser omits selector from SelectorError logs', () => {
	const error = new SelectorError('click', 'div:nth-of-type(2) > div > div > a')

	assert.strictEqual(
		formatAgentToolErrorForUser(error),
		'Selector not found or not visible',
	)
})

test('formatAgentToolErrorForUser omits selector from AgentPolicy cheatsheet errors', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	assert.throws(
		() =>
			policy.validateAction('click', { selector: 'div.guessed' }, { knownSelectors }),
		/not in the current element list/,
	)

	try {
		policy.validateAction('click', { selector: 'div.guessed' }, { knownSelectors })
	} catch (error) {
		assert.strictEqual(
			formatAgentToolErrorForUser(error),
			'Selector is not in the current element list',
		)
		assert.match(error instanceof Error ? error.message : '', /div\.guessed/)
	}
})

test('formatAgentToolErrorForUser omits selector from inspectElement SelectorError logs', () => {
	const error = new SelectorError('inspectElement', 'h1.title')

	assert.strictEqual(
		formatAgentToolErrorForUser(error),
		'Selector not found or not visible',
	)
})
