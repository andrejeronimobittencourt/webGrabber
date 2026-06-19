# Building Custom Actions

While **webGrabber** bundles a dense array of [Built-in Actions](./actions.md) capable of achieving most heavy lifting, specialized pipelines often require tailored logic. webGrabber handles extensibility organically inside `src/config/customActions.js`.

## The `customActions.js` Engine Hook

The custom configurations module exports a function intercepting the underlying `Grabber` instance prior to browser initialization. Here, we can exploit the `addCustomAction` prototype.

**Basic Setup:**

```javascript
// src/config/customActions.js
export default (grabber) => {
	
  grabber.addCustomAction('complexMath', async (brain, page) => {
     const value = 12 * 4;
     console.log(`Computed ${value}`);
  })

}
```

## Referencing the Custom Action in Payload Grabs

Once an action is booted into the engine registry namespace, any JSON/YAML config dynamically links them identically to native hooks:

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

## Understanding the Internal Parameters

When your async callback block is invoked, the engine feeds your action two dense orchestrator objects:

### 1. `brain` (State Management Object)
The `brain` object exposes script memory and namespaced runtime state:
- **`brain.learn(key, value)` / `brain.recall(key)`**: Script variables and the `INPUT` pipe. Env vars prefixed with `GRABBER_` are synced into script memory at startup.
- **`brain.recall('INPUT')` / `brain.learn('INPUT', ...)`**: Fetch or mutate the pipe value from the immediately preceding action.
- **`brain.run.params`**: Params for the current action (from the grab file).
- **`brain.browser.pages` / `brain.browser.activePage`**: Open Puppeteer tabs and the focused page.
- **`brain.fs.baseDir` / `brain.fs.currentDir`**: Output root (`output/<grab-name>/`) and the active working subdirectory.

### 2. `page` (Puppeteer Frame Object)
Passes the active [Puppeteer Page](https://pptr.dev/api/puppeteer.page) reference pointing at the target window viewport context. Utilize native Puppeteer commands.

**Complex usage binding the entire paradigm:**

```javascript
export default (grabber) => {

  grabber.addCustomAction('extractAllDynamicPrices', async (brain, page) => {
    
    const { selectorKey } = brain.run.params
    const cssTarget = selectorKey || '.price'

    // 2. Perform native Puppeteer actions
    await page.waitForSelector(cssTarget, { timeout: 5000 });
    
    // 3. Extract custom data via Page evaluate
    const mappedPrices = await page.evaluate((sel) => {
       return Array.from(document.querySelectorAll(sel))
                   .map(node => node.textContent.trim());
    }, cssTarget);

    // 4. Overwrite global brain pipe state using .learn() for the next action to intercept
    brain.learn('INPUT', mappedPrices.join(','))
  })

}
```