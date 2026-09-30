import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { admittedGraphNodes } from "../../src/shared/poi-edge-graph/index.ts";

export const BASE = "5b951195698d3e421f34a9922393b454412fa4bb";
export const ROOT = resolve(import.meta.dirname, "../..");
export const CLOSEOUT = "docs/qa/TASK-084-B/v2-user-acceptance-closeout.json";
export const REVIEW =
  "data/transport/nodes/task-084-b-v2-amendment-review/manifest.json";
export const CANONICAL =
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json";
export const OUTPUT = "data/transport/access";
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const json = (root, file) => JSON.parse(readFileSync(join(root, file), "utf8"));
const fingerprint = (root, file) => ({
  path: file,
  sha256: sha256(readFileSync(join(root, file))),
});
const fields = [
  "downstream085Authorized",
  "runtimeImportAuthorized",
  "nationalMasterStatus",
  "nationalMasterPass",
  "formalAcceptedV2NodeCount",
  "acceptanceStatus",
  "stage",
];

// This is a blocked-attempt audit, never an authorizer or an edge generator.
// Changed/new authorization requires a fresh Gate 0 review, not silent reuse.
export function assertBlockedSnapshot(review, closeout) {
  const snapshot = closeout.dataGateSnapshot;
  assert.ok(snapshot, "Missing TASK-084 machine closeout");
  for (const value of [review, snapshot]) {
    assert.equal(
      value.downstream085Authorized,
      false,
      "Re-evaluate TASK-085 authorization",
    );
    assert.equal(
      value.runtimeImportAuthorized,
      false,
      "Re-evaluate runtime authorization",
    );
    assert.equal(
      value.nationalMasterPass,
      false,
      "Re-evaluate national master acceptance",
    );
    assert.equal(value.nationalMasterStatus, "REWORK_IN_PROGRESS");
    assert.equal(value.formalAcceptedV2NodeCount, 0);
  }
}

function jsonFiles(root, dir) {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const file = dir + "/" + entry.name;
      return entry.isDirectory()
        ? jsonFiles(root, file)
        : file.endsWith(".json")
          ? [file]
          : [];
    })
    .sort();
}

export function auditCanonical(root = ROOT) {
  const runtime = json(root, CANONICAL);
  assert.equal(runtime.runtimeImportAuthorized, true);
  assert.equal(runtime.candidateCorpusAuthorized, false);
  for (const [pathKey, hashKey] of [
    ["datasetPath", "datasetFileSha256"],
    ["registryPath", "registryFileSha256"],
    ["admissionResultsPath", "admissionResultsSha256"],
  ]) {
    assert.equal(
      fingerprint(root, runtime[pathKey]).sha256,
      runtime[hashKey],
      pathKey,
    );
  }
  const dataset = json(root, runtime.datasetPath);
  assert.equal(dataset.datasetRevision, runtime.datasetRevision);
  assert.equal(dataset.records.length, runtime.recordCount);
  assert.equal(sha256(JSON.stringify(dataset)), runtime.datasetSha256);
  assert.equal(
    sha256(JSON.stringify(json(root, runtime.registryPath))),
    runtime.registrySha256,
  );
  const admitted = admittedGraphNodes(
    dataset,
    json(root, runtime.registryPath),
    runtime,
  );
  assert.equal(admitted.rejected.length, 0);
  assert.equal(admitted.nodes.length, runtime.recordCount);
  return {
    ...fingerprint(root, CANONICAL),
    datasetPath: runtime.datasetPath,
    datasetRevision: runtime.datasetRevision,
    datasetSha256: runtime.datasetSha256,
    datasetFileSha256: runtime.datasetFileSha256,
    recordCount: admitted.nodes.length,
    candidateCorpusAuthorized: false,
    membershipAndActiveMasterCodeBindingsVerified: true,
    supportingSampleManifest: {
      ...fingerprint(root, runtime.sampleManifestPath),
      expectedSha256: runtime.sampleManifestSha256,
      hashMatches:
        fingerprint(root, runtime.sampleManifestPath).sha256 ===
        runtime.sampleManifestSha256,
      disposition:
        "Record any supporting-evidence drift; never repair or widen authorization in TASK-085",
    },
  };
}

export function auditGate0(root = ROOT) {
  const review = json(root, REVIEW);
  const closeout = json(root, CLOSEOUT);
  assertBlockedSnapshot(review, closeout);
  assert.equal(
    fingerprint(root, REVIEW).sha256,
    closeout.acceptedReviewManifestSha256,
  );
  const inspected = [
    ...jsonFiles(root, "data/transport"),
    ...jsonFiles(root, "docs/qa/TASK-084-B"),
  ].filter((file) => !file.startsWith(OUTPUT + "/"));
  const inventory = inspected.map((file) => {
    const value = json(root, file);
    assert.notEqual(
      value.downstream085Authorized,
      true,
      "New authorization requires review: " + file,
    );
    assert.notEqual(
      value.dataGateSnapshot?.downstream085Authorized,
      true,
      file,
    );
    return {
      ...fingerprint(root, file),
      fields: Object.fromEntries(
        fields.filter((key) => key in value).map((key) => [key, value[key]]),
      ),
    };
  });
  const canonical = auditCanonical(root);
  const sourcePaths = [
    CLOSEOUT,
    REVIEW,
    "docs/tasks/RESULT-TASK-084-b-v2-user-acceptance-closeout.md",
    "docs/tasks/AMENDMENT-TASK-084-b-transport-master-quality-rework.md",
    "docs/qa/TASK-084-B/TRANSPORT-MASTER-V1-REJECTION-AUDIT.md",
    "docs/tasks/TASK-082-a-poi-edge-graph-generation-pilot.md",
    "docs/tasks/RESULT-TASK-082-a-poi-edge-graph-generation-pilot.md",
    "docs/qa/TASK-082-a-poi-edge-pilot-qa.md",
    "src/shared/poi-edge-graph/index.ts",
    "src/server/poi-edge-graph/repository.ts",
    "docs/architecture/route-contract.md",
    "docs/architecture/map-routing-poi-ai-provider-policy-v1.md",
    "docs/architecture/ekiworld-evaluation-routing.md",
    "data/transport/n03-2026-source-rights-decision.json",
  ];
  return {
    schemaVersion: "1.0",
    task: "TASK-085-B",
    status: "BLOCKED_084_DOWNSTREAM_GATE",
    baseDevelopSha: BASE,
    issueExecutionGate:
      "https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5905235799",
    originalTask: {
      pr: 449,
      branch: "docs/poi-transport-parallel-execution",
      revision: "7073c2a5501e9f7e74361fb0bdc6219a99504f87",
    },
    canonical,
    transport: {
      authoritativeDownstreamArtifact: null,
      authoritativeRevision: null,
      authoritativeSha256: null,
      acceptedNodeCount: 0,
      currentReview: {
        ...fingerprint(root, REVIEW),
        revision: closeout.userAcceptanceEvidence.acceptedDeliverableHead,
        fields: Object.fromEntries(
          fields
            .filter((key) => key in review)
            .map((key) => [key, review[key]]),
        ),
      },
      closeout: {
        ...fingerprint(root, CLOSEOUT),
        fields: closeout.dataGateSnapshot,
      },
      historicalV1: {
        ...fingerprint(
          root,
          "data/transport/nodes/task-084-b-national-master/manifest.json",
        ),
        disposition: "REJECTED_FOR_REWORK_DO_NOT_USE",
      },
    },
    discovery: {
      roots: ["data/transport", "docs/qa/TASK-084-B"],
      inspectedJsonCount: inventory.length,
      explicitlyAuthorized085Artifacts: [],
      inventory,
    },
    metrics: {
      canonicalPoiAuthorizedCount: canonical.recordCount,
      canonicalPoiProcessedCount: 0,
      shortfall: canonical.recordCount,
      shortfallBasis:
        "Current runtime-authorized corpus minus access-generation processed count",
      poisWithAtLeastOneAccessNode: null,
      localNodeCoverage: null,
      majorHubCoverage: null,
      specialTourismAccessCoverage: null,
      totalDirectedEdges: 0,
      edgesPerPoi: { mean: null, median: null, min: null, max: null },
      walkingResolvedRate: null,
      localTransitResolvedRate: null,
      taxiResolvedRate: null,
      accessibilityKnownRate: null,
      extremeDetourCount: null,
      unresolvedPoiCount: null,
      unresolvedReasonDistribution: {},
      gateBlockedPoiCount: canonical.recordCount,
      gateBlockerDistribution: {
        BLOCKED_084_DOWNSTREAM_GATE: canonical.recordCount,
      },
      batchCount: 0,
      sourceProvenanceCoverage: null,
      metricNote:
        "Generation/route QA not run. Null is unassessed; zeros only count work actually performed.",
    },
    execution: {
      stoppedBeforeCandidateGeneration: true,
      providerRequests: 0,
      rawProviderPayloadsPersisted: 0,
      generatedEdgeCount: 0,
      batchReceiptsCreated: 0,
      batchResume: "NOT_RUN_GATE_0_BLOCKED",
      singleBatchRerun: "NOT_RUN_GATE_0_BLOCKED",
      corruptedReceiptDetection: "NOT_RUN_NO_BATCH_RECEIPTS",
      edgeDeterministicRebuild: "NOT_RUN_GATE_0_BLOCKED",
      task086Started: false,
    },
    providerLicenseDecision: {
      status: "FAIL_CLOSED_NO_BATCH_OR_PERSISTENCE_AUTHORIZATION",
      selectedPrimary:
        "Google Routes (repository frozen policy, not a bulk persistence grant)",
      fallback: "Ekiworld evaluation only; persistence=none; ttlSeconds=null",
      batchQueryAuthorized: null,
      cacheAuthorized: null,
      retentionAuthorized: null,
      productionBatchAuthorized: null,
      derivativePersistenceAuthorized: null,
      staticGeodesicCandidates:
        "Permitted in principle; not executed because Gate 0 is blocked",
      n03ProductionJoin: false,
    },
    sources: sourcePaths.map((file) => fingerprint(root, file)),
    wbs715Status: "阻塞",
  };
}

export function expectedArtifacts(root = ROOT) {
  const report = auditGate0(root);
  return {
    [OUTPUT + "/manifest.json"]: JSON.stringify(report, null, 2) + "\n",
    [OUTPUT + "/poi-transport-access-edges.jsonl"]: "",
    [OUTPUT + "/poi-access-unresolved.jsonl"]: "",
    [OUTPUT + "/poi-access-score-traces.jsonl"]: "",
    [OUTPUT + "/candidate-node-decisions.jsonl"]: "",
    [OUTPUT + "/batches/README.md"]:
      "# No batches\n\nGate 0 is BLOCKED_084_DOWNSTREAM_GATE. No access-generation batch has run.\n",
    [OUTPUT + "/batch-receipts/README.md"]:
      "# No batch receipts\n\nGate 0 is BLOCKED_084_DOWNSTREAM_GATE. No batch QA PASS or checkpoint is claimed.\n",
  };
}

export function verifyArtifacts(
  root = ROOT,
  readArtifact = (file) => readFileSync(join(root, file), "utf8"),
) {
  for (const [file, expected] of Object.entries(expectedArtifacts(root))) {
    assert.equal(
      readArtifact(file),
      expected,
      "Artifact drift/corruption: " + file,
    );
  }
  for (const dir of ["batches", "batch-receipts"]) {
    assert.deepEqual(readdirSync(join(root, OUTPUT, dir)).sort(), [
      "README.md",
    ]);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  assert.ok(
    process.argv.length === 3 &&
      ["--write", "--check"].includes(process.argv[2]),
  );
  if (process.argv[2] === "--write") {
    // Freeze the original clean-develop attempt; do not relabel another baseline.
    assert.equal(
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      }).trim(),
      BASE,
    );
    for (const [file, contents] of Object.entries(expectedArtifacts())) {
      mkdirSync(dirname(join(ROOT, file)), { recursive: true });
      writeFileSync(join(ROOT, file), contents);
    }
  } else verifyArtifacts();
  console.log(
    "BLOCKED_084_DOWNSTREAM_GATE; audit verified; no edges generated",
  );
}
