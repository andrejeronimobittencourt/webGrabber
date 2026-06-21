import { z } from 'zod'
import * as common from './common.js'

export const if_ = z.object({ condition: common.condition(), actions: common.actionsArray() })
export const ifElse = z.object({
	condition: common.condition(),
	actions: common.actionsArray(),
	elseActions: common.actionsArray(),
})
export const for_ = z.object({
	from: z.number().int(),
	until: z.number().int(),
	step: z.number().int().default(1),
	actions: common.actionsArray(),
})
export const forEach = z.object({ key: z.string().min(1), actions: common.actionsArray() })
export const while_ = z.object({ condition: common.condition(), actions: common.actionsArray() })
