import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../tools/transport/task-085-gate0.mjs";
import {
  loadInputs,
  buildArtifacts,
} from "../tools/transport/task-085-access-generation.mjs";
import {
  admitNodes,
  makeBindings,
  identityFor,
  readTask085Access,
  digest,
  accessMetadata,
} from "../tools/transport/task-085-access-core.mjs";
import { auditReviewConservation } from "../tools/transport/task-085-review-corrections.mjs";

const input = loadInputs(ROOT);
const built = buildArtifacts(input);
const edges = built.batches.flatMap((b) => b.data.edges);
const suzakaHash =
  "bf5fa2f53633e7f2acc1b21fbb01dd8925a883760e9f747e1d619c00a1576150";
const source = input.records.find((r) => r.sourceRecordSha256 === suzakaHash);

test("085 missing raw station codes never become valid external IDs", () => {
  for (const code of [
    null,
    undefined,
    "",
    "  ",
    "null",
    "undefined",
    NaN,
    {},
    true,
  ]) {
    const r = {
      ...source,
      sourceRows: source.sourceRows.map((s) => ({ ...s, stationCode: code })),
    };
    assert.deepEqual(identityFor(r).externalIds, []);
    const admission = admitNodes([r], input.rights, makeBindings([r]))[0];
    assert.equal(admission.decision, "HOLD");
    assert.ok(admission.failures.includes("IDENTITY_INCOMPLETE"));
  }
});

test("085 mixed valid/null codes require explicit new binding and keep the valid station code", () => {
  assert.deepEqual(identityFor(source).externalIds, ["002014"]);
  const correction = input.reviewCorrections.records.find(
    (r) => r.sourceRecordSha256 === suzakaHash,
  );
  assert.notEqual(correction.oldBinding.nodeId, correction.newBinding.nodeId);
  const unbound = admitNodes([source], input.rights, [
    correction.oldBinding,
  ])[0];
  assert.ok(unbound.failures.includes("IDENTITY_REBIND_OR_UNREGISTERED"));
  assert.equal(
    input.admissions.find((n) => n.sourceRecordSha256 === suzakaHash).decision,
    "ADMIT_TASK_085_TOPOLOGY",
  );
  const related = edges.filter(
    (e) => e.provenance.nodeSourceRecordSha256 === suzakaHash,
  );
  assert.equal(related.length, 2);
  assert.ok(
    related.every(
      (e) =>
        e.nodeId === correction.newBinding.nodeId &&
        [e.from.id, e.to.id].includes(e.nodeId),
    ),
  );
  assert.ok(
    built.batches.every((b) =>
      [...b.data.edges, ...b.data.pending, ...b.data.decisions].every(
        (r) => r.nodeId !== correction.oldBinding.nodeId,
      ),
    ),
  );
});

test("085 null-only Kikusuiyama is HOLD and admitted identities remain unique", () => {
  const n = input.admissions.find((r) => r.name === "菊水山");
  assert.equal(n.decision, "HOLD");
  assert.deepEqual(n.externalIds, []);
  assert.ok(!edges.some((e) => e.nodeId === n.nodeId));
  const admitted = input.admissions.filter((r) => r.downstream085Authorized);
  assert.equal(admitted.length, 5201);
  assert.equal(new Set(admitted.map((r) => r.nodeId)).size, admitted.length);
  assert.equal(input.reviewCorrections.originalCounts.holdRecords, 344);
  assert.equal(input.reviewCorrections.originalCounts.holdUniqueNodeIds, 303);
});

test("085 all exported directions preserve exact reviewed conditions and consumer denies routing", () => {
  for (const edge of edges) {
    const evidence = input.topologyReview.filter((t) =>
      edge.provenance.topologyEvidence.some(
        (p) => p.evidenceId === t.evidenceId && p.sha256 === digest(t),
      ),
    );
    assert.ok(evidence.length);
    const consumed = readTask085Access(
      JSON.parse(JSON.stringify(edge)),
      evidence,
    );
    assert.equal(consumed.routeEligible, false);
    assert.equal(consumed.runtimeImportAuthorized, false);
    assert.deepEqual(
      consumed.conditions.flatMap((c) => c.accessConditions),
      evidence.flatMap((e) => e.accessConditions ?? []),
    );
  }
  for (const name of ["村山橋", "まほろば湖"]) {
    const poi = input.pois.find((p) =>
      p.names.localized.some((n) => n.value === name),
    );
    const related = edges.filter((e) => e.poiId === poi.internalId);
    assert.ok(related.length >= 2);
    assert.ok(
      related.some((e) =>
        e.task085Access.conditions.some((c) => c.accessConditions.length),
      ),
    );
    assert.ok(related.every((e) => e.walkingRouteDistanceM === null));
  }
});

test("085 stripped or forged conditions and cross-direction binding fail closed", () => {
  const original = edges.find((e) =>
    e.task085Access.conditions.some((c) => c.accessConditions.length),
  );
  const evidence = input.topologyReview.filter((t) =>
    original.provenance.topologyEvidence.some(
      (p) => p.evidenceId === t.evidenceId && p.sha256 === digest(t),
    ),
  );
  const stripped = structuredClone(original);
  delete stripped.task085Access;
  assert.throws(
    () => readTask085Access(stripped, evidence),
    /ACCESS_METADATA_MISSING/,
  );
  const forged = structuredClone(original);
  forged.task085Access = accessMetadata(
    forged,
    evidence.map((e) => ({ ...e, accessConditions: [] })),
  );
  assert.throws(
    () => readTask085Access(forged, evidence),
    /ACCESS_CONDITIONS_NOT_PROPAGATED/,
  );
  const mirror = {
    ...original,
    direction:
      original.direction === "NODE_TO_POI" ? "POI_TO_NODE" : "NODE_TO_POI",
  };
  assert.throws(
    () => readTask085Access(mirror, evidence),
    /ACCESS_METADATA_WRONG_EDGE/,
  );
});

test("085 review preserves 347 relationships and all unknown metrics with two explicit rebound edges", () => {
  const audit = auditReviewConservation(input, edges);
  assert.equal(audit.status, "PASS");
  assert.equal(audit.currentDirectedEdges, 694);
  assert.equal(audit.identityReboundDirectedEdges, 2);
  const corrupt = structuredClone(edges);
  corrupt[0].straightDistanceM += 1;
  assert.equal(auditReviewConservation(input, corrupt).status, "FAIL");
});

test("085 topology evidence export includes all seven added evidence IDs and current Misaki area restriction", () => {
  const rows = built.artifacts["topology-evidence-export.jsonl"]
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(rows.length, 473);
  assert.ok(rows.every((r) => r.evidenceId && r.nodeSourceRecordSha256));
  const amendment = input.reviewCorrections.evidenceAmendments.find(
    (a) => a.name === "みさき公園",
  );
  assert.ok(
    edges
      .filter((e) => e.poiId === amendment.poiId)
      .every((e) =>
        e.task085Access.conditions.some(
          (c) =>
            c.accessConditionAmendment?.sourceDocumentSha256 ===
            amendment.sourceDocumentSha256,
        ),
      ),
  );
  assert.equal(
    JSON.parse(readFileSync(join(ROOT, "data/transport/access/manifest.json")))
      .transportAdmission.nationalMasterAuthorized,
    false,
  );
});
