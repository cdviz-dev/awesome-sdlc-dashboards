import { readdir, readFile, copyFile, mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "a", "ul", "ol", "li",
  "code", "pre", "h1", "h2", "h3", "h4", "blockquote",
];

function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "rel", "target"] },
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener", target: "_blank" },
      }),
    },
  });
}

const ROOT = new URL("..", import.meta.url).pathname;
const CATALOG_DIR = join(ROOT, "catalog");
const DIST_DIR = join(ROOT, "dist");
const HUGO_STATIC_DIR = join(ROOT, "hugo", "static");
const HUGO_CONTENT_DIR = join(ROOT, "hugo", "content", "catalog");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);

interface Entry {
  slug: string;
  title: string;
  kind: "dashboard" | "panel";
  panel_type?: string;
  topics: string[];   // values of tags with the "topic:" prefix, without the prefix
  source?: string;
  links: Array<{ rel: string; url: string }>;
  primary_url?: string;  // url of first `live` link, or first link of any rel
  tags: string[];
  images: string[];
  thumbnail?: string;
  related_dashboard?: string;
  description: string;       // raw markdown (used for search)
  description_html: string;  // sanitized HTML (used for display)
}

async function buildCatalog(): Promise<Entry[]> {
  const entries: Entry[] = [];
  const slugDirs = await readdir(CATALOG_DIR, { withFileTypes: true });

  for (const dirent of slugDirs) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const yamlPath = join(CATALOG_DIR, slug, "index.yaml");

    let raw: string;
    try {
      raw = await readFile(yamlPath, "utf-8");
    } catch {
      console.warn(`  skip ${slug}: no index.yaml`);
      continue;
    }

    const data = Bun.YAML.parse(raw) as Record<string, unknown>;

    // Copy images dir and collect refs
    const srcImages = join(CATALOG_DIR, slug, "images");
    const destImages = join(HUGO_STATIC_DIR, "catalog", slug, "images");
    const imageRefs: string[] = [];

    try {
      const files = await readdir(srcImages);
      await mkdir(destImages, { recursive: true });
      for (const f of files) {
        if (!IMAGE_EXTS.has(extname(f).toLowerCase())) continue;
        await copyFile(join(srcImages, f), join(destImages, f));
        imageRefs.push(`catalog/${slug}/images/${f}`);
      }
    } catch {
      // no images dir — that's fine
    }

    // front matter `images` overrides auto-discovered ones (relative to entry dir)
    let images: string[];
    if (Array.isArray(data.images) && data.images.length > 0) {
      images = [];
      for (const p of data.images as string[]) {
        const src = join(CATALOG_DIR, slug, p);
        const destDir = join(HUGO_STATIC_DIR, "catalog", slug);
        await mkdir(destDir, { recursive: true });
        await copyFile(src, join(destDir, p));
        images.push(`catalog/${slug}/${p}`);
      }
    } else {
      images = imageRefs;
    }

    entries.push({
      slug,
      title: String(data.title ?? slug),
      kind: data.kind === "dashboard" ? "dashboard" : "panel",
      panel_type: data.panel_type ?? undefined,
      topics: (Array.isArray(data.tags) ? data.tags as string[] : [])
        .filter((t) => t.startsWith("topic:"))
        .map((t) => t.slice("topic:".length)),
      source: data.source ?? undefined,
      links: Array.isArray(data.links)
        ? (data.links as Array<{ rel: string; url: string }>)
        : [],
      get primary_url() {
        return (
          this.links.find((l) => l.rel === "live")?.url ?? this.links[0]?.url
        );
      },
      tags: Array.isArray(data.tags) ? data.tags : [],
      images,
      thumbnail: images[0],
      related_dashboard: data.related_dashboard ?? undefined,
      description: String(data.description ?? "").trim(),
      description_html: renderMarkdown(String(data.description ?? "").trim()),
    });
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dashboard" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

function firstParagraph(md: string): string {
  return md.split('\n')
    .find(l => l.trim() && !l.startsWith('#'))
    ?.trim()
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // strip markdown links
    .replace(/[*_`]/g, '')                        // strip inline formatting
    .slice(0, 160) ?? '';
}

function yamlStr(v: string): string {
  // quote strings that need it (contain special chars or look like YAML keywords)
  if (/[:#\[\]{}&*!|>'"%@`,]/.test(v) || /^(true|false|null|~)$/i.test(v) || v === '') {
    return JSON.stringify(v);
  }
  return v;
}

function toYamlFrontMatter(fm: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      lines.push(`${key}: ${yamlStr(value)}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every(v => typeof v === 'string')) {
        lines.push(`${key}:`);
        for (const item of value as string[]) lines.push(`  - ${yamlStr(item)}`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item as Record<string, string>);
            lines.push(`  - ${entries[0][0]}: ${yamlStr(entries[0][1])}`);
            for (const [k, v] of entries.slice(1)) lines.push(`    ${k}: ${yamlStr(v)}`);
          } else {
            lines.push(`  - ${item}`);
          }
        }
      }
    }
  }
  return lines.join('\n') + '\n';
}

async function writeHugoContent(entries: Entry[]): Promise<void> {
  await mkdir(HUGO_CONTENT_DIR, { recursive: true });

  for (const entry of entries) {
    const dir = join(HUGO_CONTENT_DIR, entry.slug);
    await mkdir(dir, { recursive: true });

    const fm: Record<string, unknown> = {
      title: entry.title,
      entry_kind: entry.kind,
      tags: entry.tags,
      topics: entry.topics,
      images: entry.images,
      links: entry.links,
      primary_url: entry.primary_url,
      description: firstParagraph(entry.description),
    };
    if (entry.source) fm.source = entry.source;
    if (entry.panel_type) fm.panel_type = entry.panel_type;
    if (entry.thumbnail) fm.thumbnail = entry.thumbnail;
    if (entry.related_dashboard) fm.related_dashboard = entry.related_dashboard;

    const content = `---\n${toYamlFrontMatter(fm)}---\n\n${entry.description}\n`;
    await writeFile(join(dir, "index.md"), content);
  }
}

async function main(): Promise<void> {
  await mkdir(DIST_DIR, { recursive: true });
  await mkdir(HUGO_STATIC_DIR, { recursive: true });

  const entries = await buildCatalog();

  await Promise.all([
    writeHugoContent(entries),
    writeFile(
      join(HUGO_STATIC_DIR, "catalog.json"),
      JSON.stringify(entries, null, 2),
    ),
  ]);

  console.log(`\nBuilt ${entries.length} entries:`);
  for (const e of entries) {
    const type = e.panel_type ? ` (${e.panel_type})` : "";
    console.log(`  [${e.kind}${type}] ${e.title}`);
  }
  console.log(`\nHugo content: ${HUGO_CONTENT_DIR}`);
  console.log(`Hugo static:  ${HUGO_STATIC_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
