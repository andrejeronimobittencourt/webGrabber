import yaml from 'js-yaml'
import Chalk from '../classes/wrappers/Chalk.js'
import { FileSystem } from './fileSystem.js'
import { grabSchema, formatGrabValidationError } from '../schemas/grabSchema.js'
import { pathJoin, basePathJoin } from './paths.js'
import { displayErrorAndExit } from './display.js'

/**
 * Load all grab configurations from grabs folder
 * @returns {Promise<Array>} Array of validated grab configurations
 */
export const getGrabList = async () => {
	const grabsPath = basePathJoin('../grabs')
	const files = await FileSystem.readdir(grabsPath)
	const grabList = []

	for (const file of files) {
		try {
			let doc
			const ext = file.split('.').pop()
			const filePath = pathJoin(grabsPath, file)

			// Parse YAML or JSON
			if (ext === 'yml' || ext === 'yaml') {
				const content = await FileSystem.readFile(filePath, 'utf8')
				doc = yaml.load(content)
			} else if (ext === 'json') {
				const content = await FileSystem.readFile(filePath, 'utf8')
				doc = JSON.parse(content)
			} else {
				continue
			}

			// Validate with Zod schema
			const result = grabSchema.safeParse(doc)
			if (!result.success) {
				console.warn(Chalk.create([
					{ text: `Warning: Invalid grab config in ${file}:\n`, color: 'yellow', style: 'bold' },
					{ text: formatGrabValidationError(result.error), color: 'red' }
				]))
				continue
			}

			doc = result.data

			// Check for duplicate names
			if (grabList.some((g) => g.name === doc.name)) {
				console.warn(
					Chalk.create([
						{
							text: `Warning: Duplicate grab name '${doc.name}' in ${file}. Skipping.`,
							color: 'yellow',
							style: 'bold',
						},
					]),
				)
				continue
			}

			grabList.push(doc)
		} catch (e) {
			displayErrorAndExit(e)
		}
	}
	return grabList
}
