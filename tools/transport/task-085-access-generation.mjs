import {
  loadCanonicalReplay,
  validatePriorCanonicalBinding,
  rebindDiscoveryReviews,
  replayOutcome,
  EXCEPTION_STATUS,
} from "./task-085-canonical-replay.mjs";
import { applyTargetedRepair } from "./task-085-targeted-repair.mjs";
import {
  applyReviewCorrections,
  correctedBaselineDecision,
  auditReviewConservation,
  CORRECTIONS_PATH,
} from "./task-085-review-corrections.mjs";
import {
  discoveryProofs,
  topologyAcceptance,
} from "./task-085-topology-acceptance.mjs";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ROOT,
  OUTPUT,
  auditGate0,
  readJson,
  fingerprint,
  sha256,
} from "./task-085-gate0.mjs";
import {
  stable,
  jsonl,
  digest,
  validateConfig,
  admitNodes,
  generateBatch,
  qualityAnomalies,
} from "./task-085-access-core.mjs";

const INPUT = OUTPUT + "/inputs";
const readLines = (root, file) =>
  readFileSync(join(root, file), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const objectText = (value) => JSON.stringify(value, null, 2) + "\n";
const codePaths = [
  "docs/tasks/AMENDMENT-TASK-085-b-post-canonical-final-replay.md",
  "tools/transport/task-085-canonical-replay.mjs",
  "tools/transport/task-085-targeted-repair.mjs",
  "tools/transport/task-085-review-corrections.mjs",
  "tools/transport/task-085-targeted-source-check.py",
  "src/server/poi-runtime/access-adjudication.ts",
  "docs/tasks/AMENDMENT-TASK-085-b-access-topology-route-metrics-split-v2.md",
  "tools/transport/task-085-gate0.mjs",
  "tools/transport/task-085-topology-acceptance.mjs",
  "tools/transport/task-085-p11-extract.py",
  "tools/transport/task-085-named-extract.py",
  "tools/transport/task-085-supplemental-extract.py",
  "tools/transport/task-085-topology-review.mjs",
  "tools/transport/task-085-access-core.mjs",
  "tools/transport/task-085-access-generation.mjs",
  "tools/transport/task-085-source-extract.py",
  "tools/transport/task-085-gtfs-extract.py",
  "tools/transport/task-085-expanded-gtfs-extract.py",
  "src/shared/poi-edge-graph/index.ts",
];
export function loadInputs(root = ROOT, { includeTargeted = true } = {}) {
  const preflight = auditGate0(root),
    config = readJson(root, INPUT + "/config.json");
  validateConfig(config);
  const pois = readJson(root, preflight.canonical.datasetPath)
    .records.slice()
    .sort((a, b) => (a.internalId < b.internalId ? -1 : 1));
  const canonicalReplay = loadCanonicalReplay(root, preflight.canonical, pois);
  const files = readdirSync(join(root, INPUT))
    .sort()
    .map((name) => INPUT + "/" + name);
  assert.ok(
    files.every((f) => /\.(json|jsonl)$/.test(f)),
    "UNEXPECTED_INPUT_FILE",
  );
  const s12 = readJson(root, INPUT + "/s12-extraction.json"),
    gtfs = readJson(root, INPUT + "/gtfs-extraction.json");
  for (const [file, sha] of Object.entries(s12.derivedFiles))
    assert.equal(
      fingerprint(root, INPUT + "/" + file).sha256,
      sha,
      "S12_DERIVED_HASH:" + file,
    );
  assert.equal(
    fingerprint(root, INPUT + "/gtfs-source-records.jsonl").sha256,
    gtfs.derivedSha256,
    "GTFS_DERIVED_HASH",
  );
  validatePriorCanonicalBinding(
    s12.canonicalDatasetFileSha256,
    preflight.canonical.datasetFileSha256,
    canonicalReplay,
  );
  assert.deepEqual(
    s12.spatialConfig,
    Object.fromEntries(
      ["stagedRadiiM", "maxDiscoveryCandidatesPerPoi", "cellDegrees"].map(
        (key) => [key, config[key]],
      ),
    ),
    "CHANGED_SPATIAL_CONFIG_REQUIRES_REEXTRACTION",
  );
  const research = readJson(root, INPUT + "/official-access-research.json");
  const topologyReview = readJson(root, INPUT + "/topology-review.json");
  const factReviews = readJson(root, INPUT + "/gateway-fact-reviews.json");
  const seal = readJson(root, INPUT + "/topology-review-seal.json");
  assert.equal(
    seal.implementationSha256,
    fingerprint(root, "tools/transport/task-085-topology-review.mjs").sha256,
    "REVIEW_IMPLEMENTATION_CHANGED",
  );
  validatePriorCanonicalBinding(
    seal.canonicalDatasetFileSha256,
    preflight.canonical.datasetFileSha256,
    canonicalReplay,
  );
  for (const [file, sha] of Object.entries({ ...seal.inputs, ...seal.outputs }))
    assert.equal(
      fingerprint(root, INPUT + "/" + file).sha256,
      sha,
      "TOPOLOGY_REVIEW_SEAL:" + file,
    );
  for (const e of topologyReview) {
    const fact = factReviews.find(
      (f) => digest(f) === e.sourceFactReviewSha256,
    );
    assert.ok(
      fact &&
        fact.poiId === e.poiId &&
        fact.reviewedOn === e.reviewedOn &&
        fact.evidenceType === e.evidenceType &&
        fact.currentPublicAccess === e.currentPublicAccess &&
        fact.gateways.some((g) => g.name === e.gatewayName) &&
        stable(fact.sourceRefs) === stable(e.sourceRefs),
      "TOPOLOGY_FACT_BINDING_INVALID",
    );
  }
  for (const r of research)
    r.topologyEvidence = topologyReview.filter((e) => e.poiId === r.poiId);
  const p11 = readJson(root, INPUT + "/p11-extraction.json");
  for (const [file, sha] of Object.entries(p11.derivedFiles))
    assert.equal(
      fingerprint(root, INPUT + "/" + file).sha256,
      sha,
      "P11_DERIVED_HASH:" + file,
    );
  validatePriorCanonicalBinding(
    p11.canonicalDatasetFileSha256,
    preflight.canonical.datasetFileSha256,
    canonicalReplay,
  );
  assert.deepEqual(
    p11.spatialConfig,
    Object.fromEntries(
      ["cellDegrees", "stagedRadiiM", "p11MaxNearestCandidatesPerPoi"].map(
        (k) => [k, config[k]],
      ),
    ),
    "P11_CONFIG_CHANGED",
  );
  const named = readJson(root, INPUT + "/named-extraction.json");
  for (const [file, sha] of Object.entries(named.derivedFiles))
    assert.equal(
      fingerprint(root, INPUT + "/" + file).sha256,
      sha,
      "NAMED_DERIVED_HASH:" + file,
    );
  assert.equal(
    fingerprint(root, INPUT + "/gateway-fact-reviews.json").sha256,
    named.inputFactReviewsSha256,
    "FACT_CHANGE_REQUIRES_NAMED_REEXTRACTION",
  );
  const supplemental = readJson(root, INPUT + "/supplemental-extraction.json");
  for (const [file, sha] of Object.entries(supplemental.derivedFiles))
    assert.equal(
      fingerprint(root, INPUT + "/" + file).sha256,
      sha,
      "SUPPLEMENTAL_DERIVED_HASH:" + file,
    );
  const expandedGtfs = readJson(root, INPUT + "/expanded-gtfs-extraction.json");
  assert.equal(
    fingerprint(root, INPUT + "/expanded-gtfs-source-records.jsonl").sha256,
    expandedGtfs.derivedSha256,
    "EXPANDED_GTFS_DERIVED_HASH",
  );
  assert.equal(research.length, pois.length);
  assert.deepEqual(
    research.map((r) => r.poiId).sort(),
    pois.map((p) => p.internalId).sort(),
    "RESEARCH_MEMBERSHIP",
  );
  const sourceFiles = [...files, ...codePaths].map((f) => fingerprint(root, f));
  const records = [
    ...readLines(root, INPUT + "/s12-source-records.jsonl"),
    ...readLines(root, INPUT + "/gtfs-source-records.jsonl"),
    ...readLines(root, INPUT + "/expanded-gtfs-source-records.jsonl"),
    ...readLines(root, INPUT + "/p11-source-records.jsonl"),
    ...readLines(root, INPUT + "/named-source-records.jsonl"),
    ...readLines(root, INPUT + "/supplemental-source-records.jsonl"),
    ...readLines(root, INPUT + "/reviewed-source-records.jsonl"),
  ];
  const observations = readLines(root, INPUT + "/route-observations.jsonl");
  const rights = readJson(root, INPUT + "/source-rights.json"),
    bindings = readLines(root, INPUT + "/node-identity-bindings.jsonl");
  const input = {
    root,
    topologyReview,
    factReviews,
    identityDecisions: readJson(
      root,
      INPUT + "/gateway-identity-decisions.json",
    ),
    baselineNodes: readJson(root, INPUT + "/baseline-node-decisions.json"),
    observedIterations: readJson(root, INPUT + "/observed-replays.json"),
    canonicalReplay,
    discoveryReview: rebindDiscoveryReviews(
      readJson(root, INPUT + "/discovery-review.json"),
      canonicalReplay,
    ),
    discoveryFindings: readJson(
      root,
      INPUT + "/discovery-review-findings.json",
    ),
    baseline: readLines(root, INPUT + "/baseline-directed-candidates.jsonl"),
    preflight,
    config,
    pois,
    research,
    sourceFiles,
    records,
    observations,
    rights,
    bindings,
    blockers: readJson(root, INPUT + "/canonical-access-blockers.json").map(
      (b) => {
        const owner = preflight.canonical.accessAdjudication.records.find(
          (r) => r.internalId === b.poiId,
        );
        assert.ok(owner, "UNADJUDICATED_CANONICAL_BLOCKER:" + b.poiId);
        return {
          ...b,
          canonicalLifecycle: owner.lifecycleStatus,
          ownerAdjudicated: true,
          ownerDecision: owner,
          topologyRejected: true,
        };
      },
    ),
    discoveryScans: [
      ...readLines(root, INPUT + "/s12-spatial-scan.jsonl").map((r) => ({
        ...r,
        sourceId: "mlit-s12-fy2024",
      })),
      ...readLines(root, INPUT + "/p11-spatial-scan.jsonl"),
      ...readLines(root, INPUT + "/named-source-scans.jsonl"),
    ],
    inputFingerprint: digest({ canonical: preflight.canonical, sourceFiles }),
    admissions: admitNodes(records, rights, bindings),
  };
  const corrected = applyReviewCorrections(root, input);
  return includeTargeted ? applyTargetedRepair(root, corrected) : corrected;
}
export function chunks(items, size = 200) {
  const result = [];
  for (let i = 0; i < items.length; i += size)
    result.push(items.slice(i, i + size));
  return result;
}
const batchKeys = {
  edges: "edges.jsonl",
  pending: "unconfirmed-directed-candidates.jsonl",
  decisions: "candidate-node-decisions.jsonl",
  unresolved: "unresolved.jsonl",
  scans: "spatial-scans.jsonl",
  traces: "score-traces.jsonl",
  rejectedObservations: "rejected-observations.jsonl",
};
function batchArtifacts(input, pois, index) {
  const id = String(index + 1).padStart(4, "0"),
    prefix = "batches/" + id + "/";
  const data = generateBatch(
    pois,
    input.admissions,
    input.research,
    input.observations,
    input.rights,
    input.config,
    input.blockers,
  );
  const artifacts = Object.fromEntries(
    Object.entries(batchKeys).map(([key, name]) => [
      prefix + name,
      jsonl(data[key]),
    ]),
  );
  const resultIds = new Set([
    ...data.unresolved.map((r) => r.poiId),
    ...data.edges.map((e) => e.poiId),
  ]);
  assert.deepEqual(
    [...resultIds].sort(),
    pois.map((p) => p.internalId).sort(),
    "BATCH_EXPLICIT_RESULT_COVERAGE",
  );
  assert.equal(
    new Set(data.edges.map((e) => e.edgeId)).size,
    data.edges.length,
    "BATCH_DUPLICATE_EDGE",
  );
  const receipt = {
    schemaVersion: "1.0",
    batchId: id,
    inputFingerprint: input.inputFingerprint,
    poiIds: pois.map((p) => p.internalId),
    poiCount: pois.length,
    integrityQa: "PASS",
    acceptanceQa: data.unresolved.length ? "FAIL" : "PENDING_CORPUS_ACCEPTANCE",
    artifacts: Object.fromEntries(
      Object.entries(artifacts).map(([path, text]) => [path, sha256(text)]),
    ),
  };
  receipt.receiptSha256 = digest(receipt);
  artifacts["batch-receipts/" + id + ".json"] = objectText(receipt);
  return { id, data, artifacts, receipt };
}
function stats(values) {
  if (!values.length) return { mean: null, median: null, min: null, max: null };
  const a = values.slice().sort((x, y) => x - y),
    mid = Math.floor(a.length / 2);
  return {
    mean: a.reduce((s, n) => s + n, 0) / a.length,
    median: a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2,
    min: a[0],
    max: a.at(-1),
  };
}
const rate = (num, den) => ({
  numerator: num,
  denominator: den,
  actual: den ? num / den : null,
});
export const acceptanceFor = topologyAcceptance;
function iterationRecords(input, combined, acceptance) {
  return [
    ...(input.observedIterations ?? []),
    {
      iteration: (input.observedIterations?.at(-1)?.iteration ?? 0) + 1,
      stage: "CURRENT_FULL_REPLAY_AND_PROOF_VALIDATION",
      inputFingerprint: input.inputFingerprint,
      admittedNodes: input.admissions.filter((n) => n.downstream085Authorized)
        .length,
      topologyEdges: combined.edges.length,
      pendingDirectedCandidates: combined.pending.length,
      reviewedPoiCount: input.discoveryReview?.length ?? 0,
      failedGates: acceptance.gates
        .filter((g) => g.status === "FAIL")
        .map((g) => g.name),
      globalTopologyDiscoveryFixpoint:
        acceptance.globalTopologyDiscoveryFixpoint,
    },
  ];
}
export function baselineRevalidation(input) {
  const records = (input.baselineNodes?.records ?? []).map((old) => {
    const now = input.admissions.find(
      (n) => n.sourceRecordSha256 === old.sourceRecordSha256,
    );
    const changedFields = Object.keys(old).filter(
      (k) => stable(old[k]) !== stable(now?.[k] ?? null),
    );
    return {
      nodeId: old.nodeId,
      sourceRecordSha256: old.sourceRecordSha256,
      previousDecision: old.decision,
      status: correctedBaselineDecision(input, old, now)
        ? "AUDITED_IDENTITY_CORRECTION"
        : changedFields.length
          ? "CHANGED_OR_MISSING"
          : "PRESERVED",
      currentNodeId: now?.nodeId ?? null,
      currentDecision: now?.decision ?? null,
      changedFields,
    };
  });
  const baselineCandidates = (input.baseline ?? []).map((e) => ({
    edgeId: e.edgeId,
    poiId: e.poiId,
    nodeId: e.nodeId,
    sha256: digest(e),
  }));
  return {
    baseHead: input.baselineNodes?.baseHead ?? null,
    baselineAdmissionGitBlobSha256: input.baselineNodes?.gitBlobSha256 ?? null,
    status: records.every((r) => r.status !== "CHANGED_OR_MISSING")
      ? "PASS"
      : "FAIL",
    originalAdmitted:
      input.baselineNodes?.records.filter((r) => r.downstream085Authorized)
        .length ?? 0,
    originalHeld:
      input.baselineNodes?.records.filter((r) => !r.downstream085Authorized)
        .length ?? 0,
    missingOrChanged: records.filter((r) => r.status === "CHANGED_OR_MISSING")
      .length,
    auditedIdentityCorrections: records.filter(
      (r) => r.status === "AUDITED_IDENTITY_CORRECTION",
    ).length,
    records,
    preservedDirectedCandidates: baselineCandidates.length,
    baselineSha256: digest(input.baseline ?? []),
    candidateRecordChecksums: baselineCandidates,
    preservationPath: "inputs/baseline-directed-candidates.jsonl",
    baselineCandidatesAreDiscoveryNotAutomaticAcceptance: true,
  };
}
export function buildArtifacts(input) {
  const batches = chunks(input.pois, input.config.batchSize).map((pois, i) =>
    batchArtifacts(input, pois, i),
  );
  const combined = Object.fromEntries(
    Object.keys(batchKeys).map((k) => [k, batches.flatMap((b) => b.data[k])]),
  );
  const admitted = input.admissions.filter((n) => n.downstream085Authorized),
    edges = combined.edges;
  const completeness = input.pois.map((p) => {
    const es = edges.filter((e) => e.poiId === p.internalId),
      rs = input.research.find((r) => r.poiId === p.internalId);
    return {
      poiId: p.internalId,
      masterCode: p.masterCode,
      name: p.names.localized[0].value,
      region: p.regionRelations.find((r) => r.primary)?.regionRef ?? "unknown",
      result: es.length ? "CONFIRMED_ACCESS" : "NO_CONFIRMED_ACCESS",
      reviewStatus: input.blockers.some(
        (b) => b.poiId === p.internalId && b.ownerAdjudicated,
      )
        ? "OWNER_ADJUDICATED_EXCLUDED"
        : input.blockers.some((b) => b.poiId === p.internalId)
          ? "HUMAN_REVIEW_REQUIRED"
          : es.length
            ? "CONFIRMED"
            : "EVIDENCE_REQUIRED",
      usefulDistinctNodes: new Set(es.map((e) => e.nodeId)).size,
      directedEdges: es.length,
      localNodeCount: new Set(
        es.filter((e) => e.accessRole === "local_node").map((e) => e.nodeId),
      ).size,
      accessRoles: [...new Set(es.map((e) => e.accessRole))].sort(),
      resolvedModes: ["walking", "transit", "taxi"].filter((m) =>
        es.some((e) => e.modes[m].status === "resolved"),
      ),
      candidateNodeCount: combined.decisions.filter(
        (d) => d.poiId === p.internalId && d.decision === "RETAIN",
      ).length,
      sourceRefs: [
        ...new Set([
          ...rs.sourceRefs,
          ...es.flatMap((e) => e.topologyEvidenceRefs ?? []),
        ]),
      ],
      canonicalAdjudicationRequired: input.blockers.some(
        (b) => b.poiId === p.internalId && !b.ownerAdjudicated,
      ),
      assessmentEligible:
        !input.preflight.canonical.accessAdjudication.excludedInternalIds.includes(
          p.internalId,
        ),
      ownerAdjudication:
        input.preflight.canonical.accessAdjudication.records.find(
          (r) => r.internalId === p.internalId,
        ) ?? null,
      barrierReviewTriggers: rs.barrierReviewTriggers,
    };
  });
  const proofs = discoveryProofs(input, combined, completeness),
    anomalies = qualityAnomalies(edges, input.pois, input.config);
  const acceptance = acceptanceFor(
    input,
    combined,
    completeness,
    proofs,
    anomalies,
  );
  const modeRows = [...edges, ...combined.pending];
  const modes = Object.fromEntries(
    ["walking", "transit", "taxi"].map((m) => [
      m,
      {
        acceptedEdges: rate(
          edges.filter((e) => e.modes[m].status === "resolved").length,
          edges.length,
        ),
        allDirectedCandidates: rate(
          modeRows.filter((e) => e.modes[m].status === "resolved").length,
          modeRows.length,
        ),
        usablePoiCoverage: rate(
          completeness.filter((p) => p.resolvedModes.includes(m)).length,
          input.pois.length,
        ),
        assessedPoiCoverage: rate(
          completeness.filter(
            (p) => p.assessmentEligible && p.resolvedModes.includes(m),
          ).length,
          completeness.filter((p) => p.assessmentEligible).length,
        ),
      },
    ]),
  );
  modes.directional = Object.fromEntries(
    ["POI_TO_NODE", "NODE_TO_POI"].map((direction) => [
      direction,
      Object.fromEntries(
        ["walking", "transit", "taxi"].map((mode) => [
          mode,
          rate(
            edges.filter(
              (e) =>
                e.direction === direction &&
                e.modes[mode].status === "resolved",
            ).length,
            edges.filter((e) => e.direction === direction).length,
          ),
        ]),
      ),
    ]),
  );
  modes.optional = Object.fromEntries(
    [
      "accessibility",
      "stairs",
      "elevationGainM",
      "detourRatio",
      "durationP90Min",
    ].map((field) => [
      field,
      {
        edges: rate(
          edges.filter((e) =>
            Object.values(e.modes).some(
              (m) =>
                m.status === "resolved" &&
                m.metrics?.[field] != null &&
                m.metrics[field] !== "unknown",
            ),
          ).length,
          edges.length,
        ),
        pois: rate(
          completeness.filter((p) =>
            edges.some(
              (e) =>
                e.poiId === p.poiId &&
                Object.values(e.modes).some(
                  (m) =>
                    m.status === "resolved" &&
                    m.metrics?.[field] != null &&
                    m.metrics[field] !== "unknown",
                ),
            ),
          ).length,
          input.pois.length,
        ),
      },
    ]),
  );
  const regions = [...new Set(completeness.map((p) => p.region))]
    .sort()
    .map((region) => {
      const rows = completeness.filter((p) => p.region === region);
      return {
        region,
        canonicalPois: rows.length,
        scanned: rows.length,
        explicitResults: rows.length,
        usableAccess: rate(
          rows.filter((p) => p.usefulDistinctNodes > 0).length,
          rows.length,
        ),
        unresolvedPoiIds: rows
          .filter((p) => !p.usefulDistinctNodes)
          .map((p) => p.poiId),
      };
    });
  const roles = Object.fromEntries(
    ["local_node", "major_hub", "tourism_gateway", "special_access"].map(
      (role) => [
        role,
        {
          usablePoiCoverage: rate(
            completeness.filter((p) => p.accessRoles.includes(role)).length,
            input.pois.length,
          ),
          unconfirmedCandidatePairs: combined.decisions.filter(
            (d) => d.accessRole === role && d.decision === "RETAIN",
          ).length,
        },
      ],
    ),
  );
  const reasons = {};
  for (const row of combined.unresolved)
    for (const reason of row.reasons)
      reasons[reason] = (reasons[reason] ?? 0) + 1;
  const artifacts = {
    ...Object.assign({}, ...batches.map((b) => b.artifacts)),
    "poi-transport-access-edges.jsonl": jsonl(edges),
    "topology-confirmed-edges.jsonl": jsonl(edges),
    "route-metric-unresolved.jsonl": jsonl(
      edges.flatMap((e) =>
        ["walking", "transit", "taxi"]
          .filter((m) => e.modes[m].status !== "resolved")
          .map((m) => ({
            edgeId: e.edgeId,
            poiId: e.poiId,
            nodeId: e.nodeId,
            direction: e.direction,
            mode: m,
            status: e.modes[m].status.toUpperCase(),
            reason:
              e.directionalAccessStatus === "UNAVAILABLE"
                ? "DOCUMENTED_DIRECTIONAL_PROHIBITION"
                : "NO_LEGAL_ENDPOINT_BOUND_DIRECTIONAL_METRICS",
            topologyStatus: e.topologyStatus,
            topologyPreserved: true,
            sourceRefs: e.topologyEvidenceRefs,
            rightsDecisionPath: "inputs/source-rights.json",
            distanceM: null,
            durationTypicalMin: null,
            durationP90Min: null,
            stairs: null,
            elevationGainM: null,
            accessibility: null,
            detourRatio: null,
          })),
      ),
    ),
    "canonical-adjudication-required.json": objectText({
      authoritativeCanonicalCount: input.pois.length,
      recordsRemovedByB: 0,
      upstreamFilesModified: false,
      pendingCount: input.blockers.filter((b) => !b.ownerAdjudicated).length,
      ownerAdjudication: input.preflight.canonical.accessAdjudication,
      cases: input.blockers.map((b) => ({
        disposition: b.ownerAdjudicated
          ? "RESOLVED_BY_CANONICAL_OWNER"
          : "OWNER_REVIEW_REQUIRED",
        ...b,
        classification: b.allGeneralTouristModesBlocked
          ? "LIFECYCLE_INVALID"
          : b.reason.includes("RESTRICTED")
            ? "PUBLIC_ACCESS_RESTRICTED"
            : "CANONICAL_ENDPOINT_AMBIGUOUS",
      })),
      supportingHash: input.preflight.canonical.supportingSampleManifest,
    }),
    "baseline-revalidation.json": objectText(baselineRevalidation(input)),
    "post-canonical-replay-audit.json": objectText(
      replayOutcome(input, combined, proofs),
    ),
    "poi-access-unresolved.jsonl": jsonl(combined.unresolved),
    "poi-access-score-traces.jsonl": jsonl(combined.traces),
    "candidate-node-decisions.jsonl": jsonl(combined.decisions),
    "node-downstream-admission.jsonl": jsonl(input.admissions),
    "topology-evidence-export.jsonl": jsonl(input.topologyReview),
    "identity-correction-audit.json": objectText(
      input.reviewCorrections ?? null,
    ),
    "review-remediation-audit.json": objectText(
      input.targetedRepair
        ? auditReviewConservation(input, edges)
        : { status: "NOT_APPLICABLE_TO_PRE_TARGETED_FIXTURE" },
    ),
    "poi-access-completeness.json": objectText(completeness),
    "under-target-pois.json": objectText(
      completeness
        .filter(
          (p) =>
            p.assessmentEligible &&
            p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
        )
        .map((p) => ({
          ...p,
          exhaustionProof:
            proofs.find((x) => x.poiId === p.poiId)?.status ??
            "DISCOVERY_IN_PROGRESS",
        })),
    ),
    "candidate-exhaustion-proofs.jsonl": jsonl(proofs),
    "coverage-by-region.json": objectText(regions),
    "access-role-coverage.json": objectText(roles),
    "mode-resolution-coverage.json": objectText(modes),
    "detour-anomalies.jsonl": jsonl(anomalies),
    "auto-fix-iterations.jsonl": jsonl(
      iterationRecords(input, combined, acceptance),
    ),
    "final-acceptance-gate.json": objectText(acceptance),
    "batches/README.md":
      "# TASK-085 batches\n\n200 runtime-authorized POIs per batch (final batch may be shorter). Integrity QA PASS allows scanning the next batch; it does not mean access acceptance PASS. Unconfirmed directed candidates are quarantined here.\n",
    "batch-receipts/README.md":
      "# TASK-085 receipts\n\nReceipts seal the input fingerprint, POI membership and every batch artifact checksum. Resume verifies the receipt and files before checksum skip. Changed sources invalidate intact receipts. A corrupted receipt fails closed; --rerun-batch N explicitly repairs only that batch.\n",
  };
  const manifest = {
    schemaVersion: "1.0",
    task: "TASK-085-B",
    revision: input.config.revision,
    status: acceptance.status,
    acceptanceStatus: acceptance.status,
    globalTopologyDiscoveryFixpoint: acceptance.globalTopologyDiscoveryFixpoint,
    blockingScope:
      "Topology and route metrics evaluated separately; see failed topology gates and explicit per-POI source/identity proof.",
    ...input.preflight,
    inputFingerprint: input.inputFingerprint,
    transportAdmission: {
      path: OUTPUT + "/node-downstream-admission.jsonl",
      revision: input.config.revision,
      sha256: sha256(artifacts["node-downstream-admission.jsonl"]),
      records: input.admissions.length,
      acceptedTopologyNodes: admitted.length,
      heldNodes: input.admissions.length - admitted.length,
      heldRecordCount: input.admissions.length - admitted.length,
      heldUniqueNodeIdCount: new Set(
        input.admissions
          .filter((n) => !n.downstream085Authorized)
          .map((n) => n.nodeId),
      ).size,
      admittedUniqueNodeIdCount: new Set(admitted.map((n) => n.nodeId)).size,
      nationalMasterAuthorized: false,
      usableAccessNotImplied: true,
    },
    metrics: {
      canonicalPoiProcessedCount: input.pois.length,
      assessment: {
        denominator: completeness.filter((p) => p.assessmentEligible).length,
        withConfirmedTopology: completeness.filter(
          (p) => p.assessmentEligible && p.usefulDistinctNodes > 0,
        ).length,
        underTarget: completeness.filter(
          (p) =>
            p.assessmentEligible &&
            p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
        ).length,
        zeroNodes: completeness.filter(
          (p) => p.assessmentEligible && !p.usefulDistinctNodes,
        ).length,
        atLeastTarget: completeness.filter(
          (p) =>
            p.assessmentEligible &&
            p.usefulDistinctNodes >= input.config.targetMinNodesPerPoi,
        ).length,
        usefulNodesPerPoi: stats(
          completeness
            .filter((p) => p.assessmentEligible)
            .map((p) => p.usefulDistinctNodes),
        ),
      },
      shortfall: completeness.filter((p) => !p.usefulDistinctNodes).length,
      poisWithAtLeastOneAccessNode: completeness.filter(
        (p) => p.usefulDistinctNodes > 0,
      ).length,
      totalDirectedEdges: edges.length,
      unconfirmedDirectedCandidates: combined.pending.length,
      usefulNodesPerPoi: stats(completeness.map((p) => p.usefulDistinctNodes)),
      edgesPerPoi: stats(completeness.map((p) => p.directedEdges)),
      underTargetPois: completeness.filter(
        (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
      ).length,
      exhaustionProofCoverage: rate(
        proofs.filter((p) => p.status === "CANDIDATE_EXHAUSTION_PROOF").length,
        completeness.filter(
          (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
        ).length,
      ),
      localNodeCoverage: roles.local_node.usablePoiCoverage,
      majorHubCoverage: roles.major_hub.usablePoiCoverage,
      specialTourismAccessCoverage: rate(
        completeness.filter((p) =>
          p.accessRoles.some((r) =>
            ["tourism_gateway", "special_access"].includes(r),
          ),
        ).length,
        input.pois.length,
      ),
      modeResolution: modes,
      accessibilityKnownRate: rate(
        edges.filter((e) =>
          Object.values(e.modes).some(
            (m) =>
              m.metrics?.accessibility && m.metrics.accessibility !== "unknown",
          ),
        ).length,
        edges.length,
      ),
      extremeDetourCount: anomalies.filter((a) => a.reason === "EXTREME_DETOUR")
        .length,
      routeBarrierQaAssessableCandidates: modeRows.filter(
        (e) => e.provenance.routeEvidence?.length,
      ).length,
      unresolvedPoiCount: combined.unresolved.length,
      unresolvedReasonDistribution: reasons,
      batchCount: batches.length,
      acceptedNodeProvenance: rate(
        admitted.filter((n) => n.sourceRefs.length && n.archiveSha256).length,
        admitted.length,
      ),
      acceptedEdgeProvenance: rate(
        edges.filter((e) => e.provenance.topologyEvidence?.length).length,
        edges.length,
      ),
    },
    providerLicenseDecision: input.rights,
    execution: {
      deterministicRebuild:
        input.executionVerification?.deterministicRebuild ?? "NOT_RUN",
      providerBatchRequests: 0,
      rawRouteProviderPayloadsPersisted: 0,
      task086Started: false,
      autoFixIterationCount: iterationRecords(input, combined, acceptance)
        .length,
      batchIntegrityQa:
        input.executionVerification?.receiptIntegrity ?? "NOT_RUN",
      accessAcceptance: acceptance.status,
      globalTopologyDiscoveryFixpoint:
        acceptance.globalTopologyDiscoveryFixpoint,
      candidateExhaustionProofCount: proofs.filter(
        (p) => p.status === "CANDIDATE_EXHAUSTION_PROOF",
      ).length,
    },
    wbs715Status: acceptance.allPass
      ? "待审查"
      : acceptance.status === EXCEPTION_STATUS
        ? "待审查（audited fixpoint exceptions）"
        : "进行中",
    sourceFiles: input.sourceFiles,
    generatedArtifactHashes: Object.fromEntries(
      Object.entries(artifacts).map(([path, text]) => [path, sha256(text)]),
    ),
  };
  // preflight.status describes national input selection, not the run outcome.
  manifest.status = acceptance.status;
  artifacts["manifest.json"] = objectText(manifest);
  return { artifacts, batches, manifest, acceptance };
}
export function validateReceipt(out, receipt) {
  return validateReceiptContents(receipt, (file) =>
    readFileSync(join(out, file), "utf8"),
  );
}
export function validateReceiptContents(receipt, readArtifact) {
  const { receiptSha256, ...unsigned } = receipt;
  assert.equal(receiptSha256, digest(unsigned), "CORRUPTED_RECEIPT");
  assert.equal(receipt.integrityQa, "PASS", "CORRUPTED_RECEIPT_QA");
  for (const [file, sha] of Object.entries(receipt.artifacts)) {
    assert.ok(
      /^batches\/\d{4}\/[a-z-]+\.jsonl$/.test(file),
      "UNSAFE_RECEIPT_PATH",
    );
    assert.ok(readArtifact(file) != null, "MISSING_BATCH_ARTIFACT:" + file);
    assert.equal(
      sha256(readArtifact(file)),
      sha,
      "CORRUPTED_BATCH_ARTIFACT:" + file,
    );
  }
}
function atomicWrite(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + ".task085-tmp";
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}
export function execute({
  root = ROOT,
  out = join(root, OUTPUT),
  mode = "resume",
  rerunBatch = null,
  input = null,
} = {}) {
  input ??= loadInputs(root);
  const probe = buildArtifacts(input);
  assert.deepEqual(
    probe.artifacts,
    buildArtifacts(input).artifacts,
    "NON_DETERMINISTIC_FULL_REBUILD",
  );
  for (const b of probe.batches) {
    const reader = (f) => probe.artifacts[f];
    validateReceiptContents(b.receipt, reader);
    assert.throws(
      () =>
        validateReceiptContents(
          { ...b.receipt, poiCount: b.receipt.poiCount + 1 },
          reader,
        ),
      /CORRUPTED_RECEIPT/,
    );
    assert.throws(
      () => validateReceiptContents(b.receipt, () => "corrupted"),
      /CORRUPTED_BATCH_ARTIFACT/,
    );
  }
  input = {
    ...input,
    executionVerification: {
      deterministicRebuild:
        "PASS_TWO_INDEPENDENT_FULL_ARTIFACT_BUILDS_COMPARED_BEFORE_WRITE",
      receiptIntegrity: "PASS_GENERATED_RECEIPTS_AND_INJECTED_CORRUPTION",
    },
  };
  const built = buildArtifacts(input),
    second = buildArtifacts(input);
  assert.deepEqual(
    built.artifacts,
    second.artifacts,
    "NON_DETERMINISTIC_FULL_REBUILD",
  );
  if (rerunBatch !== null)
    assert.ok(
      Number.isInteger(rerunBatch) &&
        rerunBatch >= 1 &&
        rerunBatch <= built.batches.length,
      "INVALID_BATCH_NUMBER",
    );
  if (existsSync(out)) {
    const inventory = (dir, prefix = "") =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const name = prefix + entry.name;
        if (name === "inputs") return [];
        return entry.isDirectory()
          ? inventory(join(dir, entry.name), name + "/")
          : [name];
      });
    const unexpected = inventory(out).filter(
      (name) =>
        !(name in built.artifacts) &&
        OUTPUT + "/" + name !== CORRECTIONS_PATH &&
        !input.targetedRepair?.sourceFiles.some(
          (f) => f.path === OUTPUT + "/" + name,
        ),
    );
    assert.deepEqual(unexpected, [], "UNEXPECTED_OR_STALE_TASK_ARTIFACTS");
  }
  const operations = [];
  // Validate all existing receipts before mutating any files.
  for (const batch of built.batches) {
    const path = "batch-receipts/" + batch.id + ".json",
      present = existsSync(join(out, path));
    if (mode !== "rebuild" && present && Number(batch.id) !== rerunBatch) {
      const receipt = JSON.parse(readFileSync(join(out, path), "utf8"));
      validateReceipt(out, receipt);
      const current = receipt.inputFingerprint === input.inputFingerprint;
      if (current)
        assert.equal(
          stable(receipt),
          stable(batch.receipt),
          "RECEIPT_EXPECTATION_MISMATCH",
        );
      operations.push({
        batchId: batch.id,
        action: current ? "CHECKSUM_SKIP" : "CHANGED_SOURCE_INVALIDATE",
      });
    } else
      operations.push({
        batchId: batch.id,
        action:
          Number(batch.id) === rerunBatch ? "SINGLE_BATCH_RERUN" : "GENERATE",
      });
  }
  if (mode === "check") {
    for (const [path, text] of Object.entries(built.artifacts))
      assert.equal(
        readFileSync(join(out, path), "utf8"),
        text,
        "ARTIFACT_DRIFT:" + path,
      );
  } else {
    for (const batch of built.batches)
      if (
        operations.find((o) => o.batchId === batch.id).action !==
        "CHECKSUM_SKIP"
      )
        for (const [path, text] of Object.entries(batch.artifacts))
          atomicWrite(join(out, path), text);
    for (const [path, text] of Object.entries(built.artifacts))
      if (
        !/^batches\/\d{4}\//.test(path) &&
        !/^batch-receipts\/\d{4}\.json$/.test(path)
      )
        atomicWrite(join(out, path), text);
  }
  return {
    status: built.manifest.status,
    acceptance: built.acceptance.status,
    inputFingerprint: input.inputFingerprint,
    processed: input.pois.length,
    admittedNodes: built.manifest.transportAdmission.acceptedTopologyNodes,
    directedEdges: built.manifest.metrics.totalDirectedEdges,
    pending: built.manifest.metrics.unconfirmedDirectedCandidates,
    operations,
    deterministicRebuild: "PASS",
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  const known = [
    "--resume",
    "--write",
    "--rebuild",
    "--check",
    "--rerun-batch",
  ];
  assert.ok(
    args.length > 0 &&
      args.every(
        (a, i) =>
          known.includes(a) ||
          (i > 0 && args[i - 1] === "--rerun-batch" && /^\d+$/.test(a)),
      ),
    "Usage: --resume | --rebuild | --check | --rerun-batch N",
  );
  const mode = args.includes("--check")
    ? "check"
    : args.includes("--rebuild")
      ? "rebuild"
      : "resume";
  const pos = args.indexOf("--rerun-batch");
  const rerunBatch = pos < 0 ? null : Number(args[pos + 1]);
  const report = execute({ mode, rerunBatch });
  console.log(JSON.stringify(report, null, 2));
  if (
    mode !== "check" &&
    ![
      "PASS / READY_FOR_REVIEW",
      "READY_EXCEPT_CANONICAL_ADJUDICATION",
      EXCEPTION_STATUS,
    ].includes(report.acceptance)
  )
    process.exitCode = 2;
}
