import { z } from 'zod'
import * as common from './common.js'

export const setVariable = z.object({ key: common.key(), value: z.any() })
export const getVariable = z.object({ key: common.key(), index: z.number().optional() })
export const deleteVariable = z.object({ key: common.key() })
export const transferVariable = z.object({
	from: common.key(),
	to: common.key(),
	index: z.number().optional(),
	key: z.string().optional(),
})
export const appendToVariable = z.object({ key: common.key(), value: z.any() })

export const countStart = z.object({ key: common.key(), value: z.number().optional() })
export const countIncrement = z.object({ key: common.key() })
export const countDecrement = z.object({ key: common.key() })
