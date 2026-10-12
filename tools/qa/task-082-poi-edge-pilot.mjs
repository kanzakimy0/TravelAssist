import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  DEFAULT_EDGE_CONFIG,
  admittedGraphNodes,
  candidateToUnresolvedEdge,
  generatePoiCandidates,
} from "../../src/shared/poi-edge-graph/index.ts";

const root = resolve(import.meta.dirname, "../..");
const output = join(root, "docs", "qa", "TASK-082");
const registryPath = join(root, "src/shared/data/master-code-registry.v1.json");
const candidateManifestPath = join(
  root,
  "data/poi/full/manifests/current-candidate-review.v1.json",
);
const runtimePath = join(
  root,
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const datasetPath = join(
  root,
  "src/shared/data/canonical-poi-pilot100.v1.json",
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const parse = (path) => JSON.parse(readFileSync(path, "utf8"));
const registry = parse(registryPath);
const candidateManifest = parse(candidateManifestPath);
assert.equal(candidateManifest.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
assert.equal(candidateManifest.runtimeImportAuthorized, false);

let status = "BLOCKED_NO_ADMITTED_CANONICAL_POI";
let blocker =
  "develop has no authorized Canonical runtime dataset or active POI Master Codes";
let datasetRevision = null;
let datasetFileSha256 = null;
let nodes = [];
let rejectedNodes = [];
const activePoiCodes = registry.entries.filter(
  (entry) =>
    entry.lifecycleStatus === "active" && entry.entityType.startsWith("poi."),
);
if (existsSync(runtimePath) || existsSync(datasetPath)) {
  assert.ok(
    existsSync(runtimePath) && existsSync(datasetPath),
    "Canonical dataset and authorization must be published together",
  );
  const runtime = parse(runtimePath);
  assert.equal(runtime.scope, "CANONICAL_POI_PILOT_100");
  assert.equal(runtime.runtimeImportAuthorized, true);
  assert.equal(
    runtime.datasetPath,
    "src/shared/data/canonical-poi-pilot100.v1.json",
  );
  datasetFileSha256 = sha256(readFileSync(datasetPath));
  assert.equal(datasetFileSha256, runtime.datasetFileSha256);
  const dataset = parse(datasetPath);
  assert.equal(dataset.datasetRevision, runtime.datasetRevision);
  assert.equal(dataset.records.length, runtime.recordCount);
  const admitted = admittedGraphNodes(dataset, registry, runtime);
  nodes = admitted.nodes;
  rejectedNodes = admitted.rejected;
  datasetRevision = dataset.datasetRevision;
  status = "PARTIAL_CANONICAL_INVENTORY_BELOW_TARGET";
  blocker = "Authorized Canonical inventory is below the 500-POI target";
}
assert.ok(
  nodes.length <= activePoiCodes.length,
  "Pilot may not exceed active POI allocations",
);
nodes.sort((a, b) => {
  const aTokyo = a.regionRef.includes("tokyo") ? 0 : 1;
  const bTokyo = b.regionRef.includes("tokyo") ? 0 : 1;
  return (
    aTokyo - bTokyo ||
    a.regionRef.localeCompare(b.regionRef) ||
    a.poiId.localeCompare(b.poiId)
  );
});
const pilot = nodes.slice(0, 500);
if (pilot.length === 500) {
  status = "CANDIDATE_GRAPH_READY_ROUTE_ENRICHMENT_BLOCKED";
  blocker = "Batch/cache/retention/production route rights remain unconfirmed";
}
const generated = generatePoiCandidates(pilot, DEFAULT_EDGE_CONFIG);
const candidateEdges = generated.edges;
const unresolvedEdges = candidateEdges.map((edge) =>
  candidateToUnresolvedEdge(edge, "2026-09-28T00:00:00.000Z"),
);
const enrichedEdges = [];
const unresolvedReasons = unresolvedEdges.flatMap((edge) =>
  Object.entries(edge.modes).map(([mode, resolution]) => ({
    from: edge.from.id,
    to: edge.to.id,
    mode,
    reason: resolution.reason,
  })),
);
const degree = pilot.map(
  (node) => candidateEdges.filter((edge) => edge.from.id === node.poiId).length,
);
const sortedDegree = [...degree].sort((a, b) => a - b);
const distanceBuckets = {
  under500m: 0,
  from500To2000m: 0,
  from2000To10000m: 0,
  from10000To30000m: 0,
};
const relationCounts = {
  nearby: 0,
  same_area: 0,
  same_city: 0,
  regional: 0,
  access_to_transport_node: 0,
  special: 0,
};
const pairs = new Set(
  candidateEdges.map((edge) => edge.from.id + ">" + edge.to.id),
);
let symmetricDirectedEdgeCount = 0;
for (const edge of candidateEdges) {
  relationCounts[edge.relation] += 1;
  if (pairs.has(edge.to.id + ">" + edge.from.id))
    symmetricDirectedEdgeCount += 1;
  const distance = edge.straightDistanceM;
  if (distance < 500) distanceBuckets.under500m += 1;
  else if (distance < 2_000) distanceBuckets.from500To2000m += 1;
  else if (distance < 10_000) distanceBuckets.from2000To10000m += 1;
  else distanceBuckets.from10000To30000m += 1;
}
const unresolvedReasonDistribution = {};
for (const row of unresolvedReasons)
  unresolvedReasonDistribution[row.reason] =
    (unresolvedReasonDistribution[row.reason] ?? 0) + 1;
const stats = {
  schemaVersion: "1.0",
  task: "TASK-082-A",
  status,
  blocker,
  baseDevelopSha: "ef388cdcd0ff5f15ebd404337b4ed29fb3435058",
  registryRevision: registry.registryRevision,
  registrySha256: sha256(readFileSync(registryPath)),
  activePoiMasterCodeCount: activePoiCodes.length,
  datasetRevision,
  datasetFileSha256,
  targetPoiCount: 500,
  pilotPoiCount: pilot.length,
  shortfall: Math.max(0, 500 - pilot.length),
  candidateEdgeCount: candidateEdges.length,
  enrichedEdgeCount: enrichedEdges.length,
  walkingResolution: {
    resolved: 0,
    total: candidateEdges.length,
    rate: candidateEdges.length ? 0 : null,
  },
  drivingResolution: {
    resolved: 0,
    total: candidateEdges.length,
    rate: candidateEdges.length ? 0 : null,
  },
  transitResolution: {
    resolved: 0,
    total: candidateEdges.length,
    rate: candidateEdges.length ? 0 : null,
  },
  taxiResolution: {
    resolved: 0,
    total: candidateEdges.length,
    rate: candidateEdges.length ? 0 : null,
  },
  degree: {
    mean: degree.length
      ? degree.reduce((a, b) => a + b, 0) / degree.length
      : null,
    median: degree.length
      ? (sortedDegree[Math.floor((degree.length - 1) / 2)] +
          sortedDegree[Math.ceil((degree.length - 1) / 2)]) /
        2
      : null,
    min: degree.length ? sortedDegree[0] : null,
    max: degree.length ? sortedDegree.at(-1) : null,
  },
  distanceDistribution: distanceBuckets,
  edgeClassificationCounts: relationCounts,
  rejectedEdgeCount: 0,
  rejectedNodeCount: rejectedNodes.length + generated.rejected.length,
  extremeDetourEdgeCount: 0,
  symmetricDirectedEdgeCount,
  asymmetricDurationExamples: [],
  unresolvedReasonDistribution,
  providerDecision: "FAIL_CLOSED_NO_BATCH_CACHE_RETENTION_PRODUCTION_RIGHTS",
  transportNodePilotCount: 0,
};
const artifacts = {
  "pilot-poi-manifest.json": {
    schemaVersion: "1.0",
    status,
    source: datasetRevision,
    selection:
      "Tokyo-prefecture first, then canonical regionRef and internalId; first 500",
    records: pilot,
    rejectedNodes,
  },
  "candidate-directed-edges.json": candidateEdges,
  "edge-mode-status.json": unresolvedEdges,
  "enriched-edges.json": enrichedEdges,
  "unresolved-reasons.json": unresolvedReasons,
  "statistics.json": stats,
};
if (process.argv.includes("--check")) {
  for (const [name, value] of Object.entries(artifacts))
    assert.equal(
      readFileSync(join(output, name), "utf8"),
      JSON.stringify(value, null, 2) + "\n",
      name + " differs from deterministic replay",
    );
} else {
  mkdirSync(output, { recursive: true });
  for (const [name, value] of Object.entries(artifacts))
    writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n");
}
process.stdout.write(JSON.stringify(stats) + "\n");
