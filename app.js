import 'dotenv/config'
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import Grabber from './src/classes/Grabber.js'
import customize from './src/config/custom.js'
import options from './src/config/options.js'
import rateLimiter from './src/middleware/rateLimiter.js'
import { displayError, displayText } from './src/utils/display.js'
import { welcomePage } from './src/utils/utils.js'
import logger from './src/utils/logger.js'

// Function to start the server
const startServerMode = async () => {
	const app = express()
	app.use(express.json())

	const port = process.env.PORT || 3000

	// Apply rate limiting to all routes
	app.use(rateLimiter)

	// Routes
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

			displayError(`Server Error: ${error.message}`)
			res.status(500).send('Internal Server Error')
		}
	})

	app.listen(port, () =>
		displayText([{ text: `Server started on port ${port}`, color: 'green', style: 'bold' }]),
	)
}

const grabber = new Grabber()
customize(grabber)
await grabber.init(options)

if (process.argv.includes('--server')) await startServerMode()
else await grabber.grab()
