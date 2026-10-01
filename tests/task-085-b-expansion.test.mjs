import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadExpansion,
  buildExpansion,
  executeExpansion,
} from "../tools/transport/task-085-expansion.mjs";
const input = loadExpansion();

test("085 7791-target queue preserves Canonical authority and excludes region and transport bands", () => {
  const built = buildExpansion(input);
  assert.equal(built.summary.targetCount, 7791);
  assert.equal(built.summary.batchCount, 39);
  assert.equal(built.summary.rawCanonicalCount, 100);
  assert.equal(built.summary.assessmentDenominator, 95);
  assert.equal(built.summary.canonicalMatched, 100);
  assert.equal(built.summary.canonicalHold, 7691);
  assert.equal(built.summary.newCoverage, 0);
  assert.equal(built.summary.directedEdges, 694);
  const rows = built.artifacts["poi-results.jsonl"]
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.ok(
    rows
      .filter((r) => !r.canonicalAuthorized)
      .every(
        (r) =>
          r.status === "HOLD_CANONICAL_NOT_ADMITTED" &&
          r.canonicalPoiId === null &&
          r.nodeIds.length === 0,
      ),
  );
  assert.equal(
    rows.filter((r) => r.status === "OWNER_ADJUDICATED_EXCLUDED").length,
    5,
  );
  assert.equal(
    rows.filter((r) => r.status === "HOLD_ACCESS_EVIDENCE_SHORTFALL").length,
    4,
  );
  const batches = JSON.parse(built.artifacts["batch-summary.json"]);
  assert.ok(
    batches.every(
      (b) =>
        b.targetCount <= 200 && b.identityLicenseAndRestrictionQa === "PASS",
    ),
  );
  assert.equal(batches.at(-1).targetCount, 191);
});

test("085 expansion cannot route or discard restrictions or admit an invalid identity", () => {
  const missing = structuredClone(input);
  delete missing.edges[0].task085Access;
  assert.throws(() => buildExpansion(missing), /ACCESS_METADATA_MISSING/);
  const unadmitted = structuredClone(input);
  unadmitted.admissions.find(
    (n) => n.nodeId === unadmitted.edges[0].nodeId,
  ).downstream085Authorized = false;
  assert.throws(() => buildExpansion(unadmitted), /EXPANSION_UNADMITTED_NODE/);
  const membership = structuredClone(input);
  membership.targets = [];
  assert.throws(
    () => buildExpansion(membership),
    /EXPANSION_AUTHORIZED_MEMBERSHIP_LOST/,
  );
});

test("085 expansion batch rebuild/resume/rerun/checksum rejects corruption and reproduces exact bytes", () => {
  const out = mkdtempSync(join(tmpdir(), "task085-expansion-"));
  try {
    const first = executeExpansion({ input, out, mode: "rebuild" });
    const bytes = readFileSync(join(out, "poi-results.jsonl"));
    assert.equal(first.deterministicRebuild, "PASS");
    assert.ok(
      executeExpansion({ input, out }).operations.every(
        (r) => r.action === "CHECKSUM_SKIP",
      ),
    );
    const file = join(out, "batch-receipts/0001.json");
    const receipt = JSON.parse(readFileSync(file));
    receipt.targetCount++;
    writeFileSync(file, JSON.stringify(receipt));
    assert.throws(
      () => executeExpansion({ input, out }),
      /EXPANSION_CORRUPTED_RECEIPT/,
    );
    executeExpansion({ input, out, rerunBatch: 1 });
    assert.deepEqual(readFileSync(join(out, "poi-results.jsonl")), bytes);
    executeExpansion({ input, out, mode: "check" });
    assert.throws(
      () => executeExpansion({ input, out, rerunBatch: 40 }),
      /EXPANSION_INVALID_BATCH/,
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("085 committed expansion outputs match the admitted replay and target inventory", () => {
  const result = executeExpansion({ mode: "check" });
  assert.equal(result.runtimeImportAuthorized, false);
  assert.equal(result.nationwideBackboneAccepted, false);
});
