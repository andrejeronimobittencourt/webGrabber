<p align="center">
  <img src="assets/images/webGrabber.png" alt="webGrabber" width="300" height="300">
</p>

# webGrabber

webGrabber is a config-based web scraper and browser automation tool powered by Puppeteer. It lets you describe scraping or automation tasks as declarative “grabs” (JSON or YAML) that chain reusable actions. Runs can execute locally or via a lightweight HTTP server, with flexible environment variable injection and memory interpolation to keep configurations portable.

## Table of Contents
- [webGrabber](#webgrabber)
	- [Table of Contents](#table-of-contents)
	- [Features](#features)
	- [Prerequisites](#prerequisites)
	- [Installation](#installation)
	- [Quickstart](#quickstart)
		- [Create a grab](#create-a-grab)
		- [Run locally](#run-locally)
		- [Run a specific grab](#run-a-specific-grab)
		- [Run in server mode](#run-in-server-mode)
	- [Grab Configuration Reference](#grab-configuration-reference)
		- [Memory interpolation](#memory-interpolation)
		- [Returning values between actions](#returning-values-between-actions)
		- [Reserved variable names](#reserved-variable-names)
	- [Actions](#actions)
		- [Built-in actions](#built-in-actions)
		- [Custom actions](#custom-actions)
	- [Environment Variables](#environment-variables)
	- [Puppeteer Options](#puppeteer-options)
	- [Chromium and Browser Path](#chromium-and-browser-path)
	- [License](#license)

## Features
- **Declarative grabs:** Author scraping or automation workflows as JSON/YAML files in `src/grabs`.
- **Reusable actions:** Chain built-in actions for navigation, extraction, and logging, or add custom actions to extend behavior.
- **Memory interpolation:** Inject environment-derived values (`GRABBER_*`) directly into configs with `{{variable}}` syntax.
- **Local and server modes:** Execute all grabs locally or expose a `/grab` HTTP endpoint for on-demand runs.
- **Per-run flexibility:** Target specific grabs, pass request payloads, and use returned values across action steps.

## Prerequisites
- Node.js (version defined in the project `.nvmrc` or your system Node 18+ recommended)
- npm (bundled with Node)
- Chromium/Chrome available to Puppeteer (see [Chromium and Browser Path](#chromium-and-browser-path))

## Installation
Install dependencies from the project root:

```bash
npm install
```

## Quickstart

### Create a grab
Place a JSON, YML, or YAML file in `src/grabs`. The `name` becomes the grab identifier, and `actions` is an ordered list of steps.

**hello-world.json**
```json
{
  "name": "hello-world",
  "actions": [
    {
      "name": "log",
      "params": {
        "message": "Hello World!"
      }
    }
  ]
}
```

**hello-world.yml**
```yml
name: hello-world
actions:
  - name: log
    params:
      message: "Hello World!"
```

### Run locally
Execute every grab located in `src/grabs`:

```bash
npm run start
```

### Run a specific grab
Target one grab by name:

```bash
npm run start hello-world
```

### Run in server mode
Start the HTTP server to accept grab configurations via POST requests. The server listens on `PORT` (default `3000`).

```bash
npm run start:server
```

Send a JSON grab configuration to trigger a run:

- **Endpoint:** `POST /grab`
- **Payload:** Grab configuration JSON (same shape as files in `src/grabs`).

Example (using `curl`):
```bash
curl -X POST http://localhost:3000/grab \
  -H "Content-Type: application/json" \
  -d '{"name":"hello-world","actions":[{"name":"log","params":{"text":"Hello World!"}}]}'
```

## Grab Configuration Reference

### Memory interpolation
Environment variables prefixed with `GRABBER_` are loaded into memory and accessible in grab files using `{{variable}}` syntax. Define them in a `.env` file at the project root or your shell environment. Actions can also create or update variables during a run (for example, via `setVariable`, `appendToVariable`, or counter actions), and those variables can be interpolated in later steps with the same `{{variable}}` syntax. Each action’s parameters are re-evaluated for interpolation at runtime, so newly learned values are immediately available to subsequent steps.

### Returning values between actions
Actions can return values for downstream steps using the `INPUT` keyword. Each subsequent action can reference `INPUT` to consume the previous action's output.

### Reserved variable names
Use these identifiers with care in configs, as they are managed by the runtime:

- `INPUT`
- `PARAMS`
- `INDENTATION`
- `CURRENT_DIR`
- `BASE_DIR`
- `PAYLOAD_ID`
- `PAGES`
- `ACTIVE_PAGE`

## Actions

### Built-in actions
Browse the catalog of available actions and their parameters in [Actions](src/classes/actions/README.md).

### Custom actions
Extend behavior by defining actions in [`src/config/custom.js`](src/config/custom.js). Custom actions can be referenced from grab files like built-ins.

## Environment Variables
Place a `.env` file in the project root or export variables in your shell. All variables with the `GRABBER_` prefix are automatically loaded into memory and available for [memory interpolation](#memory-interpolation).

## Puppeteer Options
Configure Puppeteer launch settings in [`src/config/options.js`](src/config/options.js). The exported object is passed directly to `puppeteer.launch` and supports [all Puppeteer launch options](https://pptr.dev/api/puppeteer.launchoptions). Example:

```js
export default {
  headless: 'new',
  args: ['--no-sandbox'],
  executablePath: '/path/to/Chrome',
  viewport: { width: 1280, height: 720 },
  stealth: true, // enables puppeteer-extra-plugin-stealth
  adblocker: true, // enables puppeteer-extra-plugin-adblocker
};
```

`stealth` and `adblocker` toggle the corresponding `puppeteer-extra` plugins before launching the browser. Any keys not needed by your setup can be removed; the file is the single place to adapt Puppeteer to your environment.

## Chromium and Browser Path
If Puppeteer cannot find Chromium on macOS, install it explicitly:

```bash
npx puppeteer browsers install chrome
```

Alternatively, set the executable path in [`src/config/options.js`](src/config/options.js):

```js
export default {
  executablePath: '/path/to/Chrome',
};
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
