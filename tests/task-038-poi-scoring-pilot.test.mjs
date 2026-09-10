import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  PLANNING_CONTRACT_VERSION,
  POI_FEATURE_CODES,
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../src/shared/contracts/planning/index.ts";
import {
  SCENARIOS,
  SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE,
  calculateVisitLoad,
  invariantResults,
  runPilot,
  scorePoi,
} from "../tools/qa/poi-scoring-pilot.mjs";

const QA = path.resolve("docs/qa/TASK-038");
const load = async (name) =>
  JSON.parse(await readFile(path.join(QA, name), "utf8"));
const hash = async (name) =>
  createHash("sha256")
    .update(await readFile(path.join(QA, name)))
    .digest("hex");

test("TASK-038 sample has exactly 100 unique traceable Japan POIs", async () => {
  const sample = await load("poi-sample-100.json");
  assert.equal(sample.rows.length, 100);
  assert.equal(new Set(sample.rows.map((row) => row.poiRef)).size, 100);
  assert.ok(sample.rows.every((row) => row.countryCode === "JP"));
  assert.ok(sample.rows.every((row) => /^wikidata:Q\d+$/.test(row.poiRef)));
  assert.ok(sample.rows.every((row) => row.sourceRefs.length >= 2));
});

test("sample meets geographic caps and deterministic 80/20 split", async () => {
  const sample = (await load("poi-sample-100.json")).rows;
  const counts = Object.groupBy(sample, (row) => row.prefecture);
  assert.ok(new Set(sample.map((row) => row.region)).size >= 6);
  assert.ok(Object.keys(counts).length >= 10);
  assert.ok(
    Math.max(...Object.values(counts).map((rows) => rows.length)) <= 20,
  );
  assert.ok(
    sample.filter((row) => ["Tokyo", "Kyoto", "Osaka"].includes(row.prefecture))
      .length <= 45,
  );
  assert.equal(
    sample.filter((row) => row.splitAssignment === "calibration").length,
    80,
  );
  assert.equal(
    sample.filter((row) => row.splitAssignment === "holdout").length,
    20,
  );
});

test("sample meets archetype and difficulty balance targets", async () => {
  const rows = (await load("poi-sample-100.json")).rows;
  const familyCount = (tags) =>
    rows.filter((row) => row.archetypeTags.some((tag) => tags.includes(tag)))
      .length;
  for (const tags of [
    ["temple", "shrine"],
    ["historic", "architecture"],
    ["museum", "art"],
    ["nature", "park", "garden"],
    ["mountain", "viewpoint", "scenic"],
    ["food", "market"],
    ["shopping", "urban"],
    ["entertainment", "interactive", "family"],
    ["onsen", "relaxation"],
    ["night"],
  ])
    assert.ok(
      familyCount(tags) >= 5,
      `missing archetype family ${tags.join("/")}`,
    );
  assert.ok(familyCount(["high_burden"]) >= 20);
  assert.ok(familyCount(["low_burden"]) >= 20);
  assert.ok(familyCount(["iconic"]) >= 20);
  assert.ok(familyCount(["hidden", "local"]) >= 20);
  assert.ok(familyCount(["crowded"]) >= 15);
});

test("every POI has a canonical 43-key 0..9|null feature vector", async () => {
  const rows = (await load("poi-feature-annotations.json")).rows;
  assert.equal(rows.length, 100);
  for (const row of rows) {
    assert.deepEqual(
      Object.keys(row.featureSet.values).sort(),
      [...POI_FEATURE_CODES].sort(),
    );
    assert.equal(parsePoiFeatureSetV1(row.featureSet).ok, true);
    for (const value of Object.values(row.featureSet.values)) {
      assert.ok(
        value === null || (Number.isInteger(value) && value >= 0 && value <= 9),
      );
    }
    assert.equal(row.annotations.length, 43);
    assert.ok(
      row.annotations
        .filter((item) => item.value !== null)
        .every((item) => item.annotationMethod && item.sourceRefs.length),
    );
  }
});

test("null remains unknown and differs from known zero", async () => {
  const row = (await load("poi-feature-annotations.json")).rows[0];
  const scenario = SCENARIOS[0];
  const config = (await load("parameter-search.json")).selectedCandidate;
  const feature = structuredClone(row.featureSet);
  const code = scenario.dominantCodes[0];
  feature.values[code] = null;
  const unknown = scorePoi(feature, scenario, config);
  feature.values[code] = 0;
  const zero = scorePoi(feature, scenario, config);
  assert.ok(unknown.coverage < zero.coverage);
  assert.ok(
    unknown.breakdown.some(
      (item) => item.featureCode === code && item.contribution === null,
    ),
  );
});

test("preference 5 is neutral for benefit contribution", async () => {
  const row = (await load("poi-feature-annotations.json")).rows[0];
  const config = (await load("parameter-search.json")).selectedCandidate;
  const scenario = structuredClone(SCENARIOS[0]);
  scenario.values["15"] = 5;
  const result = scorePoi(row.featureSet, scenario, config);
  assert.equal(
    result.breakdown.find((item) => item.featureCode === "15")?.contribution ??
      0,
    0,
  );
});

test("cost and risk tolerance never create a positive reward", async () => {
  const features = (await load("poi-feature-annotations.json")).rows[0]
    .featureSet;
  const config = (await load("parameter-search.json")).selectedCandidate;
  const result = invariantResults(config, features, SCENARIOS[0]);
  assert.equal(result.checks.lowerWalkingToleranceNotLessPenalty, true);
  assert.equal(result.checks.highWalkingToleranceNeverRewards, true);
  assert.equal(result.checks.lowerCrowdToleranceNotLessPenalty, true);
  assert.equal(result.checks.highCrowdToleranceNeverRewards, true);
});

test("benefit direction and all semantic invariants pass", async () => {
  const features = (await load("poi-feature-annotations.json")).rows[0]
    .featureSet;
  const config = (await load("parameter-search.json")).selectedCandidate;
  const result = invariantResults(config, features, SCENARIOS[0]);
  assert.equal(result.passed, result.total);
  assert.equal(result.total, 12);
});

test("hard reject is separate and cannot be overridden by match score", async () => {
  const feature = (await load("poi-feature-annotations.json")).rows[0]
    .featureSet;
  const config = (await load("parameter-search.json")).selectedCandidate;
  const result = scorePoi(feature, SCENARIOS[0], config, "REJECT");
  assert.equal(result.selectable, false);
  assert.equal(result.value, null);
  assert.equal(result.gateStatus, "REJECT");
});

test("visit profiles keep unsupported numbers null and a synthetic fixture proves load sensitivity", async () => {
  const profiles = (await load("visit-profile-annotations.json")).rows;
  assert.ok(profiles.length > 0);
  for (const profile of profiles) {
    const canonical = Object.fromEntries(
      Object.entries(profile).filter(
        ([key]) => !["annotationMethod", "evidenceLimitation"].includes(key),
      ),
    );
    assert.equal(parsePoiVisitProfileV1(canonical).ok, true);
    for (const key of [
      "minimumDurationMinutes",
      "recommendedDurationMinutes",
      "maximumUsefulDurationMinutes",
      "fixedWalkingLoad",
      "variableWalkingLoad",
      "fixedPhysicalLoad",
      "variablePhysicalLoad",
    ])
      assert.equal(profile[key], null);
  }
  const loads = [30, 60, 90, 120].map((duration) =>
    calculateVisitLoad(SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE, duration),
  );
  assert.equal(new Set(loads.map((row) => row.walkingLoad)).size, 4);
  assert.equal(
    calculateVisitLoad(SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE, 5).feasibility,
    "TOO_SHORT",
  );
  assert.throws(
    () => calculateVisitLoad(profiles[0], 60),
    /evidence-supported/,
  );
});

test("benchmark has required judgment coverage and explicit human-review boundary", async () => {
  const rows = (await load("pairwise-benchmark.json")).rows;
  assert.ok(rows.length >= 240);
  assert.ok(
    rows.filter((row) => row.scenarioId === "low-walking").length >= 20,
  );
  assert.ok(rows.filter((row) => row.scenarioId === "low-crowd").length >= 20);
  assert.ok(
    rows.filter((row) =>
      ["first-time-iconic", "hidden-local"].includes(row.scenarioId),
    ).length >= 20,
  );
  assert.ok(
    rows.filter((row) =>
      row.reasonCodes.includes("UNKNOWN_COVERAGE_DIAGNOSTIC"),
    ).length >= 20,
  );
  assert.ok(rows.every((row) => row.reviewRequired));
});

test("parameter search is bounded, deterministic, and calibration-only", async () => {
  const search = await load("parameter-search.json");
  assert.equal(search.selectionUsedHoldout, false);
  assert.equal(search.candidateCount, 720);
  assert.equal(search.rows.length, search.candidateCount);
  assert.ok(
    search.rows.every((row) => row.config.gamma >= 1 && row.config.gamma <= 3),
  );
});

test("train and holdout POIs are disjoint", async () => {
  const split = await load("train-holdout-split.json");
  assert.equal(new Set(split.calibrationPoiRefs).size, 80);
  assert.equal(new Set(split.holdoutPoiRefs).size, 20);
  assert.equal(
    split.calibrationPoiRefs.filter((ref) => split.holdoutPoiRefs.includes(ref))
      .length,
    0,
  );
  assert.match(split.selectionDiscipline, /before a single holdout evaluation/);
});

test("selected candidate keeps every score inside 0..99", async () => {
  const features = (await load("poi-feature-annotations.json")).rows;
  const config = (await load("parameter-search.json")).selectedCandidate;
  for (const row of features)
    for (const scenario of SCENARIOS) {
      const score = scorePoi(row.featureSet, scenario, config).value;
      assert.ok(score >= 0 && score <= 99);
    }
});

test("pilot artifacts reproduce byte-for-byte without network", async () => {
  const names = [
    "annotation-quality.json",
    "calibration-results.json",
    "failure-cases.json",
    "holdout-results.json",
    "pairwise-benchmark.json",
    "parameter-search.json",
    "pilot-report.md",
    "poi-feature-annotations.json",
    "preference-scenarios.json",
    "train-holdout-split.json",
    "visit-profile-annotations.json",
  ];
  const before = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await hash(name)])),
  );
  await runPilot();
  const after = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await hash(name)])),
  );
  assert.deepEqual(after, before);
});

test("planning contract version remains canonical and no runtime context enters match score", () => {
  assert.equal(PLANNING_CONTRACT_VERSION, "1.0");
  for (const scenario of SCENARIOS) {
    assert.deepEqual(scenario.excludesLiveContext, [
      "weather",
      "route",
      "fatigue",
      "opening",
      "booking",
      "inventory",
      "itinerary_feasibility",
    ]);
  }
});
