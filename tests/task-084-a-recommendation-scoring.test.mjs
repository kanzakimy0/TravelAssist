import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
} from "../src/shared/contracts/planning/features.ts";
import { completePoiFeatureFixture } from "../src/shared/contracts/planning/fixtures.ts";
import { preferenceKeys } from "../src/shared/contracts/preferences/index.ts";
import { toLongTermPreferenceReadV1 } from "../src/shared/contracts/preferences/read.ts";
import { urbanAttractionPoiFixture } from "../src/shared/contracts/poi/fixtures.ts";
import {
  MAPPING_VERSION,
  PREFERENCE_KEY_MAPPING,
  SCORING_CONFIG_VERSION,
  adaptPreferenceToScoringV1,
  assertScoringRegistryAlignment,
  scorePoiRecommendationV1,
} from "../src/shared/recommendation-scoring/index.ts";
import { scoreAuthorizedCanonicalPoiV1 } from "../src/server/recommendation-scoring/service.ts";

const clone = structuredClone;
const longTerm = (values = {}) =>
  toLongTermPreferenceReadV1({
    preference: { schemaVersion: "1.0", values },
    revision: 7,
    updatedAt: "2026-09-28T00:00:00Z",
  });
const base = (values = {}, featureValues = {}) => {
  const features = clone(completePoiFeatureFixture);
  for (const code of POI_FEATURE_CODES) features.values[code] = null;
  Object.assign(features.values, featureValues);
  features.confidence = 1;
  return {
    poiRef: features.poiRef,
    features,
    longTerm: longTerm(values),
    context: { contextVersion: "test-context-v1" },
    dataRevision: "synthetic-contract-fixture-v1",
  };
};
const score = (values, features, extras = {}) =>
  scorePoiRecommendationV1({ ...base(values, features), ...extras });
const breakdown = (result, code, component = "matchScore") =>
  result[component].breakdown.find((item) => item.featureCode === code);

test("single registries: all 23 keys and all 43 codes have one kind", () => {
  assertScoringRegistryAlignment();
  assert.equal(preferenceKeys.length, 23);
  assert.deepEqual(
    [...Object.keys(PREFERENCE_KEY_MAPPING)].sort(),
    [...preferenceKeys].sort(),
  );
  assert.equal(POI_FEATURE_DEFINITIONS.length, 43);
  assert.equal(new Set(POI_FEATURE_CODES).size, 43);
  assert.ok(
    POI_FEATURE_DEFINITIONS.every(([, , kind]) =>
      ["benefit", "suitability", "cost", "risk"].includes(kind),
    ),
  );
});

test("benefit p=9/f=9 contributes +1 with correct registry key", () => {
  const result = score(
    { "interests.preferences": { photography: "like" } },
    { "04": 9 },
  );
  assert.equal(breakdown(result, "04").contribution, 1);
  assert.equal(breakdown(result, "04").featureKey, "photo");
  assert.equal(result.matchScore.status, "scored");
});
test("benefit p=1/f=9 contributes -1; dislike remains soft", () => {
  const result = score(
    { "interests.preferences": { photography: "dislike" } },
    { "04": 9 },
  );
  assert.equal(breakdown(result, "04").contribution, -1);
  assert.equal(result.constraintGate.status, "PASS");
  assert.ok(
    result.reasons.some((reason) => reason.code === "PREF_DISLIKE_CONFLICT"),
  );
});
test("benefit p=1/f=0 is neutral, not a reward", () => {
  assert.equal(
    breakdown(
      score(
        { "interests.preferences": { photography: "dislike" } },
        { "04": 0 },
      ),
      "04",
    ).contribution,
    0,
  );
});
test("explicit neutral preference yields zero personalized contribution", () => {
  const result = score({ "style.discovery": 3 }, { 15: 9 });
  assert.equal(breakdown(result, "15").contribution, 0);
  assert.equal(breakdown(result, "15").signalSource, "long_term");
});
test("cost below tolerance has zero penalty", () => {
  assert.equal(
    breakdown(score({ "mobility.walkingTolerance": "high" }, { 25: 2 }), "25")
      .contribution,
    0,
  );
});
test("cost above tolerance has penalty and traceable reason", () => {
  const result = score({ "mobility.walkingTolerance": "veryLow" }, { 25: 9 });
  assert.equal(breakdown(result, "25").contribution, -1);
  assert.ok(
    result.reasons.some((reason) => reason.code === "WALKING_OVER_TOLERANCE"),
  );
});
test("high risk tolerance removes crowd penalty without rewarding crowd", () => {
  const result = score(
    {},
    { 27: 9 },
    { context: { contextVersion: "v1", crowdTolerance: 9 } },
  );
  assert.equal(breakdown(result, "27").contribution, 0);
  assert.equal(breakdown(result, "27").signalSource, "party_context");
});
test("null feature loses coverage, unlike known zero", () => {
  const values = { "interests.preferences": { photography: "like" } };
  const missing = score(values, { "04": null });
  const zero = score(values, { "04": 0 });
  assert.equal(breakdown(missing, "04").contribution, null);
  assert.equal(breakdown(zero, "04").contribution, 0);
  assert.equal(missing.matchScore.value, null);
  assert.ok(zero.matchScore.coverage > missing.matchScore.coverage);
});
test("hard violation rejects before soft score", () => {
  const result = score(
    {},
    { "04": 9 },
    {
      constraints: {
        partyNeeds: [{ requiresWheelchair: true }],
        accessibilityFacts: {
          wheelchairAccessible: false,
          strollerAccessible: null,
        },
      },
    },
  );
  assert.equal(result.constraintGate.status, "REJECT");
  assert.equal(result.matchScore.value, null);
  assert.equal(result.matchScore.status, "blocked");
});
test("critical unknown needs fact and does not emit score", () => {
  const result = score(
    {},
    { "04": 9 },
    { constraints: { criticalFacts: [{ code: "TICKET", satisfied: null }] } },
  );
  assert.equal(result.constraintGate.status, "NEEDS_FACT");
  assert.equal(result.matchScore.status, "needs_fact");
  assert.equal(result.matchScore.value, null);
});
test("context suitability reacts in the correct direction", () => {
  const context = { contextVersion: "v1", party: { family: 1 } };
  const high = score({}, { 16: 9 }, { context });
  const low = score({}, { 16: 0 }, { context });
  assert.ok(high.partyFit.value > low.partyFit.value);
  assert.equal(breakdown(high, "16", "partyFit").signalSource, "party_context");
});
test("weather sensitivity is not a static dislike", () => {
  const clear = score(
    {},
    { 39: 9 },
    {
      context: {
        contextVersion: "v1",
        weather: { condition: "clear", severity: 1 },
      },
    },
  );
  const rainy = score(
    {},
    { 39: 9, 35: 0 },
    {
      context: {
        contextVersion: "v1",
        weather: { condition: "rain", severity: 1 },
      },
    },
  );
  assert.equal(clear.weatherFit.status, "not_applicable");
  assert.equal(breakdown(rainy, "39", "weatherFit").contribution, -1);
  assert.equal(
    breakdown(rainy, "39", "weatherFit").signalSource,
    "weather_context",
  );
});
test("group wheelchair hard need cannot be averaged away", () => {
  const result = score(
    {},
    { 29: 9 },
    {
      constraints: {
        partyNeeds: [{}, { requiresWheelchair: true }],
        accessibilityFacts: {
          wheelchairAccessible: null,
          strollerAccessible: true,
        },
      },
    },
  );
  assert.equal(result.constraintGate.status, "NEEDS_FACT");
});
test("group walking tolerance protects the least tolerant member", () => {
  const result = score(
    { "mobility.walkingTolerance": "veryHigh" },
    { 25: 9 },
    {
      context: {
        contextVersion: "v1",
        partyMemberTolerances: [{ 25: 9 }, { 25: 1 }],
      },
    },
  );
  assert.equal(breakdown(result, "25").preferenceValue, 1);
  assert.equal(breakdown(result, "25").limitingPartyMemberIndex, 1);
  assert.equal(breakdown(result, "25").contribution, -1);
});
test("fresh live crowd replaces baseline, never double counts", () => {
  const result = score(
    {},
    { 27: 9 },
    {
      liveRiskFacts: {
        27: {
          value: 0,
          confidence: 1,
          provenanceRef: "live-crowd",
          fresh: true,
        },
      },
    },
  );
  assert.equal(
    result.matchScore.breakdown.filter((item) => item.featureCode === "27")
      .length,
    1,
  );
  assert.equal(breakdown(result, "27").featureValue, 0);
  assert.equal(breakdown(result, "27").featureSource, "live");
});
test("low coverage shrinks toward neutral", () => {
  const values = {
    "interests.preferences": { photography: "like", history_culture: "like" },
  };
  const sparse = score(values, { "04": 9 });
  const complete = score(values, { "04": 9, "02": 9, "03": 9 });
  assert.ok(sparse.matchScore.value < complete.matchScore.value);
  assert.ok(sparse.matchScore.coverage < complete.matchScore.coverage);
  assert.ok(
    sparse.reasons.some((reason) => reason.code === "LOW_DATA_COVERAGE"),
  );
});
test("same versioned input returns byte-stable result", () => {
  const input = base(
    { "interests.preferences": { photography: "like" } },
    { "04": 9 },
  );
  assert.equal(
    JSON.stringify(scorePoiRecommendationV1(input)),
    JSON.stringify(scorePoiRecommendationV1(input)),
  );
});
test("score breakdown recomputes coverage, raw and score", () => {
  const result = score(
    { "interests.preferences": { photography: "like" } },
    { "04": 8 },
  );
  const envelope = result.matchScore;
  const requested = envelope.breakdown.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const known = envelope.breakdown.reduce(
    (sum, item) =>
      sum +
      (item.featureValue === null ? 0 : item.weight * item.featureConfidence),
    0,
  );
  const weighted = envelope.breakdown.reduce(
    (sum, item) => sum + item.weightedContribution,
    0,
  );
  assert.equal(envelope.coverage, known / requested);
  assert.equal(envelope.knownRaw, weighted / known);
  assert.equal(
    envelope.value,
    Math.round(99 * ((envelope.coverage * envelope.knownRaw + 1) / 2)),
  );
});
test("route and day fit are separate; no route facts inferred from 43D", () => {
  const result = score({}, { 25: 9, 26: 9 });
  assert.equal(result.dayFit.status, "not_applicable");
  assert.equal(result.routeFit.status, "not_applicable");
  assert.equal(result.dayFit.value, null);
  assert.equal(result.routeFit.value, null);
  assert.equal(JSON.stringify(result).includes("transfers"), false);
});
test("Trip Override takes precedence over Snapshot and LongTerm", () => {
  const input = base({ "mobility.walkingTolerance": "veryLow" }, { 25: 9 });
  input.tripSnapshot = {
    schemaVersion: "1.0",
    values: { "mobility.walkingTolerance": "low" },
  };
  input.tripSnapshotRef = "snapshot:1";
  input.tripOverride = {
    schemaVersion: "1.0",
    values: { "mobility.walkingTolerance": "veryHigh" },
  };
  input.tripOverrideRevision = 2;
  const result = scorePoiRecommendationV1(input);
  assert.equal(breakdown(result, "25").preferenceValue, 9);
  assert.equal(breakdown(result, "25").signalSource, "trip_override");
  assert.equal(result.preferenceSnapshotRef, "snapshot:1");
  assert.equal(result.preferenceOverrideRevision, 2);
});
test("route, accommodation and budget keys do not leak into POI signals", () => {
  const adapted = adaptPreferenceToScoringV1({
    longTerm: longTerm({
      "mobility.fewerTransfers": true,
      "accommodation.comfort": "prioritize",
      "budget.prioritizeAccommodation": true,
    }),
  });
  assert.ok(
    adapted.signals.every(
      (signal) => !/fewerTransfers|accommodation|budget/.test(signal.signalKey),
    ),
  );
});
test("route bans reject only with evaluated route modes", () => {
  const values = { "mobility.noBus": true };
  const reject = score(
    values,
    {},
    { constraints: { route: { evaluationRequired: true, modes: ["bus"] } } },
  );
  const unknown = score(
    values,
    {},
    { constraints: { route: { evaluationRequired: true, modes: null } } },
  );
  assert.equal(reject.constraintGate.status, "REJECT");
  assert.equal(unknown.constraintGate.status, "NEEDS_FACT");
});
test("score binds all replay revisions and provenance", () => {
  const result = score(
    { "interests.preferences": { photography: "like" } },
    { "04": 9 },
  );
  assert.equal(result.mappingVersion, MAPPING_VERSION);
  assert.equal(result.scoringConfigVersion, SCORING_CONFIG_VERSION);
  assert.equal(result.preferenceSourceRevision, 7);
  assert.equal(result.dataRevision, "synthetic-contract-fixture-v1");
  assert.equal(result.contextVersion, "test-context-v1");
  assert.equal(
    breakdown(result, "04").featureProvenanceRef,
    "source-synthetic-fixture",
  );
});
test("authorized canonical server boundary refuses missing 43D and candidate IDs", async () => {
  const repository = {
    scope: "CANONICAL_POI_PILOT_100",
    runtimeImportAuthorized: true,
    datasetRevision: "test-only",
    internalIds: [urbanAttractionPoiFixture.internalId],
    async getByInternalId() {
      return { ...urbanAttractionPoiFixture, features: null };
    },
  };
  const common = {
    repository,
    longTerm: longTerm(),
    context: { contextVersion: "v1" },
  };
  assert.deepEqual(
    await scoreAuthorizedCanonicalPoiV1({
      ...common,
      poiId: "candidate:unadmitted",
    }),
    { status: "unavailable", reason: "POI_NOT_IN_AUTHORIZED_SET" },
  );
  assert.deepEqual(
    await scoreAuthorizedCanonicalPoiV1({
      ...common,
      poiId: urbanAttractionPoiFixture.internalId,
    }),
    { status: "unavailable", reason: "FEATURE43_UNAVAILABLE" },
  );
  assert.deepEqual(
    await scoreAuthorizedCanonicalPoiV1({
      ...common,
      repository: null,
      poiId: urbanAttractionPoiFixture.internalId,
    }),
    { status: "unavailable", reason: "CANONICAL_RUNTIME_UNAUTHORIZED" },
  );
});
test("benchmark personas are canonical Preference fixtures and not real POIs", () => {
  const data = JSON.parse(
    readFileSync("docs/qa/TASK-084/benchmark-personas.json", "utf8"),
  );
  assert.equal(data.fixtureOnly, true);
  assert.equal(data.personas.length, 8);
  for (const persona of data.personas) {
    const adapted = adaptPreferenceToScoringV1({
      longTerm: longTerm(persona.preference.values),
    });
    assert.equal(adapted.mappingVersion, MAPPING_VERSION);
    assert.ok(persona.context.contextVersion);
  }
});
