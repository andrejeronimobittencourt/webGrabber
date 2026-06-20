# Execution & Server Mode

**webGrabber** runs offline via the CLI or as an HTTP server that accepts grab payloads on `POST /grab`.

## Command Line (Local Mode)

Grab configs live in `grabs/` at the project root.

```bash
# Run all grabs sequentially
npm run start

# Run one grab by name
npm run start login-flow
```

### Inspecting Grabs

```bash
npm run help
```

Lists grabs that have a `description` property.

## Server Mode

```bash
npm run start:server
```

Default port `3000`; override with `PORT` in `.env`.

### `POST /grab`

- **Endpoint:** `POST http://localhost:3000/grab`
- **Body:** Full grab JSON (`name`, `actions`, optional `description`)

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
