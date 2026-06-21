# Building Custom Actions

When [built-in actions](./actions.md) are not enough, register your own in `src/config/customActions.js` and call them from grab files like any other action.

## Register an action

```javascript
// src/config/customActions.js
export default (grabber) => {
  grabber.addCustomAction('complexMath', async (brain, page) => {
    const value = 12 * 4;
    console.log(`Computed ${value}`);
  });
};
```

Set `importable: true` to make a custom action available in agent mode:

```javascript
grabber.addCustomAction(
  'fetchToken',
  async (brain, page) => {
    brain.learn('INPUT', 'token-value');
  },
  {
    importable: true,
    description: 'Fetch an API token from the current session',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
);
```

## Use it in a grab

```json
{
  "name": "test-custom",
  "actions": [
    {
      "name": "complexMath",
      "params": {}
    }
  ]
}
```

## Callback arguments

Each custom action receives:

### `brain` — script memory and run context

- **`brain.learn(key, value)` / `brain.recall(key)`** — read and write script variables (same keys you use with <code v-pre>{{key}}</code> in grabs).
- **`brain.recall('INPUT')` / `brain.learn('INPUT', ...)`** — read or set the value passed from the previous action.
- **`brain.run.params`** — parameters from the current grab step.
- **`brain.browser.pages` / `brain.browser.activePage`** — open tabs and the active page.
- **`brain.fs.baseDir` / `brain.fs.currentDir`** — output folder for the current grab run.

### `page` — active Puppeteer page

The focused browser tab. Use normal [Puppeteer Page](https://pptr.dev/api/puppeteer.page) APIs.

## Example: extract and pass data forward

```javascript
export default (grabber) => {
  grabber.addCustomAction('extractAllDynamicPrices', async (brain, page) => {
    const { selectorKey } = brain.run.params;
    const cssTarget = selectorKey || '.price';

    await page.waitForSelector(cssTarget, { timeout: 5000 });

    const mappedPrices = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel))
        .map((node) => node.textContent.trim());
    }, cssTarget);

    brain.learn('INPUT', mappedPrices.join(','));
  });
};
```

The next grab action can use <code v-pre>{{INPUT}}</code> or a follow-up action that reads `INPUT`.
