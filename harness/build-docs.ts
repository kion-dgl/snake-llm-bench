import { mkdir, writeFile, rm, cp } from "node:fs/promises";
import { join } from "node:path";
import { loadRuns, renderIndex } from "./render.ts";

const ROOT = process.cwd();
const DOCS = join(ROOT, "docs");

async function main() {
  // wipe and rebuild docs/
  await rm(DOCS, { recursive: true, force: true });
  await mkdir(DOCS, { recursive: true });

  // copy runs/ and runs2/ and runs3/ into docs/ so GitHub Pages can serve them
  for (const src of ["runs", "runs2", "runs3"]) {
    try {
      await cp(join(ROOT, src), join(DOCS, src), { recursive: true });
      console.log(`copied ${src}/ -> docs/${src}/`);
    } catch (e) {
      console.log(`skip ${src}/ (${(e as Error).message})`);
    }
  }

  // generate the three index pages
  const r1 = await loadRuns(ROOT, "runs");
  const r2 = await loadRuns(ROOT, "runs2");
  const r3 = await loadRuns(ROOT, "runs3");

  const r1Html = renderIndex(r1, {
    runsRoot: "runs",
    roundLabel: "Round 1 — original prompt",
    otherRoundHref: "round2.html",
    otherRoundLabel: "Round 2 →",
  });
  const r2Html = renderIndex(r2, {
    runsRoot: "runs2",
    roundLabel: "Round 2 — strict spec",
    otherRoundHref: "round3.html",
    otherRoundLabel: "Round 3 →",
  });
  const r3Html = renderIndex(r3, {
    runsRoot: "runs3",
    roundLabel: "Round 3 — skeleton fill-in",
    otherRoundHref: "round2.html",
    otherRoundLabel: "← Round 2",
  });

  await writeFile(join(DOCS, "index.html"), r1Html);
  await writeFile(join(DOCS, "round2.html"), r2Html);
  await writeFile(join(DOCS, "round3.html"), r3Html);

  console.log(`wrote docs/index.html (${r1.length} groups)`);
  console.log(`wrote docs/round2.html (${r2.length} groups)`);
  console.log(`wrote docs/round3.html (${r3.length} groups)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
