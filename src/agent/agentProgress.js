/** @typedef {import('./AgentToolMapper.js').AgentStep} AgentStep */
/** @typedef {import('./observePage.js').PageObservation} PageObservation */

import {
	CONSECUTIVE_SAME_TOOL_PAGE_THRESHOLD,
	PAGE_LOOP_MONITOR_TOOLS,
} from './agentConfig.js'

/**
 * Stable key for comparing tool attempts across steps.
 * @param {string} action
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function buildToolAttemptKey(action, params) {
	const sortedParams = Object.keys(params)
		.sort()
		.reduce((accumulator, key) => {
			accumulator[key] = params[key]
			return accumulator
		}, /** @type {Record<string, unknown>} */ ({}))

	return `${action}:${JSON.stringify(sortedParams)}`
}

/**
 * Fingerprint the observation fields the model can act on.
 * @param {Partial<PageObservation>} observation
 * @returns {string}
 */
export function buildObservationFingerprint(observation) {
	return JSON.stringify({
		url: observation.url ?? '',
		title: observation.title ?? '',
		htmlPage: observation.htmlPage
			? {
				offset: observation.htmlPage.offset,
				total: observation.htmlPage.total,
			}
			: null,
		pickedSelector: observation.pickedSelector ?? null,
	})
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
export function observationFingerprintsEqual(left, right) {
	return left === right
}

/**
 * Mark whether recent tool steps changed the observation.
 * @param {AgentStep[]} steps
 * @param {number} startIndex
 * @param {boolean} madeProgress
 */
export function attributeProgressToRecentSteps(steps, startIndex, madeProgress) {
	for (let index = startIndex; index < steps.length; index += 1) {
		steps[index].madeProgress = madeProgress
	}
}

/**
 * @param {AgentStep[]} steps
 * @returns {number}
 */
function findProgressResetIndex(steps) {
	for (let index = steps.length - 1; index >= 0; index -= 1) {
		if (steps[index].madeProgress) {
			return index + 1
		}
	}

	return 0
}

/**
 * Detect the same tool+params tried twice without observation progress since the last change.
 * @param {AgentStep[]} steps
 * @returns {{ action: string, params: Record<string, unknown>, count: number } | null}
 */
export function findRepeatedStalledAttempt(steps) {
	if (steps.length < 2) {
		return null
	}

	const recentSteps = steps.slice(findProgressResetIndex(steps))
	/** @type {Map<string, { action: string, params: Record<string, unknown>, count: number }>} */
	const attempts = new Map()

	for (const step of recentSteps) {
		if (step.madeProgress) {
			continue
		}

		const key = buildToolAttemptKey(step.action, step.params)
		const existing = attempts.get(key)

		if (existing) {
			existing.count += 1

			if (existing.count >= 2) {
				return existing
			}

			continue
		}

		attempts.set(key, {
			action: step.action,
			params: step.params,
			count: 1,
		})
	}

	return null
}

/**
 * Detect the same tool called repeatedly on one page URL without navigation in between.
 * @param {AgentStep[]} steps
 * @param {number} [threshold]
 * @returns {{ action: string, count: number, pageUrl: string } | null}
 */
export function findConsecutiveSameToolOnSamePage(
	steps,
	threshold = CONSECUTIVE_SAME_TOOL_PAGE_THRESHOLD,
) {
	if (steps.length < threshold) {
		return null
	}

	const lastStep = steps[steps.length - 1]
	const pageUrl = lastStep.pageUrl ?? ''

	if (!PAGE_LOOP_MONITOR_TOOLS.has(lastStep.action)) {
		return null
	}

	let count = 0

	for (let index = steps.length - 1; index >= 0; index -= 1) {
		const step = steps[index]

		if ((step.pageUrl ?? '') !== pageUrl) {
			break
		}

		if (step.action !== lastStep.action) {
			break
		}

		count += 1
	}

	if (count < threshold) {
		return null
	}

	return {
		action: lastStep.action,
		count,
		pageUrl,
	}
}

/**
 * Runtime feedback when the model repeats a stalled tool call.
 * @param {{ action: string, params: Record<string, unknown>, count: number }} stalledAttempt
 * @returns {string}
 */
export function formatRepeatedStalledActionFeedback(stalledAttempt) {
	return (
		`${stalledAttempt.action} with the same parameters was tried ${stalledAttempt.count} times ` +
		'without observation change. Try a different selector or parameter.'
	)
}

/**
 * Runtime feedback when the model loops one tool on the same page.
 * @param {{ action: string, count: number, pageUrl: string }} pageLoop
 * @returns {string}
 */
export function formatConsecutiveSameToolFeedback(pageLoop) {
	return (
		`${pageLoop.action} was called ${pageLoop.count} times in a row on the same page ` +
		`(${pageLoop.pageUrl}) without navigation. Navigate away or try a different action.`
	)
}

/**
 * @param {AgentStep[]} steps
 * @returns {string | null}
 */
export function buildRepeatedStalledActionFeedback(steps) {
	const stalledAttempt = findRepeatedStalledAttempt(steps)

	if (stalledAttempt) {
		return formatRepeatedStalledActionFeedback(stalledAttempt)
	}

	const pageLoop = findConsecutiveSameToolOnSamePage(steps)

	if (pageLoop) {
		return formatConsecutiveSameToolFeedback(pageLoop)
	}

	return null
}
