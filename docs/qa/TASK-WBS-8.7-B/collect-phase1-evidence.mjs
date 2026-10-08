import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
const dir = "docs/qa/TASK-WBS-8.7-B/";
const base = "8f60c8b94d3f5148abeb414d0d8e209e5d736cea";
const upstream = "97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1";
const ancestor = "f08daa9f8aa9b459fbd294f08e4bd29e16624647";
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  }).trimEnd();
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const changes = git("diff", "--name-status", ancestor, upstream)
  .split("\n")
  .map((line) => {
    const [status, path] = line.split("\t");
    const exists =
      spawnSync("git", ["cat-file", "-e", `${base}:${path}`], {
        windowsHide: true,
      }).status === 0;
    return {
      status,
      path,
      sourceCommit: upstream,
      sourceBlob: git("rev-parse", `${upstream}:${path}`),
      developBlob: exists ? git("rev-parse", `${base}:${path}`) : null,
    };
  });
const merge = spawnSync("git", ["merge-tree", "--write-tree", base, upstream], {
  encoding: "utf8",
  windowsHide: true,
  maxBuffer: 8 * 1024 * 1024,
});
if (merge.status !== 1)
  throw new Error(
    "Expected independently verified conflict; re-audit changed inputs",
  );
writeFileSync(dir + "merge-tree.txt", merge.stdout);
const tree = merge.stdout.split("\n")[0];
const merged = git("show", `${tree}:docs/project/WBS-TravelAssist.md`).split(
  "\n",
);
const start = merged.findIndex((line) => line.startsWith("<<<<<<<"));
const finish = merged.findIndex((line) => line.startsWith(">>>>>>>"));
const snippet =
  merged
    .slice(start - 3, finish + 4)
    .map((line, i) => `${start - 2 + i}: ${line}`.trimEnd())
    .join("\n") + "\n";
writeFileSync(dir + "wbs-conflict-excerpt.txt", snippet);
const sources = {
  develop: git("show", `${base}:docs/project/WBS-TravelAssist.md`)
    .split("\n")
    .flatMap((line, i) =>
      /\| 6\.1[034]\s/.test(line) ? [{ line: i + 1, text: line }] : [],
    ),
  upstream: git("show", `${upstream}:docs/project/WBS-TravelAssist.md`)
    .split("\n")
    .flatMap((line, i) =>
      /\| 6\.1[034]\s/.test(line) ? [{ line: i + 1, text: line }] : [],
    ),
};
const probesource = git(
  "show",
  `${upstream}:src/shared/contracts/ai-conversation/runtime.ts`,
);
const js = ts.transpileModule(probesource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { applyAiConversationEventV1: apply } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const common = {
  contractVersion: "1.0",
  conversationId: "audit-conversation",
  turnId: "audit-turn",
  traceId: "audit-trace",
  correlationId: null,
  occurredAt: "2026-10-08T00:00:00.000Z",
};
const startEvent = {
  ...common,
  type: "turn.started",
  eventId: "audit-event-0",
  sequence: 0,
  userMessage: {
    contractVersion: "1.0",
    id: "audit-user-message",
    role: "user",
    createdAt: common.occurredAt,
    blocks: [{ type: "text", text: "Synthetic audit only" }],
  },
  assistantMessageId: "audit-assistant-message",
};
const delta = {
  ...common,
  type: "text.delta",
  eventId: "audit-event-1",
  sequence: 1,
  messageId: "audit-assistant-message",
  delta: "X",
};
let state = apply(null, startEvent);
state = apply(apply(state, delta), delta);
const duplicateDeltaText = state.messages.find((m) => m.role === "assistant")
  .blocks[0].text;
state = apply(state, {
  ...common,
  type: "turn.completed",
  eventId: "audit-event-2",
  sequence: 2,
  message: {
    contractVersion: "1.0",
    id: "audit-assistant-message",
    role: "assistant",
    createdAt: common.occurredAt,
    blocks: [{ type: "text", text: "Final" }],
  },
  usage: {
    inputTokens: 1,
    outputTokens: 1,
    cachedInputTokens: 0,
    toolCalls: 0,
    toolRounds: 0,
  },
});
state = apply(state, delta);
const lateDeltaText = state.messages.find((m) => m.role === "assistant")
  .blocks[0].text;
const toolState = apply(state, {
  ...common,
  type: "tool.completed",
  eventId: "audit-event-3",
  sequence: 3,
  toolCallId: "audit-tool",
  toolName: "user.preference.get",
  status: "completed",
});
const evidence = {
  schemaVersion: "1.0",
  task: "WBS-8.7-B-Phase1",
  recordedAt: new Date().toISOString(),
  status: "CONTRACT_REVIEW_REQUIRED",
  baseDevelopSha: base,
  upstreamHeadSha: upstream,
  mergeBaseSha: ancestor,
  documentBranchSha: "c8c1a36d27a3314fe69fda51868092ced7bba214",
  initialWorktree: { statusShort: "", branch: "(detached)", head: base },
  branch: git("branch", "--show-current"),
  canonicalOwner: "A",
  executor: "B",
  upstreamBranchModified: false,
  applicationCodeModified: false,
  mergeAudit: {
    command: `git merge-tree --write-tree ${base} ${upstream}`,
    exitCode: merge.status,
    resultTree: tree,
    conflictPaths: ["docs/project/WBS-TravelAssist.md"],
    markerLines: { start: start + 1, end: finish + 1 },
    sourceLines: sources,
    rawSha256: sha256(merge.stdout),
  },
  changedFileCount: changes.length,
  changedFiles: changes,
  upstreamReducerProbe: {
    scope:
      "Exact upstream runtime.ts transpiled in memory; synthetic input; NOT integrated runtime QA",
    sourceSha256: sha256(probesource),
    duplicateDeltaText,
    expectedIfDeduplicated: "X",
    lateDeltaText,
    terminalTextIfGuarded: "Final",
    toolEventLeavesProjectionUnchanged: toolState === state,
  },
  baselineTests: [],
  notRun: [
    {
      gate: "PR426 latest-develop integrated tests",
      reason:
        "No runtime integration in Phase 1; upstream historical PASS is not current baseline evidence",
    },
    {
      gate: "Schema/migration/RLS/persistence E2E",
      reason: "Forbidden until contract approval and Phase 2 authorization",
    },
    {
      gate: "full lint/typecheck/build/Quality Gate locally",
      reason:
        "Phase 1 documentation and read-only audit only; not claimed PASS; PR checks reported separately",
    },
  ],
};
for (const [label, args] of [
  [
    "ai-runtime",
    [
      "--conditions=react-server",
      "--import",
      "./tests/register-route-ts.mjs",
      "--test",
      "--test-reporter=tap",
      "tests/task-076-ai-runtime.test.mjs",
    ],
  ],
  [
    "personal-history",
    [
      "--import",
      "./tests/register-route-ts.mjs",
      "--test",
      "--test-reporter=tap",
      "tests/task-082-personal-ai-history.test.mjs",
    ],
  ],
]) {
  const startedAt = new Date().toISOString();
  const run = spawnSync(process.execPath, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  const log = (run.stdout ?? "") + (run.stderr ?? "");
  writeFileSync(dir + `baseline-${label}.log`, log);
  const number = (key) =>
    Number(log.match(new RegExp("^# " + key + " (\\d+)", "m"))?.[1] ?? -1);
  evidence.baselineTests.push({
    label,
    command: "node " + args.join(" "),
    head: git("rev-parse", "HEAD"),
    sourceTree: git("rev-parse", `${base}^{tree}`),
    startedAt,
    endedAt: new Date().toISOString(),
    exitCode: run.status,
    status: run.status === 0 ? "PASS" : "FAIL",
    tests: number("tests"),
    passed: number("pass"),
    failed: number("fail"),
    skipped: number("skipped"),
    log: `baseline-${label}.log`,
    logSha256: sha256(log),
  });
}
writeFileSync(
  dir + "phase1-evidence.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      conflict: evidence.mergeAudit,
      probe: evidence.upstreamReducerProbe,
      tests: evidence.baselineTests,
    },
    null,
    2,
  ),
);
if (evidence.baselineTests.some((t) => t.exitCode !== 0)) process.exitCode = 1;
