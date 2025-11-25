import { z } from 'zod'
import * as common from './common.js'

export const puppeteer = z.object({ func: z.string().min(1), func2: z.string().optional() }).passthrough()
export const screenshot = z.object({
	name: z.string().min(1),
	type: z.enum(['jpeg', 'png']).optional(),
	fullPage: z.boolean().optional(),
})
export const screenshotElement = z.object({
	name: z.string().min(1),
	selector: common.selector(),
	type: z.enum(['jpeg', 'png']).optional(),
})
export const newPage = z.object({ pageKey: z.string().min(1) })
export const closePage = z.object({ pageKey: z.string().min(1) })
export const switchPage = z.object({ pageKey: z.string().min(1) })
export const getElements = z.object({ selector: common.selector(), attribute: z.string().optional() })
export const getChildren = z.object({
	selectorParent: common.selector(),
	selectorChild: common.selector(),
	attribute: z.string().optional(),
})
export const elementExists = z.object({ selector: common.selector() })
