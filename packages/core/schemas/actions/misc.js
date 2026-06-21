import { z } from 'zod'
import * as common from './common.js'

export const sanitizeString = z.object({ string: z.string() })
export const replaceString = z.object({ string: z.string(), search: z.string(), replace: z.string() })
export const matchFromString = z.object({ string: z.string(), regex: z.string() })
export const matchFromSelector = z.object({
	selector: common.selector(),
	regex: z.string(),
	attribute: z.string().optional(),
})
export const sleep = z.object({ ms: common.duration() })
export const log = z.object({
	message: z.string(),
	color: z.string().optional(),
	background: z.string().optional(),
})
export const random = z.object({ min: z.number(), max: z.number() })
export const uuid = z.object({}).optional()
export const getExtension = z.object({ string: z.string().min(1) })
export const userInput = z.object({ query: z.string() })
