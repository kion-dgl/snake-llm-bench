import { generate as ollamaGenerate } from "./ollama.ts";
import { generate as openrouterGenerate } from "./openrouter.ts";
import { generate as lmstudioGenerate } from "./lmstudio.ts";
import { FIXUP_PROMPT_TEMPLATE, extractCode } from "./prompts.ts";
import { scoreRun } from "./score.ts";
import { scoreRunV2 } from "./score-round2.ts";

function pickProvider(model: string) {
  if (process.env.PROVIDER === "lmstudio") return lmstudioGenerate;
  return model.includes("/") ? openrouterGenerate : ollamaGenerate;
}
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

interface Args { baseRun: string; maxRetries: number; specFile?: string; round: 1 | 2; }

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { maxRetries: 5, round: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--base") { out.baseRun = next; i++; }
    else if (a === "--max-retries") { out.maxRetries = Number(next); i++; }
    else if (a === "--spec-file") { out.specFile = next; i++; }
    else if (a === "--round") { out.round = Number(next) as 1 | 2; i++; }
  }
  if (!out.baseRun) {
    console.error("usage: bun harness/fixup.ts --base <runDir> [--max-retries 5] [--spec-file <path>] [--round 1|2]");
    process.exit(2);
  }
  return out as Args;
}

interface CheckResult { name: string; pass: boolean; detail?: string; }
interface ScorePayload { passed: number; total: number; results: CheckResult[]; }

function describeFailures(score: ScorePayload): string {
  const failed = score.results.filter((r) => !r.pass);
  const lines: string[] = [];
  for (const r of failed) {
    switch (r.name) {
      case "index_html_exists":
        lines.push(`- index.html is missing from your previous output (extraction failed). Make sure you output an \`html\` fenced code block.`);
        break;
      case "snake_ts_exists":
        lines.push(`- snake.ts is missing from your previous output (extraction failed). Make sure you output a \`typescript\` fenced code block.`);
        break;
      case "ts_compiles":
        lines.push(`- TypeScript compilation failed under \`--strict\`:\n\`\`\`\n${r.detail ?? "(no detail)"}\n\`\`\``);
        break;
      case "no_console_errors":
        lines.push(`- Console / page errors at runtime:\n\`\`\`\n${r.detail ?? "(no detail)"}\n\`\`\`\n  (Common cause: \`<script type="module">\` blocks \`file://\` loads via CORS — use a plain script tag.)`);
        break;
      case "canvas_present":
        lines.push(`- No <canvas> element was found in the rendered page.`);
        break;
      case "canvas_has_size":
        lines.push(`- The canvas has zero width/height (${r.detail ?? "no bbox"}). Give it explicit \`width\` and \`height\` attributes.`);
        break;
      case "score_label_present":
        lines.push(`- The page text does not contain the word "Score". Add a visible label such as \`<div>Score: 0</div>\`.`);
        break;
      case "canvas_animates":
        lines.push(`- The canvas is NOT animating without user input (pixel hash unchanged over ~300ms). Your game loop is missing or paused; the snake must move continuously via setInterval/requestAnimationFrame from the moment the page loads.`);
        break;
      case "responds_to_input":
        lines.push(`- Pressing arrow keys does not change the canvas. Either the keydown listener is missing, attached to the wrong element, or the game has already ended (e.g. snake immediately hit a wall). Listen on \`window\` or \`document\`, and start the snake away from the walls.`);
        break;
      default:
        lines.push(`- ${r.name} failed${r.detail ? `: ${r.detail}` : ""}`);
    }
  }
  return lines.join("\n\n");
}

async function readOrEmpty(path: string): Promise<string> {
  try { return await readFile(path, "utf8"); } catch { return ""; }
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const baseMeta = JSON.parse(await readFile(join(args.baseRun, "meta.json"), "utf8")) as { model: string };
  const model = baseMeta.model;
  if (!model) throw new Error(`no model in ${args.baseRun}/meta.json`);
  const scorer = args.round === 2 ? scoreRunV2 : scoreRun;
  const specText = args.specFile ? await readFile(args.specFile, "utf8") : null;

  let currentDir = args.baseRun;
  let currentScore: ScorePayload;
  try {
    currentScore = JSON.parse(await readFile(join(currentDir, "score.json"), "utf8"));
  } catch {
    console.log(`scoring base ${currentDir}...`);
    currentScore = await scorer(currentDir);
  }
  console.log(`base ${currentDir}: ${currentScore.passed}/${currentScore.total}`);

  if (currentScore.passed === currentScore.total) {
    console.log(`already at full score, nothing to fix.`);
    return;
  }

  for (let attempt = 1; attempt <= args.maxRetries; attempt++) {
    const prevHtml = await readOrEmpty(join(currentDir, "index.html"));
    const prevTs = await readOrEmpty(join(currentDir, "snake.ts"));
    if (!prevHtml || !prevTs) {
      console.log(`  no code in ${currentDir}; treating as empty for fixup prompt.`);
    }
    const failureNotes = describeFailures(currentScore);
    let prompt = FIXUP_PROMPT_TEMPLATE(prevHtml, prevTs, failureNotes);
    if (specText) {
      prompt = `Target specification (the task you were asked to complete):\n\n${specText}\n\n---\n\n${prompt}`;
    }

    const retryDir = `${args.baseRun}__retry${attempt}`;
    await mkdir(retryDir, { recursive: true });
    await writeFile(join(retryDir, "prompt.txt"), prompt);

    console.log(`\n[retry ${attempt}/${args.maxRetries}] calling ${model}...`);
    let result;
    try {
      result = await pickProvider(model)(model, prompt);
    } catch (e) {
      console.error(`  ${(e as Error).message}`);
      await writeFile(join(retryDir, "error.txt"), String(e));
      break;
    }
    console.log(`  done in ${(result.durationMs / 1000).toFixed(1)}s, ${result.evalCount ?? "?"} tokens, stop=${result.doneReason ?? "?"}`);

    await writeFile(join(retryDir, "raw.txt"), result.response);
    if (result.thinking) await writeFile(join(retryDir, "thinking.txt"), result.thinking);
    await writeFile(
      join(retryDir, "meta.json"),
      JSON.stringify(
        {
          model,
          role: "fixup",
          baseRun: args.baseRun,
          attempt,
          durationMs: Math.round(result.durationMs),
          promptEvalCount: result.promptEvalCount ?? null,
          evalCount: result.evalCount ?? null,
          doneReason: result.doneReason ?? null,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    const { html, ts } = extractCode(result.response);
    if (!html || !ts) {
      console.error(`  WARNING: failed to extract code blocks (html=${!!html}, ts=${!!ts})`);
      await writeFile(join(retryDir, "score.json"), JSON.stringify({ runDir: retryDir, passed: 0, total: 2, score: 0, results: [
        { name: "index_html_exists", pass: !!html },
        { name: "snake_ts_exists", pass: !!ts },
      ] }, null, 2));
      currentDir = retryDir;
      currentScore = { passed: 0, total: 2, results: [
        { name: "index_html_exists", pass: !!html },
        { name: "snake_ts_exists", pass: !!ts },
      ] };
      continue;
    }
    await writeFile(join(retryDir, "index.html"), html);
    await writeFile(join(retryDir, "snake.ts"), ts);

    currentScore = await scorer(retryDir);
    currentDir = retryDir;
    console.log(`  scored ${currentScore.passed}/${currentScore.total}`);
    for (const c of currentScore.results) console.log(`    [${c.pass ? "x" : " "}] ${c.name}`);

    if (currentScore.passed === currentScore.total) {
      console.log(`\nFIXED on attempt ${attempt}.`);
      return;
    }
  }
  console.log(`\nNot fixed after ${args.maxRetries} attempts; final ${currentScore.passed}/${currentScore.total} in ${currentDir}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
