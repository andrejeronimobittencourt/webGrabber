import fs from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(moduleDir, '../..')

/** @type {string} Absolute project root directory. */
export const PROJECT_ROOT = projectRoot

/** @type {string} Absolute logs directory under the project root. */
export const LOGS_DIR = resolve(projectRoot, 'logs')

/**
 * Create the logs directory synchronously.
 * @returns {string} Absolute logs directory path
 */
export function ensureLogsDirSync() {
	fs.mkdirSync(LOGS_DIR, { recursive: true })

	return LOGS_DIR
}

ensureLogsDirSync()
