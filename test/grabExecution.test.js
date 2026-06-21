import test from 'node:test'
import assert from 'node:assert'
import BrainFactory from '../packages/core/brain/BrainFactory.js'
import { ActionListContainer } from '../packages/core/actions/ActionRegistry.js'
import CoreActionList from '../packages/core/actions/CoreActionList.js'
import GrabCatalog from '../packages/core/grabCatalog.js'
import { executeGrab } from '../packages/core/grabExecution.js'
import { rootPathJoin } from '../packages/core/utils/paths.js'
import constants from '../packages/core/utils/constants.js'

/**
 * @returns {ReturnType<typeof BrainFactory.create>}
 */
function createExecutionBrain() {
	const actions = new ActionListContainer()
	actions.add(new CoreActionList())
	BrainFactory.init(new Map(), actions)
	const brain = BrainFactory.create()
	brain.browser.activePage = {
		url: () => 'about:blank',
	}
	brain.fs.baseDir = rootPathJoin('output', 'parent-grab')
	brain.fs.currentDir = brain.fs.baseDir
	brain.run.grabCallStack = []
	return brain
}

test('executeGrab runs importable grab actions and maps parameters', async () => {
	const brain = createExecutionBrain()
	const catalog = new GrabCatalog([
		{
			name: 'helper-grab',
			importable: true,
			parameters: {
				type: 'object',
				properties: {
					username: { type: 'string' },
				},
				required: ['username'],
				additionalProperties: false,
			},
			actions: [
				{ name: 'setVariable', params: { key: 'GREETING', value: 'Hello {{username}}' } },
				{ name: 'log', params: { message: '{{GREETING}}' } },
			],
		},
	])

	await executeGrab(brain, 'helper-grab', { username: 'Ada' }, {
		grabCatalog: catalog,
	})

	assert.strictEqual(brain.recall('username'), 'Ada')
})

test('executeGrab rejects missing grabs', async () => {
	const brain = createExecutionBrain()
	const catalog = new GrabCatalog([])

	await assert.rejects(
		() =>
			executeGrab(brain, 'missing', {}, {
				grabCatalog: catalog,
			}),
		/Grab "missing" not found/,
	)
})

test('executeGrab rejects non-importable grabs', async () => {
	const brain = createExecutionBrain()
	const catalog = new GrabCatalog([
		{
			name: 'entry-only',
			importable: false,
			actions: [{ name: 'log', params: { message: 'nope' } }],
		},
	])

	await assert.rejects(
		() =>
			executeGrab(brain, 'entry-only', {}, {
				grabCatalog: catalog,
			}),
		/Grab "entry-only" is not importable/,
	)
})

test('executeGrab rejects circular runtime calls', async () => {
	const brain = createExecutionBrain()
	const catalog = new GrabCatalog([
		{
			name: 'loop-a',
			importable: true,
			actions: [{ name: 'runGrab', params: { grab: 'loop-b' } }],
		},
		{
			name: 'loop-b',
			importable: true,
			actions: [{ name: 'runGrab', params: { grab: 'loop-a' } }],
		},
	])

	brain.run.grabCatalog = catalog

	await assert.rejects(
		() =>
			executeGrab(brain, 'loop-a', {}, {
				grabCatalog: catalog,
			}),
		/Circular grab call/,
	)
})

test('executeGrab enforces max call depth', async () => {
	const previous = process.env.GRAB_MAX_CALL_DEPTH
	process.env.GRAB_MAX_CALL_DEPTH = '1'

	try {
		const brain = createExecutionBrain()
		const catalog = new GrabCatalog([
			{
				name: 'depth-parent',
				importable: true,
				actions: [{ name: 'runGrab', params: { grab: 'depth-child' } }],
			},
			{
				name: 'depth-child',
				importable: true,
				actions: [{ name: 'log', params: { message: 'child' } }],
			},
		])

		brain.run.grabCatalog = catalog

		await assert.rejects(
			() =>
				executeGrab(brain, 'depth-parent', {}, {
					grabCatalog: catalog,
				}),
			/Grab call depth exceeded maximum of 1/,
		)
	} finally {
		if (previous === undefined) {
			delete process.env.GRAB_MAX_CALL_DEPTH
		} else {
			process.env.GRAB_MAX_CALL_DEPTH = previous
		}
	}
})

test('executeGrab returns INPUT pipe value', async () => {
	const brain = createExecutionBrain()
	const catalog = new GrabCatalog([
		{
			name: 'pipe-grab',
			importable: true,
			actions: [{ name: 'setVariable', params: { key: constants.inputKey, value: 'done' } }],
		},
	])

	const { result } = await executeGrab(brain, 'pipe-grab', {}, {
		grabCatalog: catalog,
	})

	assert.strictEqual(result, 'done')
})
