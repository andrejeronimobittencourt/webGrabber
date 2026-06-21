import test from 'node:test'
import assert from 'node:assert'
import { parseCliArgs } from '../../src/utils/cliArgs.js'

test('parseCliArgs detects agent mode and instruction', () => {
	const previousArgv = process.argv
	process.argv = ['node', 'app.js', '--agent', 'Go to example.com']

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentMode, true)
		assert.strictEqual(args.agentInstruction, 'Go to example.com')
		assert.strictEqual(args.grabName, undefined)
	} finally {
		process.argv = previousArgv
	}
})

test('parseCliArgs keeps grab name outside agent mode', () => {
	const previousArgv = process.argv
	process.argv = ['node', 'app.js', 'hello-world']

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentMode, false)
		assert.strictEqual(args.grabName, 'hello-world')
	} finally {
		process.argv = previousArgv
	}
})

test('parseCliArgs parses --export grab name in agent mode', () => {
	const previousArgv = process.argv
	process.argv = [
		'node',
		'app.js',
		'--agent',
		'Go to example.com',
		'--export',
		'example-h1',
	]

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentMode, true)
		assert.strictEqual(args.agentInstruction, 'Go to example.com')
		assert.strictEqual(args.agentExportName, 'example-h1')
	} finally {
		process.argv = previousArgv
	}
})

test('parseCliArgs excludes --export value from instruction text', () => {
	const previousArgv = process.argv
	process.argv = [
		'node',
		'app.js',
		'--export',
		'my-grab',
		'--agent',
		'Click the login button',
	]

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentInstruction, 'Click the login button')
		assert.strictEqual(args.agentExportName, 'my-grab')
		assert.strictEqual(args.grabName, undefined)
	} finally {
		process.argv = previousArgv
	}
})

test('parseCliArgs detects --overwrite for agent export', () => {
	const previousArgv = process.argv
	process.argv = [
		'node',
		'app.js',
		'--agent',
		'--export',
		'example-h1',
		'--overwrite',
		'Go to example.com',
	]

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentExportName, 'example-h1')
		assert.strictEqual(args.agentExportOverwrite, true)
		assert.strictEqual(args.agentInstruction, 'Go to example.com')
	} finally {
		process.argv = previousArgv
	}
})

test('parseCliArgs parses export name after --overwrite', () => {
	const previousArgv = process.argv
	process.argv = [
		'node',
		'app.js',
		'--agent',
		'--export',
		'--overwrite',
		'example-h1',
		'Go to example.com',
	]

	try {
		const args = parseCliArgs()
		assert.strictEqual(args.agentExportName, 'example-h1')
		assert.strictEqual(args.agentExportOverwrite, true)
		assert.strictEqual(args.agentInstruction, 'Go to example.com')
	} finally {
		process.argv = previousArgv
	}
})
