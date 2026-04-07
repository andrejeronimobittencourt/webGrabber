# Installation & Troubleshooting

**webGrabber** is powered by Node.js and heavily relies on [Puppeteer](https://pptr.dev/) under the hood to perform browser automation. Follow the steps below to integrate it seamlessly into your environment or run it securely via CLI.

## Prerequisites

Before installing the project, ensure that you have the following installed on your machine:
- **Node.js**: The project requires `v18.x` or later (verify with `node -v`).
- **npm**: Comes bundled with Node.js.

## Installing Dependencies

Clone the repository if you haven't already, traverse into the project directory, and install the modules:

```bash
git clone https://github.com/andrejeronimobittencourt/webGrabber.git
cd webGrabber
npm install
```

When you install webGrabber, npm will automatically fetch the core dependencies including Puppeteer, Express, and essential Puppeteer stealth plugins.

## Troubleshooting Puppeteer

Puppeteer downloads a local Chromium binary by default. Depending on your operating system (specifically macOS or certain slim Docker Linux images), this may fail or the binary might not mount correctly.

### Manually Installing Browsers (macOS/Linux)
If `npm start` throws errors complaining about "cannot find Chromium" or "Executable path is not specified":

```bash
npx puppeteer browsers install chrome
```

Alternatively, you can skip the automated browser download entirely by relying on your local Google Chrome installation. To do this, configure the `executablePath` in `src/config/options.js`:

```javascript
// src/config/options.js
export default {
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Path for macOS
  // executablePath: '/usr/bin/google-chrome-stable' // Path for Linux
}
```

### Missing System Dependencies (Headless Linux)

If you are running webGrabber in a barebones headless Linux environment (such as WSL or a slim Docker container), Puppeteer's executable may fail to start because of missing native GUI libraries. 

You can typically resolve this by installing the missing runtime fonts and system libraries. On Debian-based distributions (like Ubuntu), running the following command installs the most common dependencies needed to bridge headless Chromium:

```bash
sudo apt-get update && sudo apt-get install -y \
  ca-certificates fonts-liberation libappindicator3-1 libasound2 \
  libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
  lsb-release wget xdg-utils
```
*(Note: Exact package names and versions might slightly vary depending on your specific Linux distribution or release version).*

::: tip
For highly robust stealth usage (e.g. bypassing Captchas), point the `executablePath` directly to a fully-equipped Chrome installation rather than the bare Chromium.
:::