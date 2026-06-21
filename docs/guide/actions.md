# Built-in Actions Reference

**webGrabber** provides built-in actions for scraping and automation workflows. Parameters marked *(opt)* are optional.

Actions marked **server: no** cannot be used in `POST /grab` payloads (inline server runs). See [Server Mode](./server-mode.md#blocked-actions-in-server-runs).

---

## 💾 Variables & Memory

| Action | Parameters | Description |
|--------|------------|-------------|
| `setVariable` | `key` *(str)*, `value` *(any)* | Store a value in script memory. Interpolate later via <code v-pre>{{key}}</code>. |
| `getVariable` | `key` *(str)*, `index` *(int, opt)* | Load a key into `INPUT`. Use `index` when the stored value is an array. |
| `appendToVariable` | `key` *(str)*, `value` *(any)* | Append to an existing string value. |
| `deleteVariable` | `key` *(str)* | Remove a key from script memory. |
| `transferVariable` | `from` *(str)*, `to` *(str)*, `index` *(int, opt)*, `key` *(str, opt)* | Copy a value from one key to another. |
| `countStart` | `key` *(str)*, `value` *(int, opt)* | Initialize a counter (default `0`). |
| `countIncrement` | `key` *(str)* | Increment counter by `1`. |
| `countDecrement` | `key` *(str)* | Decrement counter by `1`. |

---

## 🖱️ Interaction & Input

| Action | Parameters | Description |
|--------|------------|-------------|
| `type` | `selector` *(str)*, `text` *(str)*, `secret` *(bool, opt)* | Type into an input. Masks logs when `secret` is true. |
| `pressKey` | `key` *(str)*, `selector` *(str, opt)* | Press a keyboard key. Optional `selector` focuses an input first. |
| `click` | `selector` *(str)*, `text` *(str, opt)*, `attribute` *(str, opt)* | Click a matching element. Optional `text` fuzzy match. |
| `clickAll` | `selector` *(str)* | Click all elements matching the selector. |
| `login` **server: no** | `url`, `usernameSelector`, `username`, `passwordSelector`, `password`, `submitSelector`, `cookieName` *(str, opt)* | Full login flow with optional cookie reuse via `cookieName`. |
| `scrollWaitClick` | `selector` *(str)*, `ms` *(int, opt)* | Scroll into view, wait, then click. |

---

## 🌐 Browser Manipulation

| Action | Parameters | Description |
|--------|------------|-------------|
| `puppeteer` | `func` *(str)*, `func2` *(str, opt)*, … | Call a Puppeteer page method. Extra keys pass through (e.g. `url` for `goto`). |
| `newPage` | `pageKey` *(str)* | Open a tab and register it under `pageKey`. |
| `switchPage` | `pageKey` *(str)* | Set the active tab. |
| `closePage` | `pageKey` *(str)* | Close a tab. |
| `screenshot` **server: no** | `name` *(str)*, `type` *(`jpeg` \| `png`, opt)*, `fullPage` *(bool, opt)* | Save a viewport screenshot. |
| `screenshotElement` **server: no** | `name` *(str)*, `selector` *(str)*, `type` *(`jpeg` \| `png`, opt)* | Screenshot a single element. |
| `getElements` | `selector` *(str)*, `attribute` *(str, opt)* | Query all matches; result → `INPUT`. |
| `getChildren` | `selectorParent` *(str)*, `selectorChild` *(str)*, `attribute` *(str, opt)* | Query children under a parent; result → `INPUT`. |
| `elementExists` | `selector` *(str)* | Check DOM presence → `INPUT` (boolean). |

---

## 📂 Filesystem Orchestration

Paths are relative to the grab output root (`output/<grab-name>/`), set automatically at run start.

| Action | Parameters | Description |
|--------|------------|-------------|
| `setBaseDir` | `dir` *(str)* | Override base output directory (normally set by the engine). |
| `setCurrentDir` **server: no** | `dir` *(str)*, `useBaseDir` *(bool, opt)* | Change working directory. |
| `resetCurrentDir` | — | Reset working directory to base. |
| `backToParentDir` **server: no** | — | Move working directory up one level. |
| `createDir` **server: no** | `dir` *(str)*, `useBaseDir` *(bool, opt)* | Create a directory. |
| `deleteFolder` **server: no** | `foldername` *(str)* | Delete a folder recursively. |
| `listFolders` **server: no** | — | List folders in current dir → `INPUT`. |
| `createFile` **server: no** | `filename` *(str)*, `content` *(str, opt)* | Create a UTF-8 file. |
| `readFromText` **server: no** | `filename` *(str)*, `breakLine` *(bool, opt)* | Read file contents → `INPUT`. |
| `saveToText` **server: no** | `key` *(str)*, `filename` *(str)* | Write script memory value to file. |
| `appendToText` **server: no** | `key` *(str)*, `filename` *(str)* | Append script memory value to file. |
| `deleteFile` **server: no** | `filename` *(str)* | Delete a file. |
| `fileExists` **server: no** | `filename` *(str)* | Check file existence → `INPUT` (boolean). |
| `checkStringInFile` **server: no** | `filename` *(str)*, `string` *(str)* | Search file for string → `INPUT` (boolean). |
| `download` **server: no** | `url` *(str)*, `filename` *(str, opt)*, `host` *(str, opt)*, `showProgress` *(bool, opt)* | Download a URL to disk. |

---

## 🔀 Control Flow

Nested `actions` / `elseActions` values are arrays of action objects (same shape as root `actions`).

| Action | Parameters | Description |
|--------|------------|-------------|
| `if` | `condition` *(str)*, `actions` *(array)* | Run nested actions when condition is truthy. |
| `ifElse` | `condition` *(str)*, `actions` *(array)*, `elseActions` *(array)* | Conditional branch with else block. |
| `while` | `condition` *(str)*, `actions` *(array)* | Loop while condition is truthy. |
| `for` | `from` *(int)*, `until` *(int)*, `step` *(int, opt)*, `actions` *(array)* | Numeric loop (`step` defaults to `1`). |
| `forEach` | `key` *(str)*, `actions` *(array)* | Iterate array stored in script memory under `key`. |

---

## 🛠️ Utilities

| Action | Parameters | Description |
|--------|------------|-------------|
| `log` **server: no** | `message` *(str)*, `color` *(str, opt)*, `background` *(str, opt)* | Print a message. Always shown in CLI, even when `verbose: 0`. |
| `sleep` | `ms` *(int)* | Pause execution (max 300000 ms). |
| `random` | `min` *(int)*, `max` *(int)* | Random integer in range → `INPUT`. |
| `uuid` | — | Generate UUID → `INPUT`. |
| `sanitizeString` | `string` *(str)* | Strip invalid characters → `INPUT`. |
| `replaceString` | `string` *(str)*, `search` *(str)*, `replace` *(str)* | String replace → `INPUT`. |
| `matchFromString` | `string` *(str)*, `regex` *(str)* | First regex match → `INPUT`. |
| `matchFromSelector` | `selector` *(str)*, `regex` *(str)*, `attribute` *(str, opt)* | Regex matches on page content → `INPUT`. |
| `getExtension` | `string` *(str)* | File extension via `path.extname` → `INPUT`. |
| `userInput` **server: no** | `query` *(str)* | Prompt on stdin → `INPUT`. |

*For actions not covered here, see [Custom Actions](./custom-actions.md).*
