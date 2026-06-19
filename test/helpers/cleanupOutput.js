import path from 'path'
import { fileURLToPath } from 'url'
import { FileSystem } from '../../src/utils/FileSystem.js'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../')
const outputRoot = path.join(projectRoot, 'output')

/**
 * Remove a grab output directory created during tests.
 * @param {string} dirName - Directory name under output/
 */
export const removeOutputDir = async (dirName) => {
	const outputPath = path.join(outputRoot, dirName)
	if (FileSystem.exists(outputPath)) {
		await FileSystem.rmdir(outputPath, { recursive: true })
	}
}

/**
 * @param {string[]} dirNames
 */
export const removeOutputDirs = async (dirNames) => {
	for (const dirName of dirNames) {
		await removeOutputDir(dirName)
	}
}
