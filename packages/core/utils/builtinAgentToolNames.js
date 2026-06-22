/** Built-in agent tool names always available to the reason model. */
export const BUILTIN_AGENT_TOOL_NAMES = [
	'navigate',
	'click',
	'type',
	'pressKey',
	'paginateElements',
	'listTabs',
	'switchTab',
	'getElements',
	'screenshot',
]

/** Agent tools included only when vision is available. */
export const VISION_AGENT_TOOL_NAMES = ['inspectElement']

/** Agent tools included only when exporting a grab from an agent run. */
export const EXPORT_AGENT_TOOL_NAMES = ['pickElement']

/** All names reserved from importable custom actions and dynamic grab tools. */
export const AGENT_RESERVED_TOOL_NAMES = [
	...BUILTIN_AGENT_TOOL_NAMES,
	...VISION_AGENT_TOOL_NAMES,
	...EXPORT_AGENT_TOOL_NAMES,
]
