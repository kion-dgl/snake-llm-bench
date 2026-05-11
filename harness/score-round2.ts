import { chromium, type ConsoleMessage } from "playwright";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

interface CheckResult { name: string; pass: boolean; detail?: string; }

async function writeIsolatedTsconfig(runDir: string): Promise<string> {
  const cfgPath = join(runDir, "tsconfig.score.json");
  const cfg = {
    compilerOptions: {
      target: "ES2022",
      module: "ES2022",
      moduleResolution: "Bundler",
      strict: true,
      lib: ["DOM", "ES2022"],
      types: [],
      typeRoots: [],
      skipLibCheck: true,
      noEmit: false,
      outDir: ".",
      noResolve: true,
    },
    files: ["snake.ts"],
  };
  await writeFile(cfgPath, JSON.stringify(cfg, null, 2));
  return cfgPath;
}

async function tscCompile(runDir: string): Promise<CheckResult> {
  const cfgPath = await writeIsolatedTsconfig(runDir);
  return new Promise((resolve) => {
    const p = spawn(
      "bunx",
      ["tsc", "-p", cfgPath, "--noEmit"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    p.stdout.on("data", (b) => (out += b.toString()));
    p.stderr.on("data", (b) => (out += b.toString()));
    p.on("close", (code) => {
      resolve({ name: "ts_compiles", pass: code === 0, detail: code === 0 ? undefined : out.trim().slice(0, 600) });
    });
  });
}

function emitJs(runDir: string): Promise<void> {
  return new Promise((resolve) => {
    const cfgPath = join(runDir, "tsconfig.score.json");
    const p = spawn("bunx", ["tsc", "-p", cfgPath]);
    p.on("close", () => resolve());
  });
}

const sampleHashEval = () => {
  const c = document.querySelector("canvas") as HTMLCanvasElement;
  const ctx2 = c.getContext("2d", { willReadFrequently: true });
  if (!ctx2) return "no-ctx";
  const d = ctx2.getImageData(0, 0, c.width, c.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0;
  return String(h);
};

async function loadAndCheck(runDir: string, results: CheckResult[]) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

    const fileUrl = `file://${join(process.cwd(), runDir, "index.html")}`;
    await page.goto(fileUrl, { waitUntil: "load" });
    await page.waitForTimeout(200);

    results.push({ name: "no_console_errors", pass: consoleErrors.length === 0, detail: consoleErrors.slice(0, 5).join(" | ") });

    const canvas = await page.$("canvas");
    if (!canvas) {
      results.push({ name: "canvas_400x400", pass: false, detail: "no canvas" });
      for (const n of ["starts_paused", "space_starts_game", "arrow_steers", "r_restarts_to_zero"]) {
        results.push({ name: n, pass: false, detail: "no canvas" });
      }
      return;
    }
    const dims = await page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement;
      return { w: c.width, h: c.height };
    });
    results.push({ name: "canvas_400x400", pass: dims.w === 400 && dims.h === 400, detail: `${dims.w}x${dims.h}` });

    const sampleHash = () => page.evaluate(sampleHashEval);

    // 1) starts_paused — sample, wait 500ms, sample. Hashes should match (no animation without input).
    const initialHash = await sampleHash();
    await page.waitForTimeout(500);
    const idleHash = await sampleHash();
    results.push({ name: "starts_paused", pass: initialHash === idleHash, detail: `${initialHash} -> ${idleHash}` });

    // 2) space_starts_game — press Space, wait 400ms, hash should change
    await page.focus("body");
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
    const afterSpaceHash = await sampleHash();
    results.push({ name: "space_starts_game", pass: idleHash !== afterSpaceHash, detail: `${idleHash} -> ${afterSpaceHash}` });

    // 3) arrow_steers — press ArrowDown then ArrowLeft, expect canvas to change differently than pure forward motion.
    // Snapshot before any arrow, then press a direction and snapshot. Hash should differ.
    const beforeArrow = await sampleHash();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(180);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(220);
    const afterArrow = await sampleHash();
    results.push({ name: "arrow_steers", pass: beforeArrow !== afterArrow, detail: `${beforeArrow} -> ${afterArrow}` });

    // 4) r_restarts_to_zero — press R, give it a moment, check body text contains "Score: 0"
    await page.keyboard.press("KeyR");
    await page.waitForTimeout(250);
    const bodyText = (await page.textContent("body")) ?? "";
    const hasZero = /Score:\s*0\b/.test(bodyText);
    results.push({ name: "r_restarts_to_zero", pass: hasZero, detail: bodyText.slice(0, 120).replace(/\s+/g, " ") });
  } finally {
    await browser.close();
  }
}

export async function scoreRunV2(runDir: string) {
  const results: CheckResult[] = [];

  try { await stat(join(runDir, "index.html")); results.push({ name: "index_html_exists", pass: true }); }
  catch { results.push({ name: "index_html_exists", pass: false }); }

  try { await stat(join(runDir, "snake.ts")); results.push({ name: "snake_ts_exists", pass: true }); }
  catch { results.push({ name: "snake_ts_exists", pass: false }); }

  const haveSources = results.every((r) => r.pass);
  if (haveSources) {
    const tsSource = await readFile(join(runDir, "snake.ts"), "utf8");
    const htmlSource = await readFile(join(runDir, "index.html"), "utf8");

    results.push({ name: "score_label_present", pass: /Score:/i.test(htmlSource) || /Score:/i.test(tsSource), detail: undefined });
    results.push({ name: "high_label_present", pass: /\bHigh:/i.test(htmlSource) || /\bHigh:/i.test(tsSource) });
    results.push({ name: "class_game_present", pass: /\bclass\s+Game\b/.test(tsSource) });
    results.push({ name: "snake_high_key_present", pass: /['"`]snake\.high['"`]/.test(tsSource) });

    const tscRes = await tscCompile(runDir);
    results.push(tscRes);

    if (tscRes.pass) {
      await emitJs(runDir);
      try {
        await loadAndCheck(runDir, results);
      } catch (e) {
        results.push({ name: "page_loads", pass: false, detail: String(e).slice(0, 400) });
      }
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const payload = { runDir, total, passed, score: total ? passed / total : 0, results };
  await writeFile(join(runDir, "score.json"), JSON.stringify(payload, null, 2));
  return payload;
}

async function main() {
  const arg = Bun.argv[2];
  if (!arg) {
    console.error("usage: bun harness/score-round2.ts <runDir|--all>");
    process.exit(2);
  }
  const baseDir = process.env.ROUND2_DIR ?? "runs2";
  const dirs: string[] = [];
  if (arg === "--all") {
    for (const d of await readdir(baseDir, { withFileTypes: true })) {
      if (d.isDirectory()) dirs.push(join(baseDir, d.name));
    }
  } else {
    dirs.push(arg);
  }
  for (const d of dirs) {
    console.log(`scoring ${d}...`);
    const r = await scoreRunV2(d);
    console.log(`  ${r.passed}/${r.total} passed`);
    for (const c of r.results) console.log(`    [${c.pass ? "x" : " "}] ${c.name}${c.detail ? " — " + c.detail.slice(0, 80) : ""}`);
  }
}

if (import.meta.main) main();
