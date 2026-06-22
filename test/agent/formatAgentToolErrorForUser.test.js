import test from 'node:test'
import assert from 'node:assert'
import { SelectorError } from '../../packages/core/errors/ActionErrors.js'
import AgentPolicy from '../../src/agent/AgentPolicy.js'
import {
	buildAgentToolResultForModel,
	formatAgentToolErrorForUser,
} from '../../src/agent/agentMessages.js'
import { AgentValidationError } from '../../src/agent/agentErrors.js'

test('buildAgentToolResultForModel includes available selectors for observation errors', () => {
	const error = AgentValidationError.selectorNotInObservation('div.guessed', 'Use listed selectors.')
	const knownSelectors = new Set(['textarea[name="q"]', 'button[type="submit"]'])

	assert.deepStrictEqual(buildAgentToolResultForModel(error, knownSelectors), {
		error: error.message,
		availableSelectors: ['textarea[name="q"]', 'button[type="submit"]'],
	})
})

test('formatAgentToolErrorForUser omits selector from SelectorError logs', () => {
	const error = new SelectorError('click', 'div:nth-of-type(2) > div > div > a')

	assert.strictEqual(
		formatAgentToolErrorForUser(error),
		'Selector not found or not visible',
	)
})

test('formatAgentToolErrorForUser omits selector from AgentPolicy observation errors', () => {
	const policy = new AgentPolicy()
	const knownSelectors = new Set(['textarea[name="q"]'])

	try {
		policy.validateAction('click', { selector: 'div.guessed' }, { knownSelectors })
		assert.fail('Expected observation validation to throw')
	} catch (error) {
		assert.strictEqual(
			formatAgentToolErrorForUser(error),
			'Selector is not in the current observation',
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
