# Awesome SDLC Dashboards

A curated catalog of dashboards and panels for **Software Development Lifecycle** metrics —
CI/CD pipelines, deployments, test results, cost, and more.

Browse it for inspiration when building your own observability setup,
or contribute entries to help the community.

> **Live catalog →** https://cdviz-dev.github.io/awesome-sdlc-dashboards

## What's inside

Each catalog entry is a directory under `catalog/` containing:

- an `index.yaml` with structured fields (title, kind, source, tags, links, …)
- screenshots referenced from the yaml

The site is a static HTML + Alpine.js page built by a Bun script. It offers:

- card view with thumbnails, defaulting to dashboards
- filters by **kind** (dashboard / panel), **panel type**, **topic**, **source**
- full-text search across titles, descriptions and tags
- lightbox for full-size screenshots
- dark mode

## Browse locally

```bash
mise run dev      # build + serve at http://localhost:1313
```

Or with plain bun:

```bash
bun install
bun run scripts/build.ts   # generates dist/
bun run scripts/serve.ts   # serves dist/ at http://localhost:3000
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Have an idea or a question before opening a PR? Start a thread in
[GitHub Discussions](https://github.com/cdviz-dev/awesome-sdlc-dashboards/discussions) first.

The short version — add a directory under `catalog/` and open a pull request:

```
catalog/
  your-entry-slug/
    index.yaml
    screenshot.png
```

With `index.yaml` like:

```yaml
# yaml-language-server: $schema=../../schema/entry.json
title: "My Dashboard"
kind: dashboard          # dashboard | panel
source: grafana          # github | grafana | datadog | cdviz | prometheus | …
links:
  - rel: source          # live | source | docs | demo | article
    url: https://...
tags:
  - topic:ci             # topic:ci | topic:cd | topic:testing | topic:security | …
  - my-tool
images:
  - screenshot.png
description: |
  What this dashboard shows and why it's useful.
```

Then open a pull request — the site is rebuilt and redeployed automatically on merge.

## Catalog structure

```
catalog/                   # one directory per entry
  <slug>/
    index.yaml             # fields + markdown description
    screenshot.png         # primary screenshot (first = thumbnail)
    screenshot-*.png       # additional screenshots (shown in lightbox)

scripts/
  build.ts                 # reads catalog/, emits dist/
  serve.ts                 # dev server for dist/
  validate.ts              # validates entries against schema/entry.json

.github/workflows/
  publish.yml              # build + deploy to GitHub Pages on push to main
```

## Sponsoring

Sponsored by [CDviz](https://cdviz.dev) — open-source SDLC observability built on [CDEvents](https://cdevents.dev).

## License

Content is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Code is licensed under [Apache 2.0](LICENSE).
