<p align="center">
  <img src="assets/images/webGrabber.png" alt="webGrabber" width="300" height="300">
</p>

# <webGrabber/>

**webGrabber** is a heavily robust, config-based web scraper and browser automation tool built squarely on top of [Puppeteer](https://pptr.dev/). It allows you to describe scraping or automation tasks organically via cleanly structured, highly readable declarative **JSON** or **YAML** files ("Grabs") and sequentially pipe the runtime memory variables flawlessly between executed actions.

Runs can execute totally locally offline via the CLI or act as a lightweight, rate-limited HTTP server `/grab` endpoint engine API.

---

> [!TIP]
> **🚀 For the complete API reference, Custom Action tutorials, and architecture guides, view our [Official Documentation Website](https://andrejeronimobittencourt.github.io/webGrabber/).**
>
> *If you've cloned the repository, you can boot the live interactive documentation locally by typing `npm run docs:dev`.*

---

## Quick Setup Overview

### 1. Install Dependencies
```bash
npm install
```

### 2. Define a Grab Config
Create a new file under `src/grabs/hello.json`:
```json
{
  "name": "hello-world",
  "actions": [
    { "name": "log", "params": { "message": "Triggering logic..." } },
    { "name": "puppeteer", "params": { "func": "goto", "url": "https://example.com" } }
  ]
}
```

### 3. Dispatch the Grabber
```bash
npm run start hello-world
```

For advanced HTTP trigger modes (`npm run start:server`) or dynamic memory mapping (`{{variable}}`), read the full reference inside `./docs/`.

## Contributing & Extensibility
Extensibility sits at the absolute core of webGrabber. If you require advanced edge-case parsing or integrations beyond the generic library, see how simple it is to inject vanilla JS logic blocks using the [`src/config/custom.js`](./docs/guide/custom-actions.md) hooks engine.

Please refer to the [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md) prior to submitting issues or pull request patches.

## License
MIT