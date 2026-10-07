// Read-only validation of one complete downloaded GitHub Actions attempt.
// Usage: node verify-remote.mjs CHECKOUT RUN_DIRECTORY EXPECTED_HEAD EXPECTED_BASE
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const [rootArg, dirArg, head, base] = process.argv.slice(2);
const root = path.resolve(rootArg),
  directory = path.resolve(dirArg);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const bytes = (p) => fs.readFileSync(p);
const read = (p) =>
  JSON.parse(
    bytes(p)
      .toString()
      .replace(/^\uFEFF/, ""),
  );
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const {
  context,
  verifyArtifacts,
  verifyReceiptShape,
  verifyReceiptCounts,
  aggregate,
} = await load("tools/qa/task-035-receipt.mjs");
const { checkInventory } = await load("tools/qa/task-035-inventory.mjs");
const { currentBinding } = await load(
  "tools/transport/task-086-final-closeout.mjs",
);
const { hash: objectHash } = await load("tools/transport/task-086-model.mjs");
const local = context(),
  inventory = checkInventory(),
  certification = currentBinding();
assert.equal(local.checkoutSha, head, "LOCAL_HEAD");
assert.equal(local.trackedWorktreeClean, true, "VERIFY_ON_CLEAN_COMMIT");
const api = read(path.join(directory, "run.json")),
  jobs = read(path.join(directory, "jobs.json")).jobs;
assert.equal(api.head_sha, head);
assert.equal(api.status, "completed");
assert.equal(api.conclusion, "success");
assert.ok(["push", "pull_request"].includes(api.event));
const runId = String(api.id),
  attempt = String(api.run_attempt);
const expectedJobs = [
  "Full Node regression / assets",
  ...Array.from(
    { length: 4 },
    (_, i) => "Full Node regression / regression-" + i,
  ),
  "Clean graph / first",
  "Clean graph / second",
  "Retained raw source reproduction",
  "Stable complete graph resume",
  "Deterministic, recovery and published-artifact proof",
  "Lint, types, formatting and build",
  "TASK086 exact-head Quality Gate",
];
for (const name of expectedJobs) {
  const matches = jobs.filter((j) => j.name === name);
  assert.equal(matches.length, 1, "JOB:" + name);
  const job = matches[0];
  assert.equal(job.status, "completed");
  assert.equal(job.conclusion, "success", name);
  for (const step of job.steps)
    assert.ok(
      !["failure", "cancelled", "timed_out"].includes(step.conclusion),
      name + ":" + step.name,
    );
}
assert.equal(
  jobs.find((j) => j.name === "Install, test and build")?.conclusion,
  "skipped",
  "SPECIALIZED_CHAIN_REPLACES_GENERIC_JOB",
);
const artifactRoot = path.join(directory, "artifacts");
const entries = fs
  .readdirSync(artifactRoot, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => path.join(e.parentPath, e.name));
const findUnique = (name) => {
  const found = entries.filter((p) => path.basename(p) === name);
  assert.equal(found.length, 1, "UNIQUE:" + name);
  return found[0];
};
const receiptPaths = entries.filter((p) => path.basename(p) === "receipt.json");
assert.equal(receiptPaths.length, 12);
const records = receiptPaths.map(read),
  checkoutSha = records[0].checkoutSha;
if (api.event === "push") assert.equal(checkoutSha, head);
else assert.notEqual(checkoutSha, head);
const checks = [];
for (let i = 0; i < records.length; i++) {
  const r = records[i],
    file = receiptPaths[i];
  for (const [key, value] of Object.entries({
    checkoutSha,
    runId,
    runAttempt: attempt,
    event: api.event,
    inputDigest: local.inputDigest,
    inventoryHash: local.inventoryHash,
  }))
    assert.equal(r[key], value, r.lane + ":" + key);
  assert.deepEqual(r.inputHashes, local.inputHashes);
  assert.equal(r.trackedWorktreeClean, true);
  assert.equal(r.protectedWorktreeClean, true);
  assert.equal(
    r.revisionKind,
    api.event === "push" ? "BRANCH_EXACT_HEAD" : "PR_MERGE_RESULT",
  );
  if (api.event === "pull_request") {
    assert.equal(r.prHeadSha, head);
    assert.equal(r.baseSha, base);
  }
  verifyReceiptShape(r);
  verifyArtifacts(path.dirname(file), r);
  if (r.eventsSha256) {
    verifyReceiptCounts(
      bytes(path.join(path.dirname(file), "events.jsonl")).toString(),
      r,
    );
    assert.deepEqual(
      r.files,
      inventory.entries
        .filter(
          (e) =>
            r.lane === "ordinary" || inventory.lanes[r.lane].includes(e.path),
        )
        .map(({ path, sha256 }) => ({ path, sha256 })),
    );
  }
  checks.push({
    lane: r.lane,
    status: r.status,
    counts: r.counts,
    selectedFiles: r.files?.length ?? null,
    receiptSha256: sha(bytes(file)),
    logSha256: r.logSha256,
    eventsSha256: r.eventsSha256,
    nativeReceiptSha256: r.nativeReceiptSha256,
    runtime: r.runtime,
    commands: r.commands,
    executions: r.executions,
    receiptPath: path.relative(artifactRoot, file).replaceAll("\\", "/"),
  });
}
const expectedLanes = [
  ...Object.keys(inventory.lanes),
  "ordinary",
  "graph-first",
  "graph-second",
  "extraction",
  "resume",
  "quality",
];
const binding = { ...local, checkoutSha, runId, runAttempt: attempt };
const aggregateRecomputed = aggregate(records, expectedLanes, binding);
const globalPath = findUnique("task-035-final-receipt.json"),
  global = read(globalPath);
for (const key of [
  "checkoutSha",
  "runId",
  "runAttempt",
  "inputDigest",
  "inventoryHash",
  "status",
])
  assert.equal(global[key], aggregateRecomputed[key], key);
assert.deepEqual([...global.required].sort(), [...expectedLanes].sort());
assert.deepEqual(
  [...global.receipts].sort((a, b) => a.lane.localeCompare(b.lane)),
  [...aggregateRecomputed.receipts].sort((a, b) =>
    a.lane.localeCompare(b.lane),
  ),
);
const ordinary = records.find((r) => r.lane === "ordinary");
for (const key of [
  "tests",
  "passed",
  "failed",
  "cancelled",
  "skipped",
  "todo",
  "topLevel",
  "suites",
])
  assert.equal(
    records
      .filter((r) => Object.hasOwn(inventory.lanes, r.lane))
      .reduce((n, r) => n + r.counts[key], 0),
    ordinary.counts[key],
    "LANE_SUM_VS_ORDINARY:" + key,
  );
const legacyFinalPath = findUnique("closeout-publication-final-receipt.json"),
  final = read(legacyFinalPath);
assert.equal(
  final.status,
  "PASS_CERTIFICATION_ENGINE_REPAIR_AND_FULL_RECERTIFICATION",
);
for (const [key, value] of Object.entries({
  actualCheckoutSha: checkoutSha,
  runId,
  runAttempt: attempt,
  event: api.event,
}))
  assert.equal(final[key], value, key);
const proofPath = findUnique("deterministic-recovery-proof.json"),
  proof = read(proofPath);
assert.equal(final.deterministicRecoveryProofSha256, sha(bytes(proofPath)));
assert.equal(proof.status, "PASS");
assert.equal(proof.binding.checkoutSha, checkoutSha);
assert.equal(proof.binding.runId, runId);
assert.equal(proof.binding.runAttempt, attempt);
assert.deepEqual(final.binding, proof.binding);
assert.equal(final.fullRegressionFiles, inventory.entries.length);
assert.deepEqual(
  final.regressionInventory.files,
  inventory.entries.map((e) => e.path),
);
assert.deepEqual(final.regressionInventory.lanes, inventory.lanes);
for (const lane of ["extract", "first", "second", "resume"]) {
  assert.equal(proof.laneReceipts[lane].status, "PASS");
  assert.deepEqual(proof.laneReceipts[lane].binding, proof.binding);
}
for (const record of records.filter((r) => r.nativeReceiptSha256)) {
  const proofLane =
    record.lane === "extraction"
      ? "extract"
      : record.lane.replace("graph-", "");
  assert.deepEqual(
    read(
      path.join(
        path.dirname(receiptPaths[records.indexOf(record)]),
        "native-proof.json",
      ),
    ),
    proof.laneReceipts[proofLane],
  );
}
for (const [file, expected] of Object.entries(proof.binding.bound))
  assert.equal(sha(bytes(path.join(root, file))), expected, "BOUND:" + file);
assert.equal(objectHash(proof.binding.bound), proof.binding.inputCodeSha256);
const proofKeys = [
  "fullDeterministicRebuild",
  "resumeChecksumSkip",
  "exceptionProofInputPreserved",
  "publishedArtifactComparison",
  "resumeCorruptionInvalidation",
];
for (const key of proofKeys) {
  assert.equal(proof[key], "PASS");
  assert.equal(final.deterministicRecoveryChecks[key], "PASS");
}
for (const [file, expected] of Object.entries(proof.coreArtifactHashes))
  assert.equal(
    sha(bytes(path.join(root, "data/transport/network", file))),
    expected,
    "PUBLISHED:" + file,
  );
for (const [field, fileName, hashField] of [
  [
    "eligibility",
    "routing-eligibility-receipt.json",
    "eligibilityReceiptSha256",
  ],
  [
    "certificationEngineRepair",
    "certification-engine-repair-receipt.json",
    "certificationEngineRepairReceiptSha256",
  ],
]) {
  const matching = entries.filter((p) => path.basename(p) === fileName);
  assert.ok(matching.length);
  for (const file of matching) {
    assert.equal(sha(bytes(file)), final[hashField]);
    assert.deepEqual(read(file), final[field]);
  }
  const r = final[field];
  assert.equal(r.status, "PASS");
  assert.equal(r.checkoutSha, checkoutSha);
  assert.equal(r.runId, runId);
  assert.equal(r.runAttempt, attempt);
  assert.equal(r.inputSha256, certification.inputSha256);
}
assert.equal(final.eligibility.terminalRoots, 251);
assert.equal(final.eligibility.pendingRoots, 0);
assert.equal(final.eligibility.failClosedBoundary, "PASS");
assert.equal(final.certificationEngineRepair.entireQuarantineCount, 11556);
assert.equal(
  final.certificationEngineRepair.tokyoUeno,
  "PASS_FORMAL_EXPORT_BOTH_DIRECTIONS",
);
assert.equal(final.certificationEngineRepair.eightZeroIntegrityChecks, "PASS");
const graphs = [];
for (const lane of ["first", "second", "resume"]) {
  const prefix =
    "task086-" + (lane === "resume" ? "resume" : "graph-" + lane) + "-";
  const artifact = fs
    .readdirSync(artifactRoot)
    .filter((n) => n.startsWith(prefix));
  assert.equal(artifact.length, 1, prefix);
  const graphRoot = path.join(
    artifactRoot,
    artifact[0],
    "task086-lanes",
    lane === "resume" ? "first" : lane,
  );
  const manifestBytes = bytes(path.join(graphRoot, "manifest.json")),
    manifest = JSON.parse(manifestBytes);
  const native = proof.laneReceipts[lane];
  assert.equal(native.manifestSha256, sha(manifestBytes));
  assert.deepEqual(native.binding, proof.binding);
  assert.equal(native.status, "PASS");
  assert.deepEqual(manifest.artifactHashes, proof.coreArtifactHashes);
  for (const [file, expected] of Object.entries(manifest.artifactHashes))
    assert.equal(
      sha(bytes(path.join(graphRoot, file))),
      expected,
      lane + ":" + file,
    );
  for (const receipt of manifest.batchReceipts) {
    const stored = read(
      path.join(graphRoot, "batch-receipts", receipt.batchId + ".json"),
    );
    assert.deepEqual(stored, receipt);
    const { receiptSha256, ...unsigned } = stored;
    assert.equal(objectHash(unsigned), receiptSha256);
    assert.equal(
      sha(bytes(path.join(graphRoot, "batches", receipt.batchId + ".json"))),
      receipt.outputSha256,
    );
  }
  assert.equal(manifest.batchReceipts.length, proof.batchCount);
  graphs.push({
    lane,
    manifestSha256: sha(manifestBytes),
    batchesVerified: manifest.batchReceipts.length,
    coreArtifactsVerified: Object.keys(manifest.artifactHashes).length,
  });
}
assert.equal(new Set(graphs.map((g) => g.manifestSha256)).size, 1);
assert.equal(
  proof.laneReceipts.resume.batchDispositions.CHECKSUM_SKIP,
  proof.batchCount,
);
const revisions = entries.filter((p) => path.basename(p) === "revision.json");
assert.ok(revisions.length);
for (const file of revisions) {
  const r = read(file);
  assert.equal(r.checkoutSha, checkoutSha);
  assert.equal(r.branchHeadSha, head);
  if (api.event === "pull_request") {
    assert.equal(r.baseSha, base);
    assert.ok(r.checkoutParents.includes(head));
    assert.ok(r.checkoutParents.includes(base));
  }
}
const result = {
  schemaVersion: 1,
  status: "PASS",
  observedAt: new Date().toISOString(),
  expectedBranchHead: head,
  baseSha: api.event === "pull_request" ? base : null,
  actualCheckoutSha: checkoutSha,
  event: api.event,
  revisionKind: api.event === "push" ? "BRANCH_EXACT_HEAD" : "PR_MERGE_RESULT",
  runId,
  runAttempt: attempt,
  url: api.html_url,
  runConclusion: api.conclusion,
  ordinaryCounts: ordinary.counts,
  requiredLanes: expectedLanes,
  receipts: checks,
  globalAggregateSha256: sha(bytes(globalPath)),
  legacyAggregateSha256: sha(bytes(legacyFinalPath)),
  proofSha256: sha(bytes(proofPath)),
  proofChecks: Object.fromEntries(proofKeys.map((k) => [k, proof[k]])),
  boundInputsVerified: Object.keys(proof.binding.bound).length,
  certificationInputSha256: certification.inputSha256,
  graphs,
  jobs: jobs.map(
    ({ id, name, status, conclusion, started_at, completed_at, steps }) => ({
      id,
      name,
      status,
      conclusion,
      started_at,
      completed_at,
      steps,
    }),
  ),
  artifactMetadata: read(path.join(directory, "artifact-metadata.json"))
    .artifacts,
  artifactFileCount: entries.length,
  limitations: [],
};
fs.writeFileSync(
  path.join(directory, "verification.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: result.status,
    runId,
    attempt,
    checkoutSha,
    tests: ordinary.counts.tests,
    passed: ordinary.counts.passed,
    graphs,
  }),
);
