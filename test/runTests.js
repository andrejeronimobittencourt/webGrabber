import { spawn } from 'node:child_process'
import { cleanupAllTestOutputDirs } from './helpers/cleanupOutput.js'

const DEFAULT_TEST_GLOB = 'test/**/*.test.js'

/**
 * Run the Node.js test runner and always clean known test output dirs afterward.
 * @param {string[]} testArgs Arguments passed to `node --test` after the `--test` flag.
 * @returns {Promise<number>}
 */
function runNodeTest(testArgs) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, ['--test', ...testArgs], {
			stdio: 'inherit',
			shell: true,
		})

		child.on('close', (code) => {
			resolve(code ?? 1)
		})
	})
}

const userArgs = process.argv.slice(2)
const testArgs = userArgs.length > 0 ? userArgs : [DEFAULT_TEST_GLOB]
let exitCode = 1

try {
	exitCode = await runNodeTest(testArgs)
} finally {
	await cleanupAllTestOutputDirs()
}

process.exit(exitCode)
