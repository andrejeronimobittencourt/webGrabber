import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = 3333 // Using a non-standard port to avoid conflicts

app.use(express.static(__dirname))

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'))
})

export const startServer = () => {
	return new Promise((resolve) => {
		const server = app.listen(port, () => {
			console.log(`Test server running at http://localhost:${port}`)
			resolve(server)
		})
	})
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	startServer()
}
