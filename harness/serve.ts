import { stat, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { loadRuns, renderIndex } from "./render.ts";

const PORT = Number(process.env.PORT ?? 4321);
const ROOT = process.cwd();
const HOST = process.env.HOST ?? "0.0.0.0";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function indexPage(round: 1 | 2): Promise<Response> {
  const opts = round === 2
    ? { runsRoot: "runs2", roundLabel: "Round 2 — strict spec", otherRoundHref: "index.html", otherRoundLabel: "← Round 1" }
    : { runsRoot: "runs", roundLabel: "Round 1 — original prompt", otherRoundHref: "round2.html", otherRoundLabel: "Round 2 →" };
  const groups = await loadRuns(ROOT, opts.runsRoot);
  return new Response(renderIndex(groups, opts), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/index.html") return indexPage(1);
    if (url.pathname === "/round2" || url.pathname === "/round2/" || url.pathname === "/round2.html") return indexPage(2);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (path.includes("..")) return new Response("nope", { status: 400 });
    const abs = join(ROOT, path);
    try {
      const s = await stat(abs);
      if (s.isDirectory()) {
        return new Response(null, { status: 302, headers: { location: url.pathname.replace(/\/?$/, "/") + "index.html" } });
      }
      const ext = extname(abs);
      const body = await readFile(abs);
      return new Response(body, { headers: { "content-type": MIME[ext] ?? "application/octet-stream" } });
    } catch {
      return new Response("not found", { status: 404 });
    }
  },
});

console.log(`serving on http://${HOST}:${PORT}`);
