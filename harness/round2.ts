import { generate as ollamaGenerate, slugifyModel } from "./ollama.ts";
import { generate as openrouterGenerate } from "./openrouter.ts";
import { extractCode } from "./prompts.ts";
import { scoreRunV2 } from "./score-round2.ts";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

function pickProvider(model: string) {
  return model.includes("/") ? openrouterGenerate : ollamaGenerate;
}

const SPEC_FILE = "prompts/snake-spec.md";
const ROUND_DIR = "runs2";
const MAX_RETRIES = 3;

function arg(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  return i >= 0 ? Bun.argv[i + 1] : undefined;
}

async function fixup(runDir: string, model: string, specText: string) {
  const proc = spawn("bun", [
    "harness/fixup.ts",
    "--base", runDir,
    "--max-retries", String(MAX_RETRIES),
    "--spec-file", SPEC_FILE,
    "--round", "2",
  ], { stdio: "inherit" });
  await new Promise<void>((r) => proc.on("close", () => r()));
  void model; void specText;
}

async function runOne(model: string) {
  const slug = `${slugifyModel(model)}__full`;
  const runDir = join(ROUND_DIR, slug);
  await mkdir(runDir, { recursive: true });
  const prompt = await readFile(SPEC_FILE, "utf8");
  const generate = pickProvider(model);
  console.log(`\n=== ${model} ===`);
  console.log(`calling ${model}...`);
  const result = await generate(model, prompt);
  console.log(`  done in ${(result.durationMs / 1000).toFixed(1)}s, ${result.evalCount ?? "?"} tokens, stop=${result.doneReason ?? "?"}`);

  await writeFile(join(runDir, "prompt.txt"), prompt);
  await writeFile(join(runDir, "raw.txt"), result.response);
  if (result.thinking) await writeFile(join(runDir, "thinking.txt"), result.thinking);
  await writeFile(join(runDir, "meta.json"), JSON.stringify({
    model, role: "full",
    durationMs: Math.round(result.durationMs),
    promptEvalCount: result.promptEvalCount ?? null,
    evalCount: result.evalCount ?? null,
    doneReason: result.doneReason ?? null,
    timestamp: new Date().toISOString(),
    promptSource: SPEC_FILE,
  }, null, 2));

  const { html, ts } = extractCode(result.response);
  if (!html || !ts) {
    console.error(`  WARNING: failed to extract code blocks (html=${!!html}, ts=${!!ts})`);
    await writeFile(join(runDir, "score.json"), JSON.stringify({
      runDir, passed: 0, total: 2, score: 0,
      results: [
        { name: "index_html_exists", pass: !!html },
        { name: "snake_ts_exists", pass: !!ts },
      ],
    }, null, 2));
  } else {
    await writeFile(join(runDir, "index.html"), html);
    await writeFile(join(runDir, "snake.ts"), ts);
    const score = await scoreRunV2(runDir);
    console.log(`  scored ${score.passed}/${score.total}`);
    if (score.passed === score.total) return;
  }

  // need fixup
  await fixup(runDir, model, prompt);
}

async function main() {
  const single = arg("--model");
  const skip = (arg("--skip") ?? "").split(",").filter(Boolean);
  const parallel = Number(arg("--parallel") ?? "1");

  const models = single ? [single] : [
    "qwen3-coder:480b-cloud",
    "gpt-oss:120b-cloud",
    "mistral-large-3:675b-cloud",
    "gemma4:31b-cloud",
    "qwen3-coder-next:cloud",
    "nemotron-3-super:cloud",
    "deepseek-v4-pro:cloud",
    "kimi-k2.6:cloud",
    "glm-5:cloud",
  ].filter((m) => !skip.includes(m));

  if (parallel <= 1) {
    for (const m of models) {
      try { await runOne(m); }
      catch (e) { console.error(`  ${m} failed: ${(e as Error).message}`); }
    }
    return;
  }

  // simple concurrency-limited queue
  const queue = [...models];
  const inflight = new Set<Promise<void>>();
  while (queue.length || inflight.size) {
    while (inflight.size < parallel && queue.length) {
      const m = queue.shift()!;
      console.log(`[start] ${m}  (inflight=${inflight.size + 1}/${parallel}, queued=${queue.length})`);
      const p = runOne(m)
        .catch((e) => console.error(`  ${m} failed: ${(e as Error).message}`))
        .finally(() => {
          inflight.delete(p);
          console.log(`[done]  ${m}  (inflight=${inflight.size}, queued=${queue.length})`);
        });
      inflight.add(p);
    }
    if (inflight.size) await Promise.race(inflight);
  }
}

main();
