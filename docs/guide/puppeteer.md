# Puppeteer Configuration

Browser launch settings live in `src/config/puppeteerOptions.js`.

## Headless vs headful

By default Puppeteer launches Chrome **headless** (no visible window). To watch the browser in real time — useful when debugging grabs or [agent mode](./agent-mode.md) — set:

```javascript
export default {
  headless: false,
}
```

When you omit a custom `viewport`, webGrabber defaults to `defaultViewport: null` so the page matches the window size in headful mode.

## Launch options

The file exports a plain object with [Puppeteer launch options](https://pptr.dev/api/puppeteer.launchoptions):

```javascript
// src/config/puppeteerOptions.js
export default {
  headless: 'new', // Using the modern Chrome headless pipeline
  args: ['--no-sandbox', '--disable-setuid-sandbox'], // Prevent Docker permission issues
  executablePath: '/usr/bin/google-chrome-stable',
  viewport: { width: 1920, height: 1080 }
}
```

### Stealth and ad blocking

Add these optional top-level flags to the same file:

- `stealth`: When `true`, reduces common bot-detection signals.
- `adblocker`: When `true`, blocks ads and trackers to speed up page loads.

**Example for high-anon workflows:**

```javascript
// src/config/puppeteerOptions.js
export default {
  headless: false, // Run headful for maximum bot-detection bypass 
  args: [
     '--disable-web-security',
     '--disable-features=IsolateOrigins,site-per-process'
  ],
  stealth: true,
  adblocker: true
};
```

::: warning
Rethink using headless environments if scraping enterprise protection endpoints. Often running headful and tweaking viewport size is the best way to circumvent heavy heuristics.
:::