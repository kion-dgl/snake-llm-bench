const OLLAMA = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export interface GenerateResult {
  model: string;
  response: string;
  durationMs: number;
  totalDurationNs?: number;
  promptEvalCount?: number;
  evalCount?: number;
}

interface GenerateChunk {
  response?: string;
  thinking?: string;
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export async function generate(model: string, prompt: string): Promise<GenerateResult & { thinking?: string; doneReason?: string }> {
  const t0 = performance.now();
  const options: Record<string, unknown> = { temperature: 0.2, num_predict: 16384, num_ctx: 16384 };
  const reasoning = process.env.OLLAMA_REASONING_EFFORT;
  if (reasoning) options.reasoning_effort = reasoning;
  const npOverride = process.env.OLLAMA_NUM_PREDICT;
  if (npOverride) options.num_predict = Number(npOverride);
  const ncOverride = process.env.OLLAMA_NUM_CTX;
  if (ncOverride) options.num_ctx = Number(ncOverride);
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options,
    }),
    // Bun-specific: disable the default fetch timeout so slow CPU inference doesn't get killed mid-stream
    ...({ timeout: false } as Record<string, unknown>),
  });
  if (!res.ok || !res.body) {
    throw new Error(`ollama ${res.status}: ${await res.text()}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let response = "";
  let thinking = "";
  let final: GenerateChunk = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let chunk: GenerateChunk;
      try { chunk = JSON.parse(line); } catch { continue; }
      if (chunk.response) response += chunk.response;
      if (chunk.thinking) thinking += chunk.thinking;
      if (chunk.done) final = chunk;
    }
  }
  return {
    model,
    response,
    thinking: thinking || undefined,
    doneReason: final.done_reason,
    durationMs: performance.now() - t0,
    totalDurationNs: final.total_duration,
    promptEvalCount: final.prompt_eval_count,
    evalCount: final.eval_count,
  };
}

export function slugifyModel(m: string): string {
  return m.replace(/[:/]/g, "_");
}
