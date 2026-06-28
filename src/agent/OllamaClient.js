/**
 * @typedef {Object} OllamaChatMessage
 * @property {'system' | 'user' | 'assistant' | 'tool'} role
 * @property {string | Array<{ type: string, text?: string, image_url?: { url: string } }>} [content]
 * @property {Array<{ id: string, type: 'function', function: { name: string, arguments: string } }>} [tool_calls]
 * @property {string} [tool_call_id]
 */

import { resolveReasonModel, resolveReasoningEffort, resolveVisionModel } from './agentModels.js'
/**
 * @param {string} baseUrl
 * @param {unknown} error
 * @returns {Error}
 */
function createOllamaConnectionError(baseUrl, error) {
	let detail = 'connection failed — is Ollama running?'

	if (error instanceof Error) {
		const code = 'code' in error && typeof error.code === 'string' ? error.code : null

		if (code === 'ECONNREFUSED') {
			detail = 'connection refused — is Ollama running?'
		} else if (code === 'ENOTFOUND') {
			detail = 'host not found — check AGENT_OLLAMA_URL'
		} else if (error.message !== 'fetch failed') {
			detail = error.message
		}
	}

	return new Error(
		`Ollama is unreachable at ${baseUrl}. ${detail} ` +
			'Set AGENT_OLLAMA_URL if Ollama uses a different host or port.',
	)
}

/**
 * Local Ollama client using the OpenAI-compatible chat completions API.
 */
export default class OllamaClient {
	#baseUrl
	#reasonModel
	#visionModel
	#reasoningEffort

	/**
	 * @param {{ baseUrl?: string, reasonModel?: string, visionModel?: string, model?: string, reasoningEffort?: string | null }} [options]
	 */
	constructor(options = {}) {
		const reasonOptions = {
			reasonModel: options.reasonModel ?? options.model,
			visionModel: options.visionModel,
		}

		this.#baseUrl =
			options.baseUrl ?? process.env.AGENT_OLLAMA_URL ?? 'http://localhost:11434/v1'
		this.#reasonModel = resolveReasonModel(reasonOptions)
		this.#visionModel = resolveVisionModel(reasonOptions)
		this.#reasoningEffort =
			options.reasoningEffort === undefined
				? resolveReasoningEffort()
				: options.reasoningEffort
	}

	get baseUrl() {
		return this.#baseUrl
	}

	get reasonModel() {
		return this.#reasonModel
	}

	get visionModel() {
		return this.#visionModel
	}

	/** @deprecated Use reasonModel */
	get model() {
		return this.#reasonModel
	}

	/**
	 * Send a chat completion request with optional tool definitions.
	 * @param {OllamaChatMessage[]} messages
	 * @param {object[]} tools
	 * @returns {Promise<{ choices: Array<{ message: OllamaChatMessage, finish_reason?: string }> }>}
	 */
	async chat(messages, tools) {
		return this.#request(this.#reasonModel, messages, tools, {
			reasoningEffort: this.#reasoningEffort,
		})
	}

	/**
	 * Describe the current viewport for the reason model when vision is enabled.
	 * @param {string} viewportBase64
	 * @param {{ url?: string, title?: string }} [context]
	 * @returns {Promise<string>}
	 */
	async describePageView(viewportBase64, context = {}) {
		if (!this.#visionModel) {
			return ''
		}

		const contextLine = [context.title, context.url].filter(Boolean).join(' — ')

		const backgroundParts = []

		const prompt = [
			'You are a page-description assistant. Your ONLY job is to describe what is currently visible on this page. Do NOT suggest actions, next steps, or what the agent should do.',
			'Rules: (1) State what the page shows right now. (2) Mention 1-2 prominent interactive elements visible in the viewport if relevant to the goal. (3) Max 2 sentences. (4) No action suggestions. No future tense.',
			...backgroundParts,
			...(contextLine ? [`Page context: ${contextLine}`] : []),
		].join('\n')

		return this.#describeViewImage(viewportBase64, prompt)
	}

	/**
	 * Describe a single element crop for inspectElement.
	 * @param {string} elementBase64
	 * @param {{ url?: string, title?: string, selector?: string, elementText?: string }} [context]
	 * @returns {Promise<string>}
	 */
	async describeElementView(elementBase64, context = {}) {
		if (!this.#visionModel) {
			return ''
		}

		const contextLine = [context.title, context.url, context.selector, context.elementText]
			.filter(Boolean)
			.join(' — ')

		const backgroundParts = []

		const prompt = [
			'You are a page-description assistant. Your ONLY job is to describe what is currently visible in this element crop. Do NOT suggest actions, next steps, or what the agent should do.',
			'Rules: (1) Describe the visible content of this element. (2) Note any text, labels, or values shown. (3) Max 2 sentences. (4) No action suggestions.',
			...backgroundParts,
			...(contextLine ? [`Element context: ${contextLine}`] : []),
		].join('\n')

		return this.#describeViewImage(elementBase64, prompt)
	}

	/** @deprecated Use describePageView or describeElementView */
	async describePageScreenshot(screenshotBase64, context = {}) {
		if (context.selector) {
			return this.describeElementView(screenshotBase64, context)
		}

		return this.describePageView(screenshotBase64, context)
	}

	/**
	 * @param {string} imageBase64
	 * @param {string} prompt
	 * @returns {Promise<string>}
	 */
	async #describeViewImage(imageBase64, prompt) {
		const completion = await this.#request(this.#visionModel, [
			{
				role: 'user',
				content: [
					{ type: 'text', text: prompt },
					{
						type: 'image_url',
						image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
					},
				],
			},
		])

		return completion.choices?.[0]?.message?.content?.trim() ?? ''
	}

	/**
	 * @param {string} model
	 * @param {OllamaChatMessage[]} messages
	 * @param {object[]} [tools]
	 * @param {{ reasoningEffort?: string | null }} [options]
	 */
	async #request(model, messages, tools, options = {}) {
		const body = {
			model,
			messages,
		}

		if (options.reasoningEffort) {
			body.reasoning_effort = options.reasoningEffort
		}

		if (tools?.length) {
			body.tools = tools
			body.tool_choice = 'auto'
		}

		const response = await fetch(`${this.#baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}).catch((error) => {
			throw createOllamaConnectionError(this.#baseUrl, error)
		})

		if (!response.ok) {
			const responseBody = await response.text()
			throw new Error(`Ollama request failed (${response.status}): ${responseBody}`)
		}

		return response.json()
	}
}
