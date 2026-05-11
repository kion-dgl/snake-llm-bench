import type { GenerateResult } from "./ollama.ts";

const ENDPOINT = process.env.LMSTUDIO_URL ?? "http://localhost:1234/v1/chat/completions";

interface ChatChunk {
  choices?: Array<{
    delta?: { content?: string; reasoning?: string };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

export async function generate(
  model: string,
  prompt: string,
): Promise<GenerateResult & { thinking?: string; doneReason?: string }> {
  const t0 = performance.now();
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    temperature: 0.2,
  };
  const maxTokens = process.env.LMSTUDIO_MAX_TOKENS;
  if (maxTokens) body.max_tokens = Number(maxTokens);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...({ timeout: false } as Record<string, unknown>),
  });
  if (!res.ok || !res.body) {
    throw new Error(`lmstudio ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let response = "";
  let reasoning = "";
  let finishReason: string | undefined;
  let usage: ChatChunk["usage"] | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let chunk: ChatChunk;
      try { chunk = JSON.parse(payload); } catch { continue; }
      const choice = chunk.choices?.[0];
      if (choice?.delta?.content) response += choice.delta.content;
      if (choice?.delta?.reasoning) reasoning += choice.delta.reasoning;
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (chunk.usage) usage = chunk.usage;
    }
  }

  return {
    model,
    response,
    thinking: reasoning || undefined,
    doneReason: finishReason,
    durationMs: performance.now() - t0,
    promptEvalCount: usage?.prompt_tokens,
    evalCount: usage?.completion_tokens,
  };
}
