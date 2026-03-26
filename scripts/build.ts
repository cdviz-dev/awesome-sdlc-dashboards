import { readdir, readFile, copyFile, mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import matter from "gray-matter";
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
const PUBLIC_DIR = join(ROOT, "public");
const DIST_DIR = join(ROOT, "dist");

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
    const mdPath = join(CATALOG_DIR, slug, "index.md");

    let raw: string;
    try {
      raw = await readFile(mdPath, "utf-8");
    } catch {
      console.warn(`  skip ${slug}: no index.md`);
      continue;
    }

    const { data, content: body } = matter(raw);

    // Copy images dir and collect refs
    const srcImages = join(CATALOG_DIR, slug, "images");
    const destImages = join(DIST_DIR, "catalog", slug, "images");
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
    const images: string[] =
      Array.isArray(data.images) && data.images.length > 0
        ? data.images.map((p: string) => `catalog/${slug}/${p}`)
        : imageRefs;

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
      description: body.trim(),
      description_html: renderMarkdown(body.trim()),
    });
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dashboard" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

async function copyPublic(): Promise<void> {
  const files = await readdir(PUBLIC_DIR, { withFileTypes: true });
  await mkdir(DIST_DIR, { recursive: true });
  for (const f of files) {
    if (f.isFile()) {
      await copyFile(join(PUBLIC_DIR, f.name), join(DIST_DIR, f.name));
    }
  }
}

async function main(): Promise<void> {
  await mkdir(DIST_DIR, { recursive: true });

  const [entries] = await Promise.all([buildCatalog(), copyPublic()]);

  await writeFile(
    join(DIST_DIR, "catalog.json"),
    JSON.stringify(entries, null, 2),
  );

  console.log(`\nBuilt ${entries.length} entries:`);
  for (const e of entries) {
    const type = e.panel_type ? ` (${e.panel_type})` : "";
    console.log(`  [${e.kind}${type}] ${e.title}`);
  }
  console.log(`\nOutput: ${DIST_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
