import 'dotenv/config'
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import Grabber from './src/core/grabber/Grabber.js'
import AgentRunner from './src/agent/AgentRunner.js'
import { validateAgentCliOptions } from './src/agent/agentCli.js'
import Engine from './packages/core/Engine.js'
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
	customize(grabber)

	await grabber.init(puppeteerOptions)

	if (serverMode) {
		await startServerMode(grabber)
		return
	}

	await grabber.grab()
}

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
