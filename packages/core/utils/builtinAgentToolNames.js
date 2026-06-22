/** Built-in agent tool names reserved from custom action registration. */
export const BUILTIN_AGENT_TOOL_NAMES = [
	'navigate',
	'click',
	'type',
	'pressKey',
	'paginateElements',
	'inspectElement',
	'listTabs',
	'switchTab',
	'getElements',
	'screenshot',
]

/** Agent tools included only when exporting a grab from an agent run. */
export const EXPORT_AGENT_TOOL_NAMES = ['pickElement']
