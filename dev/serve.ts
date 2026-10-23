/*
 * Static file server for dev/preview.html, with no dependencies.
 *
 * `bun run preview` builds once and serves the repository root so the harness
 * can load dist/lg-remote-control.js the same way a browser would. `bun run
 * dev` additionally watches src/ and rebuilds the bundle; the preview page
 * polls the ETag below and reloads itself when the bundle changes.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT ?? 8788);

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  const wanted = pathname === "/" ? "/dev/preview.html" : pathname;
  const target = normalize(join(repoRoot, wanted));

  if (!target.startsWith(repoRoot) || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(`not found: ${wanted}\n`);
    return;
  }

  const info = statSync(target);
  res.writeHead(200, {
    "content-type": contentTypes[extname(target)] ?? "application/octet-stream",
    "content-length": info.size,
    "last-modified": info.mtime.toUTCString(),
    etag: `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`,
    "cache-control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(target).pipe(res);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`port ${port} is already in use — try PORT=8789 bun run preview`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`card preview: http://localhost:${port}/dev/preview.html`);
  console.log("if the card does not appear, run `bun run build` first");
});
