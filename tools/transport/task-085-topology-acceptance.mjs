import {
  replayOutcome,
  EXCEPTION_STATUS,
} from "./task-085-canonical-replay.mjs";
import { digest, stable } from "./task-085-access-core.mjs";
export const categories = [
  "official_venue",
  "official_tourism",
  "rail_operator",
  "local_bus_gtfs_government",
  "ferry_port",
  "ropeway_cable_funicular",
  "tourist_shuttle",
  "airport_rail_bus",
  "staged_geographic_identity",
];
const externalStatuses = [
  "EXTERNAL_OFFICIAL_RELATIONSHIP_REQUIRED",
  "EXTERNAL_LICENSED_IDENTITY_REQUIRED",
];
const terminalStatuses = [
  "CONFIRMED",
  "REJECTED_NON_USEFUL",
  "REJECTED_HISTORICAL_OR_WRONG_IDENTITY",
  ...externalStatuses,
];
export function discoveryInventory(input, combined, poiId) {
  const decisions = combined.decisions
    .filter((d) => d.poiId === poiId)
    .map((d) => ({
      decisionId: d.decisionId,
      nodeId: d.nodeId,
      sourceRecordSha256: d.sourceRecordSha256,
      decision: d.reason,
      topologyEvidenceRefs:
        d.topologyEvidence?.flatMap((e) => e.sourceRefs) ?? [],
      straightDistanceM: d.straightDistanceM,
      rank: d.rank,
      confirmed: combined.edges.some(
        (e) => e.poiId === poiId && e.nodeId === d.nodeId,
      ),
    }));
  const named = (input.identityDecisions ?? [])
    .filter((d) => d.poiId === poiId)
    .map((d) => ({ ...d, reviewKey: digest(d) }));
  const scans = input.discoveryScans.filter((s) => s.poiId === poiId);
  const factReviews = (input.factReviews ?? []).filter(
    (f) => f.poiId === poiId,
  );
  return {
    decisions,
    named,
    scans,
    manualFindingSha256: input.discoveryFindings?.some((f) =>
      input.pois.some(
        (p) => p.internalId === poiId && p.names.localized[0].value === f.name,
      ),
    )
      ? digest(
          input.discoveryFindings.find((f) =>
            input.pois.some(
              (p) =>
                p.internalId === poiId && p.names.localized[0].value === f.name,
            ),
          ),
        )
      : null,
    hashes: {
      candidateDecisionSha256: digest(decisions),
      namedGatewaySha256: digest(named),
      sourceScanSha256: digest(scans),
      factReviewSha256: digest(factReviews),
      sourceRightsSha256: digest(input.rights),
      nodeAdmissionsSha256: digest(input.admissions),
      spatialConfigSha256: digest(input.config),
      canonicalDatasetFileSha256: input.preflight.canonical.datasetFileSha256,
    },
  };
}
function validRefs(refs) {
  return (
    Array.isArray(refs) &&
    refs.length > 0 &&
    refs.every((s) => typeof s === "string" && s.startsWith("https://"))
  );
}
export function reviewIssues(review, inventory) {
  if (!review) return ["NO_REVIEW"];
  const issues = [];
  if (
    !inventory.manualFindingSha256 ||
    review.manualFindingSha256 !== inventory.manualFindingSha256
  )
    issues.push("UNBOUND_MANUAL_FINDING");
  if (stable(review.inventoryHashes) !== stable(inventory.hashes))
    issues.push("STALE_REVIEW_INVENTORY");
  if (
    review.reviewedOn !== "2026-09-30" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn ?? "")
  )
    issues.push("MISSING_REVIEW_DATE");
  for (const k of categories) {
    const c = review.categories?.[k];
    if (
      !c ||
      !["SEARCHED", "NOT_APPLICABLE_WITH_EVIDENCE"].includes(c.status) ||
      !validRefs(c.sourceRefs) ||
      typeof c.finding !== "string" ||
      c.finding.length < 30 ||
      typeof c.searchScope !== "string" ||
      !Array.isArray(c.candidateNames) ||
      ![
        "NO_ADDITIONAL_GATEWAY_SUPPORTED",
        "KNOWN_GATEWAYS_DISPOSITIONED",
        "EXTERNAL_IDENTITY_BOUNDARY",
      ].includes(c.outcome)
    )
      issues.push("INCOMPLETE_SOURCE_CATEGORY:" + k);
  }
  for (const [key, items, id] of [
    ["candidateDispositions", inventory.decisions, "decisionId"],
    ["namedGatewayDispositions", inventory.named, "reviewKey"],
  ]) {
    const disposition = review[key] ?? [];
    if (
      stable(disposition.map((d) => d[id]).sort()) !==
      stable(items.map((d) => d[id]).sort())
    )
      issues.push("UNACCOUNTED_INVENTORY:" + key);
    for (const d of disposition) {
      if (
        !terminalStatuses.includes(d.status) ||
        !validRefs(d.sourceRefs) ||
        !d.reason ||
        d.reason.length < 20
      )
        issues.push("NON_TERMINAL_DISPOSITION:" + key);
      const item = items.find((x) => x[id] === d[id]);
      if (
        d.status === "CONFIRMED" &&
        key === "candidateDispositions" &&
        !item?.confirmed
      )
        issues.push("FALSE_CONFIRMED_DISPOSITION");
      if (
        d.status.startsWith("EXTERNAL_") &&
        (!d.requiredExternalChange || !d.owner)
      )
        issues.push("UNSPECIFIED_EXTERNAL_BOUNDARY");
    }
  }
  if (
    !review.whyMoreNodesWouldBeNonUseful ||
    !review.scopeBoundary ||
    review.remainingActionableCandidates !== 0
  )
    issues.push("OPEN_DISCOVERY");
  const external = [
    ...(review.candidateDispositions ?? []),
    ...(review.namedGatewayDispositions ?? []),
  ].filter((d) => externalStatuses.includes(d.status));
  if (review.exhaustionConclusion === "FEWER_THAN_TARGET_EXIST") {
    // A search miss is never a proof of physical non-existence.
    if (
      external.length ||
      !validRefs(review.authoritativeExhaustionAttestation?.sourceRefs) ||
      !review.authoritativeExhaustionAttestation?.finding
    )
      issues.push("NO_AUTHORITATIVE_FEWER_THAN_TARGET_PROOF");
  } else if (
    review.exhaustionConclusion === "EXTERNAL_SOURCE_LICENSE_IDENTITY_FIXPOINT"
  ) {
    if (!external.length || !review.externalBlockers?.length)
      issues.push("NO_EXTERNAL_FIXPOINT_EVIDENCE");
  } else issues.push("NO_TERMINAL_CONCLUSION");
  return [...new Set(issues)];
}
export function discoveryProofs(input, combined, completeness) {
  return completeness
    .filter(
      (p) =>
        p.assessmentEligible !== false &&
        p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
    )
    .map((p) => {
      const review = input.discoveryReview?.find((r) => r.poiId === p.poiId);
      const canonical = input.blockers.find(
        (b) => b.poiId === p.poiId && !b.ownerAdjudicated,
      );
      const inventory = discoveryInventory(input, combined, p.poiId);
      const issues = reviewIssues(review, inventory);
      const status = canonical
        ? "CANONICAL_ADJUDICATION_REQUIRED"
        : issues.length
          ? "DISCOVERY_IN_PROGRESS"
          : review.exhaustionConclusion === "FEWER_THAN_TARGET_EXIST"
            ? "CANDIDATE_EXHAUSTION_PROOF"
            : "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF";
      return {
        poiId: p.poiId,
        name: p.name,
        type: status,
        status,
        confirmedUsefulNodes: p.usefulDistinctNodes,
        requiredTarget: input.config.targetMinNodesPerPoi,
        canonical: canonical ?? null,
        categories: review?.categories ?? {},
        allCredibleCandidateDispositions: review?.candidateDispositions ?? [],
        namedGatewayDispositions: review?.namedGatewayDispositions ?? [],
        whyMoreNodesWouldBeNonUseful:
          review?.whyMoreNodesWouldBeNonUseful ?? null,
        externalBlockers: review?.externalBlockers ?? [],
        stagedSearch: combined.scans.find((s) => s.poiId === p.poiId),
        sourceScans: inventory.scans,
        candidateDecisions: inventory.decisions,
        inventoryHashes: inventory.hashes,
        reviewSha256: review ? digest(review) : null,
        proofValidationIssues: canonical ? [] : issues,
        completeSourceReview: !issues.length,
        sourceLicenseDecision:
          "Static licensed topology + factual official gateway summaries only; no route-provider payload/query",
        scope:
          review?.scopeBoundary ??
          "Canonical owner adjudication. No physical candidate-exhaustion claim.",
      };
    });
}
export function topologyAcceptance(input, combined, completeness, proofs) {
  const all = input.pois.length,
    exceptions = new Set(
      input.preflight.canonical.accessAdjudication?.excludedInternalIds ??
        input.blockers.map((b) => b.poiId),
    );
  const pendingCanonical = input.blockers.filter((b) => !b.ownerAdjudicated);
  const valid = completeness.filter((p) => !exceptions.has(p.poiId)),
    n = valid.length;
  const counts = valid.map((p) => p.usefulDistinctNodes).sort((a, b) => a - b);
  const mean = n ? counts.reduce((a, b) => a + b, 0) / n : null;
  const median = n
    ? n % 2
      ? counts[Math.floor(n / 2)]
      : (counts[n / 2 - 1] + counts[n / 2]) / 2
    : null;
  const edges = combined.edges,
    admitted = input.admissions.filter((n) => n.downstream085Authorized);
  const under = valid.filter(
    (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
  );
  const missing = under.filter(
    (p) =>
      !proofs.some(
        (x) => x.poiId === p.poiId && x.status === "CANDIDATE_EXHAUSTION_PROOF",
      ),
  );
  const unresolvedDiscovery = under.filter(
    (p) =>
      !proofs.some(
        (x) =>
          x.poiId === p.poiId &&
          [
            "CANDIDATE_EXHAUSTION_PROOF",
            "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF",
          ].includes(x.status),
      ),
  );
  const gates = [];
  const add = (name, actual, threshold, pass, evidencePath, owner = "B") =>
    gates.push({
      name,
      actual,
      threshold,
      status: pass ? "PASS" : "FAIL",
      evidencePath,
      owner,
    });
  add(
    "Canonical scan coverage",
    combined.scans.length / all,
    1,
    new Set(combined.scans.map((p) => p.poiId)).size === all,
    "poi-access-completeness.json",
  );
  add(
    "Explicit result coverage",
    completeness.length / all,
    1,
    completeness.length === all,
    "poi-access-completeness.json",
  );
  add(
    "Canonical supporting manifest integrity",
    input.preflight.canonical.supportingSampleManifest.hashMatches,
    true,
    input.preflight.canonical.supportingSampleManifest.hashMatches,
    "../../../docs/qa/TASK-085-B/canonical-supporting-hash-audit.md",
    "A_CANONICAL",
  );
  add(
    "Valid Canonical POIs with confirmed useful topology",
    n ? valid.filter((p) => p.usefulDistinctNodes > 0).length / n : null,
    1,
    n > 0 && valid.every((p) => p.usefulDistinctNodes > 0),
    "poi-access-completeness.json",
  );
  add(
    "Mean useful topology nodes per valid POI",
    mean,
    ">=3",
    mean >= input.config.targetMinNodesPerPoi,
    "poi-access-completeness.json",
  );
  add(
    "Median useful topology nodes per valid POI",
    median,
    ">=3",
    median >= input.config.targetMinNodesPerPoi,
    "poi-access-completeness.json",
  );
  add(
    "Zero-node valid accessible POIs",
    valid.filter((p) => !p.usefulDistinctNodes).length,
    0,
    valid.every((p) => p.usefulDistinctNodes > 0),
    "under-target-pois.json",
  );
  add(
    "Under-target without exhaustion proof",
    missing.length,
    0,
    missing.length === 0,
    "candidate-exhaustion-proofs.jsonl",
  );
  add(
    "Accepted node provenance",
    admitted.length
      ? admitted.filter(
          (a) => a.sourceRefs.length && a.archiveSha256 && a.bindingSha256,
        ).length / admitted.length
      : null,
    1,
    admitted.length > 0 &&
      admitted.every(
        (a) => a.sourceRefs.length && a.archiveSha256 && a.bindingSha256,
      ),
    "node-downstream-admission.jsonl",
  );
  add(
    "Topology edge provenance",
    edges.length
      ? edges.filter(
          (e) =>
            e.topologyEvidenceRefs?.length &&
            e.provenance.topologyEvidence?.length,
        ).length / edges.length
      : null,
    1,
    edges.length > 0 &&
      edges.every(
        (e) =>
          e.topologyEvidenceRefs?.length &&
          e.provenance.topologyEvidence?.length,
      ),
    "topology-confirmed-edges.jsonl",
  );
  const essential = (e) =>
    e.edgeId &&
    e.poiId &&
    e.nodeId &&
    e.from.kind !== e.to.kind &&
    e.directed &&
    e.accessRole &&
    e.topologyStatus === "CONFIRMED" &&
    e.topologyConfidence > 0 &&
    e.topologyEvidenceRefs.length &&
    e.topologyEvidenceType.length &&
    Number.isFinite(e.straightDistanceM) &&
    e.generatedAt;
  add(
    "Essential topology fields",
    edges.length ? edges.filter(essential).length / edges.length : null,
    1,
    edges.length > 0 && edges.every(essential),
    "topology-confirmed-edges.jsonl",
  );
  add(
    "Duplicate topology edge",
    edges.length - new Set(edges.map((e) => e.edgeId)).size,
    0,
    new Set(edges.map((e) => e.edgeId)).size === edges.length,
    "topology-confirmed-edges.jsonl",
  );
  const invalid = edges.filter(
    (e) =>
      !admitted.some((a) => a.nodeId === e.nodeId) ||
      !input.pois.some((p) => p.internalId === e.poiId) ||
      ![e.from.id, e.to.id].includes(e.nodeId) ||
      ![e.from.id, e.to.id].includes(e.poiId),
  );
  add(
    "Invalid identity",
    invalid.length,
    0,
    invalid.length === 0,
    "topology-confirmed-edges.jsonl",
  );
  const paired = edges.every((e) =>
    edges.some(
      (r) =>
        r.poiId === e.poiId &&
        r.nodeId === e.nodeId &&
        r.direction !== e.direction,
    ),
  );
  add(
    "Two directed topology records per relationship",
    paired,
    true,
    paired,
    "topology-confirmed-edges.jsonl",
  );
  const changedBaseline = (input.baselineNodes?.records ?? []).filter((old) => {
    const now = input.admissions.find(
      (n) =>
        n.nodeId === old.nodeId &&
        n.sourceRecordSha256 === old.sourceRecordSha256,
    );
    return Object.keys(old).some(
      (k) => stable(old[k]) !== stable(now?.[k] ?? null),
    );
  });
  add(
    "Original baseline decisions preserved",
    changedBaseline.length,
    0,
    changedBaseline.length === 0,
    "baseline-revalidation.json",
  );
  add(
    "Rejected TASK-084 v1 usage",
    input.preflight.transport.historicalV1.consumed,
    false,
    !input.preflight.transport.historicalV1.consumed,
    "manifest.json",
  );
  add(
    "Unreviewed TASK-084 v2 bulk promotion",
    input.preflight.transport.v2CandidatesPromoted,
    0,
    input.preflight.transport.v2CandidatesPromoted === 0,
    "manifest.json",
  );
  add(
    "Deterministic rebuild",
    input.executionVerification?.deterministicRebuild ?? "NOT_RUN",
    "PASS",
    !!input.executionVerification?.deterministicRebuild?.startsWith("PASS"),
    "manifest.json#/execution",
  );
  add(
    "Batch resume checksum corruption detection",
    input.executionVerification?.receiptIntegrity ?? "NOT_RUN",
    "PASS",
    !!input.executionVerification?.receiptIntegrity?.startsWith("PASS"),
    "batch-receipts/",
  );
  const growth =
    completeness.every(
      (p) => p.usefulDistinctNodes <= input.config.maxTotalNodesPerPoi,
    ) && edges.length <= all * input.config.maxTotalNodesPerPoi * 2;
  add(
    "Graph growth guard",
    edges.length,
    "<= canonicalCount * maxNodes * 2",
    growth,
    "manifest.json#/metrics",
  );
  add(
    "globalTopologyDiscoveryFixpoint",
    unresolvedDiscovery.length ? "IN_PROGRESS" : "PROVEN",
    "PROVEN",
    !unresolvedDiscovery.length,
    "candidate-exhaustion-proofs.jsonl",
  );
  add(
    "Canonical lifecycle public access and endpoint adjudication",
    pendingCanonical.length,
    0,
    pendingCanonical.length === 0 &&
      input.preflight.canonical.accessAdjudication?.status === "PASS",
    "canonical-adjudication-required.json",
    "A_CANONICAL",
  );
  const replay = replayOutcome(input, combined, proofs);
  add(
    "Canonical owner assessment denominator",
    n,
    input.preflight.canonical.accessAdjudication?.assessmentCount ?? n,
    input.preflight.canonical.accessAdjudication?.status === "PASS" &&
      n === input.preflight.canonical.accessAdjudication.assessmentCount,
    "canonical-adjudication-required.json",
    "A_CANONICAL",
  );
  add(
    "Post-Canonical evidence and fixpoint proof replay",
    replay.status,
    "PASS",
    replay.status === "PASS" || !input.canonicalReplay,
    "post-canonical-replay-audit.json",
  );
  const failed = gates.filter((g) => g.status === "FAIL");
  const exceptionGateNames = [
    "Valid Canonical POIs with confirmed useful topology",
    "Zero-node valid accessible POIs",
    "Under-target without exhaustion proof",
  ];
  const auditedIds = new Set(
    replay.cases?.filter((p) => p.proofValidAfterMerge).map((p) => p.poiId) ??
      [],
  );
  const affected = valid.filter(
    (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
  );
  const auditedExceptionsOnly =
    replay.status === "PASS" &&
    !unresolvedDiscovery.length &&
    failed.length > 0 &&
    failed.every((g) => exceptionGateNames.includes(g.name)) &&
    affected.length === auditedIds.size &&
    affected.every((p) => auditedIds.has(p.poiId));
  const nonCanonicalPass = gates
      .filter((g) => g.owner !== "A_CANONICAL")
      .every((g) => g.status === "PASS"),
    allPass = !failed.length;
  const status = allPass
    ? "PASS / READY_FOR_REVIEW"
    : auditedExceptionsOnly
      ? EXCEPTION_STATUS
      : input.canonicalReplay
        ? "BLOCKED_POST_CANONICAL_REPLAY_INTEGRITY"
        : nonCanonicalPass
          ? "READY_EXCEPT_CANONICAL_ADJUDICATION"
          : !unresolvedDiscovery.length
            ? "BLOCKED_SOURCE_LICENSE_IDENTITY_FIXPOINT"
            : "REWORK_IN_PROGRESS";
  return {
    schemaVersion: "2.0",
    status,
    allPass,
    nonCanonicalPass,
    auditedExceptionsOnly,
    auditedFixpointExceptionCount: auditedIds.size,
    remainingFailedGates: failed.map((g) => ({
      name: g.name,
      actual: g.actual,
      threshold: g.threshold,
      status: g.status,
      affectedPoiIds: (g.name === "Under-target without exhaustion proof"
        ? affected
        : valid.filter((p) => !p.usefulDistinctNodes)
      ).map((p) => p.poiId),
    })),
    userAcceptanceRequired: auditedExceptionsOnly,
    canonicalPendingAdjudicationCount: pendingCanonical.length,
    inputFingerprint: input.inputFingerprint,
    authoritativeCanonicalCount: all,
    canonicalAdjudicationCount: exceptions.size,
    validAccessibleAssessmentCount: n,
    denominatorPolicy:
      "All authorized Canonical records remain in outputs and raw coverage. Exceptions are explicit owner adjudications, never deleted or silently accepted. Both full-corpus and valid-subset counts are reported.",
    globalTopologyDiscoveryFixpoint: unresolvedDiscovery.length
      ? "IN_PROGRESS"
      : "PROVEN",
    topologyGates: gates,
    gates,
    metricGates: {
      affectTopologyExistence: false,
      walking: "Separate directional resolution coverage",
      transit: "Separate directional resolution coverage",
      taxi: "Separate directional resolution coverage",
      evidencePath: "mode-resolution-coverage.json",
    },
  };
}
