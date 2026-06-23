/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
export function levenshteinDistance(left, right) {
	if (left === right) {
		return 0
	}

	if (left.length === 0) {
		return right.length
	}

	if (right.length === 0) {
		return left.length
	}

	/** @type {number[]} */
	let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index)

	for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
		/** @type {number[]} */
		const currentRow = [leftIndex + 1]

		for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
			const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1
			currentRow.push(
				Math.min(
					currentRow[rightIndex] + 1,
					previousRow[rightIndex + 1] + 1,
					previousRow[rightIndex] + substitutionCost,
				),
			)
		}

		previousRow = currentRow
	}

	return previousRow[right.length]
}

/**
 * @param {string} toolName
 * @param {number} toolNameLength
 * @returns {number}
 */
function maxToolNameEditDistance(toolNameLength) {
	if (toolNameLength >= 14) {
		return 3
	}

	if (toolNameLength >= 8) {
		return 2
	}

	return 1
}

/**
 * @param {string} toolName
 * @param {string[]} allowedToolNames
 * @returns {string[]}
 */
export function findSimilarAgentToolNames(toolName, allowedToolNames) {
	const normalizedToolName = toolName.trim()
	const maxDistance = maxToolNameEditDistance(normalizedToolName.length)

	return allowedToolNames.filter((allowedName) => {
		if (allowedName === normalizedToolName) {
			return true
		}

		return levenshteinDistance(normalizedToolName.toLowerCase(), allowedName.toLowerCase()) <= maxDistance
	})
}

/**
 * Resolve a model tool name to an allowed agent tool when the typo is unambiguous.
 * @param {string} toolName
 * @param {string[]} allowedToolNames
 * @returns {string | null}
 */
export function resolveAgentToolName(toolName, allowedToolNames) {
	const normalizedToolName = toolName.trim()
	const exactMatch = allowedToolNames.find((allowedName) => allowedName === normalizedToolName)

	if (exactMatch) {
		return exactMatch
	}

	const caseInsensitiveMatch = allowedToolNames.find(
		(allowedName) => allowedName.toLowerCase() === normalizedToolName.toLowerCase(),
	)

	if (caseInsensitiveMatch) {
		return caseInsensitiveMatch
	}

	const similarNames = findSimilarAgentToolNames(normalizedToolName, allowedToolNames).filter(
		(allowedName) => allowedName !== normalizedToolName,
	)

	if (similarNames.length === 1) {
		return similarNames[0]
	}

	return null
}

/**
 * @param {string} toolName
 * @param {string[]} allowedToolNames
 * @returns {string | undefined}
 */
export function suggestAgentToolName(toolName, allowedToolNames) {
	const resolved = resolveAgentToolName(toolName, allowedToolNames)

	if (resolved && resolved !== toolName.trim()) {
		return resolved
	}

	const similarNames = findSimilarAgentToolNames(toolName, allowedToolNames).filter(
		(allowedName) => allowedName !== toolName.trim(),
	)

	if (similarNames.length === 1) {
		return similarNames[0]
	}

	return undefined
}
