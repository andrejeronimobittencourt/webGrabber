const INTERPOLATION_PATTERN = /\{\{/

/**
 * @typedef {import('zod').infer<typeof import('./schemas/grabSchema.js').grabSchema>} GrabConfig
 */

/**
 * @param {Array<{ name: string, params?: { actions?: unknown[] } & Record<string, unknown> }>} actions
 * @returns {string[]}
 */
export function collectLiteralRunGrabTargets(actions) {
	/** @type {string[]} */
	const targets = []

	for (const action of actions) {
		if (action.name === 'runGrab') {
			const grabName = action.params?.grab

			if (typeof grabName === 'string' && !INTERPOLATION_PATTERN.test(grabName)) {
				targets.push(grabName)
			}
		}

		if (Array.isArray(action.params?.actions)) {
			targets.push(...collectLiteralRunGrabTargets(action.params.actions))
		}

		if (Array.isArray(action.params?.elseActions)) {
			targets.push(...collectLiteralRunGrabTargets(action.params.elseActions))
		}
	}

	return targets
}

/**
 * Detect a cycle in literal runGrab references.
 * @param {GrabConfig[]} grabs
 * @returns {string[] | null} Cycle path or null
 */
export function detectGrabCycle(grabs) {
	/** @type {Map<string, string[]>} */
	const graph = new Map()

	for (const grab of grabs) {
		graph.set(grab.name, collectLiteralRunGrabTargets(grab.actions))
	}

	/** @type {Set<string>} */
	const visiting = new Set()
	/** @type {Set<string>} */
	const visited = new Set()
	/** @type {string[]} */
	const path = []

	/**
	 * @param {string} node
	 * @returns {string[] | null}
	 */
	const visit = (node) => {
		if (visiting.has(node)) {
			const cycleStart = path.indexOf(node)
			return [...path.slice(cycleStart), node]
		}

		if (visited.has(node)) {
			return null
		}

		visiting.add(node)
		path.push(node)

		for (const child of graph.get(node) ?? []) {
			const cycle = visit(child)

			if (cycle) {
				return cycle
			}
		}

		path.pop()
		visiting.delete(node)
		visited.add(node)
		return null
	}

	for (const grab of grabs) {
		const cycle = visit(grab.name)

		if (cycle) {
			return cycle
		}
	}

	return null
}

/**
 * Validate literal runGrab references and cycles across loaded grabs.
 * @param {GrabConfig[]} grabs
 */
export function validateGrabCatalog(grabs) {
	/** @type {Map<string, GrabConfig>} */
	const byName = new Map(grabs.map((grab) => [grab.name, grab]))

	for (const grab of grabs) {
		for (const targetName of collectLiteralRunGrabTargets(grab.actions)) {
			const target = byName.get(targetName)

			if (!target) {
				throw new Error(`Grab "${grab.name}" references missing grab "${targetName}" via runGrab`)
			}

			if (!target.importable) {
				throw new Error(
					`Grab "${grab.name}" references non-importable grab "${targetName}" via runGrab`,
				)
			}
		}
	}

	const cycle = detectGrabCycle(grabs)

	if (cycle) {
		throw new Error(`Circular grab call detected: ${cycle.join(' → ')}`)
	}
}

/**
 * In-memory catalog of loaded grab configs.
 */
export default class GrabCatalog {
	#byName = new Map()

	/**
	 * @param {GrabConfig[]} grabs
	 */
	constructor(grabs) {
		for (const grab of grabs) {
			this.#byName.set(grab.name, grab)
		}
	}

	/**
	 * @param {string} grabName
	 * @returns {GrabConfig | undefined}
	 */
	get(grabName) {
		return this.#byName.get(grabName)
	}

	/**
	 * @returns {GrabConfig[]}
	 */
	list() {
		return [...this.#byName.values()]
	}

	/**
	 * @returns {GrabConfig[]}
	 */
	listImportable() {
		return this.list().filter((grab) => grab.importable)
	}
}
