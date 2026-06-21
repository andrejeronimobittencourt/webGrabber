import { z } from 'zod'

const parameterPropertySchema = z.object({
	type: z.enum(['string', 'number', 'integer', 'boolean']),
	description: z.string().optional(),
})

/**
 * JSON Schema object shape for grab/custom-action parameter definitions.
 */
export const grabParametersSchema = z
	.object({
		type: z.literal('object'),
		properties: z.record(parameterPropertySchema).optional().default({}),
		required: z.array(z.string()).optional().default([]),
		additionalProperties: z.boolean().optional().default(false),
	})
	.optional()
