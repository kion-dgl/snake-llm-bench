import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SingleRun {
  dir: string;
  model: string;
  role: string;
  passed: number;
  total: number;
  scorePct: number;
  timeSec: number | null;
  tokens: number | null;
  note: string;
  failedChecks: string[];
}

export interface GroupedRun {
  baseDir: string;
  model: string;
  role: string;
  attempts: SingleRun[];
  finalScorePct: number;
  finalScoreText: string;
  retriesUsed: number;
  retriesFailed: boolean;
  totalTimeSec: number | null;
  totalTokens: number | null;
  note: string;
}

async function loadSingleRun(root: string, runsRoot: string, dir: string): Promise<SingleRun> {
  let passed = 0, total = 0, scorePct = 0;
  const failedChecks: string[] = [];
  try {
    const s = JSON.parse(await readFile(join(root, runsRoot, dir, "score.json"), "utf8"));
    passed = s.passed; total = s.total; scorePct = s.score ?? (total ? passed / total : 0);
    for (const r of s.results ?? []) if (!r.pass) failedChecks.push(r.name);
  } catch {}
  let model = "?", role = "?", note = "";
  let timeSec: number | null = null, tokens: number | null = null;
  try {
    const m = JSON.parse(await readFile(join(root, runsRoot, dir, "meta.json"), "utf8"));
    model = m.model ?? "?";
    role = m.role ?? "?";
    timeSec = m.durationMs != null ? m.durationMs / 1000 : null;
    tokens = m.evalCount ?? null;
    note = m.note ?? "";
  } catch {}
  return { dir, model, role, passed, total, scorePct, timeSec, tokens, note, failedChecks };
}

export async function loadRuns(root: string, runsRoot: string): Promise<GroupedRun[]> {
  const entries = await readdir(join(root, runsRoot), { withFileTypes: true }).catch(() => []);
  const allDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const retryRe = /^(.+?)__retry(\d+)$/;
  const baseDirs = allDirs.filter((d) => !retryRe.test(d));
  const retryByBase = new Map<string, { n: number; dir: string }[]>();
  for (const d of allDirs) {
    const m = d.match(retryRe);
    if (m) {
      const base = m[1]!;
      const n = Number(m[2]);
      if (!retryByBase.has(base)) retryByBase.set(base, []);
      retryByBase.get(base)!.push({ n, dir: d });
    }
  }
  for (const arr of retryByBase.values()) arr.sort((a, b) => a.n - b.n);

  const groups: GroupedRun[] = [];
  for (const base of baseDirs) {
    const baseRun = await loadSingleRun(root, runsRoot, base);
    const retries = retryByBase.get(base) ?? [];
    const retryRuns = await Promise.all(retries.map((r) => loadSingleRun(root, runsRoot, r.dir)));
    const attempts = [baseRun, ...retryRuns];
    const final = attempts[attempts.length - 1]!;
    const passedFinal = final.scorePct === 1;
    const retriesUsed = passedFinal
      ? (retryRuns.findIndex((r) => r.scorePct === 1) + 1 || retryRuns.length)
      : retryRuns.length;
    const totalTime = attempts.reduce<number | null>(
      (sum, a) => (sum == null || a.timeSec == null ? (a.timeSec ?? sum) : sum + a.timeSec),
      null,
    );
    const totalTokens = attempts.reduce<number | null>(
      (sum, a) => (sum == null || a.tokens == null ? (a.tokens ?? sum) : sum + a.tokens),
      null,
    );
    groups.push({
      baseDir: base,
      model: baseRun.model,
      role: baseRun.role,
      attempts,
      finalScorePct: final.scorePct,
      finalScoreText: `${final.passed}/${final.total}`,
      retriesUsed,
      retriesFailed: !passedFinal && retries.length > 0,
      totalTimeSec: totalTime,
      totalTokens,
      note: baseRun.note,
    });
  }

  groups.sort((a, b) => {
    if (b.finalScorePct !== a.finalScorePct) return b.finalScorePct - a.finalScorePct;
    if (a.retriesUsed !== b.retriesUsed) return a.retriesUsed - b.retriesUsed;
    if (a.attempts[0]!.timeSec != null && b.attempts[0]!.timeSec != null)
      return a.attempts[0]!.timeSec - b.attempts[0]!.timeSec;
    return a.baseDir.localeCompare(b.baseDir);
  });
  return groups;
}

function fmtTime(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, "0")}s`;
}

function fmtTokens(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function scoreColor(pct: number, hasAny: boolean): string {
  if (!hasAny) return "#666";
  if (pct === 1) return "#7ed957";
  if (pct >= 0.7) return "#e6c84c";
  return "#e06c6c";
}

function trajectoryChips(attempts: SingleRun[]): string {
  return attempts
    .map((a, i) => {
      const label = i === 0 ? `base` : `r${i}`;
      const color = scoreColor(a.scorePct, a.total > 0);
      return `<span class=chip style="border-color:${color};color:${color}" title="${a.dir}">${label} ${a.passed}/${a.total}</span>`;
    })
    .join(`<span class=arrow>→</span>`);
}

export function renderIndex(
  groups: GroupedRun[],
  opts: {
    runsRoot: string;            // "runs" or "runs2"
    roundLabel: string;
    otherRoundHref: string;      // "round2.html" or "index.html"
    otherRoundLabel: string;
  },
): string {
  const { runsRoot, roundLabel, otherRoundHref, otherRoundLabel } = opts;
  const mainRows = groups
    .map((g) => {
      const base = g.attempts[0]!;
      const final = g.attempts[g.attempts.length - 1]!;
      const playDir = g.finalScorePct === 1 ? final.dir : base.dir;
      const filesLinks = [
        `<a href="${runsRoot}/${playDir}/index.html">play</a>`,
        `<a href="${runsRoot}/${base.dir}/raw.txt">raw</a>`,
        `<a href="${runsRoot}/${base.dir}/plan.md">plan</a>`,
        `<a href="${runsRoot}/${final.dir}/score.json">score</a>`,
        `<a href="${runsRoot}/${base.dir}/meta.json">meta</a>`,
      ].join(" · ");
      const trajectoryCell = g.attempts.length === 1
        ? `<span class=chip style="border-color:${scoreColor(g.finalScorePct, final.total > 0)};color:${scoreColor(g.finalScorePct, final.total > 0)}">first-try ${g.finalScoreText}</span>`
        : trajectoryChips(g.attempts);
      return `<tr>
        <td><a href="${runsRoot}/${playDir}/index.html">${g.model}</a><div class=sub>${g.role} · <code>${g.baseDir}</code></div></td>
        <td style="color:${scoreColor(g.finalScorePct, final.total > 0)};font-weight:600">${g.finalScoreText}</td>
        <td class=traj>${trajectoryCell}</td>
        <td>${fmtTime(g.totalTimeSec)}${g.attempts.length > 1 ? `<div class=sub>sum of ${g.attempts.length} calls</div>` : ""}</td>
        <td>${fmtTokens(g.totalTokens)}</td>
        <td class=notes>${final.failedChecks.length ? `failed: ${final.failedChecks.join(", ")}` : g.note}</td>
        <td class=files>${filesLinks}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Snake LLM Bench — ${roundLabel}</title>
<style>
  body{font:14px/1.4 system-ui,sans-serif;margin:1em;background:#111;color:#eee}
  a{color:#7cf;text-decoration:none}
  a:hover{text-decoration:underline}
  code{font-size:12px;color:#999}
  table{border-collapse:collapse;width:100%;max-width:1200px}
  td,th{padding:8px 10px;border-bottom:1px solid #2a2a2a;text-align:left;vertical-align:top}
  th{background:#1c1c1c;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#bbb}
  .sub{font-size:12px;color:#888;margin-top:2px}
  .notes{font-size:12px;color:#bbb;max-width:260px}
  .files{font-size:12px;white-space:nowrap}
  .traj{white-space:nowrap}
  .chip{display:inline-block;padding:2px 7px;border-radius:8px;border:1px solid #444;font-size:11px;font-variant-numeric:tabular-nums}
  .arrow{color:#666;margin:0 4px;font-size:11px}
  h1{font-size:20px;margin-bottom:6px}
  .meta{color:#888;font-size:13px;margin-bottom:14px}
  .nav{margin-bottom:14px;font-size:13px}
  .nav a{margin-right:12px}
</style>
<h1>Snake LLM Bench <span style="font-size:14px;color:#888;font-weight:normal">— ${roundLabel}</span></h1>
<div class=nav><a href="${otherRoundHref}">${otherRoundLabel}</a> · <a href="https://github.com/kion-dgl/snake-llm-bench">source on github</a></div>
<div class=meta>${groups.length} model groups · sorted by final score, then retries used, then base-call speed</div>
<table>
<thead><tr><th>Model</th><th>Final score</th><th>Trajectory (per try)</th><th>Total time</th><th>Total tokens</th><th>Notes</th><th>Files</th></tr></thead>
<tbody>${mainRows}</tbody>
</table>`;
}
