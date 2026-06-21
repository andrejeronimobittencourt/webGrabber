# Creating Grab Files

Grabs are the heart of **webGrabber**. A grab is a purely declarative definition (using JSON or YAML) of the steps required to achieve an automation outcome. By separating configuration from code, you can build modular, portable scraper flows.

## The Basic Structure

A grab file should be stored inside the `grabs/` directory. Root properties:

- `name` *(string, required)*: Unique identifier (letters, numbers, hyphens, underscores).
- `description` *(string, optional)*: Shown by `npm run help`.
- `importable` *(boolean, optional)*: Default `false`. When `true`, the grab can be called from other grabs with `runGrab` and used as an agent tool.
- `parameters` *(object, optional)*: Input definitions for importable grabs. Values passed via `runGrab` or agent tools are available as <code v-pre>{{paramName}}</code> inside the grab.
- `verbose` *(integer, optional)*: CLI output level. Default `1`. Use `0` to silence step output; `log` actions still print. Ignored in server mode.
- `actions` *(array, required)*: Sequential steps to execute.

### JSON Syntax

```json
{
  "name": "login-workflow",
  "description": "Navigates to the portal example.com",
  "actions": [
    {
      "name": "log",
      "params": {
         "message": "Initiating workflow..."
      }
    },
    {
      "name": "puppeteer",
      "await": true, 
      "params": {
        "func": "goto",
        "url": "https://example.com/"
      }
    }
  ]
}
```

*Note: The `await` Boolean flag exists on all actions and defaults to `true`. Setting it to `false` allows execution of the next step immediately without waiting for the current step's Promise to resolve.*

## Grab Output Directory

Each grab writes files under:

```
output/<grab-name>/
```

For example, a grab named `example-test` saves under `output/example-test/`. Filesystem actions use paths relative to that folder.

Place your grab configs in `grabs/` at the project root; generated artifacts land in `output/`, keeping source and run results separate.

### Context Passing & Memory Interpolation

webGrabber supports **memory interpolation**, so you can bind dynamic values into action parameters. Environment variables starting with `GRABBER_` are loaded at run start. Action outputs and variables you set can be referenced the same way.

#### Syntax Rule: <code v-pre>{{variableName}}</code>

Variables are enclosed in double curly braces <code v-pre>{{}}</code>. Any action parameter will be processed, and bindings will be injected right before that action runs.

```yaml
name: fetch-target
actions:
  # Imagine your OS sets GRABBER_TARGET_URL=https://google.com
  - name: puppeteer
    params:
      func: goto
      url: "{{TARGET_URL}}"
```

#### The `INPUT` Magic Variable

Some actions (like `getElements` or `matchFromSelector`) return a value at the end of their execution. This value implicitly binds to the `INPUT` variable, acting like a pipe payload for the heavily chained next action:

```json
{
  "name": "chaining-example",
  "actions": [
    {
      "name": "getVariable",
      "params": { "key": "SYSTEM_TOKEN" }
    },
    {
      "name": "log",
      "params": { 
        "message": "The token is: {{INPUT}}" 
      }
    }
  ]
}
```

## Script Memory & `INPUT`

Store values with `setVariable`, `getVariable`, and related actions. Reference them in later steps with <code v-pre>{{variableName}}</code>.

- **`INPUT`**: The pipe variable. Actions that return a result (e.g. `getElements`, `readFromText`) write their output here. It is overwritten each step — use it in the very next action if you need that value.

Avoid using `INPUT` as a long-lived variable name in `setVariable`; reserve it for step-to-step piping.

## Importable grabs and composition

By default, grabs are meant to be run directly from the CLI or server. Set `importable: true` to reuse a grab inside another grab or from agent mode:

```yaml
name: login-flow
description: Logs into the portal
importable: true
parameters:
  type: object
  properties:
    username:
      type: string
  required: [username]
  additionalProperties: false
actions:
  - name: log
    params:
      message: "Signing in as {{username}}"
```

Call it from another grab with the `runGrab` action:

```json
{
  "name": "runGrab",
  "params": {
    "grab": "login-flow",
    "params": {
      "username": "{{PORTAL_USER}}"
    }
  }
}
```

Importable grabs also appear as agent tools in [Agent Mode](./agent-mode.md).