# Snake LLM Bench

Small benchmark comparing 20+ LLMs on the same task: build a vanilla TypeScript + HTML5 Canvas Snake game. Same prompt, same automated grader, same retry budget. Measures **first-pass capability**, **recoverability with one round of error feedback**, and **token / wall-clock efficiency** across providers (Ollama cloud + local, OpenRouter, Claude CLI).

🔗 **[Live results — Round 1 & Round 2](https://kion-dgl.github.io/snake-llm-bench/)**

## Headline findings

- **The "is Claude worth it?" gap is small and lives in the ambiguous-prompt regime.** On a tight spec (Round 2), `gemini-2.5-flash`, `mistral-large-3:675b`, `grok-4.3`, `claude-opus`, `gpt-5-mini`, `gemma-4-26b`, `kimi-k2.6`, `deepseek-v4-pro`, `gpt-oss:120b`, `gpt-oss:20b`, and `gpt-5-codex` all pass 13/13 first try. The gap appears only when the prompt is under-specified.
- **`gpt-oss:20b` matches the cloud-class models on quality when given a strict spec.** Speed is the only cost — minutes on CPU, seconds on GPU. If your workflow includes spec-writing, a 16GB-VRAM machine is enough.
- **Reasoning models lose on ambiguous tasks, win on strict ones.** Kimi-k2.6, deepseek-v4-pro, gpt-5-codex failed or struggled on Round 1's loose prompt. On Round 2 they passed first try. The detail of the spec is the discriminator.
- **One retry round closes almost every failure.** 8 of 10 models that failed Round 1's compile check fixed themselves when sent the error log back. The first-pass gap is care, not capability.
- **Three exceptions don't recover.** `qwen3-coder-next` (a generation artifact — emits literal token-fusion typos like `thisgridSize`), `gemma-3-27b-it` (consistent `null`/`undefined` confusion), and the local `gemma4:26b` at ollama's default Q4_K_M quantization (16k tokens of garbage, never emits valid code) failed even after 3 retries with the full spec.

See the [live results page](https://kion-dgl.github.io/snake-llm-bench/) for the full standings.

## Results

### Round 1 — ambiguous prompt (9 automated checks)

| Model | First-try | After retries | Retries used | Total time | Total tokens |
|---|---|---|---|---|---|
| claude-opus (CLI) | **9/9** | 9/9 | 0 | 18s | 1.8k |
| mistral-large-3:675b-cloud | **9/9** | 9/9 | 0 | 20s | 1.3k |
| gpt-oss:120b-cloud | **9/9** | 9/9 | 0 | 29s | 2.1k |
| qwen3-coder:480b-cloud | **9/9** | 9/9 | 0 | 128s | 1.4k |
| claude-opus-4-7 (hand-written) | **9/9** | 9/9 | 0 | — | — |
| gemma4:31b-cloud | 8/9 | 9/9 | 1 | 91s | 3.0k |
| nemotron-3-super:cloud | 6/9 | 9/9 | 1 | 30s | 5.0k |
| qwen3-coder-next:cloud | 2/9 | 9/9 | 1 | 44s | 3.3k |
| deepseek-v4-pro:cloud | 2/9 | 9/9 | 1 | 346s | 9.0k |
| kimi-k2.6:cloud | 2/9 | 9/9 | 1 | 273s | 17.6k |
| gpt-oss:20b (local CPU) | 7/9 | 9/9 | 2 | 1785s | 14.6k |
| glm-5:cloud | 0/9 | 9/9 | 2 | 644s | 22.8k |
| google/gemma-3-27b-it | 7/9 | 7/9 | — *(no fixup attempted; round 1 done before OpenRouter integration)* | 35s | 0.9k |
| qwen3-coder:30b (local CPU) | 0/2 | **0/2** | gave up after 5 — only ever emits HTML block, never TS | 87s × 6 | 1.5k each |

### Round 2 — strict spec (13 automated checks)

| Model | First-try | After retries | Retries used | Total time | Total tokens |
|---|---|---|---|---|---|
| google/gemini-2.5-flash | **13/13** | 13/13 | 0 | 10s | 2.7k |
| x-ai/grok-4.3 | **13/13** | 13/13 | 0 | 23s | 2.6k |
| claude-opus (CLI) | **13/13** | 13/13 | 0 | 26s | 3.3k |
| mistral-large-3:675b-cloud | **13/13** | 13/13 | 0 | 31s | 2.2k |
| gpt-oss:120b-cloud | **13/13** | 13/13 | 0 | 46s | 3.7k |
| openai/gpt-5-mini | **13/13** | 13/13 | 0 | 48s | 4.6k |
| google/gemma-4-26b-a4b-it | **13/13** | 13/13 | 0 | 79s | 2.7k |
| kimi-k2.6:cloud | **13/13** | 13/13 | 0 | 191s | 3.3k |
| deepseek-v4-pro:cloud | **13/13** | 13/13 | 0 | 245s | 7.7k |
| openai/gpt-5-codex | **13/13** | 13/13 | 0 | 299s | 48.6k |
| gpt-oss:20b (local CPU) | **13/13** | 13/13 | 0 | 762s | 6.1k |
| anthropic/claude-haiku-4-5 | 6/7 | 13/13 | 1 | 25s | 5.8k |
| meta-llama/llama-4-scout | 6/7 | 13/13 | 1 | 36s | 4.0k |
| gemma4:31b-cloud | 6/7 | 13/13 | 1 | 40s | 4.7k |
| x-ai/grok-code-fast-1 | 6/7 | 13/13 | 1 | 46s | 6.6k |
| glm-5:cloud | 0/2 | 13/13 | 1 | 261s | 32.4k |
| qwen3-coder:480b-cloud | 6/7 | 13/13 | 1 | 474s | 4.2k |
| nemotron-3-super:cloud | 6/7 | 13/13 | 2 | 150s | 13.4k |
| google/gemma-3-27b-it | 6/7 | **6/7** | gave up after 3 — recurring `null`/`undefined` confusion | 286s | 9.1k |
| qwen3-coder-next:cloud | 6/7 | **6/7** | gave up after 3 — recurring generation artifacts | 295s | 8.2k |
| gemma4:26b (local CPU, Q4_K_M) | 0/2 | **0/2** | gave up after 3 — 16k tokens of garbage each attempt | 7322s | 65.5k |

### Reading the tables

- **First-try** is the score on a single shot, no error feedback.
- **After retries** is the final score after up to N rounds of `harness/fixup.ts` sending compile/runtime errors back to the same model.
- **Total time / total tokens** sum across all attempts (base + retries).
- Local CPU runs are on a minipc with no GPU offload — wall-clock not comparable to cloud rows. The token counts and scores are.
- The two `claude-opus` rows differ in methodology: the CLI version is `claude -p --output-format json`; the hand-written one (`claude-opus-4-7`) was authored in an interactive Claude Code session and exists as a quality reference, not a timing measurement.

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
