import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

import { completePoiFeatureFixture } from "../../src/shared/contracts/planning/fixtures.ts";
import {
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
} from "../../src/shared/contracts/planning/features.ts";
import {
  interestCodes,
  preferenceKeys,
} from "../../src/shared/contracts/preferences/index.ts";
import { toLongTermPreferenceReadV1 } from "../../src/shared/contracts/preferences/read.ts";
import {
  INTEREST_DETAIL_EXTRA_MAP,
  INTEREST_FEATURE_MAP,
  MAPPING_CATEGORIES,
  MAPPING_VERSION,
  PREFERENCE_KEY_MAPPING,
  SCORING_CONFIG_V1,
  SCORING_CONFIG_VERSION,
  scorePoiRecommendationV1,
} from "../../src/shared/recommendation-scoring/index.ts";

const root = "docs/qa/TASK-084/";
const personas = JSON.parse(
  readFileSync(root + "benchmark-personas.json", "utf8"),
);
assert.equal(personas.fixtureOnly, true);
assert.equal(personas.personas.length, 8);
const mapping = {
  mappingVersion: MAPPING_VERSION,
  preferenceRegistrySource:
    "src/shared/contracts/preferences/core.ts#preferenceFields",
  featureRegistrySource:
    "src/shared/contracts/planning/features.ts#POI_FEATURE_DEFINITIONS",
  categories: MAPPING_CATEGORIES,
  preferenceKeys: preferenceKeys.map((key) => ({
    key,
    categories: PREFERENCE_KEY_MAPPING[key],
  })),
  interestMapping: interestCodes.map((code) => ({
    interestCode: code,
    featureCodes: INTEREST_FEATURE_MAP[code],
    independentDetailFeatures: INTEREST_DETAIL_EXTRA_MAP[code] ?? {},
  })),
  note: "No second Preference or Feature43 registry. Classification is not a 43D user vector.",
};
assert.equal(mapping.preferenceKeys.length, 23);
assert.equal(POI_FEATURE_DEFINITIONS.length, 43);
const config = {
  ...SCORING_CONFIG_V1,
  mappingVersion: MAPPING_VERSION,
  featureRegistry: POI_FEATURE_DEFINITIONS.map(([code, key, kind]) => ({
    code,
    key,
    kind,
    weight: SCORING_CONFIG_V1.featureWeights[code],
  })),
  note: "Pilot calibration candidate only; not an empirically validated real-POI calibration.",
};
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const longTerm = (preference) =>
  toLongTermPreferenceReadV1({
    preference,
    revision: 1,
    updatedAt: "2026-09-28T00:00:00Z",
  });
const inputs = personas.personas.map((persona) => {
  const features = structuredClone(completePoiFeatureFixture);
  for (const code of POI_FEATURE_CODES) features.values[code] = null;
  features.values["04"] = 9;
  features.values["25"] = 4;
  features.values["27"] = 5;
  features.values["39"] = 4;
  features.confidence = 0.8;
  return {
    poiRef: features.poiRef,
    features,
    longTerm: longTerm(persona.preference),
    context: persona.context,
    dataRevision: "synthetic-performance-fixture-v1",
  };
});
const measure = (count, inputCount) => {
  const samples = [];
  let lastResult;
  for (let repeat = 0; repeat < 25; repeat += 1) {
    const start = process.hrtime.bigint();
    for (let index = 0; index < count; index += 1)
      lastResult = scorePoiRecommendationV1(inputs[index % inputCount]);
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  samples.sort((a, b) => a - b);
  return {
    callsPerRun: count,
    personasPerRun: inputCount,
    repeats: 25,
    p50Ms: Number(samples[12].toFixed(3)),
    p95Ms: Number(samples[23].toFixed(3)),
    lastResultHash: hash(lastResult),
    syntheticFixtureOnly: true,
  };
};
const first = scorePoiRecommendationV1(inputs[0]);
assert.equal(hash(first), hash(scorePoiRecommendationV1(inputs[0])));
const summary = {
  task: "TASK-084-A",
  status: "PASS_RUNTIME",
  realPilotStatus: "BLOCKED_REAL_PILOT",
  mappingVersion: MAPPING_VERSION,
  scoringConfigVersion: SCORING_CONFIG_VERSION,
  featureCodeCount: POI_FEATURE_CODES.length,
  preferenceKeyCount: preferenceKeys.length,
  benchmarkPersonaCount: personas.personas.length,
  targetedContractTestCount: 26,
  deterministicSyntheticResultHash: hash(first),
  performance: {
    onePoiOnePersona: measure(1, 1),
    oneHundredPoiOnePersona: measure(100, 1),
    oneHundredPoiEightPersonas: measure(800, 8),
  },
  caution:
    "Performance fixture has no real POI data. No real ranking, calibration or pairwise benchmark was run.",
};
assert.equal(SCORING_CONFIG_VERSION, SCORING_CONFIG_V1.configVersion);
const artifacts = {
  "preference-43d-mapping.json": mapping,
  "scoring-config.json": config,
  "contract-test-summary.json": summary,
};
for (const [name, value] of Object.entries(artifacts)) {
  const path = root + name;
  const content = await format(JSON.stringify(value), { parser: "json" });
  if (process.argv.includes("--check")) {
    if (name !== "contract-test-summary.json")
      assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), value, path);
  } else {
    writeFileSync(path, content);
  }
}
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
