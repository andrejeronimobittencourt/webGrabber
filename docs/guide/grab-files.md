# Creating Grab Files

Grabs are the heart of **webGrabber**. A grab is a purely declarative definition (using JSON or YAML) of the steps required to achieve an automation outcome. By separating configuration from code, you can build modular, portable scraper flows.

## The Basic Structure

A grab file should be stored inside the `src/grabs/` directory. Each file requires two core properties:
- `name` (string): A unique identifier for the payload.
- `actions` (array): A sequential array of automation steps to execute.

### JSON Syntax

```json
{
  "name": "login-workflow",
  "actions": [
    {
      "name": "log",
      "params": {
         "message": "Initiating workflow..."
      }
    },
    {
      "name": "puppeteer",
      "params": {
        "func": "goto",
        "url": "https://example.com/login"
      }
    }
  ]
}
```

### Context Passing & Memory Interpolation

webGrabber introduces **memory interpolation**, allowing dynamic runtime bindings. Env variables starting with `GRABBER_` are automatically flushed into memory. Additionally, in-flight action outputs and set variables can be referenced seamlessly.

#### Syntax Rule: `{{variableName}}`

Variables are enclosed in double curly braces `{{}}`. Any action parameter will be processed, and bindings will be injected right before that action runs.

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

## Reserved Keywords

It's highly recommended you abstain from mutating the following memory keywords:
- `INPUT`: Pipe variable, overridden every step.
- `PARAMS`: Run metadata and payloads.
- `PAYLOAD_ID`: Unique runtime ID.
- `CURRENT_DIR` & `BASE_DIR`: Flow filesystem awareness.
- `PAGES` & `ACTIVE_PAGE`: Browser tab management flags.
