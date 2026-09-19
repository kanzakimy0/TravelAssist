import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, hash } from "./enrich-candidates.mjs";
import { parsePoiFeatureSetV1 } from "../../src/shared/contracts/planning/validation.ts";

const MANIFEST = "data/poi/full/manifests/current-candidate-review.v1.json";
const parseLines = (text) =>
  text.trim().split("\n").filter(Boolean).map(JSON.parse);

export function applyEvidenceDelta(baseline, delta, ledger, heldKeys) {
  const original = new Map(baseline.map((r) => [r.candidateKey, r]));
  const evidence = new Map(ledger.entries.map((e) => [e.candidateKey, e]));
  assert.equal(original.size, baseline.length, "Duplicate baseline candidate");
  assert.equal(
    evidence.size,
    ledger.entries.length,
    "Duplicate editorial entry",
  );
  const replacements = new Map();
  for (const row of delta) {
    const old = original.get(row.candidateKey);
    assert.ok(
      old && !replacements.has(row.candidateKey),
      "Unknown/duplicate delta candidate",
    );
    assert.ok(!heldKeys.has(row.candidateKey), "Identity hold");
    assert.ok(
      Object.values(old.featureSet.values).every((v) => v === null),
      "Previously scored candidate is protected",
    );
    const e = evidence.get(row.candidateKey);
    assert.ok(e && e.identityAssessment.status === "TARGET_CONFIRMED");
    assert.equal(row.identityInputChecksum, old.identityInputChecksum);
    assert.equal(row.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
    assert.equal(
      row.currentFactUsability,
      "UNKNOWN_REVERIFY_VIA_EXISTING_FACT_POLICY",
    );
    for (const field of ["visitProfiles", "accessLinks", "neighbors"])
      assert.deepEqual(row[field], old[field]);
    assert.ok(
      parsePoiFeatureSetV1(row.featureSet).ok,
      "Shared feature contract",
    );
    assert.equal(Object.keys(row.featureSet.values).length, 43);
    const mutable = new Set([
      "status",
      "featureSet",
      "provenance",
      "remainingReview",
    ]);
    assert.deepEqual(
      Object.fromEntries(Object.entries(row).filter(([k]) => !mutable.has(k))),
      Object.fromEntries(Object.entries(old).filter(([k]) => !mutable.has(k))),
      "Non-feature baseline metadata changed",
    );
    assert.equal(row.featureSet.poiRef, row.candidateKey);
    assert.deepEqual(row.featureSet.sourceRefs, [e.sourceRef]);
    assert.equal(
      row.featureSet.confidence,
      Math.min(...e.features.map((f) => f.confidence)),
    );
    const facts = new Map(e.features.map((f) => [f.code, f]));
    assert.equal(facts.size, e.features.length);
    assert.equal(row.provenance.length, e.features.length);
    for (const [code, value] of Object.entries(row.featureSet.values)) {
      const fact = facts.get(code);
      assert.equal(
        value,
        fact ? fact.value : null,
        "Unsupported default or altered score",
      );
      if (!fact) continue;
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 9);
      const p = row.provenance.find((p) => p.featureCode === code);
      assert.equal(p.value, value);
      assert.equal(p.confidence, fact.confidence);
      assert.ok(p.confidence >= 0 && p.confidence <= 1);
      assert.equal(p.annotationMethod, "editorial_calibration");
      assert.equal(p.rubricVersion, ledger.rubricVersion);
      assert.equal(p.rationale, fact.reason);
      assert.ok(p.rationale);
      assert.deepEqual(p.sourceRefs, [e.sourceRef]);
      assert.deepEqual(p.facts, [
        { sourceRef: e.sourceRef, reason: fact.reason, locator: fact.locator },
      ]);
    }
    replacements.set(row.candidateKey, row);
  }
  return baseline.map((r) => replacements.get(r.candidateKey) ?? r);
}

export function readCurrentCandidateRows(root = ROOT) {
  const checkedRead = (ref) => {
    const path = resolve(root, ref.path);
    const rel = relative(root, path);
    assert.ok(
      !isAbsolute(rel) && !rel.startsWith(".."),
      "Manifest path escapes repository",
    );
    const bytes = readFileSync(path);
    assert.equal(
      hash(bytes),
      ref.sha256,
      "Manifest content mismatch: " + ref.path,
    );
    return bytes.toString("utf8");
  };
  const manifest = JSON.parse(readFileSync(resolve(root, MANIFEST), "utf8"));
  assert.equal(manifest.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
  assert.equal(manifest.runtimeImportAuthorized, false);
  const baseline = manifest.baseFeaturePartitions.flatMap((p) =>
    parseLines(checkedRead(p)),
  );
  const delta = parseLines(checkedRead(manifest.delta));
  const ledger = JSON.parse(checkedRead(manifest.editorialLedger));
  const pending = manifest.pendingBatches.flatMap((p) =>
    parseLines(checkedRead(p)),
  );
  assert.equal(pending.length, 10097);
  assert.equal(new Set(pending.map((p) => p.candidateKey)).size, 10097);
  const plan = JSON.parse(
    readFileSync(
      resolve(root, "data/poi/full/manifests/remaining-v1/population.json"),
      "utf8",
    ),
  );
  assert.deepEqual(manifest.baseFeaturePartitions, plan.baselinePartitions);
  for (const [path, sha256] of Object.entries(plan.identityHashes))
    checkedRead({ path, sha256 });
  const held = new Set(
    plan.items.filter((i) => i.identityHold).map((i) => i.candidateKey),
  );
  assert.equal(held.size, 165);
  const rows = applyEvidenceDelta(baseline, delta, ledger, held);
  const byKey = new Map(rows.map((r) => [r.candidateKey, r]));
  for (const q of pending) {
    assert.equal(q.identityHold, held.has(q.candidateKey));
    const row = byKey.get(q.candidateKey);
    assert.ok(row);
    assert.deepEqual(
      q.unresolvedFeatureCodes,
      Object.keys(row.featureSet.values)
        .filter((c) => row.featureSet.values[c] === null)
        .sort(),
    );
    assert.equal(q.acceptedFeatureCount, row.provenance.length);
    assert.equal(q.retryPolicy.preserveCandidateKeyAndCodes, true);
    assert.equal(q.retryPolicy.manualReviewAllowed, true);
  }
  return { rows, baseline, delta, ledger, pending, manifest };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { rows, delta, pending, manifest } = readCurrentCandidateRows();
  console.log(
    JSON.stringify(
      {
        status: "CANDIDATE_VIEW_VALIDATED",
        generation: manifest.generation,
        population: rows.length,
        newScoredPois: delta.length,
        scoredPois: rows.filter((r) => r.provenance.length).length,
        nonNullFeatures: rows.reduce((n, r) => n + r.provenance.length, 0),
        pendingCandidates: pending.length,
        searchCheckpoints: pending.filter(
          (p) => p.searchStatus === "SEARCH_EXECUTED",
        ).length,
        runtimeImportAuthorized: false,
      },
      null,
      2,
    ),
  );
}
