import test from 'node:test'
import assert from 'node:assert'
import GrabListFactory from '../src/core/grabber/GrabListFactory.js'
import { ActionList, ActionListContainer } from '../src/core/actions/ActionRegistry.js'
import CliPresenter from '../src/infrastructure/presenter/CliPresenter.js'
import { createTestBrain } from './helpers/createTestBrain.js'
import { setPresenter } from '../src/infrastructure/presenter/present.js'
import { removeOutputDir } from './helpers/cleanupOutput.js'

test('GrabList preserves verbose from grab config', () => {
	const grabList = GrabListFactory.create()
	grabList.add({
		name: 'silent',
		verbose: 0,
		actions: [{ name: 'log', params: { message: 'x' } }],
	})

	assert.strictEqual(grabList.list[0].verbose, 0)
})

test('ActionList throws on duplicate registration', () => {
	const list = new ActionList()
	list.add('foo', async () => {})
	assert.throws(() => list.add('foo', async () => {}), /Action foo already exists/)
})

test('ActionListContainer throws on unknown action', async () => {
	const container = new ActionListContainer()
	const list = new ActionList()
	list.add('known', async () => {})
	container.add(list)

	const brain = createTestBrain()
	await assert.rejects(
		() => container.run('unknown', brain, null),
		/Action unknown not found/,
	)
})

const grabberModule = await import('../src/core/grabber/Grabber.js').catch(() => null)
const puppeteerModule = grabberModule
	? await import('../src/infrastructure/PuppeteerPageFactory.js').catch(() => null)
	: null

test(
	'Grabber.addCustomAction throws when action is not a function',
	{ skip: !grabberModule },
	() => {
		const grabber = new grabberModule.default()
		assert.throws(
			() => grabber.addCustomAction('bad', 'not-a-function'),
			/Action bad must be a function/,
		)
	},
)

test(
	'Grabber.grab throws when action is not found',
	{ skip: !grabberModule || !puppeteerModule },
	async () => {
		const grabber = new grabberModule.default()

		try {
			setPresenter(new CliPresenter())
			await grabber.init({ headless: true })

			await assert.rejects(
				() =>
					grabber.grab({
						id: 'test-run',
						body: {
							name: 'failing-grab',
							actions: [{ name: 'nonexistentAction' }],
						},
					}),
				/Action nonexistentAction not found/,
			)
		} finally {
			await removeOutputDir('failing-grab')
			try {
				await puppeteerModule.default.close()
			} catch {
				// Browser may not have launched if init failed
			}
		}
	},
)
