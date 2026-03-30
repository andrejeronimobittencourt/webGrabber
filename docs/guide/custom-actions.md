# Building Custom Actions

While **webGrabber** bundles a dense array of [Built-in Actions](./actions.md) capable of achieving most heavy lifting, specialized pipelines often require tailored logic. webGrabber handles extensibility organically inside `src/config/custom.js`.

## The `custom.js` Engine Hook

The custom configurations module exports a function intercepting the underlying `Grabber` instance prior to browser initialization. Here, we can exploit the `addCustomAction` prototype.

**Basic Setup:**

```javascript
// src/config/custom.js
export default (_grabber) => {
	
  _grabber.addCustomAction('complexMath', async (brain, page) => {
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
The `brain` object is an expansive proxy mapping memory states. You retrieve environment outputs or step `INPUT` via standard JS properties.
- **`brain.PARAMS`**: Access params parsed strictly from your grab file. Use this to read config flags.
- **`brain.INPUT`**: Fetch the pipe value outputted by the immediately preceding action.
- **`brain.PAGE_ID`**: Identifier string tracking execution context.

### 2. `page` (Puppeteer Frame Object)
Passes the active [Puppeteer Page](https://pptr.dev/api/puppeteer.page) reference pointing at the target window viewport context. Utilize native Puppeteer commands.

**Complex usage binding the entire paradigm:**

```javascript
export default (_grabber) => {

  _grabber.addCustomAction('extractAllDynamicPrices', async (brain, page) => {
    
    // 1. Read strict parameter metadata
    const cssTarget = brain.PARAMS.selectorKey || ".price";

    // 2. Perform native Puppeteer actions bypassing action wrappers
    await page.waitForSelector(cssTarget, { timeout: 5000 });
    
    // 3. Extract custom data via Page evaluate
    const mappedPrices = await page.evaluate((sel) => {
       return Array.from(document.querySelectorAll(sel))
                   .map(node => node.textContent.trim());
    }, cssTarget);

    // 4. Overwrite global brain pipe state for the next action to intercept
    brain.INPUT = mappedPrices.join(","); 
  })

}
```
