# WebGrabber Actions Reference

This document is auto-generated from the verified Zod schemas. All parameters are strictly validated.

## Variables

| Action | Parameters | Description |
|--------|------------|-------------|
| `appendToVariable` | `key: string, value?: string` |  |
| `countDecrement` | `key: string` |  |
| `countIncrement` | `key: string` |  |
| `countStart` | `key: string, value?: string` |  |
| `deleteVariable` | `key: string` |  |
| `getVariable` | `key: string, index?: string` |  |
| `setVariable` | `key: string, value?: string` |  |
| `transferVariable` | `from: string, to: string, index?: string, key?: string` |  |

## Interaction

| Action | Parameters | Description |
|--------|------------|-------------|
| `click` | `selector: string, attribute?: string, text?: string` |  |
| `clickAll` | `selector: string` |  |
| `login` | `url: string, usernameSelector: string, username: string, passwordSelector: string, password: string, submitSelector: string, cookieName?: string` |  |
| `scrollWaitClick` | `selector: string, ms?: string` |  |
| `type` | `selector: string, text: string, secret?: string` |  |

## Browser

| Action | Parameters | Description |
|--------|------------|-------------|
| `closePage` | `pageKey: string` |  |
| `elementExists` | `selector: string` |  |
| `getChildren` | `selectorParent: string, selectorChild: string, attribute?: string` |  |
| `getElements` | `selector: string, attribute?: string` |  |
| `newPage` | `pageKey: string` |  |
| `puppeteer` | `func: string, func2?: string` |  |
| `screenshot` | `name: string, type?: string, fullPage?: string` |  |
| `screenshotElement` | `name: string, selector: string, type?: string` |  |
| `switchPage` | `pageKey: string` |  |

## Filesystem

| Action | Parameters | Description |
|--------|------------|-------------|
| `appendToText` | `key: string, filename: string` |  |
| `backToParentDir` | `None` |  |
| `checkStringInFile` | `filename: string, string: string` |  |
| `createDir` | `dir: string, useBaseDir?: string` |  |
| `createFile` | `filename: string, content?: string` |  |
| `deleteFile` | `filename: string` |  |
| `deleteFolder` | `foldername: string` |  |
| `download` | `url: string, filename?: string, host?: string, showProgress?: string` |  |
| `fileExists` | `filename: string` |  |
| `listFolders` | `None` |  |
| `readFromText` | `filename: string, breakLine?: string` |  |
| `resetCurrentDir` | `None` |  |
| `saveToText` | `key: string, filename: string` |  |
| `setBaseDir` | `dir: string` |  |
| `setCurrentDir` | `dir: string, useBaseDir?: string` |  |

## Control Flow

| Action | Parameters | Description |
|--------|------------|-------------|
| `forEach` | `key: string, actions: string` |  |
| `for` | `from: number, until: number, step?: string, actions: string` |  |
| `ifElse` | `condition: string, actions: string, elseActions: string` |  |
| `if` | `condition: string, actions: string` |  |
| `while` | `condition: string, actions: string` |  |

## Utilities

| Action | Parameters | Description |
|--------|------------|-------------|
| `getExtension` | `string: string` |  |
| `log` | `message: string, color?: string, background?: string` |  |
| `matchFromSelector` | `selector: string, regex: string, attribute?: string` |  |
| `matchFromString` | `string: string, regex: string` |  |
| `random` | `min: number, max: number` |  |
| `replaceString` | `string: string, search: string, replace: string` |  |
| `sanitizeString` | `string: string` |  |
| `sleep` | `ms: number` |  |
| `userInput` | `query: string` |  |
| `uuid` | `None` |  |

