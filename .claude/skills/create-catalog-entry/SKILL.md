---
name: create-catalog-entry
description: Create, update, or batch-create catalog entries for awesome-sdlc-dashboards from a screenshot or image URL plus the source page URL. Extracts metadata from the page, fills entry fields, asks for missing info, writes entries, updates existing ones, and creates several entries when the source page lists multiple dashboards or panels.
---

# Create / Update Catalog Entry

Manage entries in the `catalog/` directory from a screenshot (file path or image URL) and the URL of the source page where the screenshot was taken.

This skill handles three modes:
- **Create** — add one new entry (default).
- **Update** — modify an existing entry (fields, image, tags, links, description).
- **Batch** — when the source page lists several dashboards or panels, create (or update) one entry per item in a single run.

## Inputs

The user provides one or both of:
- **Image**: pasted inline into the chat, OR local file path, OR image URL (the screenshot of the dashboard/panel)
- **Source URL**: the web page where the screenshot was captured

At minimum one of these must be present. If only the image is given, ask for the source URL before proceeding (it's needed for links and metadata).

## Step 0 — Determine the mode

1. **Update** if any of these hold:
   - The user says "update", "edit", "fix", "modify", "refresh" an entry, OR
   - A slug they name already exists under `catalog/` (`ls catalog/` and compare slugified names), OR
   - You generate a slug (Step 3) that collides with an existing `catalog/<slug>/` directory.

   In the collision case, do NOT silently overwrite — confirm with the user whether to update the existing entry or pick a different slug. Then follow **Update flow** below.

2. **Batch** if the source page names more than one dashboard/panel and the user wants several (e.g. "add all of these", "create entries for each panel"). Follow **Batch flow** below.

3. **Create** otherwise — proceed Step 1 → Step 5 for a single entry.

## Step 1 — Analyze the image

Three cases:
- **Pasted inline**: the image is already visible in the conversation — analyze it directly, no tool needed.
- **Local file path**: use the Read tool to view it (Claude is multimodal and can read PNG/JPEG directly).
- **URL**: use WebFetch to retrieve it, or infer from URL context.

From the image, extract:
- Dashboard/panel title (text visible in the screenshot)
- Whether it is a **dashboard** (full screen, multiple panels) or a **panel** (single chart/stat/table)
- If panel: the **panel_type** — `stat`, `table`, `timeseries`, `bar`, `gauge`, `heatmap`, `piechart`, `text`
- The **source tool** visible (Grafana, Datadog, GitHub, CDviz, etc.)
- Any visible metric names, labels, or SDLC domain hints (CI, CD, deployment, incidents, cost, quality, testing, security)

## Step 2 — Fetch and analyze the source page

Use WebFetch on the source URL. Extract:
- Page title, H1, description meta tags
- Dashboard/panel name(s) mentioned — note ALL named dashboards or panels visible on the page (for Step 6)
- The tool/platform (GitHub, Grafana, Datadog, etc.) — this becomes `source`
- Any direct links to: source code repos, live instances, docs, demo URLs, blog articles
- Keywords, tags, categories, or domain labels (map to `topic:ci`, `topic:cd`, `topic:testing`, `topic:security`, `topic:quality`, `topic:cost`, `topic:deployment`, `topic:incident`)
- Any parent dashboard name if this is a panel

## Step 3 — Determine field values

Combine image analysis + page analysis to fill:

| Field | How to determine |
|---|---|
| `title` | From image text or page title. Format: `"Tool - Descriptive Name"` (e.g., `"GitHub Actions - Usage by Repository"`) |
| `kind` | `dashboard` (full screen) or `panel` (single chart) |
| `panel_type` | From image chart type (panels only) |
| `source` | Tool name lowercased: `github`, `grafana`, `datadog`, `cdviz`, `prometheus`, `loki`, `jaeger`, `jenkins`, `gitlab`, `middleware` |
| `links` | From page: use `live` for the source URL if it's a running instance; `source` for code repos; `docs` for documentation; `demo` for public demos; `article` for blog posts |
| `tags` | At least one `topic:` tag + tool-specific tags + metric/feature tags (lowercase-hyphen) |
| `related_dashboard` | Slug of parent dashboard if this is a panel |
| `description` | 2–4 sentence markdown paragraph: what it shows, why it's useful, what data sources it needs |
| `images` | `["screenshot.png"]` (the image will be saved as screenshot.png) |

**Slug generation**: from `title`, lowercase, replace spaces/special chars with hyphens, strip leading tool prefix repetition (e.g., `"GitHub Actions - Usage by Repository"` → `github-actions-usage-by-repository`).

## Step 4 — Ask for missing or uncertain fields

Before creating files, present a summary of what was inferred and ask the user to confirm or fill gaps:

```
Entry draft:
  title: "..."        ← inferred / MISSING
  kind: dashboard     ← inferred / MISSING
  panel_type: table   ← inferred (panels only) / MISSING
  source: github      ← inferred / MISSING
  slug: ...           ← generated
  links: [...]        ← inferred / MISSING
  tags: [...]         ← inferred / MISSING
  description: |      ← inferred / MISSING
    ...

Any corrections or additions before I create the files?
```

Only ask once. If the user confirms or says "go ahead", proceed.

## Step 5 — Create the entry

**Locate the catalog root**: find `catalog/` directory. Start from the current working directory, then check parent directories up to 3 levels. If not found, ask the user.

**Create files**:

1. Create directory `catalog/<slug>/`

2. Save the image as `catalog/<slug>/screenshot.png`:
   - If local file path: use Bash `cp "<source_path>" "catalog/<slug>/screenshot.png"`
   - If URL: use Bash `curl -sL "<url>" -o "catalog/<slug>/screenshot.png"`

3. Write `catalog/<slug>/index.yaml`:

```yaml
# yaml-language-server: $schema=../../schema/entry.json
title: "TITLE"
kind: KIND
# panel_type: PANEL_TYPE   ← include only for panels
source: SOURCE
links:
  - rel: REL
    url: URL
tags:
  - topic:DOMAIN
  - tag1
  - tag2
images:
  - screenshot.png
# related_dashboard: SLUG  ← include only for panels with known parent
description: |
  DESCRIPTION
```

Omit `panel_type` entirely for dashboards. Omit `related_dashboard` if not known. Do NOT include comment placeholders — write real values or omit the field.

4. Run validation: `cd <catalog-root> && mise run validate` (or `bun run scripts/validate.ts` if mise not available). Fix any reported errors.

## Update flow

When the mode is **Update** (Step 0):

1. **Locate** the entry: `catalog/<slug>/index.yaml`. If the user named it loosely, match against `ls catalog/`.
2. **Read** the current `index.yaml` so you preserve fields the user does not want changed.
3. **Apply changes** only to the fields requested or clearly improved by new inputs:
   - New image provided → overwrite `catalog/<slug>/screenshot.png` (same Bash `cp`/`curl` as Step 5) and keep `images` pointing at it.
   - New/better metadata from a re-fetched page (Steps 2–3) → update `title`, `source`, `links`, `tags`, `description`, `panel_type`, `related_dashboard` as needed.
   - Leave every untouched field exactly as it was — do not drop comments, ordering, or the `# yaml-language-server:` header line.
4. **Confirm** the diff with the user before writing (show old → new for each changed field), unless they already said "go ahead".
5. **Write** the updated `index.yaml` (use Edit for targeted field changes; rewrite the file only if many fields change).
6. **Validate**: `cd <catalog-root> && mise run validate` (or `bun run scripts/validate.ts`). Fix reported errors.

Do not rename the slug/directory on update unless the user explicitly asks; a slug change means moving the directory (`git mv`) and updating any `related_dashboard` references that point to it.

## Batch flow

When the source page lists several dashboards/panels and the user wants more than one:

1. **Enumerate** all named dashboards/panels on the page (from Step 2). Slugify each and check `ls catalog/` to tag each as NEW or EXISTING (existing → update candidate).
2. **Present the plan once** and get a single confirmation:

   ```
   Found N entries on the page:
     1. "Panel Name A"      (panel, timeseries)   → NEW
     2. "Dashboard Name B"  (dashboard)           → NEW
     3. "Panel Name C"      (panel, stat)         → EXISTING (update)
   Create/update all of these? (all / pick numbers / no)
   ```

3. **Process each selected item** in turn: run Steps 1–5 (create) or the Update flow (existing) per item, reusing the already-fetched page analysis. For images: use any provided per-item screenshots; if an item has no image, ask once for all missing images up front, or note the entry as needing a screenshot rather than blocking the whole batch.
4. **Validate once at the end**: `cd <catalog-root> && mise run validate`. Fix errors per entry.
5. **Summarize**: list each slug created or updated, and any items skipped for missing screenshots.

Avoid re-asking the confirmation question per item — confirm the batch once, then run unattended.

## Step 6 — Offer additional entries from the same page

For a single **Create**, after writing the entry check if the source page contained OTHER named dashboards or panels not yet in the catalog.

To check existing entries: `ls catalog/` — compare slugified names.

If potential new entries exist:

```
Found X more potential entries on the same page:
  1. "Panel Name A" (panel, timeseries)
  2. "Dashboard Name B" (dashboard)

Work on these next? (all / pick numbers / no)
```

If the user picks several, switch to the **Batch flow**. If one, restart from Step 1 using the same source URL focused on that item. Ask for a screenshot if you don't already have one.

## Notes

- The `# yaml-language-server:` comment on line 1 of index.yaml is required — it enables schema validation in editors.
- Always use YAML literal block style (`|`) for `description` to preserve formatting.
- Tags: lowercase, hyphen-separated. Topic tags (`topic:ci` etc.) are the primary filter mechanism — always include at least one.
- If unsure whether something is a dashboard or panel: full-screen multi-chart = dashboard; single chart/stat = panel.
- Existing topic values: `topic:ci` · `topic:cd` · `topic:testing` · `topic:security` · `topic:quality` · `topic:cost` · `topic:deployment` · `topic:incident`
- Existing source values: `github` · `grafana` · `datadog` · `cdviz` · `prometheus` · `loki` · `jaeger` · `jenkins` · `gitlab` · `middleware`
