# Puppeteer Configuration

Since **webGrabber** entirely orchestrates the `puppeteer.launch()` mechanics for you, configuration takes place in a dedicated module file rather than hidden deep in standard CLI flags. 

The configuration source of truth resides entirely in `src/config/options.js`.

## Structuring the Options payload

The file exports a plain JavaScript object precisely mimicking the [Puppeteer LaunchOptions Object](https://pptr.dev/api/puppeteer.launchoptions).

```javascript
// src/config/options.js
export default {
  headless: 'new', // Using the modern Chrome headless pipeline
  args: ['--no-sandbox', '--disable-setuid-sandbox'], // Prevent Docker permission issues
  executablePath: '/usr/bin/google-chrome-stable',
  viewport: { width: 1920, height: 1080 }
}
```

### Enabling Core Plugins

A primary reason webGrabber passes launch options this way instead of a flat JSON configuration is because you have the programmatic flexibility to enable stealth and ad-blockers dynamically.

Under the hood, webGrabber leverages `puppeteer-extra`. You can toggle two specific boolean keys at the top-level of the exported object:

- `stealth`: When `true`, enables `puppeteer-extra-plugin-stealth` avoiding most bot detection logic like re-CAPTCHA.
- `adblocker`: When `true`, enables `puppeteer-extra-plugin-adblocker` significantly reducing loading speed overhead and bandwidth.

**Example for high-anon workflows:**

```javascript
// src/config/options.js
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
