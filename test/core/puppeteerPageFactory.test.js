import test from 'node:test'
import assert from 'node:assert'
import { buildPuppeteerLaunchOptions } from '../../packages/core/infrastructure/PuppeteerPageFactory.js'

test('buildPuppeteerLaunchOptions defaults to window-sized viewport', () => {
	const launchOptions = buildPuppeteerLaunchOptions({ headless: false })

	assert.strictEqual(launchOptions.defaultViewport, null)
	assert.strictEqual(launchOptions.headless, false)
	assert.strictEqual('viewport' in launchOptions, false)
})

test('buildPuppeteerLaunchOptions preserves explicit defaultViewport', () => {
	const launchOptions = buildPuppeteerLaunchOptions({
		headless: false,
		defaultViewport: { width: 1280, height: 720 },
	})

	assert.deepStrictEqual(launchOptions.defaultViewport, { width: 1280, height: 720 })
})

test('buildPuppeteerLaunchOptions strips custom viewport from launch options', () => {
	const launchOptions = buildPuppeteerLaunchOptions({
		headless: false,
		viewport: { width: 1920, height: 1080 },
	})

	assert.strictEqual('viewport' in launchOptions, false)
	assert.strictEqual(launchOptions.defaultViewport, undefined)
})

test('buildPuppeteerLaunchOptions strips webGrabber plugin flags', () => {
	const launchOptions = buildPuppeteerLaunchOptions({
		stealth: true,
		adblocker: true,
		headless: false,
	})

	assert.strictEqual('stealth' in launchOptions, false)
	assert.strictEqual('adblocker' in launchOptions, false)
})
