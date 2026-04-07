# Built-in Actions Reference

**webGrabber** provides a comprehensive suite of built-in actions designed to rapidly piece together complex scraping or automation workflows. Actions are categorized by their primary domain of responsibility.

---

## 💾 Variables & Memory

Manage the internal state of the current grab run. Use these actions to store, increment, or extract data payloads dynamically.

| Action | Parameters | Description |
|--------|------------|-------------|
| `setVariable` | `key` *(str)*, `value` *(str)* | Statically bind a key-value pair into the memory buffer. Can be interpolated later via <code v-pre>{{key}}</code>. |
| `getVariable` | `key` *(str)*, `index` *(str)* | Fetches an exact key. Automatically populates the global `INPUT` pipe. Use `index` to slice array values. |
| `appendToVariable` | `key` *(str)*, `value` *(str)* | String concatenation. Appends the `value` to the existing memory `key`. |
| `deleteVariable` | `key` *(str)* | Hard deletes the specified `key` from the running memory pool. |
| `transferVariable` | `from` *(str)*, `to` *(str)* | Safely clones the value mapping from one memory `key` directly into another target binding. |
| `countStart` | `key` *(str)*, `value` *(str)* | Initializes a numerical counter integer under the specified `key`. Defaults to `0` if no value explicitly given. |
| `countIncrement` | `key` *(str)* | Increments the numerical counter corresponding to `key` by `1`. |
| `countDecrement` | `key` *(str)* | Decrements the numerical counter corresponding to `key` by `1`. |

---

## 🖱️ Interaction & Input

Drive the headless browser directly using Puppeteer's underlying API to simulate natural human inputs.

| Action | Parameters | Description |
|--------|------------|-------------|
| `type` | `selector` *(str)*, `text` *(str)*, `secret` *(str)* | Focuses on an input node and types exactly the provided `text`. Masks logs if `secret` is true. |
| `click` | `selector` *(str)*, `text` *(str)* | Fires a mouse click sequence. Can optionally fuzzy match button values if `text` is provided. |
| `clickAll` | `selector` *(str)* | Finds an array of DOM nodes matching the selector and dispatches a concurrent click on all. |
| `login` | `url`, `usernameSelector`, `username`, `passwordSelector`, `password`, `submitSelector`, `cookieName` *(opt)* | High-level macro. Bootstraps a full login sequence targeting specific fields and clicks submit. Auto-saves session cookies to disk. Providing `cookieName` (the specific string key of your auth cookie, e.g., 'jwt_token') allows the engine to isolate the correct cookie and check its expiry timestamp. If valid, it natively restores the session and skips the login form. |
| `scrollWaitClick` | `selector` *(str)*, `ms` *(str)* | Forces the viewport to scroll until the `selector` intersects the screen, waits `ms`, then clicks. |

---

## 🌐 Browser Manipulation

Manage window frames, navigation history, evaluating DOM queries, and screenshots.

| Action | Parameters | Description |
|--------|------------|-------------|
| `puppeteer` | `func` *(str)* | The most versatile bridging action. Dispatches a raw string function literal onto the Puppeteer Page object. Examples: `goto`, `reload`. |
| `newPage` | `pageKey` *(str)* | Spins up a new browser tab/frame instance and records the handle inside the engine registry under `pageKey`. |
| `switchPage` | `pageKey` *(str)* | Rotates the execution scope and viewport focus cleanly onto the specified `pageKey` identifier. |
| `closePage` | `pageKey` *(str)* | Safely terminates and garbage collects the specific tab mapping. |
| `screenshot` | `name` *(str)*, `fullPage` *(bool)* | Dumps a `.png` snapshot mapping to the viewport buffer. Defaults to the visible boundaries unless `fullPage` is true. |
| `screenshotElement`| `name` *(str)*, `selector` *(str)* | Dumps a highly focused `.png` snapshot specifically bounded merely to the matched element coordinates. |
| `getElements` | `selector` *(str)*, `attribute` *(str)* | Evaluates `querySelectorAll`. Maps returning values cleanly into the global `INPUT` pipe for extraction. |
| `elementExists` | `selector` *(str)* | Performs a non-blocking fast DOM check assessing if the matching node is currently painted on DOM. |

---

## 📂 Filesystem Orchestration

Interact intelligently with the local host disk. Store payloads, read text dumps, or manage staging folders dynamically via automation.

| Action | Parameters | Description |
|--------|------------|-------------|
| `createDir` | `dir` *(str)* | Instantiates a new arbitrary system directory path mapping. |
| `createFile` | `filename` *(str)*, `content` *(str)* | Generates a new utf-8 file block instantly dumping the stringified `content`. |
| `listFolders` | *None* | Maps a tree listing of the actively executing directory root, outputting directly to `INPUT`. |
| `fileExists` | `filename` *(str)* | Verifies if the fully qualified target filename is resolvable on disk geometry. |
| `download` | `url` *(str)*, `filename` *(str)* | Stream-downloads the binary signature from the targeting absolute `url` payload directly into an offline file payload. |
| `saveToText` | `key` *(str)*, `filename` *(str)* | Retrieves the active value nested in memory context (`key`) and strictly binds the entire string directly onto disk format (`filename`). |
| `readFromText` | `filename` *(str)* | Maps the entire utf-8 contents of a strictly defined local directory file block, cleanly emitting back directly to `INPUT`. |

---

## 🔀 Control Flow

Conditionally route the declarative grab arrays. Loops and logical branch evaluations dynamically execute action shards seamlessly.

| Action | Parameters | Description |
|--------|------------|-------------|
| `if` | `condition` *(str)*, `actions` *(str)* | Evaluates a plain JS-compatible string literal boolean `condition`. If truthy, deeply processes the injected sub-array. |
| `ifElse` | `condition` *(str)*, `actions` *(str)* | Same evaluation loop hook, providing an explicit fall-back `elseActions` array sequence routing block payload. |
| `while` | `condition` *(str)*, `actions` *(str)* | Traverses indefinitely processing the nested sub-array payload blocks recursively as long as the memory boundary mapping holds true. |
| `for` | `from` *(int)*, `until` *(int)* | Steps iteratively between integer `from` constraints. |
| `forEach` | `key` *(str)*, `actions` *(str)* | Highly practical mapping iteration block strictly bounded directly against a target object layout bound into memory contextualized `key`. |

---

## 🛠️ Utilities

Standard logic bridging modules and formatting normalizers bridging raw values into sanitized text pipelines.

| Action | Parameters | Description |
|--------|------------|-------------|
| `log` | `message` *(str)*, `color` *(str)* | Outputs an environment logger message block mapping. Safely evaluates global <code v-pre>{{}}</code> interpolation string signatures natively. |
| `sleep` | `ms` *(int)* | Forcibly hooks into a Promise setTimeout pause interval, unconditionally freezing execution routines indefinitely matching `ms`. |
| `random` | `min` *(int)*, `max` *(int)* | Maps a randomized safe float execution scalar mapping string matching boundaries, storing perfectly directly to `INPUT`. |
| `matchFromString` | `string` *(str)*, `regex` *(str)* | A robust generic string RegExp executer sequence mapped directly over the injected targeted string. |
| `replaceString` | `string` *(str)* | Finds and forcibly overwrites specific sub-string signature payloads matching dynamic criteria blocks perfectly. |

*To implement workflows not covered organically here, read the guide on declaring custom behaviors over [Custom Actions](./custom-actions.md).*