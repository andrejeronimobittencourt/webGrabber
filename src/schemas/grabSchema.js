import { z } from 'zod'
import { actionSchemas } from './actionSchemas.js'

/**
 * Action schema with integrated parameter validation
 */
const actionSchema = z
	.object({
		name: z.string().min(1, 'Action name is required'),
		params: z.record(z.any()).optional(),
		await: z.boolean().optional().default(true),
	})
	.superRefine((action, ctx) => {
		// Validate action params against action-specific schema
		const schema = actionSchemas[action.name]

		if (!schema) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Unknown action: "${action.name}"`,
				path: ['name'],
			})
			return
		}

		// Only validate params if they exist and schema is defined
		if (action.params && schema) {
			const result = schema.safeParse(action.params)
			if (!result.success) {
				result.error.issues.forEach((issue) => {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Action "${action.name}" - ${issue.path.join('.')}: ${issue.message}`,
						path: ['params', ...issue.path],
					})
				})
			}
		}
	})

/**
 * Grab configuration schema
 */
export const grabSchema = z.object({
	name: z
		.string()
		.min(1, 'Grab name is required')
		.regex(/^[a-zA-Z0-9-_]+$/, 'Grab name must contain only letters, numbers, hyphens, and underscores'),
	description: z.string().optional(),
	actions: z.array(actionSchema).min(1, 'At least one action is required'),
})

/**
 * Helper to format Zod errors for better readability
 */
export const formatGrabValidationError = (error) => {
	if (!error || !error.issues) {
		return 'Unknown validation error'
	}
	const issues = error.issues.map((issue) => {
		const path = issue.path && issue.path.length > 0 ? `${issue.path.join('.')}` : 'root'
		return `  - ${path}: ${issue.message}`
	})
	return issues.join('\n')
}
