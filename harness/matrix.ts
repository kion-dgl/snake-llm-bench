import { spawn } from "node:child_process";

const MODELS = [
  "qwen3-coder:480b-cloud",
  "gpt-oss:120b-cloud",
  "kimi-k2:1t-cloud",
  "deepseek-v4-pro:cloud",
];

const ROLES = ["plan", "full"] as const;

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("close", (c) => resolve(c ?? 1));
  });
}

async function main() {
  for (const model of MODELS) {
    for (const role of ROLES) {
      console.log(`\n=== ${model} / ${role} ===`);
      const code = await run("bun", ["harness/eval.ts", "--model", model, "--role", role]);
      if (code !== 0) console.error(`  exit ${code}`);
    }
  }

  console.log(`\n=== mixed runs: each model plans, qwen3-coder writes ===`);
  const CODER = "qwen3-coder:480b-cloud";
  for (const planner of MODELS) {
    if (planner === CODER) continue;
    const planSlug = `${planner.replace(/[:/]/g, "_")}__plan`;
    const label = `mixed__${planner.replace(/[:/]/g, "_")}_plan__qwen3coder_code`;
    console.log(`\n--- planner=${planner}, coder=${CODER} ---`);
    const code = await run("bun", [
      "harness/eval.ts",
      "--model", CODER,
      "--role", "code",
      "--plan-from", `runs/${planSlug}`,
      "--label", label,
    ]);
    if (code !== 0) console.error(`  exit ${code}`);
  }

  console.log(`\n=== scoring all runs ===`);
  await run("bun", ["harness/score.ts", "--all"]);
}

main();
