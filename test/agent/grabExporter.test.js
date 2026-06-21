import test from 'node:test'
import assert from 'node:assert'
import { exportGrabFromSteps } from '../../src/agent/GrabExporter.js'

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
