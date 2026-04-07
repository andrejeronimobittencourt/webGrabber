# Execution & Server Mode

**webGrabber** features a deeply robust architecture allowing runtime logic to either execute offline, sequentially, or run on a dedicated HTTP backend listening for payload events. 

## Command Line Standard (Local Mode)

If you have grab payload configs nested correctly directly under `src/grabs/`, executing a run is straightforward. 

```bash
# Execute *all* JSON/YAML configs sequentially
npm run start 

# Target only a specific grab named log-workflow
npm run start log-workflow
```

### Inspecting Grabs via CLI

If you have assigned a `description` property to your grab configurations, you can easily inspect your library of automation flows from the terminal:

```bash
# Lists all registered grabs & their descriptions
npm run help
```

## Running the Server backend

If you wish to spin up a standalone container or a microservice acting exclusively as a scrape-engine API, webGrabber provides an optimized Express web server. This server dynamically registers payloads via HTTP `POST`.

```bash
npm run start:server
# Server started on port 3000
```
*(Optionally modify port binding by assigning `PORT=8080` in `.env`)*

### Sending Requests to the Engine

The server exposes a main route at `/grab`. 
- **Endpoint:** `POST http://localhost:3000/grab`
- **Rate Limited:** The IP-level rate-limiter prevents spamming bots.
- **Payload Schema:** Requires dynamic JSON mapping directly to `name` & `actions`.

Executing the engine using `cURL`:

```bash
curl -X POST http://localhost:3000/grab \
  -H "Content-Type: application/json" \
  -d '{
        "name": "login-flow",
        "actions": [
          { "name": "log", "params": { "message": "Triggered via HTTP!" } }
        ]
      }'
```

### Response Mapping

The request evaluates the browser flow, awaits execution closure, and replies natively with a detailed schema documenting duration lengths, metadata payloads, extracted memory outputs (`INPUT`), and potential parsing errors.

```json
{
  "id": "e88d1d87-5b65-4f0e-bdf7-e17f2bc29255",
  "grabName": "login-flow",
  "status": "success",
  "duration": 1250 
}
```

> [!INFO] Roadmap
> Extended return information, custom return typings, and deeper nested payloads sent back through the API response are officially planned for the future roadmap. Currently, server return topologies are functionally limited to the basic schema documented above!