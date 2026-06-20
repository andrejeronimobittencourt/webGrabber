# Creating Grab Files

Grabs are the heart of **webGrabber**. A grab is a purely declarative definition (using JSON or YAML) of the steps required to achieve an automation outcome. By separating configuration from code, you can build modular, portable scraper flows.

## The Basic Structure

A grab file should be stored inside the `grabs/` directory. Root properties:

- `name` *(string, required)*: Unique identifier (letters, numbers, hyphens, underscores).
- `description` *(string, optional)*: Shown by `npm run help`.
- `verbose` *(integer, optional)*: CLI output level. Default `1`. Use `0` to silence engine output; `log` actions still print. Ignored in server mode.
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

When a grab runs, the engine automatically calls `setBaseDir` using the grab's `name`. All filesystem actions resolve relative to:

```
output/<grab-name>/
```

For example, a grab named `example-test` writes files under `output/example-test/`.

Place your grab configs in `grabs/` at the project root; generated artifacts land in `output/`, keeping source and run results separate.

### Context Passing & Memory Interpolation

webGrabber introduces **memory interpolation**, allowing dynamic runtime bindings. Env variables starting with `GRABBER_` are automatically flushed into memory. Additionally, in-flight action outputs and set variables can be referenced seamlessly.

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

Grab scripts store user-defined variables via `setVariable`, `getVariable`, and related actions. These live in script memory and are accessed with `brain.learn()` / `brain.recall()` in custom actions, or via <code v-pre>{{variableName}}</code> interpolation in grab configs.

- **`INPUT`**: The pipe variable. Actions that produce a result (e.g. `getElements`, `readFromText`) write their output here. It is overwritten each step — chain it immediately in the next action if you need the value.

Engine runtime state (browser tabs, filesystem paths, verbose level, action params) is **not** stored in script memory. It lives on namespaced brain properties (`brain.browser`, `brain.fs`, `brain.presenter`, `brain.run`) and is managed internally by the engine.

Avoid using `INPUT` as a long-lived variable name in `setVariable` — reserve it for step-to-step piping.