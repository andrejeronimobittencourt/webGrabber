import { z } from 'zod'
import './actionSchemas.js'
import { getActionNodeSchema } from './refineAction.js'

const actionSchema = getActionNodeSchema()

/**
 * Grab configuration schema
 */
export const grabSchema = z.object({
	name: z
		.string()
		.min(1, 'Grab name is required')
		.regex(/^[a-zA-Z0-9-_]+$/, 'Grab name must contain only letters, numbers, hyphens, and underscores'),
	description: z.string().optional(),
	verbose: z.number().int().min(0).default(1),
	actions: z.array(actionSchema).min(1, 'At least one action is required'),
})

/**
 * Helper to format Zod errors for better readability
 * @param {import('zod').ZodError} error
 * @param {string} [grabName]
 */
export const formatGrabValidationError = (error, grabName) => {
	if (!error || !error.issues) {
		return 'Unknown validation error'
	}
	const issues = error.issues.map((issue) => {
		const actionIndex =
			issue.path[0] === 'actions' && typeof issue.path[1] === 'number' ? issue.path[1] : null
		const label =
			grabName && actionIndex !== null
				? `${grabName} (action ${actionIndex})`
				: grabName || (issue.path.length > 0 ? issue.path.join('.') : 'root')
		return `  - ${label}: ${issue.message}`
	})
	return issues.join('\n')
}
