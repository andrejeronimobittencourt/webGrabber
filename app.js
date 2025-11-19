import 'dotenv/config'
import express from 'express'
import Grabber from './src/classes/Grabber.js'
import customize from './src/config/custom.js'
import options from './src/config/options.js'
import { v4 as uuidv4 } from 'uuid'
import { displayError, displayText, welcomePage } from './src/utils/utils.js'

// Function to start the server
const startServerMode = async () => {
	// Initialize Express app
	const app = express()
	app.use(express.json())

	// Set the default port or use the one from environment variables
	const port = process.env.PORT || 3000

	// Define the root route with a welcome message
	app.get('/', (_, res) => res.send(welcomePage(port)))

	// Define the /grab endpoint for grabbing configurations
	app.post('/grab', async (req, res) => {
		try {
			const payload = {
				id: uuidv4(),
				body: req.body,
			}
			const response = await grabber.grab(payload)
			res.status(200).send(response)
		} catch (error) {
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
