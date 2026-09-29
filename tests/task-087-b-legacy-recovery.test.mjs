import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path));
const json = (path) => JSON.parse(read(path));
const lines = (path) =>
  read(path).toString("utf8").trim().split("\n").map(JSON.parse);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const qa = "docs/qa/TASK-087-B/";
const sample = json("data/poi/canonical/pilot-100/sample-manifest.v1.json");
const dataset = json("src/shared/data/canonical-poi-pilot100.v1.json");
const runtime = json(
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const candidate = json(
  "data/poi/full/manifests/current-candidate-review.v1.json",
);
const crosswalk = lines(qa + "identity-crosswalk.jsonl");
const observations = lines(qa + "historical-feature-observations.jsonl");
const decisions = lines(qa + "promotion-decisions.jsonl");
const conflicts = lines(qa + "conflicts.jsonl");
const unresolved = lines(qa + "unresolved.jsonl");
const inventory = json(qa + "source-inventory.json");
const matrix = json(qa + "rubric-compatibility.json");
const coverage = json(qa + "coverage-before-after.json");
const draft = json(qa + "pr437-draft-reference.json");
const overlay = json(
  "src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.json",
);
const manifest = json(
  "src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.manifest.v2.json",
);
const proof = json(qa + "deterministic-rebuild.json");
const featureCodes = [
  ...read("src/shared/contracts/planning/features.ts")
    .toString("utf8")
    .matchAll(
      /^\s*\["(\d{2})", "[^"]+", "(?:benefit|suitability|cost|risk)"\]/gm,
    ),
].map((match) => match[1]);

function validateOverlay(maybeOverlay, maybeManifest = manifest) {
  assert.equal(maybeManifest.runtimeImportAuthorized, false);
  assert.equal(maybeOverlay.runtimeImportAuthorized, false);
  assert.equal(maybeManifest.baseDatasetSha256, runtime.datasetSha256);
  assert.equal(maybeOverlay.baseDatasetSha256, runtime.datasetSha256);
  assert.deepEqual(maybeManifest.internalIds, runtime.internalIds);
  assert.deepEqual(maybeManifest.masterCodes, runtime.masterCodes);
  assert.deepEqual(
    maybeOverlay.records.map((row) => row.internalId),
    runtime.internalIds,
  );
  assert.deepEqual(
    maybeOverlay.records.map((row) => row.masterCode),
    runtime.masterCodes,
  );
  assert.ok(maybeOverlay.records.every((row) => row.features === null));
}

test("exact admitted Pilot-100 identity set and workbook UUID lineage", () => {
  assert.equal(sample.records.length, 100);
  assert.equal(crosswalk.length, 100);
  assert.deepEqual(
    crosswalk.map((row) => row.canonicalPoiId),
    runtime.internalIds,
  );
  assert.deepEqual(
    crosswalk.map((row) => row.masterCode),
    runtime.masterCodes,
  );
  assert.deepEqual(
    dataset.records.map((row) => row.internalId),
    runtime.internalIds,
  );
  assert.deepEqual(
    crosswalk.map((row) => row.historicalMatches[0].historicalInternalUuid),
    sample.records.map((row) => row.sourceInternalUuid),
  );
  assert.ok(crosswalk.every((row) => row.identityDecision === "EXACT_MATCH"));
});

test("no candidate key, name-only join, rebinding or identity ambiguity", () => {
  assert.equal(candidate.runtimeImportAuthorized, false);
  assert.equal(candidate.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
  assert.ok(sample.records.every((row) => row.candidateLinkage === null));
  assert.ok(
    crosswalk.every(
      (row) =>
        row.historicalMatches[0].matchMethod ===
          "EXACT_INTERNAL_UUID_THEN_FROZEN_MASTER_CODE_LINEAGE" &&
        row.historicalMatches[0].candidateKey === null &&
        row.historicalMatches
          .slice(1)
          .every(
            (match) =>
              match.matchMethod ===
                "EXACT_WIKIDATA_QID_POINTER_ONLY_NOT_ADMITTED" &&
              match.numericCells === 0,
          ),
    ),
  );
  assert.equal(new Set(crosswalk.map((row) => row.canonicalPoiId)).size, 100);
  assert.equal(new Set(crosswalk.map((row) => row.masterCode)).size, 100);
  assert.equal(coverage.ambiguousIdentityJoins, 0);
});

test("all 4,300 cells have one ordered decision from the sole Feature43 registry", () => {
  assert.equal(featureCodes.length, 43);
  assert.equal(decisions.length, 4300);
  assert.equal(
    new Set(decisions.map((row) => row.canonicalPoiId + "|" + row.featureCode))
      .size,
    4300,
  );
  for (let i = 0; i < 100; i++) {
    assert.deepEqual(
      decisions.slice(i * 43, (i + 1) * 43).map((row) => row.featureCode),
      featureCodes,
    );
    assert.ok(
      decisions
        .slice(i * 43, (i + 1) * 43)
        .every(
          (row) =>
            row.canonicalPoiId === runtime.internalIds[i] &&
            row.masterCode === runtime.masterCodes[i],
        ),
    );
  }
});

test("duplicate historical observations preserved; conflicts not averaged", () => {
  assert.equal(observations.length, 4317);
  assert.equal(draft.observations.length, 17);
  assert.equal(draft.sourceStatus, "UNMERGED_DRAFT_REFERENCE");
  assert.equal(conflicts.length, 17);
  assert.equal(coverage.draftEqualWorkbook, 8);
  assert.equal(coverage.draftDifferentWorkbook, 9);
  for (const row of conflicts) {
    assert.equal(row.state, "CONFLICT_REVIEW_REQUIRED");
    assert.equal(row.observationIndexes.length, 2);
    assert.equal(row.proposedValue, null);
    assert.deepEqual(
      row.observationIndexes.map(
        (index) => observations[index].historicalValue,
      ),
      row.legacyValues,
    );
  }
});

test("rubric and provenance gates fail closed for legacy numeric values", () => {
  assert.equal(
    matrix.legacyRows.reduce((sum, row) => sum + row.pilotPoiCount, 0),
    100,
  );
  assert.ok(
    matrix.legacyRows.every(
      (row) =>
        row.featureColumnNamesCompatible &&
        row.numericDomainCompatible &&
        row.scaleMagnitudeCompatibility === "UNVERIFIED" &&
        row.directCopyAllowed === false,
    ),
  );
  assert.deepEqual(coverage.provenance, { P0: 0, P1: 17, P2: 4300, P3: 0 });
  assert.ok(decisions.every((row) => row.proposedValue === null));
  assert.equal(coverage.states.LEGACY_VALUE_NO_PROVENANCE, 4283);
  assert.equal(coverage.states.CONFLICT_REVIEW_REQUIRED, 17);
  assert.equal(coverage.states.PROMOTE_AS_IS, 0);
  assert.equal(coverage.states.PROMOTE_REVALIDATED, 0);
});

test("null is not converted to zero or five; unresolved ledger complete", () => {
  assert.equal(unresolved.length, 4300);
  assert.ok(
    unresolved.every((row) => row.finalProposedValue === null && row.reason),
  );
  assert.ok(dataset.records.every((row) => row.features === null));
  assert.equal(coverage.existingCanonicalNonNull, 0);
  assert.equal(coverage.proposedFinalNonNull, 0);
  assert.equal(coverage.unexplainedDelta, 0);
  assert.equal(coverage.poiWith43Of43, 0);
  for (const code of featureCodes) {
    assert.deepEqual(coverage.perFeature[code], {
      before: 0,
      found: 100,
      promotable: 0,
      final: 0,
    });
  }
});

test("candidate partitions, deltas and historical source files inventoried", () => {
  assert.ok(inventory.fileCount >= 2300);
  assert.equal(inventory.candidateFeaturePartitions.candidateCount, 10369);
  assert.equal(inventory.candidateFeaturePartitions.baselinePartitionCount, 52);
  assert.equal(inventory.candidateFeaturePartitions.baselineNumericCells, 860);
  assert.equal(
    inventory.candidateFeaturePartitions.currentCandidateNumericCells,
    6209,
  );
  assert.deepEqual(
    inventory.candidateFeaturePartitions.exactPilotQidSourceRefHits,
    [],
  );
  assert.deepEqual(
    inventory.candidateFeaturePartitions.exactPilotQidCandidateKeyPointers.map(
      (pointer) => [pointer.candidateKey, pointer.numericCells],
    ),
    [["wikidata:Q270983", 0]],
  );
  assert.equal(
    inventory.candidateFeaturePartitions.canonicalPromotionAllowed,
    false,
  );
  assert.equal(
    inventory.workbookSha256,
    sha(
      read(
        inventory.historicalFiles.find((file) => file.path.endsWith(".xlsx"))
          .path,
      ),
    ),
  );
});

test("overlay candidate binds exact base and fails on reorder or tamper", () => {
  validateOverlay(overlay);
  const reordered = structuredClone(overlay);
  [reordered.records[0], reordered.records[1]] = [
    reordered.records[1],
    reordered.records[0],
  ];
  assert.throws(() => validateOverlay(reordered));
  const rebound = structuredClone(overlay);
  rebound.records[0].masterCode = "99999";
  assert.throws(() => validateOverlay(rebound));
  const authorized = structuredClone(manifest);
  authorized.runtimeImportAuthorized = true;
  assert.throws(() => validateOverlay(overlay, authorized));
});

test("deterministic hashes bind every generated artifact", () => {
  assert.equal(
    manifest.promotionDecisionsSha256,
    sha(read(qa + "promotion-decisions.jsonl")),
  );
  assert.equal(
    manifest.overlaySha256,
    sha(
      read("src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.json"),
    ),
  );
  assert.equal(manifest.sourceInventorySha256, inventory.inventorySha256);
  for (const [path, hash] of Object.entries(proof.outputHashes)) {
    assert.equal(sha(read(path)), hash, path);
  }
  assert.equal(proof.repeatable, true);
  assert.equal(proof.unexplainedDelta, 0);
});
