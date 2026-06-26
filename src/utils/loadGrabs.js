import yaml from 'js-yaml'
import StyledConsole from '../infrastructure/StyledConsole.js'
import { FileSystem } from './FileSystem.js'
import { grabSchema, formatGrabValidationError } from '../../packages/core/schemas/grabSchema.js'
import GrabCatalog, { validateGrabCatalog } from '../../packages/core/grabCatalog.js'
import { pathJoin, rootPathJoin } from './paths.js'

/**
 * @param {string} file
 * @returns {string}
 */
const fileStem = (file) => file.replace(/\.(json|ya?ml)$/i, '')

/**
 * @param {string} file
 * @param {{ name?: string }} doc
 * @param {string | null} grabName
 * @returns {boolean}
 */
const matchesGrabFilter = (file, doc, grabName) => {
	if (!grabName) return true

	const stem = fileStem(file)
	return doc?.name === grabName || stem === grabName
}

/**
 * @param {string} file
 * @param {{ name?: string }} doc
 * @returns {string}
 */
const resolveGrabLabel = (file, doc) => doc?.name ?? fileStem(file)

/**
 * Load grab configurations from grabs folder.
 * @param {{ grabName?: string | null, catalogMode?: boolean, warnForGrabName?: string | null, warnOnInvalid?: boolean }} [options]
 * @returns {Promise<Array>} Array of validated grab configurations
 */
export const loadGrabs = async (options = {}) => {
	const {
		grabName = null,
		catalogMode = false,
		warnForGrabName = grabName,
		warnOnInvalid = true,
	} = options
	const grabsPath = rootPathJoin('grabs')
	const files = await FileSystem.readdir(grabsPath)
	const grabList = []

	for (const file of files) {
		let doc
		const ext = file.split('.').pop()
		const filePath = pathJoin(grabsPath, file)

		if (ext === 'yml' || ext === 'yaml') {
			const content = await FileSystem.readFile(filePath, 'utf8')
			doc = yaml.load(content)
		} else if (ext === 'json') {
			const content = await FileSystem.readFile(filePath, 'utf8')
			doc = JSON.parse(content)
		} else {
			continue
		}

		if (!catalogMode && grabName && !matchesGrabFilter(file, doc, grabName)) {
			continue
		}

		const grabLabel = resolveGrabLabel(file, doc)
		const result = grabSchema.safeParse(doc)
		if (!result.success) {
			if (
				warnOnInvalid &&
				(!warnForGrabName || matchesGrabFilter(file, doc, warnForGrabName))
			) {
				console.warn(
					StyledConsole.create([
						{
							text: `Warning: Invalid grab config in ${file}:\n`,
							color: 'yellow',
							style: 'bold',
						},
						{ text: formatGrabValidationError(result.error, grabLabel), color: 'red' },
					]),
				)
			}
			continue
		}

		doc = result.data

		if (grabList.some((g) => g.name === doc.name)) {
			if (warnOnInvalid) {
				console.warn(
					StyledConsole.create([
						{
							text: `Warning: Duplicate grab name '${doc.name}' in ${file}. Skipping.`,
							color: 'yellow',
							style: 'bold',
						},
					]),
				)
			}
			continue
		}

		grabList.push(doc)
	}

	return grabList
}

/**
 * Load all grabs and validate importable composition rules.
 * @param {{ warnForGrabName?: string | null, warnOnInvalid?: boolean }} [options]
 * @returns {Promise<GrabCatalog>}
 */
export const loadGrabCatalog = async (options = {}) => {
	const { warnForGrabName = null, warnOnInvalid = true } = options
	const grabs = await loadGrabs({ catalogMode: true, warnForGrabName, warnOnInvalid })
	validateGrabCatalog(grabs)
	return new GrabCatalog(grabs)
}
