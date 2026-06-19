import { z } from 'zod'

/** @type {Record<string, import('zod').ZodTypeAny> | null} */
let actionSchemasRef = null

/** @type {import('zod').ZodTypeAny | null} */
let actionNodeSchemaInstance = null

/**
 * Registers action param schemas for recursive action validation.
 * Called once from actionSchemas.js after the schema map is built.
 * @param {Record<string, import('zod').ZodTypeAny>} schemas
 */
export const registerActionSchemas = (schemas) => {
	actionSchemasRef = schemas
}

/**
 * Validates a single action node and recursively validates nested control-flow actions.
 * @param {{ name: string, params?: Record<string, unknown> }} action
 * @param {import('zod').RefinementCtx} ctx
 */
export const refineActionNode = (action, ctx) => {
	if (!actionSchemasRef) {
		throw new Error('actionSchemas not registered')
	}

	const schema = actionSchemasRef[action.name]

	if (!schema) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Unknown action: "${action.name}"`,
			path: ['name'],
		})
		return
	}

	if (!action.params) {
		return
	}

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

/**
 * Full action node schema with recursive validation for nested control-flow actions.
 * @returns {import('zod').ZodTypeAny}
 */
export const getActionNodeSchema = () => {
	if (!actionNodeSchemaInstance) {
		actionNodeSchemaInstance = z
			.object({
				name: z.string().min(1, 'Action name is required'),
				params: z.record(z.any()).optional(),
				await: z.boolean().optional().default(true),
			})
			.superRefine(refineActionNode)
	}

	return actionNodeSchemaInstance
}
