import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  REVIEW,
  CLOSEOUT,
  assertBlockedSnapshot,
  auditGate0,
  expectedArtifacts,
  verifyArtifacts,
} from "../tools/transport/task-085-gate0.mjs";

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), "utf8"));
test("085 cannot infer downstream acceptance from WBS completion or v1 PASS", () => {
  const report = auditGate0();
  assert.equal(read(CLOSEOUT).wbsStatus, "已完成");
  assert.equal(
    read("data/transport/nodes/task-084-b-national-master/manifest.json")
      .nationalMasterStatus,
    "PASS",
  );
  assert.equal(report.status, "BLOCKED_084_DOWNSTREAM_GATE");
  assert.equal(report.transport.authoritativeDownstreamArtifact, null);
  assert.equal(report.transport.acceptedNodeCount, 0);
  assert.equal(report.discovery.explicitlyAuthorized085Artifacts.length, 0);
});

test("085 blocked snapshot rejects changed, missing and non-boolean authorizations", () => {
  for (const key of [
    "downstream085Authorized",
    "runtimeImportAuthorized",
    "nationalMasterPass",
  ]) {
    for (const changed of [true, undefined, "false", null]) {
      const review = read(REVIEW);
      review[key] = changed;
      assert.throws(() => assertBlockedSnapshot(review, read(CLOSEOUT)));
      const closeout = read(CLOSEOUT);
      closeout.dataGateSnapshot[key] = changed;
      assert.throws(() => assertBlockedSnapshot(read(REVIEW), closeout));
    }
  }
  const review = read(REVIEW);
  review.formalAcceptedV2NodeCount = 1;
  assert.throws(() => assertBlockedSnapshot(review, read(CLOSEOUT)));
  assert.throws(() => assertBlockedSnapshot(review, {}));
});

test("085 reads actual Canonical membership and hashes without a fixed count", () => {
  const report = auditGate0();
  const runtime = read(report.canonical.path);
  assert.equal(report.canonical.recordCount, runtime.internalIds.length);
  assert.equal(report.metrics.shortfall, runtime.recordCount);
  assert.equal(
    report.canonical.membershipAndActiveMasterCodeBindingsVerified,
    true,
  );
  assert.equal(report.canonical.candidateCorpusAuthorized, false);
});

test("085 does not invent route QA or coverage from an unexecuted corpus", () => {
  const { metrics, execution } = auditGate0();
  assert.equal(metrics.canonicalPoiProcessedCount, 0);
  assert.equal(metrics.totalDirectedEdges, 0);
  assert.equal(metrics.batchCount, 0);
  for (const key of [
    "walkingResolvedRate",
    "localTransitResolvedRate",
    "taxiResolvedRate",
    "accessibilityKnownRate",
    "extremeDetourCount",
    "unresolvedPoiCount",
    "localNodeCoverage",
    "majorHubCoverage",
    "specialTourismAccessCoverage",
    "sourceProvenanceCoverage",
  ]) {
    assert.equal(metrics[key], null, key);
  }
  assert.equal(execution.providerRequests, 0);
  assert.equal(execution.rawProviderPayloadsPersisted, 0);
  assert.equal(execution.task086Started, false);
});

test("085 deterministic preflight rebuild matches every committed artifact", () => {
  assert.deepEqual(expectedArtifacts(), expectedArtifacts());
  verifyArtifacts();
});

test("085 retains only empty generation outputs and no fabricated batch receipts", () => {
  const outputs = expectedArtifacts();
  for (const [file, contents] of Object.entries(outputs)) {
    if (file.endsWith(".jsonl")) assert.equal(contents, "");
  }
  assert.equal(auditGate0().execution.batchReceiptsCreated, 0);
});

test("085 detects a corrupted blocked-attempt manifest instead of accepting its receipt", () => {
  assert.throws(
    () =>
      verifyArtifacts(ROOT, (file) =>
        file.endsWith("/manifest.json")
          ? "{}\n"
          : readFileSync(join(ROOT, file), "utf8"),
      ),
    /Artifact drift\/corruption/,
  );
});
