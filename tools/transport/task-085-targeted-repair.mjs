import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  digest,
  stable,
  jsonl,
  admitNodes,
  makeBindings,
  identityFor,
  generateBatch,
  topologyEvidenceValid,
} from "./task-085-access-core.mjs";
import { sha256 } from "./task-085-gate0.mjs";
import { straightDistanceM } from "../../src/shared/poi-edge-graph/index.ts";

export const TARGETED_PATH =
  "data/transport/access/inputs/targeted-repair.json";
const normalize = (s) => s.normalize("NFKC").replace(/\s+/gu, "");

/** Add reviewed evidence to the frozen replay; never rewrite its inputs or authority. */
export function applyTargetedRepair(root, input) {
  if (!existsSync(join(root, TARGETED_PATH))) return input;
  const receipt = JSON.parse(readFileSync(join(root, TARGETED_PATH), "utf8"));
  const { receiptSha256, ...body } = receipt;
  assert.equal(digest(body), receiptSha256, "TARGETED_RECEIPT_CORRUPTED");
  assert.equal(receipt.schemaVersion, "1.0");
  assert.equal(
    receipt.authorization,
    "USER_REQUEST_NINE_CASE_REPAIR_2026_10_01",
  );
  assert.match(receipt.baseHead, /^[a-f0-9]{40}$/);
  assert.equal(
    receipt.canonicalDatasetFileSha256,
    input.preflight.canonical.datasetFileSha256,
    "TARGETED_CANONICAL_DRIFT",
  );
  const scope = new Set(
    input.canonicalReplay.fixpointCases.map((p) => p.poiId),
  );
  assert.equal(
    stable([...scope].sort()),
    stable(receipt.poiIds.slice().sort()),
    "TARGETED_SCOPE_DRIFT",
  );
  assert.equal(
    stable(receipt.findings.map((f) => f.poiId).sort()),
    stable([...scope].sort()),
    "TARGETED_FINDING_SCOPE_DRIFT",
  );
  for (const finding of receipt.findings) {
    if (finding.status !== "PUBLIC_SOURCE_SEARCH_COMPLETED_EVIDENCE_REQUIRED")
      continue;
    assert.ok(
      finding.sourceRefs.length >= 3 &&
        finding.requiredEvidence.length > 40 &&
        finding.requestedOwnerAction.length > 40,
      "TARGETED_INCOMPLETE_HANDOFF",
    );
    assert.equal(
      finding.physicalExhaustionProven,
      false,
      "TARGETED_UNPROVEN_EXHAUSTION",
    );
  }
  const baseline = generateBatch(
    input.pois,
    input.admissions,
    input.research,
    input.observations,
    input.rights,
    input.config,
    input.blockers,
  );
  for (const [name, data] of [
    ["node-downstream-admission.jsonl", input.admissions],
    ["topology-confirmed-edges.jsonl", baseline.edges],
    ["candidate-node-decisions.jsonl", baseline.decisions],
  ]) {
    assert.equal(
      sha256(jsonl(data)),
      input.canonicalReplay.preservedOutputHashes[name],
      "TARGETED_BASELINE_DRIFT:" + name,
    );
  }
  const result = structuredClone(input);
  for (const file of receipt.sourceFiles) {
    assert.match(file.path, /^data\/transport\/access\/sources\/[a-z0-9.-]+$/);
    assert.equal(
      sha256(readFileSync(join(root, file.path))),
      file.sha256,
      "TARGETED_SOURCE_CORRUPTED:" + file.path,
    );
    result.sourceFiles.push({ path: file.path, sha256: file.sha256 });
  }
  for (const grant of receipt.rights) {
    assert.ok(
      !result.rights.sources.some((g) => g.sourceId === grant.sourceId),
      "TARGETED_RIGHTS_OVERWRITE",
    );
    assert.ok(
      receipt.sourceFiles.some((s) => s.sha256 === grant.archiveSha256),
      "TARGETED_UNBOUND_ARCHIVE",
    );
    result.rights.sources.push(grant);
  }
  for (const r of receipt.records) {
    const { sourceRecordSha256, ...record } = r;
    assert.equal(
      digest(record),
      sourceRecordSha256,
      "TARGETED_RECORD_CORRUPTED",
    );
    const row = record.sourceRow;
    assert.equal(digest(row), record.sourceRowSha256, "TARGETED_ROW_CORRUPTED");
    assert.equal(record.externalId, row.stop_id, "TARGETED_ROW_ID_MISMATCH");
    assert.equal(record.name, row.stop_name, "TARGETED_ROW_NAME_MISMATCH");
    assert.deepEqual(
      record.point,
      { latitude: Number(row.stop_lat), longitude: Number(row.stop_lon) },
      "TARGETED_ROW_COORDINATE_MISMATCH",
    );
    assert.ok(
      receipt.sourceFiles.some((f) => f.sha256 === record.archiveSha256),
      "TARGETED_RECORD_UNBOUND_ARCHIVE",
    );
    assert.ok(
      !result.records.some(
        (old) => identityFor(old).nodeId === identityFor(r).nodeId,
      ),
      "TARGETED_IDENTITY_OVERWRITE",
    );
    assert.ok(
      result.pois.some(
        (p) =>
          scope.has(p.internalId) &&
          straightDistanceM(p.location.point, r.point) <=
            result.config.stagedRadiiM.at(-1),
      ),
      "TARGETED_RECORD_OUTSIDE_SCOPE",
    );
    result.records.push(r);
  }
  const oldBindings = new Map(result.bindings.map((b) => [b.nodeId, b]));
  for (const b of makeBindings(receipt.records)) {
    assert.ok(!oldBindings.has(b.nodeId), "TARGETED_BINDING_OVERWRITE");
    result.bindings.push(b);
  }
  result.bindings.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  result.admissions = admitNodes(
    result.records,
    result.rights,
    result.bindings,
  );
  for (const old of input.admissions) {
    assert.equal(
      stable(
        result.admissions.find(
          (n) =>
            n.nodeId === old.nodeId &&
            n.sourceRecordSha256 === old.sourceRecordSha256,
        ),
      ),
      stable(old),
      "TARGETED_ADMISSION_REGRESSION",
    );
  }
  const pairs = new Set();
  for (const fact of receipt.facts) {
    assert.ok(scope.has(fact.poiId), "TARGETED_FACT_OUTSIDE_SCOPE");
    assert.equal(fact.reviewStatus, "OFFICIAL_GATEWAY_FACT_REVIEWED");
    assert.ok(
      fact.finding?.length > 40 && /^\d{4}-\d{2}-\d{2}$/.test(fact.reviewedOn),
      "TARGETED_UNREVIEWED_FACT",
    );
    const n = result.admissions.find(
      (a) => a.sourceRecordSha256 === fact.nodeSourceRecordSha256,
    );
    assert.ok(n?.downstream085Authorized, "TARGETED_NODE_NOT_ADMITTED");
    const pair = fact.poiId + "/" + n.nodeId;
    assert.ok(!pairs.has(pair), "TARGETED_DUPLICATE_RELATIONSHIP");
    pairs.add(pair);
    assert.equal(
      normalize(n.name),
      normalize(fact.gatewayName),
      "TARGETED_NAME_JOIN_MISMATCH",
    );
    assert.equal(n.operator, fact.operator, "TARGETED_OPERATOR_JOIN_MISMATCH");
    const poi = result.pois.find((p) => p.internalId === fact.poiId);
    assert.ok(
      straightDistanceM(poi.location.point, n.point) <=
        result.config.stagedRadiiM.at(-1),
      "TARGETED_GATEWAY_OUTSIDE_BOUND",
    );
    assert.ok(
      !baseline.edges.some(
        (e) => e.poiId === fact.poiId && e.nodeId === n.nodeId,
      ),
      "TARGETED_EXISTING_RELATIONSHIP_OVERWRITE",
    );
    const e = {
      poiId: fact.poiId,
      nodeId: n.nodeId,
      nodeSourceRecordSha256: n.sourceRecordSha256,
      gatewayName: fact.gatewayName,
      operator: n.operator,
      evidenceId:
        "topology-evidence:" +
        digest([fact.poiId, n.nodeId, fact.sourceRefs]).slice(0, 24),
      sourceRefs: fact.sourceRefs,
      evidenceType: fact.evidenceType,
      reviewStatus: "APPROVED",
      gatewayRelationshipVerified: true,
      identityJoinVerified: true,
      identityJoinMethod: "REVIEWED_EXACT_SOURCE_RECORD_NAME_OPERATOR_LOCALITY",
      sourceFactReviewSha256: digest(fact),
      reviewedOn: fact.reviewedOn,
      currentPublicAccess: fact.currentPublicAccess,
      accessConditions: fact.accessConditions ?? [],
      factPersistenceDecision: "FACTUAL_TOPOLOGY_ONLY_NO_RAW_PAYLOAD",
      metricsAuthorized: false,
      finding: fact.finding,
    };
    assert.ok(topologyEvidenceValid(e), "TARGETED_INVALID_TOPOLOGY_EVIDENCE");
    result.factReviews.push(fact);
    result.topologyReview.push(e);
    result.research
      .find((r) => r.poiId === fact.poiId)
      .topologyEvidence.push(e);
    result.identityDecisions.push({
      poiId: fact.poiId,
      gatewayName: fact.gatewayName,
      kind: n.nodeKind,
      sourceFactReviewSha256: digest(fact),
      sourceRefs: fact.sourceRefs,
      matchingComponents: [
        {
          sha256: n.sourceRecordSha256,
          operator: n.operator,
          straightDistanceM: straightDistanceM(poi.location.point, n.point),
        },
      ],
      status: "JOIN_PROPOSED_REQUIRES_NODE_ADMISSION",
    });
  }
  // New evidence invalidates old fixpoint claims. Only fresh inventory-bound reviews
  // may restore an exhaustion result; a digest refresh alone is not an audit.
  result.discoveryReview = receipt.discoveryReviews;
  result.discoveryFindings = receipt.findings;
  result.targetedRepair = {
    receiptSha256,
    phase: receipt.phase,
    handoffAuthority: receipt.handoffAuthority,
    sourceFiles: receipt.sourceFiles,
    poiIds: receipt.poiIds,
    baselineEdges: baseline.edges,
    baselineAdmissions: input.admissions,
    priorCases: input.canonicalReplay.fixpointCases,
    findings: receipt.findings,
  };
  result.inputFingerprint = digest({
    baseFingerprint: input.inputFingerprint,
    receiptSha256,
  });
  return result;
}

export function targetedRepairOutcome(input, combined, proofs) {
  const r = input.targetedRepair,
    issues = [];
  const previous = new Set(r.baselineEdges.map(stable));
  const current = new Set(combined.edges.map(stable));
  for (const e of r.baselineEdges) {
    if (!current.has(stable(e)))
      issues.push("PREVIOUS_EDGE_CHANGED:" + e.edgeId);
  }
  const scope = new Set(r.poiIds);
  for (const e of combined.edges) {
    if (!scope.has(e.poiId) && !previous.has(stable(e)))
      issues.push("EDGE_OUTSIDE_REPAIR_SCOPE:" + e.poiId);
  }
  const cases = r.priorCases.map((old) => {
    const count = new Set(
      combined.edges.filter((e) => e.poiId === old.poiId).map((e) => e.nodeId),
    ).size;
    const proof = proofs.find((p) => p.poiId === old.poiId);
    return {
      poiId: old.poiId,
      name: old.name,
      previousUsefulNodes: old.confirmedUsefulNodes,
      confirmedUsefulNodes: count,
      result:
        count >= input.config.targetMinNodesPerPoi
          ? "TARGET_MET"
          : (proof?.status ?? "DISCOVERY_IN_PROGRESS"),
      priorFixpointSuperseded: true,
      proofValidAfterMerge: false,
      currentProofSha256: proof ? digest(proof) : null,
      finding: r.findings.find((f) => f.name === old.name) ?? null,
    };
  });
  return {
    status: issues.length ? "FAIL" : "PASS",
    mode: "USER_AUTHORIZED_TARGETED_REPAIR",
    issues,
    receiptSha256: r.receiptSha256,
    nationwideDiscoveryPerformed: false,
    previousDirectedEdges: r.baselineEdges.length,
    preservedDirectedEdges: r.baselineEdges.filter((e) =>
      current.has(stable(e)),
    ).length,
    cases,
  };
}
