/**
 * Parse command line arguments for mode, grab name, and agent mode.
 */
export const parseCliArgs = () => {
	const args = process.argv.slice(2)
	const helpMode = args.includes('--help')
	const agentMode = args.includes('--agent')
	const agentIndex = args.indexOf('--agent')
	const agentInstruction = agentMode
		? args
				.slice(agentIndex + 1)
				.filter((arg) => !arg.startsWith('-'))
				.join(' ')
				.trim() || null
		: null
	const grabName = args.find((arg, index) => {
		if (arg.startsWith('-')) return false
		if (agentMode && index > agentIndex) return false
		return true
	})

	return {
		helpMode,
		grabName,
		agentMode,
		agentInstruction,
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
