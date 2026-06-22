import test from 'node:test'
import assert from 'node:assert'
import { startServer } from '../server/index.js'
import LoggerPresenter from '../../src/infrastructure/presenter/LoggerPresenter.js'
import { setPresenter } from '../../src/infrastructure/presenter/present.js'
import Grabber from '../../src/core/grabber/Grabber.js'
import PuppeteerPageFactory from '../../packages/core/infrastructure/PuppeteerPageFactory.js'
import { FileSystem } from '../../src/utils/FileSystem.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('Full Integration Flow', async (_t) => {
	const server = await startServer()

	try {
		const grabber = new Grabber()
		setPresenter(new LoggerPresenter())
		await grabber.init({ headless: true })

		const testGrabPath = path.join(__dirname, '../fixtures/grabs/integration-test.json')
		const testGrabContent = await FileSystem.readFile(testGrabPath, 'utf8')
		const testGrab = JSON.parse(testGrabContent)

		const response = await grabber.grab({ body: testGrab, id: 'test-run' })

		assert.strictEqual(response.result, 'success')
	} finally {
		try {
			await PuppeteerPageFactory.close()
		} catch {
			// Browser may not have launched if init failed
		}

		if (server.listening) {
			server.closeAllConnections?.()
			await new Promise((resolve) => server.close(resolve))
		}
	}
})
