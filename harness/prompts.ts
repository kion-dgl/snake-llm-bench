export const PLAN_PROMPT = `You are designing a Snake game.

Stack: vanilla TypeScript + HTML5 Canvas. No frameworks, no build tools beyond \`tsc\`.

Produce a concise implementation plan (max 400 words) covering:
1. Data structures (snake body, food, direction, grid).
2. Game loop (tick rate, update vs render split).
3. Input handling (arrow keys, prevent reversing into self).
4. Render strategy (canvas size, cell size, colors).
5. Game-over conditions (wall collision, self collision).
6. Score display.

Output ONLY the plan as markdown. No code. No preamble.`;

export const CODE_PROMPT_TEMPLATE = (plan: string) => `Implement Snake in vanilla TypeScript + HTML5 Canvas based on this plan:

<plan>
${plan}
</plan>

Requirements:
- Two files: \`index.html\` and \`snake.ts\`.
- The HTML must load the compiled JS via \`<script src="snake.js" defer></script>\`.
- \`snake.ts\` must compile cleanly with \`tsc --target ES2022 --module ES2022 --strict\` (no type errors, no implicit any).
- Arrow keys to control. Visible score. Game-over on wall or self collision.
- The page must contain the literal word "Score" somewhere visible.
- Do not import anything. Browser globals only.

Output exactly two fenced code blocks, in this order, nothing else:

\`\`\`html
<!-- index.html content -->
\`\`\`

\`\`\`typescript
// snake.ts content
\`\`\``;

export const FULL_PROMPT = `Design and implement a Snake game.

Stack: vanilla TypeScript + HTML5 Canvas. No frameworks, no build tools beyond \`tsc\`.

Requirements:
- Two files: \`index.html\` and \`snake.ts\`.
- The HTML must load the compiled JS via \`<script src="snake.js" defer></script>\`.
- \`snake.ts\` must compile cleanly with \`tsc --target ES2022 --module ES2022 --strict\` (no type errors, no implicit any).
- Arrow keys to control. Visible score. Game-over on wall or self collision.
- The page must contain the literal word "Score" somewhere visible.
- Do not import anything. Browser globals only.

Output exactly two fenced code blocks, in this order, nothing else:

\`\`\`html
<!-- index.html content -->
\`\`\`

\`\`\`typescript
// snake.ts content
\`\`\``;

export const FIXUP_PROMPT_TEMPLATE = (
  prevHtml: string,
  prevTs: string,
  failureNotes: string,
) => `You wrote this Snake game in vanilla TypeScript + HTML5 Canvas.

\`\`\`html
${prevHtml}
\`\`\`

\`\`\`typescript
${prevTs}
\`\`\`

Automated testing found these problems:

${failureNotes}

Fix every problem and re-emit the complete files. Same constraints as before:
- Two files: \`index.html\` and \`snake.ts\`.
- \`<script src="snake.js" defer></script>\` exactly — do not use \`type="module"\`.
- \`snake.ts\` must compile cleanly with \`tsc --target ES2022 --module ES2022 --strict\` (no type errors, no implicit any, satisfies \`strictPropertyInitialization\` and \`strictNullChecks\`).
- Arrow keys to control. Visible "Score" text. Game-over on wall or self collision. Snake must keep moving without input (continuous game loop).
- Browser globals only. No imports. No \`type="module"\`.

Output exactly two fenced code blocks, in this order, nothing else:

\`\`\`html
<!-- index.html content -->
\`\`\`

\`\`\`typescript
// snake.ts content
\`\`\``;

export interface ExtractedCode {
  html: string | null;
  ts: string | null;
}

export function extractCode(response: string): ExtractedCode {
  const htmlMatch = response.match(/```(?:html|HTML)\s*\n([\s\S]*?)\n```/);
  const tsMatch = response.match(/```(?:typescript|ts|TypeScript|TS)\s*\n([\s\S]*?)\n```/);
  return {
    html: htmlMatch?.[1]?.trim() ?? null,
    ts: tsMatch?.[1]?.trim() ?? null,
  };
}
