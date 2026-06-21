/**
 * @typedef {import('./observePage.js').PageElementSnapshot} PageElementSnapshot
 */

const SELECTOR_SOURCE_RULE =
	'Use only selectors from elements or visibleElements in the observation.'

const VISIBLE_ELEMENTS_RULE =
	'Each observation includes a capped visibleElements list with text previews. ' +
	'Use paginateVisibleElements to change tags or offset when the target is on another page.'

const PICK_ELEMENT_RULE =
	'After navigate, call pickElement with one selector from elements or visibleElements to signal which element you are acting on or answering from.'

const REVEAL_HIDDEN_UI_RULE =
	'If it should exist but is still missing after all pages, it is probably not visible yet—' +
	'interact with visible controls from the cheatsheet (menus, tabs, expand buttons, etc.) to reveal it; ' +
	'the next observation will list newly visible elements.'

const FINAL_ANSWER_VALUE_RULE =
	'Return the concrete value they asked for (the fact, time, price, name, etc.)—not a link title, site name, URL, ' +
	'or page heading unless they asked for those specifically.'

/** Guidance when rejecting a selector outside the known element lists. */
export const CHEATSHEET_SELECTOR_REJECTION_HINT =
	`${SELECTOR_SOURCE_RULE} ${PICK_ELEMENT_RULE} ` +
	'Do not reuse selectors from an earlier step after navigate, type, click, or a tab change—wait for the next observation. ' +
	`${VISIBLE_ELEMENTS_RULE} ` +
	'Call listElements with a higher offset if the target may be on a later interactive page. ' +
	REVEAL_HIDDEN_UI_RULE

/** Reminder appended to each observation message for the reason model. */
export const OBSERVATION_EXPLORATION_NOTE =
	'Note: elements lists only currently visible interactive controls. visibleElements lists readable text on the current page slice. ' +
	`${SELECTOR_SOURCE_RULE} ${PICK_ELEMENT_RULE} ` +
	`${VISIBLE_ELEMENTS_RULE} ` +
	'Paginate with listElements or paginateVisibleElements when the target may be on a later page. ' +
	'If a click opened the wrong tab, an ad, or a popup, use switchTab with a tabKey from observation.tabs or call listTabs before continuing. ' +
	'After search submit, wait for the next observation—results may be on a new tab in tabs. ' +
	'If it should exist but is missing after all pages, reveal it first—click menus, tabs, or buttons from the list, ' +
	'or use inspectElement to scroll targets into view—then read the updated observation.'

/** Rules for the final answer returned to the user. */
export const AGENT_FINAL_ANSWER_GUIDANCE =
	'The user cannot see the browser—runs are often headless. Your final answer must be only the requested information, in plain text. ' +
	`${FINAL_ANSWER_VALUE_RULE} ` +
	'Do not justify, explain your process, mention tools or selectors, restate the task, or tell the user what to do next. ' +
	'Never say the user should click something, open a tab, or look at the page themselves. ' +
	'After pickElement, answer from the picked element in visibleElements when that text is enough. ' +
	'Otherwise keep using tools until you can return a concrete value or report briefly that the task could not be completed.'

/** Cheatsheet rules included in the agent system prompt. */
export const AGENT_CHEATSHEET_SYSTEM_GUIDANCE =
	'The elements array lists only currently visible interactive controls. visibleElements lists readable text for the current page slice. ' +
	`${SELECTOR_SOURCE_RULE} ${PICK_ELEMENT_RULE} ` +
	`${VISIBLE_ELEMENTS_RULE} ` +
	'If the target is missing, paginate with listElements (offset = pageIndex * limit) or paginateVisibleElements for readable text. ' +
	'If the target should exist but is still missing, it is likely hidden off-screen or behind collapsed UI—use visible controls to open menus, tabs, dialogs, or scroll content; after each action the next observation will include newly visible elements. ' +
	'The viewport visualSummary (when present) shows only what is currently visible, not the full page or DOM. ' +
	'The JSON cheatsheet is paginated: each observation includes elementsPage and visibleElementsPage with pageIndex, totalPages, total, and hasMore. ' +
	'Use inspectElement for visual confirmation of a target. ' +
	'Use pressKey with Enter to submit search or forms when needed instead of clicking submit buttons when possible. ' +
	'After submitting a search, read the next observation on the active tab; results may open in a new tab listed in tabs—use switchTab if needed, then pickElement on the target. Never guess result link selectors. ' +
	'Each observation includes tabs with tabKey values for every open browser tab. If a click opens the wrong page, an ad, or a popup, use switchTab to return to a previous tab or listTabs to inspect all open tabs before continuing. ' +
	'When importable grab or custom tools are available and match the task, prefer them over manual selector steps. Pass only declared parameter keys. After any grab or custom tool call, read the next observation before continuing with selectors.'

/**
 * @param {Set<string>} knownSelectors
 * @param {PageElementSnapshot[]} elements
 */
export function registerCheatsheetSelectors(knownSelectors, elements) {
	for (const element of elements) {
		knownSelectors.add(element.selector)
	}
}
