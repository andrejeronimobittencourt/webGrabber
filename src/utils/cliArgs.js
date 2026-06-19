/**
 * Parse command line arguments for mode and grab name
 */
export const parseModeAndGrabName = () => {
	const args = process.argv.slice(2)
	const helpMode = args.includes('--help')
	return {
		helpMode,
		grabName: args.find((arg) => !arg.startsWith('-')),
	}
}
