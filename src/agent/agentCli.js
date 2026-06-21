import { assertExportGrabNameAvailable } from './GrabExporter.js'

/** Agent CLI flag names. */
export const AGENT_CLI_FLAGS = {
	AGENT: '--agent',
	EXPORT: '--export',
	OVERWRITE: '--overwrite',
}

/** Agent CLI flags that do not consume a following value. */
export const AGENT_BOOLEAN_CLI_FLAGS = new Set([AGENT_CLI_FLAGS.OVERWRITE])

/**
 * @typedef {Object} ParsedAgentCliOptions
 * @property {boolean} agentMode
 * @property {string | null | undefined} agentInstruction
 * @property {string | null} agentExportName
 * @property {boolean} agentExportOverwrite
 * @property {boolean} hasExportFlag
 */

/**
 * Read the grab name passed to `--export`, skipping boolean flags such as `--overwrite`.
 * @param {string[]} args
 * @returns {string | null}
 */
export function parseAgentExportGrabName(args) {
	const exportIndex = args.indexOf(AGENT_CLI_FLAGS.EXPORT)

	if (exportIndex === -1) {
		return null
	}

	for (let index = exportIndex + 1; index < args.length; index += 1) {
		const arg = args[index]

		if (AGENT_BOOLEAN_CLI_FLAGS.has(arg)) {
			continue
		}

		if (arg.startsWith('-')) {
			return null
		}

		return arg
	}

	return null
}

/**
 * Indices that belong to agent export flags and must not be treated as instructions or grab names.
 * @param {string[]} args
 * @returns {Set<number>}
 */
export function buildAgentExportExcludedIndices(args) {
	const excluded = new Set()

	for (const flag of AGENT_BOOLEAN_CLI_FLAGS) {
		const flagIndex = args.indexOf(flag)

		if (flagIndex !== -1) {
			excluded.add(flagIndex)
		}
	}

	const exportIndex = args.indexOf(AGENT_CLI_FLAGS.EXPORT)

	if (exportIndex === -1) {
		return excluded
	}

	excluded.add(exportIndex)

	const exportName = parseAgentExportGrabName(args)

	if (!exportName) {
		return excluded
	}

	const exportNameIndex = args.indexOf(exportName, exportIndex + 1)

	if (exportNameIndex !== -1) {
		excluded.add(exportNameIndex)
	}

	return excluded
}

/**
 * Validate agent CLI flag combinations before starting a run.
 * @param {ParsedAgentCliOptions} options
 */
export function validateAgentCliOptions(options) {
	const {
		agentMode,
		agentInstruction,
		agentExportName,
		agentExportOverwrite,
		hasExportFlag,
	} = options

	if (!agentMode && hasExportFlag) {
		throw new Error('--export is only supported with --agent')
	}

	if (!agentMode && agentExportOverwrite) {
		throw new Error('--overwrite is only supported with --agent --export')
	}

	if (!agentMode) {
		return
	}

	if (!agentInstruction) {
		throw new Error('Agent mode requires an instruction after --agent')
	}

	if (hasExportFlag && !agentExportName) {
		throw new Error('--export requires a grab name, for example --export my-grab')
	}

	if (agentExportOverwrite && !agentExportName) {
		throw new Error('--overwrite requires --export with a grab name')
	}

	if (agentExportName) {
		assertExportGrabNameAvailable(agentExportName, { overwrite: agentExportOverwrite })
	}
}
