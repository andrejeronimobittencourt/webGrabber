import 'dotenv/config'
import './src/utils/projectPaths.js'
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import Grabber from './src/core/grabber/Grabber.js'
import AgentRunner from './src/agent/AgentRunner.js'
import { validateAgentCliOptions } from './src/agent/agentCli.js'
import Engine from '#core/Engine.js'
import CliPresenter from './src/infrastructure/presenter/CliPresenter.js'
import LoggerPresenter from './src/infrastructure/presenter/LoggerPresenter.js'
import { present, presentError, setPresenter, setServerMode } from './src/infrastructure/presenter/present.js'
import customize from './src/config/customActions.js'
import puppeteerOptions from './src/config/puppeteerOptions.js'
import rateLimiter from './src/middleware/rateLimiter.js'
import { welcomePage } from './src/utils/welcomePage.js'
import { parseCliArgs } from './src/utils/cliArgs.js'
import logger from './src/utils/logger.js'

const cliArgs = parseCliArgs()
const {
	agentMode,
	agentInstruction,
	agentExportName,
	agentExportOverwrite,
	serverMode,
} = cliArgs

setServerMode(serverMode)
setPresenter(serverMode ? new LoggerPresenter() : new CliPresenter())

// Active instances tracker for graceful shutdowns
let activeGrabberInstance = null

const startServerMode = async (grabber) => {
	const app = express()
	app.use(express.json())

	const port = process.env.PORT || 3000

	app.use(rateLimiter)

	app.get('/', (_, res) => res.send(welcomePage(port)))

	app.post('/grab', async (req, res) => {
		const requestId = uuidv4()
		const startTime = Date.now()

		try {
			const payload = {
				id: requestId,
				body: req.body,
			}

			logger.info('Grab request received', {
				requestId,
				grabName: req.body?.name,
				event: 'grab_request',
			})

			const response = await grabber.grab(payload)
			const duration = Date.now() - startTime

			logger.info('Grab request completed', {
				requestId,
				grabName: req.body?.name,
				duration,
				event: 'grab_success',
			})

			res.status(200).send(response)
		} catch (error) {
			const duration = Date.now() - startTime

			logger.error('Grab request failed', {
				requestId,
				grabName: req.body?.name,
				duration,
				error: error.message,
				stack: error.stack,
				event: 'grab_error',
			})

			presentError(error)
			res.status(500).send('Internal Server Error')
		}
	})

	app.listen(port, () =>
		present([{ text: `Server started on port ${port}`, color: 'green', style: 'bold' }]),
	)
}

const runAgentMode = async () => {
	const engine = new Engine()
	customize(engine)
	const runner = new AgentRunner({ engine })
	await runner.init(puppeteerOptions)
	await runner.run(agentInstruction, {
		exportGrabName: agentExportName,
		exportOverwrite: agentExportOverwrite,
	})
}

const runGrabMode = async () => {
	const grabber = new Grabber()
	activeGrabberInstance = grabber // Store ref for process listener hooks
	customize(grabber)

	await grabber.init(puppeteerOptions)

	if (serverMode) {
		await startServerMode(grabber)
		return
	}

	await grabber.grab()
}

// Graceful termination handling
const handleShutdown = async (signal) => {
	logger.info(`Received ${signal}. Shutting down gracefully...`)
	if (activeGrabberInstance && typeof activeGrabberInstance.destroy === 'function') {
		try {
			await activeGrabberInstance.destroy()
		} catch (err) {
			logger.error('Error closing browser resources during shutdown', err)
		}
	}
	process.exit(0)
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

try {
	validateAgentCliOptions(cliArgs)

	if (agentMode) {
		await runAgentMode()
	} else {
		await runGrabMode()
	}
} catch (error) {
	presentError(error)
	process.exit(1)
}
