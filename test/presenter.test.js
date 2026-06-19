import test from 'node:test'
import assert from 'node:assert'
import CliPresenter from '../src/infrastructure/presenter/CliPresenter.js'
import LoggerPresenter from '../src/infrastructure/presenter/LoggerPresenter.js'
import constants from '../src/utils/constants.js'
import { createTestBrain } from './helpers/createTestBrain.js'
import {
	decrementIndentation,
	incrementIndentation,
	present,
	resetIndentation,
	setPresenter,
	setServerMode,
} from '../src/infrastructure/presenter/present.js'

test('CliPresenter.write outputs coloured text to console', async () => {
	const presenter = new CliPresenter()
	const originalLog = console.log
	let output = ''

	console.log = (msg) => {
		output = msg
	}

	try {
		presenter.write([{ text: 'hello', color: 'red' }], null)
		assert.ok(output.includes('hello'), 'Output should contain the text')
	} finally {
		console.log = originalLog
	}
})

test('LoggerPresenter.write does not call console.log', async () => {
	setPresenter(new LoggerPresenter())
	const brain = createTestBrain()
	const originalLog = console.log
	let called = false

	console.log = () => {
		called = true
	}

	try {
		present([{ text: 'server message', color: 'blue' }], brain)
		assert.strictEqual(called, false)
	} finally {
		console.log = originalLog
		setPresenter(new CliPresenter())
	}
})

test('indentation helpers use the global presenter', () => {
	setPresenter(new CliPresenter())
	const brain = createTestBrain()

	resetIndentation(brain)
	incrementIndentation(brain)
	incrementIndentation(brain)
	decrementIndentation(brain)

	assert.strictEqual(brain.presenter.indentation, 2)
})

test('present is silent when grab verbose is 0', () => {
	setPresenter(new CliPresenter())
	const brain = createTestBrain()
	brain.presenter.verbose = 0

	const originalLog = console.log
	let output = ''

	console.log = (msg) => {
		output = msg
	}

	try {
		present([{ text: 'internal noise', color: 'blue' }], brain)
		assert.strictEqual(output, '')
	} finally {
		console.log = originalLog
	}
})

test('present with force bypasses verbose 0 for explicit log output', () => {
	setPresenter(new CliPresenter())
	const brain = createTestBrain()
	brain.presenter.verbose = 0

	const originalLog = console.log
	let output = ''

	console.log = (msg) => {
		output = msg
	}

	try {
		present([{ text: 'user message', color: 'green' }], brain, { force: true })
		assert.ok(output.includes('user message'))
	} finally {
		console.log = originalLog
	}
})

test('present ignores verbose 0 in server mode', () => {
	setPresenter(new CliPresenter())
	setServerMode(true)
	const brain = createTestBrain()
	brain.presenter.verbose = 0

	const originalLog = console.log
	let output = ''

	console.log = (msg) => {
		output = msg
	}

	try {
		present([{ text: 'server internal', color: 'blue' }], brain)
		assert.ok(output.includes('server internal'))
	} finally {
		console.log = originalLog
		setServerMode(false)
	}
})

test('present silences internal action detail when verbose is 0', () => {
	setPresenter(new CliPresenter())
	const brain = createTestBrain()
	brain.presenter.verbose = 0

	const originalLog = console.log
	let output = ''

	console.log = (msg) => {
		output = msg
	}

	try {
		present(
			[
				{ text: ': Creating directory ', color: 'white', style: 'italic' },
				{ text: 'output', color: 'gray', style: 'italic' },
			],
			brain,
		)
		assert.strictEqual(output, '')
	} finally {
		console.log = originalLog
	}
})
