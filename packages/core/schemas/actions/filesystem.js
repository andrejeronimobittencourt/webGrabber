import { z } from 'zod'
import * as common from './common.js'

export const setBaseDir = z.object({ dir: common.directory() })
export const setCurrentDir = z.object({ dir: common.directory(), useBaseDir: z.boolean().optional() })
export const resetCurrentDir = z.object({}).optional()
export const backToParentDir = z.object({}).optional()
export const createDir = z.object({ dir: common.directory(), useBaseDir: z.boolean().optional() })
export const deleteFolder = z.object({ foldername: common.directory() })
export const listFolders = z.object({}).optional()

export const createFile = z.object({ filename: common.filename(), content: z.string().optional() })
export const readFromText = z.object({ filename: common.filename(), breakLine: z.boolean().optional() })
export const saveToText = z.object({ key: common.key(), filename: common.filename() })
export const appendToText = z.object({ key: common.key(), filename: common.filename() })
export const deleteFile = z.object({ filename: common.filename() })
export const fileExists = z.object({ filename: common.filename() })
export const checkStringInFile = z.object({ filename: common.filename(), string: z.string().min(1) })
export const download = z.object({
	url: common.url(),
	filename: common.filename().optional(),
	host: z.string().optional(),
	showProgress: z.boolean().optional(),
})
