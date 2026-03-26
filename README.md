# Awesome SDLC Dashboards

A curated catalog of dashboards and panels for **Software Development Lifecycle** metrics —
CI/CD pipelines, deployments, test results, cost, and more.

Browse it for inspiration when building your own observability setup,
or contribute entries to help the community.

> **Live catalog →** https://cdviz-dev.github.io/awesome-sdlc-dashboards

## What's inside

Each catalog entry is a directory under `catalog/` containing:

- an `index.md` with structured front matter (title, kind, source, tags, …)
- screenshots in an `images/` sub-directory

The site is a static HTML + Alpine.js page built by a Bun script. It offers:

- card view with thumbnails
- filters by **kind** (dashboard / panel), **panel type**, **category**, **source**
- full-text search across titles, descriptions and tags
- lightbox for full-size screenshots
- dark mode

## Browse locally

```bash
mise run dev      # build + serve at http://localhost:3000
```

Or with plain bun:

```bash
bun install
bun run scripts/build.ts   # generates dist/
bun run scripts/serve.ts   # serves dist/ at http://localhost:3000
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

The short version — add a directory under `catalog/`:

```
catalog/
  your-entry-slug/
    index.md
    images/
      screenshot.png
```

With `index.md` front matter like:

```yaml
---
title: "My Dashboard"
kind: dashboard          # dashboard | panel
category: ci             # ci | cd | testing | security | quality | cost | deployment | incident
source: grafana          # github | grafana | datadog | cdviz | prometheus | …
source_url: https://...
tags:
  - my-tool
  - my-metric
images:
  - screenshot.png
---

What this dashboard shows and why it's useful.
```

Then open a pull request — the site is rebuilt and redeployed automatically on merge.

## Catalog structure

```
catalog/                   # one directory per entry
  <slug>/
    index.md               # front matter + markdown description
    images/
      screenshot.png       # primary screenshot (first = thumbnail)
      *.png                # additional screenshots (shown in lightbox)

public/                    # static site source
  index.html
  style.css

scripts/
  build.ts                 # reads catalog/, emits dist/
  serve.ts                 # dev server for dist/

.github/workflows/
  publish.yml              # build + deploy to GitHub Pages on push to main
```

## License

Content is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Code is licensed under [Apache 2.0](LICENSE).
