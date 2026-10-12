// Read-only verification of downloaded historical artifacts; never runs target tests.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const sha = "4888b4d507ee75d4f6b9914eb1a8d5661813f64b";
const runId = "37422119153";
const directory = process.argv[2] ?? `.artifacts/task-035/baseline/${runId}`;
const hash = (x) => createHash("sha256").update(x).digest("hex");
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const artifact = (name, file) =>
  path.join(directory, `task086-${name}-${sha}`, file);
const metadata = read(path.join(directory, "run.json"));
assert.equal(metadata.headSha, sha);
assert.equal(metadata.attempt, 1);
assert.equal(metadata.event, "push");
assert.equal(metadata.conclusion, "success");
const requiredJobs = [
  "Lint, types, formatting and build",
  "Clean graph / first",
  "Clean graph / second",
  "Retained raw source reproduction",
  "Stable complete graph resume",
  "Deterministic, recovery and published-artifact proof",
  "TASK086 exact-head Quality Gate",
  ...[
    "assets",
    "regression-0",
    "regression-1",
    "regression-2",
    "regression-3",
  ].map((l) => `Full Node regression / ${l}`),
];
for (const name of requiredJobs) {
  const matches = metadata.jobs.filter((j) => j.name === name);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].conclusion, "success");
}
const final = read(
  artifact("final-exact-head", "closeout-publication-final-receipt.json"),
);
const proofPath = artifact(
  "proof",
  "task086-lanes/deterministic-recovery-proof.json",
);
const proof = read(proofPath);
assert.equal(
  final.deterministicRecoveryProofSha256,
  hash(fs.readFileSync(proofPath)),
);
assert.equal(proof.status, "PASS");
assert.equal(proof.binding.checkoutSha, sha);
assert.equal(proof.binding.runId, runId);
assert.equal(proof.binding.runAttempt, "1");
for (const name of [
  "fullDeterministicRebuild",
  "resumeChecksumSkip",
  "exceptionProofInputPreserved",
  "publishedArtifactComparison",
  "resumeCorruptionInvalidation",
])
  assert.equal(proof[name], "PASS");
let checkedInputs = 0;
for (const [file, expected] of Object.entries(proof.binding.bound)) {
  // Current unchanged inputs can match directly. Changed infrastructure is read from the precise Git blob.
  const bytes =
    fs.existsSync(file) && hash(fs.readFileSync(file)) === expected
      ? fs.readFileSync(file)
      : execFileSync("git", ["show", `${sha}:${file}`], {
          maxBuffer: 128 * 1024 * 1024,
        });
  assert.equal(hash(bytes), expected, file);
  checkedInputs++;
}
const canonical = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : item,
  );
assert.equal(
  hash(canonical(proof.binding.bound)),
  proof.binding.inputCodeSha256,
);
const laneReceipts = ["first", "second", "extract", "resume", "corruption"].map(
  (lane) => {
    const file = artifact("proof", `task086-lanes/${lane}.receipt.json`),
      r = read(file);
    assert.equal(r.status, "PASS");
    assert.deepEqual(r.binding, proof.binding);
    return { lane, sha256: hash(fs.readFileSync(file)), status: r.status };
  },
);
const inventory = final.regressionInventory;
assert.deepEqual(Object.values(inventory.lanes).flat().sort(), inventory.files);
assert.equal(new Set(inventory.files).size, inventory.fileCount);
for (const [file, expected] of Object.entries(inventory.fileHashes)) {
  const bytes =
    fs.existsSync(file) && hash(fs.readFileSync(file)) === expected
      ? fs.readFileSync(file)
      : execFileSync("git", ["show", `${sha}:${file}`]);
  assert.equal(hash(bytes), expected, file);
}
const regressions = Object.keys(inventory.lanes).map((lane) => {
  const name = lane === "rebuild" ? "proof" : `regression-${lane}`;
  const prefix = lane === "rebuild" ? "ci/" : "";
  const r = read(artifact(name, prefix + lane + ".json"));
  assert.equal(r.status, "PASS");
  assert.equal(r.exitCode, 0);
  assert.equal(r.signal, null);
  assert.equal(r.error, null);
  assert.equal(r.checkoutSha, sha);
  assert.deepEqual(r.files, inventory.lanes[lane]);
  assert.equal(r.inventorySha256, hash(JSON.stringify(inventory)));
  const log = fs.readFileSync(artifact(name, prefix + lane + ".log"));
  assert.equal(hash(log), r.logSha256);
  const counts = Object.fromEntries(
    [
      ...log
        .toString()
        .matchAll(
          /^ℹ (tests|suites|pass|fail|skipped|cancelled|todo) (\d+)$/gm,
        ),
    ].map((m) => [m[1], Number(m[2])]),
  );
  assert.ok(counts.tests > 0);
  for (const k of ["fail", "skipped", "cancelled", "todo"])
    assert.equal(counts[k], 0);
  return {
    lane,
    selectedFiles: r.files.length,
    counts,
    logSha256: r.logSha256,
    elapsedMs: Date.parse(r.endedAt) - Date.parse(r.startedAt),
  };
});
for (const [key, artifactName, filename] of [
  [
    "eligibility",
    "regression-regression-1",
    "routing-eligibility-receipt.json",
  ],
  [
    "certificationEngineRepair",
    "regression-regression-3",
    "certification-engine-repair-receipt.json",
  ],
]) {
  const bytes = fs.readFileSync(artifact(artifactName, filename));
  const r = JSON.parse(bytes);
  assert.deepEqual(r, final[key]);
  assert.equal(r.status, "PASS");
  assert.equal(r.checkoutSha, sha);
  assert.equal(r.runId, runId);
  assert.equal(r.runAttempt, "1");
  assert.equal(
    hash(bytes),
    final[
      key === "eligibility"
        ? "eligibilityReceiptSha256"
        : "certificationEngineRepairReceiptSha256"
    ],
  );
}
const logs = fs.readFileSync(path.join(directory, "hosted.log"));
assert.ok(logs.toString().includes("node: v24.21.0"));
const summary = {
  schemaVersion: 1,
  mode: "BASELINE",
  status: "PASS_VERIFIED_HISTORICAL_RUN",
  checkoutSha: sha,
  runId,
  runAttempt: "1",
  url: metadata.url,
  event: "push",
  revisionKind: "BRANCH_EXACT_HEAD",
  environment: {
    node: proof.binding.nodeVersion,
    platform: proof.binding.platform,
    runnerImage: "ubuntu-24.04 / 20260927.320.1",
    python:
      "preinstalled python/python3; exact invoked version not recorded by old workflow",
    comparability:
      "Python-version equality UNVERIFIED; do not claim an identical-environment differential",
  },
  inputCodeSha256: proof.binding.inputCodeSha256,
  checkedInputs,
  inventoryFiles: inventory.fileCount,
  inventorySha256: hash(JSON.stringify(inventory)),
  requiredJobs,
  notApplicable: ["ordinary verify (split full-lane event)"],
  regressions,
  laneReceipts,
  logSha256: hash(logs),
  proofSha256: hash(fs.readFileSync(proofPath)),
  finalReceiptSha256: hash(
    fs.readFileSync(
      artifact("final-exact-head", "closeout-publication-final-receipt.json"),
    ),
  ),
  note: "Historical runner lacks per-file event receipts. Exact argv/selection/file hashes, lane log hashes and successful runner summaries verified; cases counted only once from each final footer. Input values not copied.",
};
fs.writeFileSync(
  "docs/qa/TASK-035/phase-2/baseline-evidence.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: summary.status,
    checkedInputs,
    files: inventory.fileCount,
    tests: regressions.reduce((n, r) => n + r.counts.tests, 0),
  }),
);
