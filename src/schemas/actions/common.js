import { z } from 'zod'

export const selector = () => z.string().min(1, 'Selector cannot be empty')
export const url = () => z.string().url('Invalid URL format')
export const filename = () => z.string().min(1, 'Filename cannot be empty')
export const key = () => z.string().min(1, 'Key cannot be empty')
export const directory = () => z.string().min(1, 'Directory cannot be empty')
export const condition = () => z.string().min(1, 'Condition cannot be empty')
export const duration = (maxMs = 300000) => z.number().int().min(0).max(maxMs)

export const actionsArray = () =>
	z.array(
		z.object({
			name: z.string(),
			params: z.record(z.any()).optional(),
		}),
	)
