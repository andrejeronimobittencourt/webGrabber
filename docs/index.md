---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "<webGrabber/>"
  text: "Config-based web scraper & automation tool"
  tagline: Declare your automation logic as JSON/YAML grabs and run everywhere.
  image:
    src: /webgrabber_logo.png
    alt: webGrabber Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/installation
    - theme: alt
      text: View Actions
      link: /guide/actions
    - theme: alt
      text: View on GitHub
      link: https://github.com/andrejeronimobittencourt/webGrabber

features:
  - title: Declarative Grabs
    details: Author scraping or automation workflows as simple JSON or YAML files in `src/grabs`.
  - title: Reusable Actions
    details: Chain robust built-in actions for navigation, extraction, and filesystem interactions.
  - title: Powerful Interpolation
    details: Inject runtime environment variables dynamically with the `{{variable}}` syntax.
  - title: Headless Server Mode 
    details: Run on a lightweight HTTP server to execute HTTP `POST /grab` triggers on demand.
---
