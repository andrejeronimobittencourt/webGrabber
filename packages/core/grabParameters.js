const EMPTY_OBJECT_SCHEMA = {
	type: 'object',
	properties: {},
	required: [],
	additionalProperties: false,
}

/**
 * Resolve the effective parameter schema for a grab or custom action.
 * @param {object | undefined} parameters
 * @returns {object}
 */
export function resolveGrabParameterSchema(parameters) {
	return parameters ?? EMPTY_OBJECT_SCHEMA
}

/**
 * Validate caller params against a grab parameter JSON Schema subset.
 * @param {Record<string, unknown>} params
 * @param {object | undefined} schema
 * @returns {Record<string, unknown>}
 */
export function validateGrabParameters(params, schema) {
	const effectiveSchema = resolveGrabParameterSchema(schema)
	const input = params ?? {}

	if (effectiveSchema.type !== 'object') {
		throw new Error('Grab parameters schema must be type "object"')
	}

	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		throw new Error('Grab parameters must be a plain object')
	}

	const properties = effectiveSchema.properties ?? {}
	const required = effectiveSchema.required ?? []
	const additionalProperties = effectiveSchema.additionalProperties ?? false

	for (const key of required) {
		if (!(key in input)) {
			throw new Error(`Missing required parameter "${key}"`)
		}
	}

	if (!additionalProperties) {
		for (const key of Object.keys(input)) {
			if (!(key in properties)) {
				throw new Error(`Unexpected parameter "${key}"`)
			}
		}
	}

	const validated = {}

	for (const [key, value] of Object.entries(input)) {
		const propertySchema = properties[key]

		if (!propertySchema) {
			validated[key] = value
			continue
		}

		validated[key] = validatePropertyValue(key, value, propertySchema)
	}

	return validated
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {{ type: string }} propertySchema
 * @returns {unknown}
 */
function validatePropertyValue(key, value, propertySchema) {
	switch (propertySchema.type) {
		case 'string':
			if (typeof value !== 'string') {
				throw new Error(`Parameter "${key}" must be a string`)
			}
			return value
		case 'number':
			if (typeof value !== 'number' || Number.isNaN(value)) {
				throw new Error(`Parameter "${key}" must be a number`)
			}
			return value
		case 'integer':
			if (typeof value !== 'number' || !Number.isInteger(value)) {
				throw new Error(`Parameter "${key}" must be an integer`)
			}
			return value
		case 'boolean':
			if (typeof value !== 'boolean') {
				throw new Error(`Parameter "${key}" must be a boolean`)
			}
			return value
		default:
			throw new Error(`Unsupported parameter type for "${key}"`)
	}
}
