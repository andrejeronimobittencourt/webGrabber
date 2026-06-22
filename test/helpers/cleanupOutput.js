import path from 'path'
import { fileURLToPath } from 'url'
import { FileSystem } from '../../src/utils/FileSystem.js'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../')
const outputRoot = path.join(projectRoot, 'output')

/**
 * Output directory names under output/ that tests may create.
 * Add a name here when a test writes into output/.
 */
export const TEST_OUTPUT_DIR_NAMES = [
	'cleanup-test-dir',
	'failing-grab',
	'integration-test',
	'integration_test',
	'parent-grab',
	'root-grab',
]

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
 * Remove multiple grab output directories created during tests.
 * @param {string[]} dirNames
 */
export const removeOutputDirs = async (dirNames) => {
	for (const dirName of dirNames) {
		await removeOutputDir(dirName)
	}
}

/**
 * Remove all known test output directories. Called once after the full test run.
 */
export const cleanupAllTestOutputDirs = async () => {
	await removeOutputDirs(TEST_OUTPUT_DIR_NAMES)
}
