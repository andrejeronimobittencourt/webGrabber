import { z } from 'zod'
import * as common from './common.js'

export const click = z.object({
	selector: common.selector(),
	attribute: z.string().optional(),
	text: z.string().optional(),
})
export const clickAll = z.object({ selector: common.selector() })
export const scrollWaitClick = z.object({
	selector: common.selector(),
	ms: z.number().int().min(0).optional(),
})
export const type = z.object({
	selector: common.selector(),
	text: z.string(),
	secret: z.boolean().optional(),
})
export const login = z.object({
	url: common.url(),
	usernameSelector: common.selector(),
	username: z.string().min(1),
	passwordSelector: common.selector(),
	password: z.string().min(1),
	submitSelector: common.selector(),
	cookieName: z.string().optional(),
})
