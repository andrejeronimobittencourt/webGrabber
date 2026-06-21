/**
 * Parse command line arguments for mode, grab name, and agent mode.
 */

import {
	AGENT_CLI_FLAGS,
	buildAgentExportExcludedIndices,
	parseAgentExportGrabName,
} from '../agent/agentCli.js'

export const parseCliArgs = () => {
	const args = process.argv.slice(2)
	const helpMode = args.includes('--help')
	const serverMode = args.includes('--server')
	const agentMode = args.includes(AGENT_CLI_FLAGS.AGENT)
	const agentIndex = args.indexOf(AGENT_CLI_FLAGS.AGENT)
	const exportExcludedIndices = buildAgentExportExcludedIndices(args)
	const agentExportName = parseAgentExportGrabName(args)
	const hasExportFlag = args.includes(AGENT_CLI_FLAGS.EXPORT)
	const agentExportOverwrite = args.includes(AGENT_CLI_FLAGS.OVERWRITE)
	const agentInstruction = agentMode
		? args
				.slice(agentIndex + 1)
				.filter((arg, offset) => {
					const index = agentIndex + 1 + offset

					if (exportExcludedIndices.has(index)) {
						return false
					}

					if (arg.startsWith('-')) {
						return false
					}

					return true
				})
				.join(' ')
				.trim() || null
		: null
	const grabName = args.find((arg, index) => {
		if (arg.startsWith('-')) return false
		if (exportExcludedIndices.has(index)) return false
		if (agentMode && index > agentIndex) return false
		return true
	})

	return {
		helpMode,
		serverMode,
		grabName,
		agentMode,
		agentInstruction,
		agentExportName,
		agentExportOverwrite,
		hasExportFlag,
	}
}

/**
 * Parse command line arguments for mode and grab name.
 */
export const parseModeAndGrabName = () => {
	const { helpMode, grabName } = parseCliArgs()
	return {
		helpMode,
		grabName,
	}
}
