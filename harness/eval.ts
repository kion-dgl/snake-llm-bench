import { generate as ollamaGenerate, slugifyModel } from "./ollama.ts";
import { generate as openrouterGenerate } from "./openrouter.ts";
import { generate as lmstudioGenerate } from "./lmstudio.ts";
import { PLAN_PROMPT, CODE_PROMPT_TEMPLATE, FULL_PROMPT, extractCode } from "./prompts.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

function pickProvider(model: string, explicit?: string) {
  if (explicit === "openrouter") return openrouterGenerate;
  if (explicit === "ollama") return ollamaGenerate;
  if (explicit === "lmstudio") return lmstudioGenerate;
  // auto-detect: openrouter model names contain `/`; ollama use `:` or no separator
  if (model.includes("/")) return openrouterGenerate;
  return ollamaGenerate;
}

type Role = "plan" | "code" | "full";

interface Args {
  model: string;
  role: Role;
  planFrom?: string;
  label?: string;
  promptFile?: string;
  outputDir?: string;
  provider?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--model") { out.model = next; i++; }
    else if (a === "--role") { out.role = next as Role; i++; }
    else if (a === "--plan-from") { out.planFrom = next; i++; }
    else if (a === "--label") { out.label = next; i++; }
    else if (a === "--prompt-file") { out.promptFile = next; i++; }
    else if (a === "--output-dir") { out.outputDir = next; i++; }
    else if (a === "--provider") { out.provider = next; i++; }
  }
  if (!out.model || !out.role) {
    console.error("usage: bun harness/eval.ts --model <name> --role plan|code|full [--plan-from <runDir>] [--label <label>] [--prompt-file <path>] [--output-dir <dir>] [--provider ollama|openrouter]");
    process.exit(2);
  }
  return out as Args;
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const slug = args.label ?? `${slugifyModel(args.model)}__${args.role}`;
  const runDir = args.outputDir ?? join("runs", slug);
  await mkdir(runDir, { recursive: true });

  let prompt: string;
  let planText: string | null = null;

  if (args.promptFile) {
    prompt = await readFile(args.promptFile, "utf8");
  } else if (args.role === "plan") {
    prompt = PLAN_PROMPT;
  } else if (args.role === "code") {
    if (!args.planFrom) {
      console.error("--role code requires --plan-from <runDir>");
      process.exit(2);
    }
    planText = await readFile(join(args.planFrom, "plan.md"), "utf8");
    prompt = CODE_PROMPT_TEMPLATE(planText);
  } else {
    prompt = FULL_PROMPT;
  }

  const generate = pickProvider(args.model, args.provider);
  console.log(`[${slug}] calling ${args.model} (role=${args.role})...`);
  const result = await generate(args.model, prompt);
  console.log(`[${slug}] done in ${(result.durationMs / 1000).toFixed(1)}s, ${result.evalCount ?? "?"} tokens`);

  await writeFile(join(runDir, "raw.txt"), result.response);
  if (result.thinking) await writeFile(join(runDir, "thinking.txt"), result.thinking);
  await writeFile(join(runDir, "prompt.txt"), prompt);
  await writeFile(
    join(runDir, "meta.json"),
    JSON.stringify(
      {
        model: args.model,
        role: args.role,
        planFrom: args.planFrom ?? null,
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

  if (args.role === "plan") {
    await writeFile(join(runDir, "plan.md"), result.response.trim());
  } else {
    if (planText) await writeFile(join(runDir, "plan.md"), planText);
    const { html, ts } = extractCode(result.response);
    if (!html || !ts) {
      console.error(`[${slug}] WARNING: failed to extract code blocks (html=${!!html}, ts=${!!ts}). Inspect raw.txt.`);
    } else {
      await writeFile(join(runDir, "index.html"), html);
      await writeFile(join(runDir, "snake.ts"), ts);
    }
  }

  console.log(`[${slug}] wrote ${runDir}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
