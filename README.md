# Snake LLM Bench

Small benchmark comparing 20+ LLMs on the same task: build a vanilla TypeScript + HTML5 Canvas Snake game. Same prompt, same automated grader, same retry budget. Measures **first-pass capability**, **recoverability with one round of error feedback**, and **token / wall-clock efficiency** across providers (Ollama cloud + local, OpenRouter, Claude CLI).

🔗 **[Live results — Round 1 & Round 2](https://kion-dgl.github.io/snake-llm-bench/)**

## Headline findings

- **The "is Claude worth it?" gap is small and lives in the ambiguous-prompt regime.** On a tight spec (Round 2), `gemini-2.5-flash`, `mistral-large-3:675b`, `grok-4.3`, `claude-opus`, `gpt-5-mini`, `gemma-4-26b`, `kimi-k2.6`, and `gpt-oss:20b` all pass 13/13 first try. The gap appears only when the prompt is under-specified.
- **`gpt-oss:20b` matches the cloud-class models on quality when given a strict spec.** Speed is the only cost — minutes on CPU, seconds on GPU. If your workflow includes spec-writing, a 16GB-VRAM machine is enough.
- **Reasoning models lose on ambiguous tasks, win on strict ones.** Kimi-k2.6, deepseek-v4-pro, gpt-5-codex failed or struggled on Round 1's loose prompt. On Round 2 they passed first try. The detail of the spec is the discriminator.
- **One retry round closes almost every failure.** 8 of 10 models that failed Round 1's compile check fixed themselves when sent the error log back. The first-pass gap is care, not capability.
- **Two exceptions don't recover.** `qwen3-coder-next` (a generation artifact — emits literal token-fusion typos like `thisgridSize`) and `gemma-3-27b-it` (consistent `null`/`undefined` confusion) failed even after 3 retries with the full spec.

See the [live results page](https://kion-dgl.github.io/snake-llm-bench/) for the full standings.

## Methodology

Two prompts, in increasing specificity:

- **Round 1** — `harness/prompts.ts:FULL_PROMPT`. Loose: "design and implement Snake, vanilla TS, HTML5 Canvas, strict compile, arrow keys, visible Score, game over on wall/self collision."
- **Round 2** — [`prompts/snake-spec.md`](prompts/snake-spec.md). Tight: exact 20×20 grid, tick speed-up curve, paused-start with Space, R to restart, localStorage high score, required class shape, color palette.

Each model run is captured as a self-contained directory:

```
runs[2]/<model-slug>__full/
  prompt.txt        # exact prompt sent
  raw.txt           # raw response
  thinking.txt      # if the model emitted reasoning tokens separately
  meta.json         # model, duration, tokens, doneReason
  index.html        # extracted from response
  snake.ts          # extracted from response
  snake.js          # compiled by scorer
  score.json        # per-check pass/fail
  tsconfig.score.json
```

If the run doesn't score perfectly, `harness/fixup.ts` sends the failed checks back to the same model (up to N times) and writes the retries as sibling `__retry1/`, `__retry2/`, etc.

### Automated checks

**Round 1 (9 checks)** — compile under `--strict`, page loads, no console errors, canvas exists at non-zero size, contains "Score" text, animates without input, responds to arrow keys.

**Round 2 (13 checks)** — all of Round 1 plus exact 400×400 canvas, `Score:` and `High:` labels, `class Game` defined, `snake.high` localStorage key, starts paused (no animation before Space), Space starts the game, arrow keys steer, R resets to `Score: 0`.

Compile checks run with an isolated `tsconfig.score.json` (`types: []`, `typeRoots: []`) so the project's `@types/bun` doesn't leak globals into the eval. Runtime checks use headless Chromium via Playwright.

## Running it yourself

```bash
bun install

# round 1, one model
bun harness/eval.ts --model qwen3-coder:480b-cloud --role full
bun harness/score.ts runs/qwen3-coder_480b-cloud__full

# round 2, one model (uses prompts/snake-spec.md)
bun harness/round2.ts --model google/gemini-2.5-flash

# fixup an existing failed run (up to N retries)
bun harness/fixup.ts --base runs2/google_gemma-3-27b-it__full --max-retries 3 --spec-file prompts/snake-spec.md --round 2

# regenerate static site for GitHub Pages
bun harness/build-docs.ts

# local dev server (browse the same standings on localhost)
PORT=4321 bun harness/serve.ts
```

### Providers

The harness dispatches by model name:

| Pattern | Provider | Auth |
|---|---|---|
| `model:tag-cloud` or `model:tag` | local Ollama daemon at `localhost:11434` | none (or `ollama signin` for cloud-plan models) |
| `org/model` (contains `/`) | OpenRouter | `OPENROUTER_API_KEY` in `.env` |
| `PROVIDER=lmstudio` env override | LM Studio at `localhost:1234` (or `LMSTUDIO_URL`) | none |
| (via `harness/claude-run.ts`) | Anthropic via `claude -p` CLI | OAuth via Claude Code |

**Why LM Studio**: useful on hardware where Ollama struggles to engage the GPU. LM Studio uses Vulkan by default, which tends to "just work" on AMD APUs and consumer Radeons where Ollama's ROCm path doesn't auto-detect. Force max GPU offload with `lms load <model> --gpu max`.

Reasoning controls (gpt-oss / kimi-k2.6 etc.) are read from env vars: `OLLAMA_REASONING_EFFORT=low`, `OLLAMA_NUM_PREDICT=16384`, `OLLAMA_NUM_CTX=16384`. See `harness/ollama.ts:14-22`.

## Repository layout

```
prompts/
  snake-spec.md         # Round 2 prompt
harness/
  ollama.ts             # streaming client for /api/generate
  openrouter.ts         # streaming client for OpenRouter SSE
  claude-run.ts         # wrapper around `claude -p --output-format json`
  prompts.ts            # Round 1 prompts + fixup prompt template
  eval.ts               # single-model driver (round 1 or arbitrary --prompt-file)
  fixup.ts              # error-feedback retry loop, --round 1|2, --spec-file
  round2.ts             # round 2 batch driver, --parallel N
  score.ts              # round 1 scorer (9 checks, Playwright)
  score-round2.ts       # round 2 scorer (13 checks)
  render.ts             # shared standings-table renderer
  serve.ts              # dev HTTP server
  build-docs.ts         # static-site generator -> docs/
runs/                   # round 1 outputs
runs2/                  # round 2 outputs
docs/                   # generated static site for GitHub Pages
```

## Notes & caveats

- The cloud-vs-local comparison's wall-clock numbers are not apples-to-apples: cloud models run on someone else's GPUs at full speed, local models in this repo ran on a small CPU-only minipc. The token counts and scores are comparable; treat the cloud "time" numbers as a fair representation of provider experience, but **don't compare cloud time directly to local time** — see each run's `meta.json` for the raw figures.
- The Claude entry without `claude-cli` in its name was authored manually in a Claude Code session, not via the CLI. It exists for reference but isn't directly comparable on time/tokens; the `claude-cli__full` rows are the apples-to-apples Claude data point.
- `runs/claude__full/meta.json` records this with `"note": "..."`.

## License

The harness code is MIT. Model outputs (`runs/`, `runs2/`) are whatever the respective model providers' terms allow.
