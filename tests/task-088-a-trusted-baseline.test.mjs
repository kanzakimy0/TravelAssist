import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET } from "../src/app/api/pois/[poiRef]/route.ts";
import { POI_FEATURE_CODES } from "../src/shared/contracts/planning/features.ts";
import { parseCanonicalPoiV1 } from "../src/shared/contracts/poi/validation.ts";
import {
  canonicalPoiRuntimeRepository,
  createCanonicalPoiRuntimeRepository,
} from "../src/server/poi-runtime/repository.ts";
import { selectEffectiveFeature43 } from "../src/server/poi-runtime/feature-precedence.ts";
import {
  attachTrustedFeature43Baseline,
  TrustedFeature43BaselineIntegrityError,
} from "../src/server/poi-runtime/trusted-baseline.ts";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = (value) => structuredClone(value);
const dataset = read("src/shared/data/canonical-poi-pilot100.v1.json");
const runtime = read(
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const registry = read("src/shared/data/master-code-registry.v1.json");
const artifact = read(
  "src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json",
);
const manifest = read(
  "src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json",
);
const sample = read("data/poi/canonical/pilot-100/sample-manifest.v1.json");
const coverage = read("docs/qa/TASK-088-A/coverage-and-identity.json");
const comparison = read("docs/qa/TASK-088-A/pr437-comparison.json");

test("dataset-level trust binds the exact 100 Canonical identities and 4,300 cells", async () => {
  assert.equal(
    artifact.scope,
    "CANONICAL_POI_PILOT_100_FEATURE43_TRUSTED_BASELINE",
  );
  assert.equal(manifest.trustPolicy, "TRUSTED_INTERNAL_BASELINE");
  assert.equal(manifest.artifactSha256, hash(artifact));
  assert.equal(manifest.baseCanonicalDatasetSha256, hash(dataset));
  assert.equal(manifest.baseRuntimeManifestSha256, hash(runtime));
  assert.equal(manifest.recordCount, 100);
  assert.equal(manifest.cellCount, 4300);
  assert.equal(coverage.exactIdentityBindings, 100);
  assert.equal(coverage.ambiguousJoins, 0);
  assert.equal(coverage.invalidDomainCells, 0);
  assert.equal(coverage.unexplainedMutation, 0);
  assert.equal(
    createHash("sha256")
      .update(readFileSync(manifest.sourceWorkbookPath))
      .digest("hex"),
    manifest.sourceWorkbookSha256,
  );
  const rows = await canonicalPoiRuntimeRepository.list();
  assert.equal(rows.length, 100);
  assert.equal(
    canonicalPoiRuntimeRepository.featureBaselineRevision,
    artifact.revision,
  );
  assert.deepEqual(
    canonicalPoiRuntimeRepository.internalIds,
    runtime.internalIds,
  );
  for (let index = 0; index < 100; index += 1) {
    const base = dataset.records[index];
    const row = rows[index];
    const historical = artifact.records[index];
    const identity = sample.records[index];
    assert.equal(base.features, null);
    assert.equal(row.internalId, identity.internalId);
    assert.equal(row.masterCode, identity.allocatedMasterCode);
    assert.equal(historical.legacyUuid, identity.sourceInternalUuid);
    assert.equal(historical.internalId, row.internalId);
    assert.equal(historical.masterCode, row.masterCode);
    assert.equal(row.features.poiRef, row.internalId);
    assert.deepEqual(
      Object.keys(row.features.values).sort(),
      [...POI_FEATURE_CODES].sort(),
    );
    assert.ok(
      Object.values(row.features.values).every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 9,
      ),
    );
    assert.equal(parseCanonicalPoiV1(row).ok, true);
  }
});

test("only server-only admitted records receive baseline; candidate IDs fail closed", async () => {
  const rawRepository = createCanonicalPoiRuntimeRepository(
    dataset,
    runtime,
    registry,
  );
  assert.equal(
    (await rawRepository.list()).every((row) => row.features === null),
    true,
  );
  assert.equal(
    await canonicalPoiRuntimeRepository.getByInternalId("wikidata:Q270983"),
    null,
  );
  assert.equal(
    await canonicalPoiRuntimeRepository.getByInternalId("candidate:fake"),
    null,
  );
  const firstId = runtime.internalIds[0];
  const record = await canonicalPoiRuntimeRepository.getByInternalId(firstId);
  record.features.values["01"] = 9;
  assert.equal(
    (await canonicalPoiRuntimeRepository.getByInternalId(firstId)).features
      .values["01"],
    artifact.records[0].featureSet.values["01"],
  );
});

test("artifact, order, identity, registry and base hash tampering fail closed", () => {
  const attach = (changedArtifact, changedManifest = manifest) =>
    attachTrustedFeature43Baseline(
      dataset.records,
      dataset,
      runtime,
      changedArtifact,
      changedManifest,
    );
  const changedValue = clone(artifact);
  changedValue.records[0].featureSet.values["01"] = 99;
  assert.throws(
    () => attach(changedValue),
    TrustedFeature43BaselineIntegrityError,
  );
  const reordered = clone(artifact);
  [reordered.records[0], reordered.records[1]] = [
    reordered.records[1],
    reordered.records[0],
  ];
  const reorderedManifest = clone(manifest);
  reorderedManifest.artifactSha256 = hash(reordered);
  assert.throws(
    () => attach(reordered, reorderedManifest),
    TrustedFeature43BaselineIntegrityError,
  );
  const rebound = clone(artifact);
  rebound.records[0].masterCode = artifact.records[1].masterCode;
  const reboundManifest = clone(manifest);
  reboundManifest.artifactSha256 = hash(rebound);
  assert.throws(
    () => attach(rebound, reboundManifest),
    TrustedFeature43BaselineIntegrityError,
  );
  const wrongBase = clone(manifest);
  wrongBase.baseCanonicalDatasetSha256 = "0".repeat(64);
  assert.throws(
    () => attach(artifact, wrongBase),
    TrustedFeature43BaselineIntegrityError,
  );
  const candidateManifest = clone(manifest);
  candidateManifest.candidateCorpusAuthorized = true;
  assert.throws(
    () => attach(artifact, candidateManifest),
    TrustedFeature43BaselineIntegrityError,
  );
  assert.throws(
    () =>
      createCanonicalPoiRuntimeRepository(dataset, runtime, registry, artifact),
    /CANONICAL_POI_RUNTIME_INTEGRITY_FAILED/,
  );
});

test("restricted trusted baseline does not leak as public live Detail data", async () => {
  for (const id of runtime.internalIds) {
    const response = await GET(
      new Request(`http://localhost/api/pois/${encodeURIComponent(id)}`),
      { params: Promise.resolve({ poiRef: id }) },
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.poiRef, id);
    assert.equal(body.data.features, null);
  }
});

test("fresh same-scale operational facts override baseline, stale ones cannot", async () => {
  const row = await canonicalPoiRuntimeRepository.getByInternalId(
    runtime.internalIds[0],
  );
  const baseline = row.features;
  const now = "2026-09-29T12:00:00+09:00";
  const facts = ["27", "28", "29", "31", "35", "40"].map((featureCode) => ({
    featureCode,
    value: baseline.values[featureCode] === 9 ? 0 : 9,
    sourceRef: `source:current:${featureCode}`,
    observedAt: "2026-09-29T11:00:00+09:00",
    expiresAt: "2026-09-29T13:00:00+09:00",
  }));
  const selected = selectEffectiveFeature43(baseline, facts, now);
  for (const fact of facts) {
    assert.equal(selected.featureSet.values[fact.featureCode], fact.value);
    assert.notEqual(
      selected.featureSet.values[fact.featureCode],
      baseline.values[fact.featureCode],
    );
    assert.equal(selected.sources[fact.featureCode], "FRESH_CURRENT_FACT");
    assert.equal(
      selected.currentFactSourceRefs[fact.featureCode],
      fact.sourceRef,
    );
  }
  assert.deepEqual(baseline.values, artifact.records[0].featureSet.values);
  const stale = selectEffectiveFeature43(
    baseline,
    [{ ...facts[0], expiresAt: "2026-09-29T11:30:00+09:00" }],
    now,
  );
  assert.equal(stale.featureSet.values["27"], baseline.values["27"]);
  assert.equal(stale.sources["27"], "TRUSTED_INTERNAL_BASELINE");
  assert.throws(
    () =>
      selectEffectiveFeature43(
        baseline,
        [{ ...facts[0], featureCode: "01" }],
        now,
      ),
    /FEATURE43_PRECEDENCE_INVALID_CURRENT_FACT/,
  );
  assert.throws(
    () => selectEffectiveFeature43(baseline, [facts[0], facts[0]], now),
    /FEATURE43_PRECEDENCE_INVALID_CURRENT_FACT/,
  );
});

test("Draft #437 remains reference: eight equal and nine different values", () => {
  assert.equal(comparison.sourceStatus, "UNMERGED_DRAFT_REFERENCE");
  assert.equal(comparison.pr, 437);
  assert.equal(comparison.observations.length, 17);
  assert.equal(comparison.equalCount, 8);
  assert.equal(comparison.differentCount, 9);
  for (const observation of comparison.observations) {
    const trusted = artifact.records.find(
      (row) => row.internalId === observation.internalId,
    );
    assert.equal(trusted.masterCode, observation.masterCode);
    assert.equal(
      trusted.featureSet.values[observation.featureCode],
      observation.trustedBaselineValue,
    );
  }
});
