import test from 'node:test'
import assert from 'node:assert'
import { startServer } from '../server/index.js'
import Grabber from '../../src/classes/Grabber.js'
import PuppeteerPageFactory from '../../src/classes/wrappers/Puppeteer.js'
import { FileSystem } from '../../src/utils/fileSystem.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '../../')

test('Full Integration Flow', async (_t) => {
	// Start Server
	const server = await startServer()

	try {
		// Initialize Grabber
		const grabber = new Grabber()
		await grabber.init({ headless: true })

		// Load test grab directly from fixtures
		const testGrabPath = path.join(__dirname, '../fixtures/grabs/integration-test.json')
		const testGrabContent = await FileSystem.readFile(testGrabPath, 'utf8')
		const testGrab = JSON.parse(testGrabContent)

		// Run Grab as payload (server mode simulation)
		await grabber.grab({ body: testGrab, id: 'test-run' })

		// Verify Results
		const resultPath = path.join(
			projectRoot,
			'src/resources/integration-test/result.txt',
		)
		const exists = FileSystem.exists(resultPath)
		assert.ok(exists, 'Result file should exist')

		const content = await FileSystem.readFile(resultPath, 'utf8')
		assert.strictEqual(content, 'success', 'File content should match')

		// Cleanup
		if (FileSystem.exists(path.join(projectRoot, 'src/resources/integration-test'))) {
			await FileSystem.rmdir(
				path.join(projectRoot, 'src/resources/integration-test'),
				{ recursive: true },
			)
		}
	} finally {
		// Close Puppeteer browser (server mode doesn't auto-close)
		await PuppeteerPageFactory.close()

		// Close server properly
		if (server.listening) {
			server.closeAllConnections?.()
			await new Promise((resolve) => server.close(resolve))
		}
	}
})
