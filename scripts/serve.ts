import { join } from "path";

const DIST_DIR = join(new URL("..", import.meta.url).pathname, "dist");
const PORT = 3000;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(DIST_DIR, pathname);
    const ext = pathname.slice(pathname.lastIndexOf("."));

    try {
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});

console.log(`Dev server: http://localhost:${PORT}`);
