# Execution & Server Mode

**webGrabber** runs offline via the CLI or as an HTTP server that accepts grab payloads on `POST /grab`.

## Command Line (Local Mode)

Grab configs live in `grabs/` at the project root.

```bash
# Run all grabs sequentially
npm run start

# Run one grab by name
npm run start log-workflow
```

### Inspecting Grabs

```bash
npm run help
```

Lists grabs that have a `description` property.

### Quiet CLI output

Set `"verbose": 0` on a grab file to suppress internal engine output. The `log` action still prints. Ignored in server mode.

## Server Mode

```bash
npm run start:server
```

Default port `3000`; override with `PORT` in `.env`.

### `POST /grab`

- **Endpoint:** `POST http://localhost:3000/grab`
- **Body:** Full grab JSON (`name`, `actions`, optional `description`, `verbose`)
- **Rate limited** per IP

```bash
curl -X POST http://localhost:3000/grab \
  -H "Content-Type: application/json" \
  -d '{
        "name": "login-flow",
        "actions": [
          { "name": "setVariable", "params": { "key": "STATUS", "value": "ok" } },
          { "name": "getVariable", "params": { "key": "STATUS" } }
        ]
      }'
```

### Blocked actions in server runs

`POST /grab` runs set `brain.run.payloadId`. Actions registered with `{ serverBlocked: true }` throw `ActionError` and return HTTP 500.

Blocked: `userInput`, `log`, `screenshot`, `screenshotElement`, `login`, `setCurrentDir`, `backToParentDir`, `createDir`, `deleteFolder`, `deleteFile`, `listFolders`, `createFile`, `readFromText`, `saveToText`, `appendToText`, `fileExists`, `checkStringInFile`, `download`.

Still allowed: browser/interaction actions, variables, control flow, and utilities such as `sleep`, `random`, `matchFromSelector`. The engine still calls `setBaseDir` and `resetCurrentDir` internally on every run.

### Responses

**Success (`200`):** returns the final `INPUT` pipe value wrapped in `result`:

```json
{
  "result": "value from last action that wrote INPUT"
}
```

If nothing wrote `INPUT`, `result` is `undefined`/absent depending on the last step.

**Failure (`500`):** plain text body:

```
Internal Server Error
```

Structured error JSON, request IDs in the response body, and duration metadata are not returned to the client today. Failures are logged server-side via Winston.
