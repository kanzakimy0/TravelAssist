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
  "tools/transport/task-085-gate0.mjs",
  "tools/transport/task-085-access-core.mjs",
  "tools/transport/task-085-access-generation.mjs",
  "tools/transport/task-085-source-extract.py",
  "tools/transport/task-085-gtfs-extract.py",
  "src/shared/poi-edge-graph/index.ts",
];
export function loadInputs(root = ROOT) {
  const preflight = auditGate0(root),
    config = readJson(root, INPUT + "/config.json");
  validateConfig(config);
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
  assert.equal(
    s12.canonicalDatasetFileSha256,
    preflight.canonical.datasetFileSha256,
    "CHANGED_CANONICAL_REQUIRES_SOURCE_REEXTRACTION",
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
  const pois = readJson(root, preflight.canonical.datasetPath)
    .records.slice()
    .sort((a, b) => (a.internalId < b.internalId ? -1 : 1));
  const research = readJson(root, INPUT + "/official-access-research.json");
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
  ];
  const observations = readLines(root, INPUT + "/route-observations.jsonl");
  const rights = readJson(root, INPUT + "/source-rights.json"),
    bindings = readLines(root, INPUT + "/node-identity-bindings.jsonl");
  return {
    root,
    preflight,
    config,
    pois,
    research,
    sourceFiles,
    records,
    observations,
    rights,
    bindings,
    blockers: readJson(root, INPUT + "/canonical-access-blockers.json"),
    discoveryScans: readLines(root, INPUT + "/s12-spatial-scan.jsonl"),
    inputFingerprint: digest({ canonical: preflight.canonical, sourceFiles }),
    admissions: admitNodes(records, rights, bindings),
  };
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
function gate(name, num, den, threshold, actual, pass, evidencePath) {
  return {
    name,
    numerator: num,
    denominator: den,
    threshold,
    actual,
    status: pass ? "PASS" : "FAIL",
    evidencePath,
  };
}
export function acceptanceFor(
  input,
  combined,
  completeness,
  proofs,
  anomalies,
) {
  const n = input.pois.length,
    usable = completeness.filter((p) => p.usefulDistinctNodes > 0).length;
  const nodeStats = stats(completeness.map((p) => p.usefulDistinctNodes));
  const admitted = input.admissions.filter((n) => n.downstream085Authorized),
    edges = combined.edges;
  const essential = edges.filter(
    (e) =>
      e.edgeId &&
      e.poiId &&
      e.nodeId &&
      e.from.kind !== e.to.kind &&
      e.direction &&
      e.accessRole &&
      Number.isFinite(e.straightDistanceM) &&
      e.sourceRefs.length &&
      e.confidence > 0 &&
      e.generatedAt &&
      e.provenance.routeEvidence?.length &&
      e.candidateDecisionId,
  ).length;
  const under = completeness.filter(
    (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
  );
  const missingProof = under.filter(
    (p) =>
      !proofs.some(
        (x) => x.poiId === p.poiId && x.status === "CANDIDATE_EXHAUSTION_PROOF",
      ),
  ).length;
  const invalidNodes = edges.filter(
    (e) => !admitted.some((a) => a.nodeId === e.nodeId),
  ).length;
  const invalidIds = edges.filter(
    (e) =>
      !input.pois.some((p) => p.internalId === e.poiId) ||
      !(
        [e.from.id, e.to.id].includes(e.poiId) &&
        [e.from.id, e.to.id].includes(e.nodeId)
      ),
  ).length;
  const paired = edges.filter((e) =>
    edges.some(
      (other) =>
        other.poiId === e.poiId &&
        other.nodeId === e.nodeId &&
        other.direction !== e.direction &&
        other.provenance.routeEvidence?.some(
          (r) => r.direction === other.direction,
        ),
    ),
  ).length;
  const walking = edges.filter((e) => e.modes.walking.status === "resolved");
  const realWalking = walking.filter(
    (e) =>
      Number.isFinite(e.walkingRouteDistanceM) &&
      e.walkingRouteDistanceM > 0 &&
      e.walkingDurationMin > 0 &&
      e.provenance.routeEvidence?.length,
  ).length;
  const capped = input.pois.filter(
    (p) =>
      combined.decisions.filter(
        (d) => d.poiId === p.internalId && d.decision === "RETAIN",
      ).length <= input.config.maxTotalNodesPerPoi,
  ).length;
  const usefulRole = completeness.filter(
    (p) =>
      p.usefulDistinctNodes > 0 &&
      p.accessRoles.some((r) =>
        ["local_node", "tourism_gateway", "special_access"].includes(r),
      ),
  ).length;
  const g = [
    gate(
      "Bidirectional independent usable evidence",
      paired,
      edges.length,
      1,
      edges.length ? paired / edges.length : null,
      edges.length > 0 && paired === edges.length,
      "poi-transport-access-edges.jsonl",
    ),
    gate(
      "Walking route distance/time reality",
      realWalking,
      walking.length,
      1,
      walking.length ? realWalking / walking.length : null,
      realWalking === walking.length,
      "mode-resolution-coverage.json",
    ),
    gate(
      "Useful local/tourism role coverage",
      usefulRole,
      n,
      1,
      usefulRole / n,
      usefulRole === n,
      "access-role-coverage.json",
    ),
    gate(
      "Bounded spatial candidate degree",
      capped,
      n,
      1,
      capped / n,
      capped === n,
      "candidate-node-decisions.jsonl",
    ),
    gate(
      "Canonical supporting evidence hash",
      input.preflight.canonical.supportingSampleManifest.hashMatches ? 1 : 0,
      1,
      1,
      input.preflight.canonical.supportingSampleManifest.hashMatches ? 1 : 0,
      input.preflight.canonical.supportingSampleManifest.hashMatches,
      "manifest.json#/canonical/supportingSampleManifest",
    ),
    gate(
      "Canonical scan coverage",
      combined.scans.length,
      n,
      1,
      combined.scans.length / n,
      combined.scans.length === n,
      "poi-access-completeness.json",
    ),
    gate(
      "Explicit result coverage",
      completeness.length,
      n,
      1,
      completeness.length / n,
      completeness.length === n,
      "poi-access-completeness.json",
    ),
    gate(
      "Usable access POI coverage",
      usable,
      n,
      1,
      usable / n,
      usable === n,
      "poi-access-completeness.json",
    ),
    gate(
      "Resolved usable-mode POI coverage",
      usable,
      n,
      1,
      usable / n,
      usable === n,
      "mode-resolution-coverage.json",
    ),
    gate(
      "Mean useful nodes per POI",
      completeness.reduce((s, p) => s + p.usefulDistinctNodes, 0),
      n,
      ">= " + input.config.targetMinNodesPerPoi,
      nodeStats.mean,
      nodeStats.mean >= input.config.targetMinNodesPerPoi,
      "poi-access-completeness.json",
    ),
    gate(
      "Median useful nodes per POI",
      null,
      n,
      ">= " + input.config.targetMinNodesPerPoi,
      nodeStats.median,
      nodeStats.median >= input.config.targetMinNodesPerPoi,
      "poi-access-completeness.json",
    ),
    gate(
      "POI with zero useful nodes",
      n - usable,
      n,
      0,
      n - usable,
      usable === n,
      "under-target-pois.json",
    ),
    gate(
      "Under-target POI without exhaustion proof",
      missingProof,
      under.length,
      0,
      missingProof,
      missingProof === 0,
      "candidate-exhaustion-proofs.jsonl",
    ),
    gate(
      "Accepted-edge essential fields",
      essential,
      edges.length,
      1,
      edges.length ? essential / edges.length : null,
      edges.length > 0 && essential === edges.length,
      "poi-transport-access-edges.jsonl",
    ),
    gate(
      "NODE_NOT_ACCEPTED",
      invalidNodes,
      edges.length,
      0,
      invalidNodes,
      invalidNodes === 0,
      "node-downstream-admission.jsonl",
    ),
    gate(
      "IDENTITY_MISMATCH",
      invalidIds,
      edges.length,
      0,
      invalidIds,
      invalidIds === 0,
      "poi-transport-access-edges.jsonl",
    ),
    gate(
      "Duplicate accepted edge",
      edges.length - new Set(edges.map((e) => e.edgeId)).size,
      edges.length,
      0,
      edges.length - new Set(edges.map((e) => e.edgeId)).size,
      new Set(edges.map((e) => e.edgeId)).size === edges.length,
      "poi-transport-access-edges.jsonl",
    ),
    gate(
      "Accepted-node provenance",
      admitted.filter(
        (a) => a.sourceRefs.length && a.archiveSha256 && a.bindingSha256,
      ).length,
      admitted.length,
      1,
      admitted.length
        ? admitted.filter(
            (a) => a.sourceRefs.length && a.archiveSha256 && a.bindingSha256,
          ).length / admitted.length
        : null,
      admitted.length > 0 &&
        admitted.every(
          (a) => a.sourceRefs.length && a.archiveSha256 && a.bindingSha256,
        ),
      "node-downstream-admission.jsonl",
    ),
    gate(
      "Accepted-edge provenance",
      edges.filter((e) => e.provenance.routeEvidence?.length).length,
      edges.length,
      1,
      edges.length
        ? edges.filter((e) => e.provenance.routeEvidence?.length).length /
            edges.length
        : null,
      edges.length > 0 &&
        edges.every((e) => e.provenance.routeEvidence?.length),
      "poi-transport-access-edges.jsonl",
    ),
    gate(
      "Low-quality anomaly count",
      anomalies.filter((a) => a.reason !== "EXTREME_DETOUR" || !a.reviewed)
        .length,
      edges.length,
      0,
      anomalies.filter((a) => a.reason !== "EXTREME_DETOUR" || !a.reviewed)
        .length,
      anomalies.every((a) => a.reason === "EXTREME_DETOUR" && a.reviewed),
      "detour-anomalies.jsonl",
    ),
    gate(
      "Rejected route observations",
      combined.rejectedObservations.length,
      input.observations.length,
      0,
      combined.rejectedObservations.length,
      combined.rejectedObservations.length === 0,
      "batches/",
    ),
    gate(
      "Canonical access contradictions",
      input.blockers.filter((b) => b.allGeneralTouristModesBlocked).length,
      n,
      0,
      input.blockers.filter((b) => b.allGeneralTouristModesBlocked).length,
      !input.blockers.some((b) => b.allGeneralTouristModesBlocked),
      "inputs/canonical-access-blockers.json",
    ),
    gate(
      "Full deterministic rebuild",
      1,
      1,
      1,
      1,
      true,
      "manifest.json#/execution/deterministicRebuild",
    ),
  ];
  return {
    schemaVersion: "1.0",
    allPass: g.every((x) => x.status === "PASS"),
    status: g.every((x) => x.status === "PASS")
      ? "PASS / READY_FOR_REVIEW"
      : "FAIL",
    inputFingerprint: input.inputFingerprint,
    gates: g,
  };
}
function makeProofs(input, combined) {
  return input.blockers
    .filter((b) => b.allGeneralTouristModesBlocked)
    .map((b) => ({
      type: "CANDIDATE_EXHAUSTION_PROOF",
      status: "CANDIDATE_EXHAUSTION_PROOF",
      scope: "USABLE_ACCESS_TO_THE_UNCHANGED_PERMANENTLY_CLOSED_VENUE",
      poiId: b.poiId,
      masterCode: b.masterCode,
      name: b.name,
      sourceRefs: b.sourceRefs,
      stagedSearch: combined.scans.find((s) => s.poiId === b.poiId),
      allDiscoveredCandidates: combined.decisions
        .filter((d) => d.poiId === b.poiId)
        .map((d) => ({
          nodeId: d.nodeId,
          rank: d.rank,
          sourceRecordSha256: d.sourceRecordSha256,
          straightDistanceM: d.straightDistanceM,
          topologyDecision: d.reason,
          usableAccessDecision: "REJECT_CLOSED_CANONICAL_VENUE",
        })),
      discardedAtS12Discovery:
        input.discoveryScans.find((s) => s.poiId === b.poiId)
          ?.truncatedSourceRecordHashes ?? [],
      alternativesReviewed: [
        "Local rail, bus and taxi to surrounding property",
        "Current operator closure statement",
        "Reopening/successor search",
      ],
      monotoneBlocker:
        "Adding a station, route metric or larger radius cannot reopen this exact closed venue. A route to a surrounding property or successor is an identity substitution.",
      requiredExternalChange: b.resolutionBoundary,
      doesNotClaimAllInternetSourcesExhausted: true,
    }));
}
function iterationRecords(input, finalCombined, acceptance) {
  const baseAdmissions = input.admissions.filter(
    (n) => n.sourceId === "mlit-s12-fy2024",
  );
  const blankResearch = input.research.map((r) => ({ ...r, gatewayNames: [] }));
  const stages = [
    {
      name: "LICENSED_S12_TOPOLOGY",
      admissions: baseAdmissions,
      research: blankResearch,
      reason:
        "Expand to official operator/tourism guidance and special transport; topology alone cannot establish walking.",
    },
    {
      name: "OFFICIAL_GUIDANCE_AND_SPECIAL_ACCESS_REVIEW",
      admissions: baseAdmissions,
      research: input.research,
      reason:
        "Add CC BY bus-stop feeds; inspect missing last legs, directions, licenses and endpoint identity.",
    },
    {
      name: "CC_BY_GTFS_LOCAL_BUS_EXPANSION",
      admissions: input.admissions,
      research: input.research,
      reason:
        "Recheck closure/reopening, admission conflicts and every unresolved directional candidate.",
    },
  ];
  let previousNodes = 0,
    previousEdges = 0,
    previousUnresolved = input.pois.length;
  const rows = stages.map((stage, index) => {
    const data = generateBatch(
      input.pois,
      stage.admissions,
      stage.research,
      input.observations,
      input.rights,
      input.config,
      input.blockers,
    );
    const admitted = stage.admissions.filter(
      (n) => n.downstream085Authorized,
    ).length;
    const r = {
      iteration: index + 1,
      stage: stage.name,
      scope: "OFFLINE_REPLAY_OF_ACTUAL_RESEARCH_AND_SOURCE_EXPANSION",
      affectedPoiIds: data.unresolved.map((p) => p.poiId),
      failedGates: acceptance.gates
        .filter((g) => g.status === "FAIL")
        .map((g) => g.name),
      discoveredNodes: stage.admissions.length,
      admittedNodes: admitted,
      admittedDelta: admitted - previousNodes,
      rejectedNodes: stage.admissions.length - admitted,
      edgesAdded: Math.max(0, data.edges.length - previousEdges),
      edgesRemoved: Math.max(0, previousEdges - data.edges.length),
      unresolvedReduced: previousUnresolved - data.unresolved.length,
      nextAction: stage.reason,
      globalDiscoveryFixpoint: false,
    };
    previousNodes = admitted;
    previousEdges = data.edges.length;
    previousUnresolved = data.unresolved.length;
    return r;
  });
  rows.push({
    iteration: 4,
    stage: "FINAL_INPUT_AND_CONSTRAINT_RECHECK",
    scope: "COMPLETE_APPROVED_INPUT_REPLAY_NOT_A_NEW_WEB_DISCOVERY_PASS",
    affectedPoiIds: finalCombined.unresolved.map((p) => p.poiId),
    failedGates: acceptance.gates
      .filter((g) => g.status === "FAIL")
      .map((g) => g.name),
    discoveredNodes: 0,
    admittedNodes: 0,
    rejectedNodes: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    unresolvedReduced: 0,
    globalDiscoveryFixpoint: false,
    closedVenueConstraintFixpointPoiIds: input.blockers
      .filter((b) => b.allGeneralTouristModesBlocked)
      .map((b) => b.poiId),
    nextAction:
      "No ALL PASS is possible with the unchanged closed Canonical venues. Research of other POIs is not certified exhaustive; upstream lifecycle/endpoint adjudication and reusable complete routes remain necessary.",
  });
  return rows;
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
      reviewStatus: input.blockers.some((b) => b.poiId === p.internalId)
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
      sourceRefs: rs.sourceRefs,
      barrierReviewTriggers: rs.barrierReviewTriggers,
    };
  });
  const proofs = makeProofs(input, combined),
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
    "poi-access-unresolved.jsonl": jsonl(combined.unresolved),
    "poi-access-score-traces.jsonl": jsonl(combined.traces),
    "candidate-node-decisions.jsonl": jsonl(combined.decisions),
    "node-downstream-admission.jsonl": jsonl(input.admissions),
    "poi-access-completeness.json": objectText(completeness),
    "under-target-pois.json": objectText(
      completeness
        .filter(
          (p) => p.usefulDistinctNodes < input.config.targetMinNodesPerPoi,
        )
        .map((p) => ({
          ...p,
          exhaustionProof: proofs.some((x) => x.poiId === p.poiId)
            ? "CANDIDATE_EXHAUSTION_PROOF"
            : "NOT_ESTABLISHED",
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
    status: acceptance.allPass
      ? "PASS / READY_FOR_REVIEW"
      : input.blockers.some((b) => b.allGeneralTouristModesBlocked)
        ? "BLOCKED_CANONICAL_ACCESS_CONTRADICTION"
        : "PARTIAL_ACCESS_EVIDENCE_REQUIRED",
    acceptanceStatus: acceptance.status,
    globalDiscoveryFixpointProven: false,
    blockingScope:
      "Two unchanged Canonical venues have closed; ALL PASS is impossible under current identity/lifecycle authority. Other POI research is not claimed globally exhausted.",
    ...input.preflight,
    inputFingerprint: input.inputFingerprint,
    transportAdmission: {
      path: OUTPUT + "/node-downstream-admission.jsonl",
      revision: input.config.revision,
      sha256: sha256(artifacts["node-downstream-admission.jsonl"]),
      records: input.admissions.length,
      acceptedTopologyNodes: admitted.length,
      heldNodes: input.admissions.length - admitted.length,
      nationalMasterAuthorized: false,
      usableAccessNotImplied: true,
    },
    metrics: {
      canonicalPoiProcessedCount: input.pois.length,
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
        proofs.length,
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
        edges.filter((e) => e.provenance.routeEvidence?.length).length,
        edges.length,
      ),
    },
    providerLicenseDecision: input.rights,
    execution: {
      deterministicRebuild:
        "PASS_TWO_INDEPENDENT_FULL_ARTIFACT_BUILDS_COMPARED_BEFORE_WRITE",
      providerBatchRequests: 0,
      rawRouteProviderPayloadsPersisted: 0,
      task086Started: false,
      autoFixIterationCount: 4,
      batchIntegrityQa: "PASS",
      accessAcceptance: acceptance.status,
      globalDiscoveryFixpoint: false,
      closedVenueConstraintProofCount: proofs.length,
    },
    wbs715Status: acceptance.allPass ? "待审查" : "进行中",
    sourceFiles: input.sourceFiles,
    generatedArtifactHashes: Object.fromEntries(
      Object.entries(artifacts).map(([path, text]) => [path, sha256(text)]),
    ),
  };
  // preflight.status describes national input selection, not the run outcome.
  manifest.status = acceptance.allPass
    ? "PASS / READY_FOR_REVIEW"
    : input.blockers.some((b) => b.allGeneralTouristModesBlocked)
      ? "BLOCKED_CANONICAL_ACCESS_CONTRADICTION"
      : "PARTIAL_ACCESS_EVIDENCE_REQUIRED";
  artifacts["manifest.json"] = objectText(manifest);
  return { artifacts, batches, manifest, acceptance };
}
export function validateReceipt(out, receipt) {
  const { receiptSha256, ...unsigned } = receipt;
  assert.equal(receiptSha256, digest(unsigned), "CORRUPTED_RECEIPT");
  assert.equal(receipt.integrityQa, "PASS", "CORRUPTED_RECEIPT_QA");
  for (const [file, sha] of Object.entries(receipt.artifacts)) {
    assert.ok(
      /^batches\/\d{4}\/[a-z-]+\.jsonl$/.test(file),
      "UNSAFE_RECEIPT_PATH",
    );
    assert.ok(existsSync(join(out, file)), "MISSING_BATCH_ARTIFACT:" + file);
    assert.equal(
      sha256(readFileSync(join(out, file))),
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
      (name) => !(name in built.artifacts),
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
  if (mode !== "check" && report.acceptance !== "PASS") process.exitCode = 2;
}
