import constants from './utils/constants.js'
import { present } from './infrastructure/presenter/present.js'
import { validateGrabParameters } from './grabParameters.js'

const DEFAULT_MAX_CALL_DEPTH = 10

/**
 * @returns {number}
 */
function resolveMaxCallDepth() {
	const parsed = Number.parseInt(process.env.GRAB_MAX_CALL_DEPTH ?? '', 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_CALL_DEPTH
}

/**
 * @typedef {ReturnType<import('./brain/BrainFactory.js').default['create']>} Brain
 * @typedef {Array<{ name: string, params?: Record<string, unknown>, await?: boolean }>} GrabActionList
 */

/** Actions whose CLI banner is replaced by presentGrabbing. */
export const GRAB_BANNER_ACTIONS = new Set(['runGrab'])

/**
 * Log grab start in CLI/server runs. Agent mode suppresses nested grab banners.
 * @param {Brain} brain
 * @param {string} grabName
 */
export function presentGrabbing(brain, grabName) {
	if (!brain.run.agentMode) {
		present([{ text: `Grabbing ${grabName}`, color: 'green', style: 'bold' }], brain)
	}
}

/**
 * Run a top-level grab from the CLI or server entrypoint.
 * @param {Brain} brain
 * @param {{ name: string, verbose?: number, actions: GrabActionList }} grab
 */
export async function runRootGrab(brain, grab) {
	brain.presenter.verbose = grab.verbose ?? 1
	brain.presenter.indentation = 0
	presentGrabbing(brain, grab.name)
	brain.run.params = { dir: grab.name }
	await brain.perform('setBaseDir')
	await brain.perform('resetCurrentDir')
	await runGrabActionList(brain, grab.actions)
}

/**
 * Run a grab action list on the active browser page.
 * @param {Brain} brain
 * @param {GrabActionList} actions
 */
export async function runGrabActionList(brain, actions) {
	const asyncActions = []

	for (const action of actions) {
		brain.run.params = action.params || {}
		const activePage = brain.browser.activePage

		if (action.await === false) {
			asyncActions.push(brain.perform(action.name, activePage))
		} else {
			await brain.perform(action.name, activePage)
		}
	}

	if (asyncActions.length > 0) {
		await Promise.all(asyncActions)
	}
}

/**
 * Execute an importable grab on the active browser page.
 * @param {Brain} brain
 * @param {string} grabName
 * @param {Record<string, unknown>} [params={}]
 * @param {{ grabCatalog: import('./grabCatalog.js').default }} options
 * @returns {Promise<{ result: unknown }>}
 */
export async function executeGrab(brain, grabName, params = {}, { grabCatalog }) {
	const grab = grabCatalog.get(grabName)

	if (!grab) {
		throw new Error(`Grab "${grabName}" not found`)
	}

	if (!grab.importable) {
		throw new Error(`Grab "${grabName}" is not importable`)
	}

	if (!Array.isArray(brain.run.grabCallStack)) {
		brain.run.grabCallStack = []
	}

	if (brain.run.grabCallStack.includes(grabName)) {
		throw new Error(`Circular grab call: ${[...brain.run.grabCallStack, grabName].join(' → ')}`)
	}

	const maxDepth = resolveMaxCallDepth()

	if (brain.run.grabCallStack.length >= maxDepth) {
		throw new Error(`Grab call depth exceeded maximum of ${maxDepth}`)
	}

	const validatedParams = validateGrabParameters(params, grab.parameters)

	brain.run.grabCallStack.push(grabName)

	try {
		for (const [key, value] of Object.entries(validatedParams)) {
			brain.learn(key, value)
		}

		presentGrabbing(brain, grab.name)

		await runGrabActionList(brain, grab.actions)

		return { result: brain.recall(constants.inputKey) }
	} finally {
		brain.run.grabCallStack.pop()
	}
}
