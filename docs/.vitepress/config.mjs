import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "<webGrabber/>",
  description: "Config based web scraper & browser automation",
  base: "/webGrabber/",
  themeConfig: {
    logo: '/logo.svg', // Will be added later if needed, users logo description here
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/guide/installation' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Creating Grab Files', link: '/guide/grab-files' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Puppeteer Configuration', link: '/guide/puppeteer' },
          { text: 'Server Mode', link: '/guide/server-mode' }
        ]
      },
      {
        text: 'Actions API',
        items: [
          { text: 'Built-in Actions', link: '/guide/actions' },
          { text: 'Custom Actions', link: '/guide/custom-actions' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/andrejeronimobittencourt/webGrabber' }
    ],
    search: {
      provider: 'local'
    }
  }
})
