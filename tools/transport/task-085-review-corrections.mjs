import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  admitNodes,
  digest,
  identityFor,
  stable,
} from "./task-085-access-core.mjs";
import { sha256 } from "./task-085-gate0.mjs";

export const CORRECTIONS_PATH =
  "data/transport/access/reviews/identity-corrections.json";

export function relationshipSemantics(edge) {
  const value = structuredClone(edge);
  for (const key of [
    "edgeId",
    "nodeId",
    "candidateDecisionId",
    "task085Access",
  ])
    delete value[key];
  for (const endpoint of [value.from, value.to])
    if (endpoint.kind === "transport")
      endpoint.id = value.provenance.nodeSourceRecordSha256;
  value.provenance.topologyEvidence = value.provenance.topologyEvidence.map(
    (e) => ({ sourceRefs: e.sourceRefs }),
  );
  return value;
}

export function auditReviewConservation(input, edges) {
  const receipt = input.reviewCorrections;
  const bindings = receipt.baselineEdges;
  const issues = [];
  const matches = bindings.map((old) => {
    const now = edges.find(
      (e) =>
        e.poiId === old.poiId &&
        e.direction === old.direction &&
        e.provenance.nodeSourceRecordSha256 === old.nodeSourceRecordSha256,
    );
    if (!now || digest(relationshipSemantics(now)) !== old.semanticSha256)
      issues.push("UNREVIEWED_RELATIONSHIP_CHANGE:" + old.edgeId);
    const migration = receipt.records.find(
      (c) => c.sourceRecordSha256 === old.nodeSourceRecordSha256,
    );
    if (
      now &&
      now.nodeId !== old.nodeId &&
      now.nodeId !== migration?.newBinding.nodeId
    )
      issues.push("SILENT_ID_REBIND:" + old.edgeId);
    return {
      oldEdgeId: old.edgeId,
      newEdgeId: now?.edgeId ?? null,
      oldNodeId: old.nodeId,
      newNodeId: now?.nodeId ?? null,
      sourceRecordSha256: old.nodeSourceRecordSha256,
      relationshipPreserved:
        !!now && digest(relationshipSemantics(now)) === old.semanticSha256,
    };
  });
  if (edges.length !== bindings.length)
    issues.push("UNREVIEWED_EDGE_INVENTORY_CHANGE");
  return {
    status: issues.length ? "FAIL" : "PASS",
    baseHead: receipt.baseHead,
    issues,
    baselineDirectedEdges: bindings.length,
    currentDirectedEdges: edges.length,
    identityReboundDirectedEdges: matches.filter(
      (r) => r.oldEdgeId !== r.newEdgeId,
    ).length,
    preservedRelationshipsAndMetrics: matches.every(
      (r) => r.relationshipPreserved,
    ),
    runtimeImportAuthorized: false,
    mappings: matches,
  };
}

export function applyReviewCorrections(root, input) {
  const raw = readFileSync(join(root, CORRECTIONS_PATH));
  const receipt = JSON.parse(raw);
  const { receiptSha256, ...body } = receipt;
  assert.equal(
    digest(body),
    receiptSha256,
    "IDENTITY_CORRECTION_RECEIPT_CORRUPTED",
  );
  assert.equal(
    receipt.authorization,
    "USER_REVIEW_445FBFD5_IDENTITY_AND_ACCESS_CONDITIONS",
  );
  assert.equal(receipt.baseHead, "445fbfd57d09108b271261a3d24ba51cd83103ad");
  const result = structuredClone(input);
  const affected = new Set();
  for (const c of receipt.records) {
    assert.ok(
      !affected.has(c.sourceRecordSha256),
      "DUPLICATE_IDENTITY_CORRECTION",
    );
    affected.add(c.sourceRecordSha256);
    const record = result.records.find(
      (r) => r.sourceRecordSha256 === c.sourceRecordSha256,
    );
    assert.ok(record, "IDENTITY_CORRECTION_SOURCE_MISSING");
    assert.equal(
      digest(record),
      c.sourceContentSha256,
      "IDENTITY_CORRECTION_SOURCE_CHANGED",
    );
    const next = identityFor(record);
    assert.deepEqual(
      next,
      c.newBinding,
      "IDENTITY_CORRECTION_NEW_BINDING_CHANGED",
    );
    const old = result.bindings.find((b) => b.nodeId === c.oldBinding.nodeId);
    assert.deepEqual(
      old,
      c.oldBinding,
      "IDENTITY_CORRECTION_OLD_BINDING_CHANGED",
    );
  }
  const retired = new Set(receipt.records.map((c) => c.oldBinding.nodeId));
  result.bindings = result.bindings.filter((b) => !retired.has(b.nodeId));
  result.bindings.push(...receipt.records.map((c) => c.newBinding));
  result.bindings.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  result.admissions = admitNodes(
    result.records,
    result.rights,
    result.bindings,
  );
  for (const c of receipt.records) {
    const now = result.admissions.find(
      (n) => n.sourceRecordSha256 === c.sourceRecordSha256,
    );
    assert.equal(
      now.decision,
      c.newDecision,
      "IDENTITY_CORRECTION_DECISION_CHANGED",
    );
    assert.ok(!c.newBinding.externalIds.includes("null"));
  }
  // Join by source-record hash as well as old ID: one invalid ID represented
  // several HOLD rows. Never apply an ambiguous old-ID-only alias.
  for (const e of result.topologyReview) {
    const c = receipt.records.find(
      (r) =>
        r.oldBinding.nodeId === e.nodeId &&
        r.sourceRecordSha256 === e.nodeSourceRecordSha256,
    );
    if (!c) continue;
    assert.equal(
      c.newDecision,
      "ADMIT_TASK_085_TOPOLOGY",
      "TOPOLOGY_REFERENCES_QUARANTINED_IDENTITY",
    );
    const previousEvidenceId = e.evidenceId;
    e.nodeId = c.newBinding.nodeId;
    e.evidenceId =
      "topology-evidence:" +
      digest([e.poiId, e.nodeId, e.sourceRefs]).slice(0, 24);
    e.identityCorrection = {
      correctionSha256: digest(c),
      previousEvidenceId,
      previousNodeId: c.oldBinding.nodeId,
      sourceRecordSha256: c.sourceRecordSha256,
    };
  }
  for (const r of result.research)
    r.topologyEvidence = result.topologyReview.filter(
      (e) => e.poiId === r.poiId,
    );
  for (const a of receipt.evidenceAmendments ?? []) {
    const poi = result.pois.find((p) => p.internalId === a.poiId);
    assert.ok(
      poi?.names.localized.some((n) => n.value === a.name),
      "ACCESS_AMENDMENT_WRONG_POI",
    );
    for (const e of result.topologyReview.filter(
      (t) => t.poiId === a.poiId && t.reviewStatus === "APPROVED",
    )) {
      e.accessConditions = [
        ...new Set([...(e.accessConditions ?? []), ...a.accessConditions]),
      ];
      e.accessConditionAmendment = {
        sha256: digest(a),
        sourceRefs: a.sourceRefs,
        sourceDocumentSha256: a.sourceDocumentSha256,
        finding: a.finding,
      };
    }
  }
  assert.equal(
    result.observations.filter((o) => retired.has(o.nodeId)).length,
    0,
    "REVIEW_DIRECTIONAL_OBSERVATION_REBIND_REQUIRED",
  );
  result.reviewCorrections = receipt;
  result.sourceFiles.push({ path: CORRECTIONS_PATH, sha256: sha256(raw) });
  result.inputFingerprint = digest({
    baseFingerprint: input.inputFingerprint,
    receiptSha256,
  });
  return result;
}

export function correctedBaselineDecision(input, old, now) {
  return (
    input.reviewCorrections?.records.some(
      (c) =>
        c.oldBinding.nodeId === old.nodeId &&
        c.sourceRecordSha256 === old.sourceRecordSha256 &&
        now?.nodeId === c.newBinding.nodeId &&
        now.decision === c.newDecision &&
        stable(now.externalIds) === stable(c.newBinding.externalIds),
    ) ?? false
  );
}
