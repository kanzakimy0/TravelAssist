import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  evaluateCandidateAdmissionV1,
  parseCanonicalPoiDatasetV1,
  parseCanonicalPoiV1,
} from "../../src/shared/contracts/poi/index.ts";
import {
  parseMasterCodeRegistryV1,
  validateMasterCodeRegistryTransitionV1,
} from "../../src/shared/master-code/index.ts";

const WRITE = process.argv.includes("--write");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const rawSha = (path) => sha(readFileSync(path));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const saveOrVerify = (path, contents) => {
  if (WRITE) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  } else assert.equal(readFileSync(path, "utf8"), contents, path);
};

const root = "data/poi/canonical/pilot-100";
const eligible = read(`${root}/eligible-pool.v1.json`);
const sample = read(`${root}/sample-manifest.v1.json`);
const allocation = read(`${root}/allocation-audit.v1.json`);
const datasetPath = "src/shared/data/canonical-poi-pilot100.v1.json";
const registryPath = "src/shared/data/master-code-registry.v1.json";
const dataset = read(datasetPath);
const registry = read(registryPath);
const priorRegistry = {
  ...registry,
  registryRevision: allocation.priorRegistryRevision,
  entries: registry.entries.filter(
    (entry) => entry.createdRevision !== "task-083-a-pilot100-r1",
  ),
};
const regionGraph = read("docs/qa/TASK-041/region-nodes.json");
const regionIds = regionGraph.nodes.map((node) => node.regionId);
const knownEvidence = [
  ...new Set(
    dataset.records.flatMap((poi) => poi.sourceRefs.map((s) => s.sourceRef)),
  ),
];
const now = "2026-09-27T00:00:00+09:00";

assert.equal(eligible.count, 422);
assert.equal(eligible.records.length, 422);
assert.equal(sample.eligiblePoolCount, 422);
assert.equal(sample.sampleCount, 100);
assert.equal(sample.records.length, 100);
assert.equal(dataset.records.length, 100);
assert.equal(allocation.allocationCount, 100);
assert.equal(
  allocation.excludedCodesBeforeAllocation.length,
  allocation.uniqueExcludedCodeCountBeforeAllocation,
);
const historicalExclusions = new Set(allocation.excludedCodesBeforeAllocation);
assert.equal(
  historicalExclusions.size,
  allocation.uniqueExcludedCodeCountBeforeAllocation,
);
for (const [path, expectedSha] of Object.entries(
  allocation.historicalExclusionSourceSha256,
))
  assert.equal(rawSha(path), expectedSha, path);
assert.equal(
  rawSha("data/poi/full/sources/master-code-registry.task-043.v1.json"),
  allocation.priorRegistrySha256,
);
assert.deepEqual(
  priorRegistry,
  read("data/poi/full/sources/master-code-registry.task-043.v1.json"),
);
for (const [index, decision] of allocation.decisions.entries()) {
  const classificationIndex = [
    "cityscape_landmark",
    "culture_history",
    "nature",
    "experience",
    "museum_art",
    "religious_historic",
    "shopping",
  ].indexOf(decision.classification);
  assert.ok(classificationIndex >= 0);
  const lower = 10000 + classificationIndex * 10000;
  const firstSafe = Array.from({ length: 10000 }, (_, n) =>
    String(lower + n).padStart(5, "0"),
  ).find((code) => !historicalExclusions.has(code));
  assert.equal(decision.allocatedMasterCode, firstSafe);
  assert.equal(
    decision.allocatedMasterCode,
    sample.records[index].allocatedMasterCode,
  );
  historicalExclusions.add(decision.allocatedMasterCode);
}
assert.equal(
  allocation.workbookSha256,
  rawSha(
    "data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx",
  ),
);
assert.equal(new Set(eligible.records.map((r) => r.internal_uuid)).size, 422);
assert.equal(new Set(eligible.records.map((r) => r.qid)).size, 422);
assert.equal(new Set(sample.records.map((r) => r.internalId)).size, 100);
assert.equal(
  new Set(sample.records.map((r) => r.allocatedMasterCode)).size,
  100,
);
assert.equal(new Set(dataset.records.map((r) => r.internalId)).size, 100);
assert.equal(new Set(dataset.records.map((r) => r.masterCode)).size, 100);

const classOrder = [
  "cityscape_landmark",
  "culture_history",
  "nature",
  "experience",
  "museum_art",
  "religious_historic",
  "shopping",
];
const bucketKeys = [];
const buckets = new Map();
for (const classification of classOrder) {
  const regions = [
    ...new Set(
      eligible.records
        .filter((r) => r.classification === classification)
        .map((r) => r.regionId),
    ),
  ].sort();
  for (const region of regions) {
    const key = `${classification}|${region}`;
    bucketKeys.push(key);
    buckets.set(
      key,
      eligible.records
        .filter(
          (r) => r.classification === classification && r.regionId === region,
        )
        .sort(
          (a, b) =>
            a.selectionHash.localeCompare(b.selectionHash) ||
            a.internal_uuid.localeCompare(b.internal_uuid),
        ),
    );
  }
}
const expectedSample = [];
for (let round = 0; expectedSample.length < 100; round++) {
  for (const key of bucketKeys) {
    const record = buckets.get(key)[round];
    if (record) expectedSample.push(record.internal_uuid);
    if (expectedSample.length === 100) break;
  }
}
assert.deepEqual(
  sample.records.map((r) => r.sourceInternalUuid),
  expectedSample,
);
assert.equal(
  sample.selectionSha256,
  sha(
    sample.records
      .map((r) => `${r.sourceInternalUuid}|${r.internalId}`)
      .join("\n"),
  ),
);
assert.equal(new Set(sample.records.map((r) => r.classification)).size, 7);
assert.equal(new Set(sample.records.map((r) => r.regionId)).size, 10);
const prefectureCounts = new Map();
for (const r of sample.records)
  prefectureCounts.set(r.regionId, (prefectureCounts.get(r.regionId) ?? 0) + 1);
assert.ok(Math.max(...prefectureCounts.values()) <= 20);

const parsedRegistry = parseMasterCodeRegistryV1(registry);
assert.equal(parsedRegistry.ok, true, JSON.stringify(parsedRegistry.issues));
const parsedPreviousRegistry = parseMasterCodeRegistryV1(priorRegistry);
assert.equal(
  parsedPreviousRegistry.ok,
  true,
  JSON.stringify(parsedPreviousRegistry.issues),
);
const transition = validateMasterCodeRegistryTransitionV1(
  priorRegistry,
  registry,
);
assert.equal(transition.ok, true, JSON.stringify(transition.issues));
const parsedDataset = parseCanonicalPoiDatasetV1(dataset);
assert.equal(parsedDataset.ok, true, JSON.stringify(parsedDataset.issues));
for (const poi of dataset.records) {
  const parsed = parseCanonicalPoiV1(poi);
  assert.equal(
    parsed.ok,
    true,
    `${poi.internalId}:${JSON.stringify(parsed.issues)}`,
  );
  assert.equal(poi.features, null);
  assert.equal(poi.facts.length, 0);
  assert.equal(poi.visitProfiles.length, 0);
  assert.ok(poi.regionRelations.every((r) => regionIds.includes(r.regionRef)));
  assert.ok(
    poi.sourceRefs.some(
      (s) =>
        s.sourceKind === "open_data" &&
        s.rights.persistence === "allowed" &&
        s.rights.redistribution === "allowed",
    ),
  );
  assert.ok(!JSON.stringify(poi).includes("candidateKey"));
}
const registryByCode = new Map(registry.entries.map((e) => [e.masterCode, e]));
const sampleById = new Map(sample.records.map((s) => [s.internalId, s]));
const newEntries = registry.entries.filter(
  (entry) => entry.createdRevision === "task-083-a-pilot100-r1",
);
assert.equal(newEntries.length, 100);
assert.equal(
  newEntries.filter(
    (entry) =>
      entry.lifecycleStatus === "active" && entry.entityType.startsWith("poi."),
  ).length,
  100,
);
for (const poi of dataset.records) {
  const s = sampleById.get(poi.internalId);
  assert.ok(s);
  assert.equal(poi.masterCode, s.allocatedMasterCode);
  assert.equal(registryByCode.get(poi.masterCode)?.entityRef, poi.internalId);
  assert.equal(
    registryByCode.get(poi.masterCode)?.entityType,
    `poi.${poi.classification.primary}`,
  );
}
const candidateManifest = read(
  "data/poi/full/manifests/current-candidate-review.v1.json",
);
assert.equal(candidateManifest.runtimeImportAuthorized, false);
assert.equal(candidateManifest.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");

const results = [];
for (let index = 0; index < dataset.records.length; index++) {
  const poi = dataset.records[index];
  const s = sample.records[index];
  const evidenceRefs = poi.sourceRefs.map((source) => source.sourceRef);
  const envelope = {
    schemaVersion: "1.0",
    admissionId: `admission:task083:${String(index + 1).padStart(3, "0")}`,
    candidate: {
      candidateKey: `v166:${s.sourceInternalUuid}`,
      proposedCanonical: poi,
      identityResolution: {
        status: "resolved",
        resolvedPoiRef: poi.internalId,
        evidenceRefs,
      },
      duplicateDisposition: {
        status: "unique",
        targetPoiRef: null,
        evidenceRefs,
      },
      providerObservations: [],
      featureEvidence: [],
      evidenceRefs,
      materialConflicts: [],
    },
    requestedAt: now,
  };
  const admitted = evaluateCandidateAdmissionV1(envelope, {
    masterCodeRegistry: registry,
    regionIds,
    existingPoiIds: [],
    evidenceIds: knownEvidence,
    evaluatedAt: now,
  });
  assert.equal(
    admitted.ok,
    true,
    `${poi.internalId}:${JSON.stringify(admitted.issues)}`,
  );
  assert.equal(admitted.value.state, "ADMIT", poi.internalId);
  assert.equal(admitted.value.gates.length, 14);
  assert.ok(
    admitted.value.gates.every((gate) => gate.status === "PASS"),
    poi.internalId,
  );
  results.push({
    sampleIndex: index + 1,
    internalId: poi.internalId,
    masterCode: poi.masterCode,
    result: admitted.value,
  });
}
const admissionPath = `${root}/admission-results.v1.jsonl`;
saveOrVerify(
  admissionPath,
  `${results.map((result) => JSON.stringify(result)).join("\n")}\n`,
);

const runtimeManifest = {
  schemaVersion: "1.0",
  scope: "CANONICAL_POI_PILOT_100",
  runtimeImportAuthorized: true,
  authorizingTask: "TASK-083-A",
  issue: 438,
  datasetPath,
  datasetRevision: dataset.datasetRevision,
  datasetSha256: sha(JSON.stringify(dataset)),
  datasetFileSha256: rawSha(datasetPath),
  recordCount: 100,
  internalIds: sample.records.map((r) => r.internalId),
  masterCodes: sample.records.map((r) => r.allocatedMasterCode),
  sampleManifestPath: `${root}/sample-manifest.v1.json`,
  sampleManifestSha256: rawSha(`${root}/sample-manifest.v1.json`),
  registryPath,
  registryRevision: registry.registryRevision,
  registrySha256: sha(JSON.stringify(registry)),
  registryFileSha256: rawSha(registryPath),
  admissionResultsPath: admissionPath,
  admissionResultsSha256: rawSha(admissionPath),
  candidateCorpusAuthorized: false,
  boundary:
    "Only these 100 admitted Canonical POIs are authorized; all other v1.66/workbook/candidate rows remain unauthorized.",
};
const manifestPath =
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json";
saveOrVerify(manifestPath, json(runtimeManifest));

const handoff = {
  task: "TASK-083-A",
  issue: 438,
  status: "READY_AFTER_USER_ACCEPTANCE",
  sampleCount: 100,
  admittedCount: 100,
  reviewRequiredCount: 0,
  blockedCount: 0,
  mergeTargetCount: 0,
  insufficientEvidenceCount: 0,
  internalIds: runtimeManifest.internalIds,
  masterCodes: runtimeManifest.masterCodes,
  datasetPath,
  datasetRevision: dataset.datasetRevision,
  datasetSha256: runtimeManifest.datasetSha256,
  datasetFileSha256: runtimeManifest.datasetFileSha256,
  registryPath,
  registryRevision: registry.registryRevision,
  registrySha256: runtimeManifest.registrySha256,
  sampleManifestPath: runtimeManifest.sampleManifestPath,
  sampleManifestSha256: runtimeManifest.sampleManifestSha256,
  admissionResultsPath: admissionPath,
  admissionResultsSha256: runtimeManifest.admissionResultsSha256,
  runtimeManifestPath: manifestPath,
  runtimeManifestSha256: sha(json(runtimeManifest)),
  runtimeRepositoryModule: "src/server/poi-runtime/repository.ts",
  detailApiSmoke:
    "100/100 actual GET route returned 200; unknown canonical ID 404; Master Code and candidateKey substitutions 400; tampered authorization/dataset/registry fail closed",
  feature43AssessedCells: 0,
  feature43TotalCells: 4300,
  pilotEntryPoint:
    "node --import ./tests/register-route-ts.mjs tools/qa/task-083-pilot100.mjs --ids",
  acceptanceBoundary:
    "TASK-081-B resumes only after TASK-083-A user acceptance; TASK-083-A did not score Feature43.",
};
saveOrVerify("docs/qa/TASK-083/pilot100-handoff.json", json(handoff));

const summary = {
  task: "TASK-083-A",
  eligiblePoolCount: eligible.count,
  sampleCount: 100,
  classifications: classOrder.filter((c) =>
    sample.records.some((s) => s.classification === c),
  ),
  prefectureCount: prefectureCounts.size,
  registryPriorEntries: registry.entries.length - 100,
  registryAddedActivePoiEntries: 100,
  admissionCounts: {
    ADMIT: 100,
    REVIEW_REQUIRED: 0,
    BLOCKED: 0,
    MERGE_TARGET: 0,
    INSUFFICIENT_EVIDENCE: 0,
  },
  allFourteenGatesPassCount: results.length,
  datasetRevision: dataset.datasetRevision,
  datasetSha256: runtimeManifest.datasetSha256,
  runtimeManifestSha256: handoff.runtimeManifestSha256,
  candidateRuntimeImportAuthorized: false,
  feature43AssessedCells: 0,
  feature43TotalCells: 4300,
};
saveOrVerify("docs/qa/TASK-083/pilot100-validation.json", json(summary));
if (process.argv.includes("--ids"))
  console.log(JSON.stringify(runtimeManifest.internalIds));
else console.log(JSON.stringify(summary));
