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
