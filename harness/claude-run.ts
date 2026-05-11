import { FULL_PROMPT, PLAN_PROMPT, CODE_PROMPT_TEMPLATE, extractCode } from "./prompts.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

type Role = "plan" | "code" | "full";

interface Args {
  role: Role;
  model: string;
  planFrom?: string;
  label?: string;
  promptFile?: string;
  outputDir?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { model: "opus" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--role") { out.role = next as Role; i++; }
    else if (a === "--model") { out.model = next; i++; }
    else if (a === "--plan-from") { out.planFrom = next; i++; }
    else if (a === "--label") { out.label = next; i++; }
    else if (a === "--prompt-file") { out.promptFile = next; i++; }
    else if (a === "--output-dir") { out.outputDir = next; i++; }
  }
  if (!out.role) {
    console.error("usage: bun harness/claude-run.ts --role plan|code|full [--model opus|sonnet|haiku] [--plan-from <dir>] [--label <label>] [--prompt-file <path>] [--output-dir <dir>]");
    process.exit(2);
  }
  return out as Args;
}

function runClaudeCli(prompt: string, model: string): Promise<{ stdout: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const child = spawn(
      "claude",
      [
        "-p",
        "--output-format", "json",
        "--model", model,
        "--max-turns", "1",
        "--disallowedTools", "Bash,Edit,Write,Read,WebFetch,WebSearch,Agent,Skill",
        "--effort", "medium",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("close", (code) => {
      const durationMs = performance.now() - t0;
      if (code !== 0) {
        reject(new Error(`claude exit ${code}: ${stderr.slice(0, 600)}`));
        return;
      }
      resolve({ stdout, durationMs });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

interface ClaudeResult {
  result: string;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  is_error: boolean;
  stop_reason: string;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd: number;
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const slug = args.label ?? `claude-cli__${args.role}`;
  const runDir = args.outputDir ?? join("runs", slug);
  await mkdir(runDir, { recursive: true });

  let prompt: string;
  let planText: string | null = null;
  if (args.promptFile) prompt = await readFile(args.promptFile, "utf8");
  else if (args.role === "plan") prompt = PLAN_PROMPT;
  else if (args.role === "code") {
    if (!args.planFrom) { console.error("--role code requires --plan-from"); process.exit(2); }
    planText = await readFile(join(args.planFrom, "plan.md"), "utf8");
    prompt = CODE_PROMPT_TEMPLATE(planText);
  } else prompt = FULL_PROMPT;

  console.log(`[${slug}] calling claude ${args.model} (role=${args.role})...`);
  const { stdout, durationMs } = await runClaudeCli(prompt, args.model);
  const parsed = JSON.parse(stdout) as ClaudeResult;
  if (parsed.is_error) {
    console.error(`[${slug}] claude returned error: ${parsed.result}`);
    process.exit(1);
  }
  console.log(`[${slug}] done in ${(durationMs / 1000).toFixed(1)}s (api ${(parsed.duration_api_ms / 1000).toFixed(1)}s), ${parsed.usage.output_tokens} output tokens`);

  await writeFile(join(runDir, "raw.txt"), parsed.result);
  await writeFile(join(runDir, "prompt.txt"), prompt);
  await writeFile(
    join(runDir, "meta.json"),
    JSON.stringify(
      {
        model: `claude-${args.model}`,
        role: args.role,
        planFrom: args.planFrom ?? null,
        durationMs: Math.round(durationMs),
        durationApiMs: parsed.duration_api_ms,
        promptEvalCount: parsed.usage.input_tokens + parsed.usage.cache_creation_input_tokens + parsed.usage.cache_read_input_tokens,
        evalCount: parsed.usage.output_tokens,
        doneReason: parsed.stop_reason,
        totalCostUsd: parsed.total_cost_usd,
        cliFreshInputTokens: parsed.usage.input_tokens,
        cliCacheCreationTokens: parsed.usage.cache_creation_input_tokens,
        cliCacheReadTokens: parsed.usage.cache_read_input_tokens,
        timestamp: new Date().toISOString(),
        note: "Run via `claude -p`. Cache tokens reflect CLI default-system-prompt overhead, not the eval prompt itself.",
      },
      null,
      2,
    ),
  );

  if (args.role === "plan") {
    await writeFile(join(runDir, "plan.md"), parsed.result.trim());
  } else {
    if (planText) await writeFile(join(runDir, "plan.md"), planText);
    const { html, ts } = extractCode(parsed.result);
    if (!html || !ts) {
      console.error(`[${slug}] WARNING: failed to extract code blocks (html=${!!html}, ts=${!!ts}).`);
    } else {
      await writeFile(join(runDir, "index.html"), html);
      await writeFile(join(runDir, "snake.ts"), ts);
    }
  }

  console.log(`[${slug}] wrote ${runDir}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
