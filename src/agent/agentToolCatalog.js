/** Agent tools that are exploration-only and should not be exported to grabs. */
export const AGENT_ONLY_EXPORT_ACTIONS = new Set([
	'inspectElement',
	'listElements',
	'listTabs',
	'paginateVisibleElements',
	'pickElement',
	'switchTab',
])

/** Agent tools omitted from normal CLI progress output. */
export const AGENT_QUIET_TOOLS = new Set(['pickElement'])

/** Agent tools that consume a pick for interaction rather than read-and-answer export. */
export const PICK_CONSUMING_ACTIONS = new Set(['click', 'inspectElement', 'pressKey', 'type'])
