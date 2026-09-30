import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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
export const readJson = (root, file) =>
  JSON.parse(readFileSync(join(root, file), "utf8"));
export const fingerprint = (root, file) => ({
  path: file,
  sha256: sha256(readFileSync(join(root, file))),
});

export function auditCanonical(root = ROOT) {
  const runtime = readJson(root, CANONICAL);
  assert.equal(runtime.runtimeImportAuthorized, true);
  assert.equal(runtime.candidateCorpusAuthorized, false);
  for (const [pathKey, hashKey] of [
    ["datasetPath", "datasetFileSha256"],
    ["registryPath", "registryFileSha256"],
    ["admissionResultsPath", "admissionResultsSha256"],
  ])
    assert.equal(
      fingerprint(root, runtime[pathKey]).sha256,
      runtime[hashKey],
      pathKey,
    );
  const dataset = readJson(root, runtime.datasetPath);
  const registry = readJson(root, runtime.registryPath);
  assert.equal(dataset.datasetRevision, runtime.datasetRevision);
  assert.equal(dataset.records.length, runtime.recordCount);
  assert.equal(sha256(JSON.stringify(dataset)), runtime.datasetSha256);
  assert.equal(sha256(JSON.stringify(registry)), runtime.registrySha256);
  const admitted = admittedGraphNodes(dataset, registry, runtime);
  assert.equal(admitted.rejected.length, 0);
  assert.equal(admitted.nodes.length, runtime.recordCount);
  assert.deepEqual(
    [...new Set(admitted.nodes.map((n) => n.poiId))].sort(),
    [...runtime.internalIds].sort(),
  );
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
        "Existing supporting-evidence drift; no upstream repair or authorization widening in TASK-085",
    },
  };
}

// #442's later amendment permits per-node TASK-085-local admission. It does not
// change the rejected national master or make a REVIEW row an accepted node.
export function auditGate0(root = ROOT) {
  const review = readJson(root, REVIEW);
  const closeout = readJson(root, CLOSEOUT);
  assert.equal(
    fingerprint(root, REVIEW).sha256,
    closeout.acceptedReviewManifestSha256,
  );
  assert.equal(
    review.downstream085Authorized,
    false,
    "REASSESS_CHANGED_NATIONAL_AUTHORIZATION",
  );
  assert.equal(
    review.formalAcceptedV2NodeCount,
    0,
    "REASSESS_CHANGED_NATIONAL_ADMISSION",
  );
  return {
    status: "TASK_085_LOCAL_ADMISSION_REQUIRED",
    baseDevelopSha: BASE,
    executionRules: [
      "https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5905235799",
      "https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5906414855",
      "https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5906421675",
      "https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5909795085",
    ],
    topologyMetricsAmendment: {
      ...fingerprint(
        root,
        "docs/tasks/AMENDMENT-TASK-085-b-access-topology-route-metrics-split-v2.md",
      ),
      revision: "41389de330df33091af9d33cc825ea8d4387a92d",
    },
    originalTask: {
      pr: 449,
      branch: "docs/poi-transport-parallel-execution",
      revision: "7073c2a5501e9f7e74361fb0bdc6219a99504f87",
    },
    canonical: auditCanonical(root),
    transport: {
      authoritativeNationalDownstreamArtifact: null,
      currentReview: {
        ...fingerprint(root, REVIEW),
        revision: closeout.userAcceptanceEvidence.acceptedDeliverableHead,
        downstream085Authorized: review.downstream085Authorized,
        runtimeImportAuthorized: review.runtimeImportAuthorized,
        nationalMasterStatus: review.nationalMasterStatus,
        nationalMasterPass: review.nationalMasterPass,
        formalAcceptedV2NodeCount: review.formalAcceptedV2NodeCount,
      },
      closeout: {
        ...fingerprint(root, CLOSEOUT),
        fields: closeout.dataGateSnapshot,
      },
      historicalV1: {
        disposition: "REJECTED_DO_NOT_READ_OR_USE",
        consumed: false,
      },
      v2CandidatesPromoted: 0,
      integrationBoundary:
        "Task-owned topology admission and GraphRef adapter only; no Planner/API/runtime contract changes.",
    },
  };
}
