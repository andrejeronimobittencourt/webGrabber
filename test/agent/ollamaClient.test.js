import test from 'node:test'
import assert from 'node:assert'
import OllamaClient from '../../src/agent/OllamaClient.js'

test('OllamaClient chat sends reasoning_effort when configured', async () => {
	const previousFetch = globalThis.fetch
	/** @type {Record<string, unknown> | null} */
	let requestBody = null

	globalThis.fetch = async (_url, init) => {
		requestBody = JSON.parse(String(init?.body))

		return new Response(
			JSON.stringify({
				choices: [{ message: { role: 'assistant', content: 'Done.' } }],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}

	try {
		const client = new OllamaClient({
			baseUrl: 'http://localhost:11434/v1',
			reasonModel: 'qwen3:latest',
			reasoningEffort: 'high',
		})

		await client.chat([{ role: 'user', content: 'Hello' }], [])

		assert.strictEqual(requestBody?.reasoning_effort, 'high')
		assert.strictEqual(requestBody?.model, 'qwen3:latest')
	} finally {
		globalThis.fetch = previousFetch
	}
})

test('OllamaClient chat omits reasoning_effort when thinking is disabled', async () => {
	const previousFetch = globalThis.fetch
	/** @type {Record<string, unknown> | null} */
	let requestBody = null

	globalThis.fetch = async (_url, init) => {
		requestBody = JSON.parse(String(init?.body))

		return new Response(
			JSON.stringify({
				choices: [{ message: { role: 'assistant', content: 'Done.' } }],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}

	try {
		const client = new OllamaClient({
			baseUrl: 'http://localhost:11434/v1',
			reasonModel: 'gemma4:latest',
			reasoningEffort: null,
		})

		await client.chat([{ role: 'user', content: 'Hello' }], [])

		assert.strictEqual('reasoning_effort' in (requestBody ?? {}), false)
	} finally {
		globalThis.fetch = previousFetch
	}
})

test('OllamaClient chat reports a clear error when Ollama is unreachable', async () => {
	const previousFetch = globalThis.fetch

	globalThis.fetch = async () => {
		const error = new TypeError('fetch failed')
		error.code = 'ECONNREFUSED'
		throw error
	}

	try {
		const client = new OllamaClient({
			baseUrl: 'http://localhost:11434/v1',
			reasonModel: 'gemma4:latest',
			reasoningEffort: null,
		})

		await assert.rejects(
			() => client.chat([{ role: 'user', content: 'Hello' }], []),
			/Ollama is unreachable at http:\/\/localhost:11434\/v1/,
		)
	} finally {
		globalThis.fetch = previousFetch
	}
})
