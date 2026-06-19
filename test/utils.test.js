import test from 'node:test'
import assert from 'node:assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { interpolation } from '../src/utils/interpolation.js'
import { sanitizeString } from '../src/utils/stringUtils.js'
import { pathJoin, basePathJoin } from '../src/utils/paths.js'
import CliPresenter from '../src/infrastructure/presenter/CliPresenter.js'
import constants from '../src/utils/constants.js'
import { createTestBrain } from './helpers/createTestBrain.js'
import {
	decrementIndentation,
	incrementIndentation,
	resetIndentation,
	setPresenter,
} from '../src/infrastructure/presenter/present.js'
import { loadGrabs } from '../src/utils/loadGrabs.js'
import { formatGrabValidationError, grabSchema } from '../src/schemas/grabSchema.js'
import { FileSystem } from '../src/utils/FileSystem.js'
import { z } from 'zod'

test('pathJoin joins paths', () => {
	const result = pathJoin('a', 'b', 'c.txt')
	assert.strictEqual(result, path.join('a', 'b', 'c.txt'))
})

test('basePathJoin joins with utils directory', () => {
	const utilsPath = path.dirname(fileURLToPath(new URL('../src/utils/paths.js', import.meta.url)))
	const result = basePathJoin('folder')
	assert.strictEqual(result, path.join(utilsPath, 'folder'))
})



test('sanitizeString removes invalid characters', () => {
	const result = sanitizeString('a/b')
	assert.strictEqual(result, 'ab')
})

test('interpolation replaces values from brain', () => {
	const brain = createTestBrain()
	brain.learn('NAME', 'John')
	const params = { greeting: 'Hello {{ NAME }}!' }
	const result = interpolation(params, brain)
	assert.strictEqual(result.greeting, 'Hello John!')
})

test('indentation helpers modify brain indentation', () => {
	setPresenter(new CliPresenter())
	const brain = createTestBrain()
	resetIndentation(brain)
	incrementIndentation(brain)
	incrementIndentation(brain)
	decrementIndentation(brain)
	assert.strictEqual(brain.presenter.indentation, 2)
})

test('CliPresenter writes coloured text', async () => {
	const presenter = new CliPresenter()
	const originalLog = console.log
	let output = ''
	console.log = (msg) => {
		output = msg
	}
	presenter.write([{ text: 'hello', color: 'red' }], null)
	console.log = originalLog
	assert.ok(output.includes('hello'), 'Output should contain the text')
})

test('loadGrabs ignores duplicate grab names', async () => {
	const originalReaddir = FileSystem.readdir
	const originalReadFile = FileSystem.readFile

	FileSystem.readdir = async () => ['grab1.json', 'grab2.json']
	FileSystem.readFile = async () => {
		return JSON.stringify({
			name: 'duplicateGrab',
			actions: [{ name: 'log', params: { message: 'test' } }],
		})
	}

	try {
		const grabs = await loadGrabs()
		assert.strictEqual(grabs.length, 1)
		assert.strictEqual(grabs[0].name, 'duplicateGrab')
	} finally {
		FileSystem.readdir = originalReaddir
		FileSystem.readFile = originalReadFile
	}
})

test('loadGrabs with grabName only loads the targeted grab', async () => {
	const originalReaddir = FileSystem.readdir
	const originalReadFile = FileSystem.readFile

	FileSystem.readdir = async () => ['valid.json', 'invalid.json']
	FileSystem.readFile = async (filePath) => {
		if (filePath.endsWith('valid.json')) {
			return JSON.stringify({
				name: 'valid',
				actions: [{ name: 'log', params: { message: 'ok' } }],
			})
		}
		return JSON.stringify({
			name: 'invalid',
			actions: [{ name: 'missingAction' }],
		})
	}

	const originalWarn = console.warn
	let warnCount = 0
	console.warn = () => {
		warnCount++
	}

	try {
		const grabs = await loadGrabs({ grabName: 'valid' })
		assert.strictEqual(grabs.length, 1)
		assert.strictEqual(grabs[0].name, 'valid')
		assert.strictEqual(warnCount, 0)
	} finally {
		FileSystem.readdir = originalReaddir
		FileSystem.readFile = originalReadFile
		console.warn = originalWarn
	}
})

test('formatGrabValidationError uses grab name in issue labels', () => {
	const error = new z.ZodError([
		{
			code: 'custom',
			message: 'Unknown action: "downloadYoutubeMp3"',
			path: ['actions', 0, 'name'],
		},
	])

	const formatted = formatGrabValidationError(error, 'mp3')
	assert.match(formatted, /mp3 \(action 0\): Unknown action: "downloadYoutubeMp3"/)
})

test('grabSchema validates unknown actions nested in control flow', () => {
	const result = grabSchema.safeParse({
		name: 'nested-invalid',
		actions: [
			{
				name: 'if',
				params: {
					condition: 'true',
					actions: [{ name: 'missingNestedAction' }],
				},
			},
		],
	})

	assert.strictEqual(result.success, false)
	const issue = result.error.issues.find((i) => i.message.includes('missingNestedAction'))
	assert.ok(issue, 'Expected nested unknown action validation error')
	assert.deepStrictEqual(issue.path, ['actions', 0, 'params', 'actions', 0, 'name'])
})

test('grabSchema validates nested action params recursively', () => {
	const result = grabSchema.safeParse({
		name: 'nested-params',
		actions: [
			{
				name: 'for',
				params: {
					from: 0,
					until: 1,
					actions: [{ name: 'log', params: {} }],
				},
			},
		],
	})

	assert.strictEqual(result.success, false)
	const issue = result.error.issues.find((i) => i.message.includes('log'))
	assert.ok(issue, 'Expected nested action param validation error')
	assert.match(issue.message, /Action "log"/)
})

test('grabSchema defaults verbose to 1 and accepts 0 for silent mode', () => {
	const withDefault = grabSchema.parse({
		name: 'default-verbose',
		actions: [{ name: 'log', params: { message: 'ok' } }],
	})
	assert.strictEqual(withDefault.verbose, 1)

	const silent = grabSchema.parse({
		name: 'silent',
		verbose: 0,
		actions: [{ name: 'log', params: { message: 'ok' } }],
	})
	assert.strictEqual(silent.verbose, 0)
})

test('removeOutputDir deletes created output directories', async () => {
	const { removeOutputDir } = await import('./helpers/cleanupOutput.js')
	const outputPath = path.join(
		path.dirname(fileURLToPath(import.meta.url)),
		'../output/cleanup-test-dir',
	)

	await FileSystem.mkdir(outputPath)
	await removeOutputDir('cleanup-test-dir')
	assert.strictEqual(FileSystem.exists(outputPath), false)
})
