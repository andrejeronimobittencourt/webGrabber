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

Some actions cannot run over HTTP (filesystem prompts, screenshots, login cookies, etc.). They are marked **server: no** in the [actions reference](./actions.md). Using one in a `POST /grab` payload returns HTTP 500.

### Responses

**Success (`200`):** JSON body with the last action’s return value:

```json
{
  "result": "value from the final step"
}
```

**Failure (`500`):** plain text `Internal Server Error`. Check the server logs for details.
