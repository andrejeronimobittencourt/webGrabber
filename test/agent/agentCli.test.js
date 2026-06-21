import test from 'node:test'
import assert from 'node:assert'
import {
	buildAgentExportExcludedIndices,
	parseAgentExportGrabName,
	validateAgentCliOptions,
} from '../../src/agent/agentCli.js'
import { FileSystem } from '../../packages/core/utils/FileSystem.js'

test('parseAgentExportGrabName skips boolean flags after --export', () => {
	const args = ['--agent', '--export', '--overwrite', 'example-h1', 'Go to example.com']

	assert.strictEqual(parseAgentExportGrabName(args), 'example-h1')
})

test('buildAgentExportExcludedIndices excludes export flags and grab name', () => {
	const args = ['--agent', '--export', '--overwrite', 'example-h1', 'Go to example.com']
	const excluded = buildAgentExportExcludedIndices(args)

	assert.deepStrictEqual(
		[...excluded].sort((left, right) => left - right),
		[1, 2, 3],
	)
})

test('validateAgentCliOptions rejects export without agent mode', () => {
	assert.throws(
		() =>
			validateAgentCliOptions({
				agentMode: false,
				agentInstruction: null,
				agentExportName: null,
				agentExportOverwrite: false,
				hasExportFlag: true,
			}),
		/--export is only supported with --agent/,
	)
})

test('validateAgentCliOptions rejects missing export grab name', () => {
	assert.throws(
		() =>
			validateAgentCliOptions({
				agentMode: true,
				agentInstruction: 'Go to example.com',
				agentExportName: null,
				agentExportOverwrite: false,
				hasExportFlag: true,
			}),
		/--export requires a grab name/,
	)
})

test('validateAgentCliOptions rejects existing export target before the run starts', () => {
	const previousExists = FileSystem.exists
	FileSystem.exists = () => true

	try {
		assert.throws(
			() =>
				validateAgentCliOptions({
					agentMode: true,
					agentInstruction: 'Go to example.com',
					agentExportName: 'example-h1',
					agentExportOverwrite: false,
					hasExportFlag: true,
				}),
			/already exists.*--overwrite/,
		)
	} finally {
		FileSystem.exists = previousExists
	}
})
