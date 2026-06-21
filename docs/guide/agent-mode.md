# Agent Mode

**webGrabber** can run browser tasks from natural-language instructions using a local [Ollama](https://ollama.com/) model. Use agent mode for one-off or exploratory work; use [Grab Files](./grab-files.md) when you need repeatable JSON/YAML flows.

## Prerequisites

Before running agent mode, ensure the following:

- **Ollama** is installed and running locally.
- Models are available locally, for example:

```bash
ollama pull gemma4:latest
# if using a separate vision model:
ollama pull minicpm-v4.6:latest
```

- **Puppeteer/Chrome** is set up for your environment (see [Installation & Troubleshooting](./installation.md)).

Agent mode uses the same Puppeteer launch options as grab mode (`src/config/puppeteerOptions.js`).

::: tip Watching the browser
Puppeteer runs headless by default unless you change it. To watch the agent work in a real Chrome window, set `headless: false` in `src/config/puppeteerOptions.js`. See [Puppeteer Configuration](./puppeteer.md).
:::

## Command Line

```bash
npm run start:agent "Go to https://example.com and return the h1 text"
```

Write instructions as you would ask a person: where to go, what to search or click, and exactly what to return (for example “return the price text”, not “find the price”).

### Export a grab from a run

```bash
npm run start:agent:export example-h1 "Go to https://example.com and return the h1 text"
```

Grab name first, then the instruction in quotes. The file is written to `grabs/<grab-name>.json` with your instruction as `description`.

To replace an existing grab:

```bash
npm run start:agent:export:overwrite example-h1 "Go to https://example.com and return the h1 text"
```

Replay it:

```bash
npm run start example-h1
```

## Configuration

Agent settings use the `AGENT_*` prefix.

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_REASON_MODEL` | `gemma4:latest` | Ollama model that runs the agent |
| `AGENT_VISION_MODEL` | reason model | Model for screenshot analysis when vision is enabled |
| `AGENT_OLLAMA_URL` | `http://localhost:11434/v1` | OpenAI-compatible Ollama API base URL |
| `AGENT_VISION` | `false` | Set to `true` to analyze page screenshots (helpful on complex layouts) |
| `AGENT_ALLOWED_HOSTS` | empty | Comma-separated host allowlist for navigation; empty allows all hosts |
| `AGENT_MAX_STEPS` | `30` | Maximum steps before the run stops |
| `AGENT_CACHE_OBSERVATIONS` | `true` | Cache page observations between steps |
| `AGENT_REASON_THINKING` | `false` | Enable extended reasoning on supported models |
| `AGENT_REASONING_EFFORT` | `medium` | Reasoning depth when thinking is enabled: `high`, `medium`, `low`, or `max` |

Example `.env` with separate reason and vision models:

```bash
AGENT_REASON_MODEL=gemma4:latest
AGENT_VISION_MODEL=minicpm-v4.6:latest
AGENT_VISION=true
AGENT_OLLAMA_URL=http://localhost:11434/v1
AGENT_ALLOWED_HOSTS=example.com,github.com
```

Example using one vision-capable model for both:

```bash
AGENT_REASON_MODEL=minicpm-v4.6:latest
AGENT_VISION=true
```

Inline override:

```bash
AGENT_ALLOWED_HOSTS=example.com npm run start:agent "Summarize example.com"
```

## Agent Mode vs Grabs

| Agent mode | Grabs |
|------------|-------|
| Natural-language instructions | Declarative JSON/YAML configs |
| Best for exploration and ad-hoc tasks | Best for CI, cron jobs, and replay |
| Depends on your local Ollama model | Deterministic and fast |

When an agent run works well, export it with `npm run start:agent:export` or build a grab manually and run it with `npm run start <grab-name>`.

## Importable grab tools

Grabs marked `importable: true` in [Grab Files](./grab-files.md) are available to the agent as tools named `grab_<grab-name>` (hyphens become underscores, e.g. `login-flow` → `grab_login_flow`).

Add optional `parameters` on the grab when the agent needs to pass inputs.

Importable [custom actions](./custom-actions.md) are available as agent tools under their action name.
