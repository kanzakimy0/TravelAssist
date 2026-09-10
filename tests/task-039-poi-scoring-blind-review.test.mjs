import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  GROUP_COUNTS,
  RESPONSE_CHOICES,
  auditReviewerPack,
  buildAdjudicationPack,
  buildCanonicalReviewSet,
  buildReviewerPack,
  calculateAgreement,
  calculateRepeatConsistency,
  evaluateCandidateOnce,
  freezeHumanGold,
  normalizeReviewerResponse,
  prepareBlindReview,
  sha256,
  validateReviewerResponse,
} from "../tools/qa/poi-scoring-blind-review.mjs";

const TASK038 = path.resolve("docs/qa/TASK-038");
const TASK039 = path.resolve("docs/qa/TASK-039");
const load = async (directory, name) =>
  JSON.parse(await readFile(path.join(directory, name), "utf8"));
const sourceInputs = async () => ({
  sample: await load(TASK038, "poi-sample-100.json"),
  scenarios: await load(TASK038, "preference-scenarios.json"),
  features: await load(TASK038, "poi-feature-annotations.json"),
  benchmark: await load(TASK038, "pairwise-benchmark.json"),
  parameters: await load(TASK038, "parameter-search.json"),
});

const syntheticResponse = (pack, choiceFor = () => "TIE") => ({
  reviewVersion: pack.reviewVersion,
  reviewerCode: pack.reviewerCode,
  submittedAt: "2026-09-11T12:00:00+09:00",
  responses: pack.items.map((item, index) => ({
    blindItemId: item.blindItemId,
    choice: choiceFor(item, index),
    confidence: "medium",
    note: null,
  })),
});

test("TASK-039 has exactly 144 items with the frozen 96/24/12/12 composition", async () => {
  const internal = await load(TASK039, "internal-review-map.json");
  assert.equal(internal.itemCount, 144);
  assert.deepEqual(internal.composition, GROUP_COUNTS);
});

test("primary has exactly eight items for each of all 12 scenarios", async () => {
  const internal = await load(TASK039, "internal-review-map.json");
  const primary = internal.canonicalItems.filter(
    (item) => item.group === "primary_validation",
  );
  const counts = Object.groupBy(primary, (item) => item.scenarioId);
  assert.equal(Object.keys(counts).length, 12);
  assert.ok(Object.values(counts).every((rows) => rows.length === 8));
  assert.ok(
    primary.every(
      (item) => Object.keys(item.hiddenMachineReferences).length === 0,
    ),
  );
});

test("non-repeat canonical tasks are unique and hidden repeats map exactly", async () => {
  const internal = await load(TASK039, "internal-review-map.json");
  const byId = new Map(
    internal.canonicalItems.map((item) => [item.canonicalItemId, item]),
  );
  const nonRepeat = internal.canonicalItems.filter(
    (item) => item.group !== "hidden_repeat",
  );
  assert.equal(
    new Set(nonRepeat.map((item) => item.canonicalPairKey)).size,
    132,
  );
  const repeats = internal.canonicalItems.filter(
    (item) => item.group === "hidden_repeat",
  );
  assert.equal(repeats.length, 12);
  for (const repeat of repeats) {
    const source = byId.get(repeat.repeatOfCanonicalItemId);
    assert.equal(source.group, "primary_validation");
    assert.equal(repeat.canonicalPairKey, source.canonicalPairKey);
  }
});

test("machine audit spans multiple hidden confidence bands", async () => {
  const internal = await load(TASK039, "internal-review-map.json");
  const bands = new Set(
    internal.canonicalItems
      .filter((item) => item.group === "machine_benchmark_audit")
      .map((item) => item.hiddenMachineReferences.machineConfidence),
  );
  assert.ok(bands.size >= 2);
});

test("generation is deterministic and TASK-038 candidate config is immutable", async () => {
  const parameterPath = path.join(TASK038, "parameter-search.json");
  const beforeParameter = sha256(await readFile(parameterPath));
  const beforeArtifacts = await Promise.all(
    [
      "reviewer-pack-r1.json",
      "reviewer-pack-r2.json",
      "internal-review-map.json",
    ].map(async (name) => sha256(await readFile(path.join(TASK039, name)))),
  );
  await prepareBlindReview();
  const afterArtifacts = await Promise.all(
    [
      "reviewer-pack-r1.json",
      "reviewer-pack-r2.json",
      "internal-review-map.json",
    ].map(async (name) => sha256(await readFile(path.join(TASK039, name)))),
  );
  assert.deepEqual(afterArtifacts, beforeArtifacts);
  assert.equal(sha256(await readFile(parameterPath)), beforeParameter);
});

test("canonical generation itself is deterministic", async () => {
  const inputs = await sourceInputs();
  assert.deepEqual(
    buildCanonicalReviewSet(inputs),
    buildCanonicalReviewSet(structuredClone(inputs)),
  );
});

test("R1 and R2 independently randomize order and orientation over the same tasks", async () => {
  const [r1, r2, internal] = await Promise.all([
    load(TASK039, "reviewer-pack-r1.json"),
    load(TASK039, "reviewer-pack-r2.json"),
    load(TASK039, "internal-review-map.json"),
  ]);
  const maps = Object.fromEntries(
    ["R1", "R2"].map((code) => [
      code,
      new Map(internal.reviewers[code].map((row) => [row.blindItemId, row])),
    ]),
  );
  const order = (pack) =>
    pack.items.map(
      (item) => maps[pack.reviewerCode].get(item.blindItemId).canonicalItemId,
    );
  assert.notDeepEqual(order(r1), order(r2));
  assert.deepEqual(new Set(order(r1)), new Set(order(r2)));
  const orientationR1 = new Map(
    internal.reviewers.R1.map((row) => [
      row.canonicalItemId,
      row.displayedAIsCanonicalA,
    ]),
  );
  assert.ok(
    internal.reviewers.R2.some(
      (row) =>
        orientationR1.get(row.canonicalItemId) !== row.displayedAIsCanonicalA,
    ),
  );
  for (const code of ["R1", "R2"]) {
    const positions = new Map(
      order(code === "R1" ? r1 : r2).map((id, index) => [id, index]),
    );
    for (const repeat of internal.canonicalItems.filter(
      (item) => item.group === "hidden_repeat",
    )) {
      assert.ok(
        positions.get(repeat.canonicalItemId) >
          positions.get(repeat.repeatOfCanonicalItemId),
      );
    }
  }
});

test("reviewer-facing packs pass recursive leakage audit", async () => {
  for (const name of ["reviewer-pack-r1.json", "reviewer-pack-r2.json"]) {
    const pack = await load(TASK039, name);
    assert.deepEqual(auditReviewerPack(pack), {
      reviewerCode: pack.reviewerCode,
      passed: true,
      findings: [],
    });
    const serialized = JSON.stringify(pack).toLowerCase();
    for (const forbidden of [
      "candidate-0457",
      "archetypetags",
      "reasoncodes",
      "splitassignment",
      "scoregap",
      "machineexpected",
    ]) {
      assert.equal(serialized.includes(forbidden), false);
    }
  }
});

test("response validator accepts only a complete, known, unique blind-id set", async () => {
  const pack = await load(TASK039, "reviewer-pack-r1.json");
  const valid = syntheticResponse(pack);
  assert.equal(validateReviewerResponse(valid, pack).ok, true);

  const missing = structuredClone(valid);
  missing.responses.pop();
  assert.equal(validateReviewerResponse(missing, pack).ok, false);

  const duplicate = structuredClone(valid);
  duplicate.responses[1].blindItemId = duplicate.responses[0].blindItemId;
  assert.equal(validateReviewerResponse(duplicate, pack).ok, false);

  const unknown = structuredClone(valid);
  unknown.responses[0].blindItemId = "R1-UNKNOWN";
  assert.equal(validateReviewerResponse(unknown, pack).ok, false);
});

test("A/B orientation normalization follows each reviewer mapping", async () => {
  const [pack, internal] = await Promise.all([
    load(TASK039, "reviewer-pack-r1.json"),
    load(TASK039, "internal-review-map.json"),
  ]);
  const mapping = new Map(
    internal.reviewers.R1.map((row) => [row.blindItemId, row]),
  );
  const response = syntheticResponse(pack, () => "A");
  const normalized = normalizeReviewerResponse(response, pack, internal);
  for (const [index, row] of normalized.entries()) {
    assert.equal(
      row.canonicalChoice,
      mapping.get(response.responses[index].blindItemId).displayedAIsCanonicalA
        ? "A"
        : "B",
    );
  }
});

test("agreement and repeat consistency calculations are deterministic", async () => {
  const [r1Pack, r2Pack, internal] = await Promise.all([
    load(TASK039, "reviewer-pack-r1.json"),
    load(TASK039, "reviewer-pack-r2.json"),
    load(TASK039, "internal-review-map.json"),
  ]);
  const r1 = normalizeReviewerResponse(
    syntheticResponse(r1Pack),
    r1Pack,
    internal,
  );
  const r2 = normalizeReviewerResponse(
    syntheticResponse(r2Pack),
    r2Pack,
    internal,
  );
  const agreement = calculateAgreement(r1, r2, internal);
  assert.equal(agreement.compared, 132);
  assert.equal(agreement.rawExactAgreement, 1);
  assert.equal(agreement.cohenKappa, 1);
  assert.deepEqual(calculateAgreement(r1, r2, internal), agreement);
  assert.deepEqual(calculateRepeatConsistency(r1, internal), {
    compared: 12,
    consistent: 12,
    rate: 1,
  });
});

test("adjudication pack reveals neither reviewer answers nor machine data", async () => {
  const inputs = await sourceInputs();
  const canonicalItems = buildCanonicalReviewSet(inputs);
  const r1Pack = buildReviewerPack(canonicalItems, "R1");
  const r2Pack = buildReviewerPack(canonicalItems, "R2");
  const internal = await load(TASK039, "internal-review-map.json");
  const r1 = normalizeReviewerResponse(
    syntheticResponse(r1Pack, () => "A"),
    r1Pack,
    internal,
  );
  const r2 = normalizeReviewerResponse(
    syntheticResponse(r2Pack, () => "B"),
    r2Pack,
    internal,
  );
  const pack = buildAdjudicationPack({
    normalizedR1: r1,
    normalizedR2: r2,
    canonicalItems,
  });
  assert.ok(pack.itemCount > 0);
  assert.equal(auditReviewerPack(pack).passed, true);
  assert.equal(JSON.stringify(pack).includes("canonicalChoice"), false);
});

test("Human Gold and candidate evaluation fail closed before human prerequisites", async () => {
  const internal = await load(TASK039, "internal-review-map.json");
  assert.throws(
    () =>
      freezeHumanGold({
        reviewers: [],
        adjudications: [],
        internalMap: internal,
      }),
    /two independent human/,
  );
  assert.throws(
    () =>
      evaluateCandidateOnce({
        humanGold: null,
        expectedHumanGoldSha256: null,
        parameterFile: "{}",
      }),
    /checksum/,
  );
});

test("no fabricated completed reviewer or human-gold files exist", async () => {
  for (const name of [
    "reviewer-r1-response.json",
    "reviewer-r2-response.json",
    "human-gold-v1.json",
    "candidate-0457-human-evaluation.json",
  ]) {
    await assert.rejects(access(path.join(TASK039, name)));
  }
  const template = await load(TASK039, "reviewer-response-template.json");
  assert.equal(template.responses[0].choice, null);
  assert.deepEqual(template.allowedChoices, RESPONSE_CHOICES);
});
