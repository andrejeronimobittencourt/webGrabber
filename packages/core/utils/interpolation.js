/**
 * Interpolate variables in params using brain memory
 * Replaces {{variable}} with values from brain
 */
export const interpolation = (params, brain) => {
	const newParams = { ...params }
	for (const [key, value] of Object.entries(newParams)) {
		if (typeof value === 'string') {
			const regex = /{{(.*?)}}/g
			const match = value.match(regex)
			if (match) {
				match.forEach((m) => {
					const variable = m.match(/{{(.*?)}}/)[1].trim()
					if (typeof brain.recall(variable) === 'object' || Array.isArray(brain.recall(variable))) {
						newParams[key] = brain.recall(variable)
					} else {
						newParams[key] = newParams[key].replace(m, brain.recall(variable))
					}
				})
			}
		} else if (Array.isArray(value)) {
			newParams[key] = value.map((item) => {
				if (typeof item === 'string' || Array.isArray(item)) {
					return interpolation({ temp: item }, brain).temp
				}
				return item
			})
		}
	}
	return newParams
}
