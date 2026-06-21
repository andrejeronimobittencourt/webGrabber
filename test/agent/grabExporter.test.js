import test from 'node:test'
import assert from 'node:assert'
import {
	assertExportGrabNameAvailable,
	exportAgentRunGrab,
	exportGrabFromSteps,
	writeExportedGrabToFile,
} from '../../src/agent/GrabExporter.js'
import { FileSystem } from '../../packages/core/utils/FileSystem.js'

test('exportGrabFromSteps maps navigate to puppeteer.goto', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com', waitUntil: 'networkidle0' },
		},
		{
			action: 'getElements',
			params: { selector: 'h1' },
		},
	])

	assert.strictEqual(grab.name, 'agent-export')
	assert.strictEqual(grab.actions.length, 2)
	assert.deepStrictEqual(grab.actions[0], {
		name: 'puppeteer',
		params: {
			func: 'goto',
			url: 'https://example.com',
			options: { waitUntil: 'networkidle0' },
		},
	})
	assert.deepStrictEqual(grab.actions[1], {
		name: 'getElements',
		params: { selector: 'h1' },
	})
})

test('exportGrabFromSteps applies default navigate waitUntil', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
		},
	])

	assert.deepStrictEqual(grab.actions[0], {
		name: 'puppeteer',
		params: {
			func: 'goto',
			url: 'https://example.com',
			options: { waitUntil: 'domcontentloaded' },
		},
	})
})

test('exportGrabFromSteps omits failed steps', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
			error: 'Navigation timeout',
		},
		{
			action: 'getElements',
			params: { selector: 'h1' },
		},
	])

	assert.strictEqual(grab.actions.length, 1)
	assert.deepStrictEqual(grab.actions[0], {
		name: 'getElements',
		params: { selector: 'h1' },
	})
})

test('exportGrabFromSteps omits agent-only exploration steps', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'listElements',
			params: { offset: 100 },
		},
		{
			action: 'inspectElement',
			params: { selector: '#result' },
		},
		{
			action: 'pressKey',
			params: { key: 'Enter', selector: 'input[name="q"]' },
		},
	])

	assert.strictEqual(grab.actions.length, 1)
	assert.deepStrictEqual(grab.actions[0], {
		name: 'pressKey',
		params: { key: 'Enter', selector: 'input[name="q"]' },
	})
})

test('exportGrabFromSteps omits visible list and pick steps from export', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
		},
		{
			action: 'paginateVisibleElements',
			params: { offset: 0 },
		},
		{
			action: 'pickElement',
			params: { selector: 'h1' },
		},
		{
			action: 'getElements',
			params: { selector: 'h1' },
		},
	])

	assert.strictEqual(grab.actions.length, 2)
	assert.deepStrictEqual(grab.actions[1], {
		name: 'getElements',
		params: { selector: 'h1' },
	})
})

test('exportGrabFromSteps synthesizes getElements from pickElement when the model answered without reading', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
		},
		{
			action: 'pickElement',
			params: { selector: 'html > body > div > h1' },
		},
	])

	assert.strictEqual(grab.actions.length, 2)
	assert.deepStrictEqual(grab.actions[1], {
		name: 'getElements',
		params: { selector: 'html > body > div > h1' },
	})
})

test('exportGrabFromSteps does not synthesize getElements when pick was used for click', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
		},
		{
			action: 'pickElement',
			params: { selector: 'button.submit' },
		},
		{
			action: 'click',
			params: { selector: 'button.submit' },
		},
	])

	assert.strictEqual(grab.actions.length, 2)
	assert.deepStrictEqual(grab.actions[1], {
		name: 'click',
		params: { selector: 'button.submit' },
	})
})

test('exportGrabFromSteps appends synthesized getElements after intervening exported actions', () => {
	const grab = exportGrabFromSteps([
		{
			action: 'navigate',
			params: { url: 'https://example.com' },
		},
		{
			action: 'click',
			params: { selector: 'button.more' },
		},
		{
			action: 'pickElement',
			params: { selector: 'h1' },
		},
	])

	assert.strictEqual(grab.actions.length, 3)
	assert.deepStrictEqual(grab.actions[2], {
		name: 'getElements',
		params: { selector: 'h1' },
	})
})

test('exportGrabFromSteps maps dynamic grab tools to runGrab', () => {
	const dynamicRegistry = new Map([
		[
			'grab_world_grab',
			{
				kind: 'grab',
				toolName: 'grab_world_grab',
				grabName: 'world-grab',
			},
		],
	])

	const grab = exportGrabFromSteps(
		[
			{
				action: 'grab_world_grab',
				params: { greeting: 'hello' },
			},
		],
		{ dynamicRegistry },
	)

	assert.deepStrictEqual(grab.actions[0], {
		name: 'runGrab',
		params: {
			grab: 'world-grab',
			params: { greeting: 'hello' },
		},
	})
})

test('exportGrabFromSteps maps dynamic custom tools to action names', () => {
	const dynamicRegistry = new Map([
		[
			'myCustomAction',
			{
				kind: 'custom',
				toolName: 'myCustomAction',
				actionName: 'myCustomAction',
			},
		],
	])

	const grab = exportGrabFromSteps(
		[
			{
				action: 'myCustomAction',
				params: { value: 42 },
			},
		],
		{ dynamicRegistry },
	)

	assert.deepStrictEqual(grab.actions[0], {
		name: 'myCustomAction',
		params: { value: 42 },
	})
})

test('exportGrabFromSteps uses name and description options', () => {
	const grab = exportGrabFromSteps(
		[
			{
				action: 'navigate',
				params: { url: 'https://example.com' },
			},
		],
		{
			name: 'example-nav',
			description: 'Go to example.com',
		},
	)

	assert.strictEqual(grab.name, 'example-nav')
	assert.strictEqual(grab.description, 'Go to example.com')
})

test('assertExportGrabNameAvailable rejects existing grabs without overwrite', () => {
	const previousExists = FileSystem.exists

	FileSystem.exists = () => true

	try {
		assert.throws(
			() => assertExportGrabNameAvailable('example-h1'),
			/already exists.*--overwrite/,
		)
	} finally {
		FileSystem.exists = previousExists
	}
})

test('writeExportedGrabToFile overwrites an existing grab when enabled', async () => {
	const previousExists = FileSystem.exists
	const previousWriteFile = FileSystem.writeFile
	/** @type {string | null} */
	let writtenPath = null

	FileSystem.exists = () => true
	FileSystem.writeFile = async (filePath) => {
		writtenPath = filePath
	}

	try {
		const filePath = await writeExportedGrabToFile(
			{
				name: 'example-h1',
				description: 'Updated export',
				actions: [{ name: 'log', params: { message: 'hello' } }],
			},
			{ overwrite: true },
		)

		assert.match(filePath, /example-h1\.json$/)
		assert.match(String(writtenPath), /example-h1\.json$/)
	} finally {
		FileSystem.exists = previousExists
		FileSystem.writeFile = previousWriteFile
	}
})

test('exportAgentRunGrab rejects runs with no exportable actions', async () => {
	await assert.rejects(
		() =>
			exportAgentRunGrab({
				steps: [
					{
						action: 'listElements',
						params: { offset: 0 },
						result: { elements: [] },
					},
				],
				instruction: 'Find nothing',
				exportGrabName: 'empty-export',
			}),
		/no exportable actions/,
	)
})
