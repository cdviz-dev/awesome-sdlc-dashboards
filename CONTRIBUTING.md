# Contributing to Awesome SDLC Dashboards

Thank you for helping grow this catalog! Every dashboard or panel you add helps other teams
build better observability around their software delivery.

## Adding a new entry

### 1. Create the entry directory

Each entry lives in its own directory under `catalog/`:

```
catalog/
  your-entry-slug/
    index.md
    images/
      screenshot.png
      screenshot-detail.png   # optional: multiple images are supported
```

Choose a slug that is lowercase, hyphen-separated, and descriptive
(e.g., `github-actions-usage-by-repository`, `grafana-dora-lead-time`).

### 2. Write `index.md`

Copy this template and fill it in:

```markdown
---
title: "Your Dashboard or Panel Title"
kind: dashboard          # dashboard | panel
panel_type:              # panels only — stat | table | timeseries | bar | gauge | heatmap | piechart | text | ...
source: github           # github | grafana | datadog | cdviz | prometheus | loki | jaeger | ...
links:
  - rel: live            # live | source | docs | demo | article
    url: https://...
tags:
  - topic:ci             # use topic:<domain> for high-level classification (see below)
  - your-tag
  - another-tag
images:
  - images/screenshot.png
related_dashboard:       # panels only — slug of the parent dashboard entry (if it exists)
---

Short paragraph describing what this dashboard/panel shows and why it is useful.

More detail if needed — what data sources it needs, what questions it helps answer,
any interesting interactions or filters.
```

#### Field reference

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | Display name shown on the card |
| `kind` | Yes | `dashboard` or `panel` |
| `panel_type` | Panels only | Chart type: `stat`, `table`, `timeseries`, `bar`, `gauge`, `heatmap`, `piechart`, `text`, … |
| `source` | Recommended | Where it comes from: `github`, `grafana`, `datadog`, `cdviz`, `prometheus`, … |
| `links` | Recommended | List of `{rel, url}` — see rel values below |
| `tags` | Recommended | Keywords for search and filtering. Use `topic:<domain>` for high-level classification (see below) |
| `images` | Recommended | List of image paths relative to the entry directory |
| `related_dashboard` | Optional | Slug of the parent dashboard (for panel entries) |

### 3. Add screenshots

Put images in `catalog/your-entry-slug/images/`.

- **Format**: PNG or JPEG (PNG preferred for screenshots)
- **Size**: aim for ≥ 800 px wide; the catalog will display them at card size
- **Naming**: `screenshot.png` for the primary image, `screenshot-*.png` for extras
- The first image in the `images:` list is used as the thumbnail

### 4. Test locally

```bash
bun install
bun run build   # generates dist/
bun run dev     # builds then serves at http://localhost:3000
```

### 5. Open a pull request

- One entry per PR is easiest to review, but batching related entries (e.g., all panels for one dashboard) is fine
- The PR title should summarise what you're adding: `add: GitHub Actions - Usage Metrics dashboard`
- Screenshots are required for new entries (no placeholder)

## Topics and sources

Use existing values where possible to keep filters useful. Check `catalog.json` (generated after build)
or browse the live site to see what's already in use.

### Topic tags (`topic:<domain>`)

Add at least one `topic:` tag to make your entry appear in the topic filter dropdown.
Topics represent the high-level SDLC domain the entry covers:

`topic:ci` · `topic:cd` · `topic:testing` · `topic:security` · `topic:quality` · `topic:cost` · `topic:deployment` · `topic:incident`

An entry can have multiple topics (e.g. `topic:ci` and `topic:cost` for a CI billing panel).

### Suggested sources
`github` · `grafana` · `datadog` · `cdviz` · `prometheus` · `loki` · `jaeger` · `jenkins` · `gitlab`

### Link `rel` values

Each item in `links:` has a `rel` that describes the relationship:

| rel | Meaning |
|---|---|
| `live` | The running dashboard or panel (may be org-specific) — shown as "View live ↗" on the card |
| `source` | Source code, Grafana JSON, Helm chart, Terraform module, etc. |
| `docs` | Official documentation for the tool or dashboard |
| `demo` | Public demo instance anyone can access |
| `article` | Blog post, tutorial, or reference material |

An entry can have multiple links with different `rel` values. At least one link is recommended.

Feel free to add new values — just be consistent with the style (lowercase, hyphen-separated).

## Questions?

Open an issue or start a discussion on GitHub.
