/**
 * Sanitize string by removing non-alphanumeric characters (except allowed ones)
 */
export const sanitizeString = (string) => {
	return string.replace(/[^a-zA-Z0-9-_.:?@(), +!#$%&*;|'"=<>^]/g, '').trim()
}

/**
 * Interpolate variables in params using brain memory
 * Replaces {{variable}} with values from brain
 */
export const interpolation = (params, brain) => {
	const newParams = { ...params }
	for (const [key, value] of Object.entries(newParams)) {
		if (typeof value === 'string') {
			const regex = /{{(.*?)}}/g
			const match = value.match(regex)
			if (match) {
				match.forEach((m) => {
					const variable = m.match(/{{(.*?)}}/)[1].trim()
					if (typeof brain.recall(variable) === 'object' || Array.isArray(brain.recall(variable))) {
						newParams[key] = brain.recall(variable)
					} else {
						newParams[key] = newParams[key].replace(m, brain.recall(variable))
					}
				})
			}
		} else if (Array.isArray(value)) {
			newParams[key] = value.map((item) => {
				if (typeof item === 'string' || Array.isArray(item)) {
					return interpolation({ temp: item }, brain).temp
				}
				return item
			})
		}
	}
	return newParams
}

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

/**
 * Generate welcome page HTML for server mode
 */
export const welcomePage = (port) => `
<!DOCTYPE html>
<html lang="en">
<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Welcome to webGrabber</title>
		<style>
				body { 
						font-family: Arial, sans-serif; 
						margin: 0; 
						padding: 0; 
						height: 100vh; 
						display: flex; 
						justify-content: center; 
						align-items: flex-start; 
						background-color: #f4f4f4;
				}
				.card {
						margin-top: 40px;
						width: 430px;
						background-color: #fff;
						box-shadow: 0 4px 8px rgba(0,0,0,0.1);
						padding: 20px;
						border-radius: 8px;
						text-align: center;
				}
				h1 { 
						color: #4A90E2; 
						font-size: 24px;
				}
				p { 
						color: #555; 
						font-size: 16px;
				}
				.info {
						margin-top: 20px; 
						font-size: 14px; 
						color: #333;
				}
				.code { 
						background-color: #f5f5f5; 
						border-left: 3px solid #4A90E2; 
						padding: 10px; 
						margin: 10px 0; 
						word-wrap: break-word;
				}
		</style>
</head>
<body>
		<div class="card">
				<h1>Welcome to webGrabber</h1>
				<p>The robust, config-based web scraping and automation tool.</p>
				<div class="info">
						To run a grab configuration, send a <b>POST</b> request to the following endpoint:
						<div class="code">http://localhost:${port}/grab</div>
						Include your grab configuration in the request's JSON payload.<br>
						Check the documentation for more information.
				</div>
		</div>
</body>
</html>
`
