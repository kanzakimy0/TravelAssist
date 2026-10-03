import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preflightPhaseHeaders } from "../tools/transport/task-086-remediate.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  actions = [
    { actionId: "primary" },
    { actionId: "corroborating" },
    { actionId: "native" },
  ],
  phase = () => ({
    phaseId: "phase-test",
    strategy: ["source", "method"],
    facts: [
      {
        factId: "f",
        kind: "service",
        sourceActionId: "primary",
        corroboratingEvidence: [{ sourceActionId: "corroborating" }],
      },
    ],
    completedActionIds: ["primary"],
  });
test("existing strategy fingerprints retain explicit string, array, object and JSON scalar forms", () => {
  for (const strategy of [
    "source/method",
    ["source", "method"],
    { source: "official", method: "exact" },
    17,
    true,
    [],
  ]) {
    const p = phase();
    p.strategy = strategy;
    const before = JSON.stringify(p);
    assert.equal(preflightPhaseHeaders([p], actions), 1);
    assert.equal(JSON.stringify(p), before);
  }
});
test("licensed and derived native-only phases retain empty facts and exact existing actions", () => {
  for (const key of ["licensedGtfsPackages", "derivedGtfsPackages"]) {
    const p = phase();
    p.facts = [];
    p.completedActionIds = ["native"];
    p[key] = [{ sourceActionId: "native", packageFile: "native.json" }];
    assert.equal(preflightPhaseHeaders([p], actions), 1);
  }
});
test("source actions need not all be marked complete in each phase; corroborating fallback is preserved", () => {
  const p = phase();
  p.completedActionIds = [];
  p.facts[0].corroboratingEvidence = [{}];
  assert.equal(preflightPhaseHeaders([p], actions), 1);
});
for (const [name, mutate, error] of [
  ["missing phaseId", (p) => delete p.phaseId, /PHASE_HEADER_PHASE_ID_INVALID/],
  ["blank phaseId", (p) => (p.phaseId = " "), /PHASE_HEADER_PHASE_ID_INVALID/],
  [
    "missing strategy",
    (p) => delete p.strategy,
    /PHASE_HEADER_STRATEGY_REQUIRED/,
  ],
  [
    "undefined strategy",
    (p) => (p.strategy = undefined),
    /PHASE_HEADER_STRATEGY_REQUIRED/,
  ],
  [
    "null strategy",
    (p) => (p.strategy = null),
    /PHASE_HEADER_STRATEGY_REQUIRED/,
  ],
  [
    "nonserializable strategy",
    (p) => (p.strategy = 1n),
    /PHASE_HEADER_STRATEGY_NOT_JSON/,
  ],
  [
    "nonfinite strategy",
    (p) => (p.strategy = Infinity),
    /PHASE_HEADER_STRATEGY_NOT_JSON/,
  ],
  ["missing facts", (p) => delete p.facts, /PHASE_HEADER_FACTS_REQUIRED/],
  ["facts object", (p) => (p.facts = {}), /PHASE_HEADER_FACTS_REQUIRED/],
  [
    "missing completed actions",
    (p) => delete p.completedActionIds,
    /PHASE_HEADER_COMPLETED_ACTION_IDS_REQUIRED/,
  ],
  [
    "completed actions string",
    (p) => (p.completedActionIds = "primary"),
    /PHASE_HEADER_COMPLETED_ACTION_IDS_REQUIRED/,
  ],
  [
    "unknown completed action",
    (p) => (p.completedActionIds = ["missing"]),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "duplicate completed action",
    (p) => (p.completedActionIds = ["primary", "primary"]),
    /PHASE_HEADER_DUPLICATE_COMPLETED_ACTION/,
  ],
  [
    "unknown fact action",
    (p) => (p.facts[0].sourceActionId = "missing"),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "unknown corroborating action",
    (p) => (p.facts[0].corroboratingEvidence[0].sourceActionId = "missing"),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "unknown condition observation action",
    (p) => (p.facts[0].conditionObservations = [{ sourceActionId: "missing" }]),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "unknown native package action",
    (p) => (p.licensedGtfsPackages = [{ sourceActionId: "missing" }]),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "unknown derived package action",
    (p) => (p.derivedGtfsPackages = [{ sourceActionId: "missing" }]),
    /PHASE_HEADER_ACTION_NOT_FOUND/,
  ],
  [
    "malformed package list",
    (p) => (p.licensedGtfsPackages = {}),
    /PHASE_HEADER_PACKAGE_ARRAY_REQUIRED/,
  ],
  [
    "missing factId",
    (p) => delete p.facts[0].factId,
    /PHASE_HEADER_FACT_ID_INVALID/,
  ],
  [
    "duplicate factId",
    (p) => p.facts.push(structuredClone(p.facts[0])),
    /PHASE_HEADER_DUPLICATE_FACT_ID/,
  ],
  [
    "unknown fact kind",
    (p) => (p.facts[0].kind = "unknown"),
    /PHASE_HEADER_FACT_KIND_INVALID/,
  ],
])
  test(name + " fails before replay", () => {
    const p = phase();
    mutate(p);
    assert.throws(() => preflightPhaseHeaders([p], actions), error);
  });
test("duplicate phase/action identities are not silently selected", () => {
  assert.throws(
    () => preflightPhaseHeaders([phase(), phase()], actions),
    /DUPLICATE_PHASE_ID/,
  );
  assert.throws(
    () =>
      preflightPhaseHeaders([phase()], [...actions, { actionId: "primary" }]),
    /DUPLICATE_ACTION_ID/,
  );
});
test("all currently registered phase headers and exact action references pass without replay", () => {
  const base = path.join(root, "data/transport/network"),
    files = fs
      .readdirSync(path.join(base, "research/phases"))
      .filter((n) => n.endsWith(".json")),
    phases = files.map((n) =>
      JSON.parse(
        fs.readFileSync(path.join(base, "research/phases", n), "utf8"),
      ),
    ),
    registered = fs
      .readFileSync(path.join(base, "next-source-actions.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
  assert.equal(preflightPhaseHeaders(phases, registered), files.length);
});
test("real remediation entry rejects a bad header before checkpoint reads or output writes", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task086-phase-header-")),
    tools = path.join(tmp, "tools/transport"),
    net = path.join(tmp, "data/transport/network"),
    output = path.join(tmp, "must-not-exist");
  fs.mkdirSync(tools, { recursive: true });
  fs.mkdirSync(path.join(net, "research/phases"), { recursive: true });
  const seen = new Set();
  function copy(name) {
    if (seen.has(name)) return;
    seen.add(name);
    const bytes = fs.readFileSync(path.join(root, "tools/transport", name));
    fs.writeFileSync(path.join(tools, name), bytes);
    for (const m of bytes
      .toString("utf8")
      .matchAll(/from\s+["']\.\/([^"']+)["']/g))
      if (m[1].endsWith(".mjs")) copy(m[1]);
  }
  try {
    copy("task-086-remediate.mjs");
    const p = phase();
    delete p.strategy;
    fs.writeFileSync(
      path.join(net, "research/phases/001-invalid.json"),
      JSON.stringify(p),
    );
    fs.writeFileSync(
      path.join(net, "next-source-actions.jsonl"),
      actions.map((a) => JSON.stringify(a)).join("\n") + "\n",
    );
    const isolated = await import(
      pathToFileURL(path.join(tools, "task-086-remediate.mjs"))
    );
    assert.throws(
      () => isolated.runRemediation({ output }),
      /PHASE_HEADER_STRATEGY_REQUIRED:phase-test/,
    );
    assert.equal(fs.existsSync(path.join(net, "checkpoints")), false);
    assert.equal(fs.existsSync(output), false);
  } finally {
    const relative = path.relative(os.tmpdir(), tmp);
    assert(
      relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
