import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { context } from "../../../tools/qa/task-035-receipt.mjs";
import { checkInventory } from "../../../tools/qa/task-035-inventory.mjs";

// Read-only audit of GitHub API snapshots and the hosted final aggregate.
// Usage: node docs/qa/TASK-080/verify-exact-head.mjs RUN_DIRECTORY HEAD RECEIPT
const [directory, expectedHead, receiptPath] = process.argv.slice(2);
const read = (file) =>
  JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const run = read(path.join(directory, "run.json"));
const jobs = read(path.join(directory, "jobs.json")).jobs;
const receipt = read(receiptPath);
const local = context();
assert.equal(local.checkoutSha, expectedHead);
assert.equal(local.trackedWorktreeClean, true);
assert.equal(run.head_sha, expectedHead);
assert.equal(run.event, "workflow_dispatch");
assert.equal(run.status, "completed");
assert.equal(run.conclusion, "success");
const requiredJobs = [
  "Full Node regression / assets",
  ...Array.from(
    { length: 4 },
    (_, i) => `Full Node regression / regression-${i}`,
  ),
  "Clean graph / first",
  "Clean graph / second",
  "Retained raw source reproduction",
  "Stable complete graph resume",
  "Deterministic, recovery and published-artifact proof",
  "Lint, types, formatting and build",
  "TASK086 exact-head Quality Gate",
];
for (const name of requiredJobs) {
  const matches = jobs.filter((job) => job.name === name);
  assert.equal(matches.length, 1, name);
  assert.equal(matches[0].status, "completed", name);
  assert.equal(matches[0].conclusion, "success", name);
  for (const step of matches[0].steps)
    assert.ok(!["failure", "cancelled", "timed_out"].includes(step.conclusion));
}
for (const [key, value] of Object.entries({
  status: "PASS",
  checkoutSha: expectedHead,
  expectedHead,
  event: "workflow_dispatch",
  revisionKind: "BRANCH_EXACT_HEAD",
  runId: String(run.id),
  runAttempt: String(run.run_attempt),
  trackedWorktreeClean: true,
  protectedWorktreeClean: true,
  inputDigest: local.inputDigest,
  inventoryHash: local.inventoryHash,
}))
  assert.equal(receipt[key], value, key);
assert.deepEqual(receipt.inputHashes, local.inputHashes);
const requiredLanes = [
  "assets",
  "regression-0",
  "regression-1",
  "regression-2",
  "regression-3",
  "rebuild",
  "ordinary",
  "graph-first",
  "graph-second",
  "extraction",
  "resume",
  "quality",
];
assert.deepEqual([...receipt.required].sort(), [...requiredLanes].sort());
assert.deepEqual(
  receipt.receipts.map((r) => r.lane).sort(),
  [...requiredLanes].sort(),
);
for (const { counts } of receipt.receipts) {
  if (!counts) continue;
  assert.equal(counts.tests, counts.passed);
  for (const key of ["failed", "cancelled", "skipped", "todo"])
    assert.equal(counts[key], 0);
}
const inventory = checkInventory();
assert.ok(
  inventory.entries.some(
    (entry) => entry.path === "tests/task-080-a-poi-search-api.test.mjs",
  ),
);
const report = {
  task: "TASK-080-A",
  status: "PASS",
  expectedHead,
  actualCheckoutSha: receipt.checkoutSha,
  runId: run.id,
  runAttempt: run.run_attempt,
  url: run.html_url,
  event: run.event,
  requiredJobs: requiredJobs.length,
  requiredLanes,
  ordinaryCounts: receipt.receipts.find((r) => r.lane === "ordinary").counts,
  inventoryCounts: inventory.counts,
  inputDigest: receipt.inputDigest,
  inventoryHash: receipt.inventoryHash,
  aggregateSha256: createHash("sha256")
    .update(fs.readFileSync(receiptPath))
    .digest("hex"),
};
fs.writeFileSync(
  path.join(directory, "verification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
