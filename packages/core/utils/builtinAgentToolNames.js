/** Built-in agent tool names always available to the reason model. */
export const BUILTIN_AGENT_TOOL_NAMES = [
	'navigate',
	'click',
	'type',
	'pressKey',
	'paginateHtml',
	'listTabs',
	'switchTab',
	'getElements',
	'screenshot',
	'answer',
]

/** Agent tools included only when vision is available. */
export const VISION_AGENT_TOOL_NAMES = ['inspectElement']

/**
 * Agent tools included only in export mode.
 * pickElement has been removed — the model now embeds the selector directly
 * in the export-mode answer JSON ({ answer, selector }).
 */
export const EXPORT_AGENT_TOOL_NAMES = []

/** All names reserved from importable custom actions and dynamic grab tools. */
export const AGENT_RESERVED_TOOL_NAMES = [
	...BUILTIN_AGENT_TOOL_NAMES,
	...VISION_AGENT_TOOL_NAMES,
]
