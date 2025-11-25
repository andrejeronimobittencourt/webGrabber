import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Join paths together
 */
export const pathJoin = (...paths) => {
	return path.join(...paths)
}

/**
 * Join paths relative to utils directory
 */
export const basePathJoin = (...paths) => {
	return pathJoin(__dirname, ...paths)
}
