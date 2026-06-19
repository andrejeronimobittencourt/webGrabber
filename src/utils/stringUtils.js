/**
 * Sanitize string by removing non-alphanumeric characters (except allowed ones)
 */
export const sanitizeString = (string) => {
	return string.replace(/[^a-zA-Z0-9-_.:?@(), +!#$%&*;|'"=<>^]/g, '').trim()
}
