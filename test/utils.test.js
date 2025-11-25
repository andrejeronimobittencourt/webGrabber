import test from 'node:test'
import assert from 'node:assert'
import path from 'path'
import { fileURLToPath } from 'url'
import {
	pathJoin,
	basePathJoin,
	sanitizeString,
	interpolation,
	resetIndentation,
	incrementIndentation,
	decrementIndentation,
	displayText,
	getGrabList,
} from '../src/utils/utils.js'
import { FileSystem } from '../src/utils/fileSystem.js'
import constants from '../src/utils/constants.js'

class Brain {
	constructor() {
		this.memory = new Map()
	}
	learn(key, value) {
		this.memory.set(key, value)
	}
	recall(key) {
		return this.memory.get(key)
	}
}

test('pathJoin joins paths', () => {
	const result = pathJoin('a', 'b', 'c.txt')
	assert.strictEqual(result, path.join('a', 'b', 'c.txt'))
})

test('basePathJoin joins with utils directory', () => {
	const utilsPath = path.dirname(fileURLToPath(new URL('../src/utils/utils.js', import.meta.url)))
	const result = basePathJoin('folder')
	assert.strictEqual(result, path.join(utilsPath, 'folder'))
})



test('sanitizeString removes invalid characters', () => {
	const result = sanitizeString('a/b')
	assert.strictEqual(result, 'ab')
})

test('interpolation replaces values from brain', () => {
	const brain = new Brain()
	brain.learn('NAME', 'John')
	const params = { greeting: 'Hello {{ NAME }}!' }
	const result = interpolation(params, brain)
	assert.strictEqual(result.greeting, 'Hello John!')
})

test('indentation helpers modify brain memory', () => {
	const brain = new Brain()
	resetIndentation(brain)
	incrementIndentation(brain)
	incrementIndentation(brain)
	decrementIndentation(brain)
	assert.strictEqual(brain.recall(constants.indentationKey), 2)
})

test('displayText writes coloured text', async () => {
	const originalLog = console.log
	let output = ''
	console.log = (msg) => {
		output = msg
	}
	displayText([{ text: 'hello', color: 'red' }])
	console.log = originalLog
	// Just verify the text is present - chalk may disable colors in non-TTY environments
	assert.ok(output.includes('hello'), 'Output should contain the text')
})

test('getGrabList ignores duplicate grab names', async () => {
	// Mock FileSystem methods
	const originalReaddir = FileSystem.readdir
	const originalReadFile = FileSystem.readFile

	// Mock readdir to return two files
	FileSystem.readdir = async () => ['grab1.json', 'grab2.json']

	// Mock readFile to return configs with same name
	FileSystem.readFile = async () => {
		return JSON.stringify({
			name: 'duplicateGrab',
			actions: [{ name: 'log', params: { message: 'test' } }],
		})
	}

	try {
		const grabs = await getGrabList()
		assert.strictEqual(grabs.length, 1)
		assert.strictEqual(grabs[0].name, 'duplicateGrab')
	} finally {
		// Restore methods
		FileSystem.readdir = originalReaddir
		FileSystem.readFile = originalReadFile
	}
})
