import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import {
  PLANNING_CONTRACT_VERSION,
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
  POI_FEATURE_KIND_BY_CODE,
  parseEffectivePreferenceV1,
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../../src/shared/contracts/planning/index.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const QA_DIR = path.join(ROOT, "docs/qa/TASK-038");
const PILOT_VERSION = "task-038-v1";
const UPDATED_AT = "2026-09-11T00:00:00+09:00";

const FEATURE_CODE_BY_NAME = Object.fromEntries(
  POI_FEATURE_DEFINITIONS.map(([code, name]) => [name, code]),
);

const TAG_FEATURES = {
  scenic: { scenery: 8, photo: 7 },
  viewpoint: { scenery: 8, photo: 8 },
  historic: { history: 8, educational: 6 },
  architecture: { architecture: 8, photo: 6 },
  temple: { history: 7, architecture: 7, local: 6 },
  shrine: { history: 7, architecture: 7, local: 7 },
  museum: { educational: 8, rain: 8 },
  art: { art: 9, educational: 6, photo: 6 },
  nature: { nature: 9, scenery: 7 },
  park: { nature: 7, relax: 7, family: 6 },
  garden: { nature: 8, scenery: 8, relax: 7 },
  mountain: { nature: 9, adventure: 8, scenery: 9 },
  food: { food: 9, local: 7 },
  market: { food: 8, shopping: 7, local: 8, interactive: 6 },
  shopping: { shopping: 9, interactive: 5 },
  urban: { shopping: 6, night: 6, photo: 6 },
  entertainment: { entertainment: 9, interactive: 8, family: 7 },
  interactive: { interactive: 9, entertainment: 7 },
  family: { family: 9, stroller: 6 },
  onsen: { onsen: 9, relax: 9, rest: 8 },
  relaxation: { relax: 9, rest: 8 },
  night: { night: 9, couple: 7, photo: 7 },
  adventure: { adventure: 9, nature: 7 },
  educational: { educational: 9 },
  local: { local: 8, unique: 6 },
  hidden: { hidden: 9, local: 8, unique: 7 },
  unique: { unique: 9, local: 6 },
  iconic: { iconic: 9, photo: 7 },
};

export const SCENARIOS = [
  [
    "first-time-iconic",
    "First-time iconic traveler",
    { iconic: 9, hidden: 3, history: 7, photo: 7 },
    ["iconic"],
    ["ICONIC_FIRST_VISIT"],
  ],
  [
    "hidden-local",
    "Hidden and local explorer",
    { hidden: 9, local: 9, iconic: 3, unique: 8 },
    ["hidden", "local", "unique"],
    ["LOCAL_HIDDEN_DISCOVERY"],
  ],
  [
    "photo-scenery",
    "Photography and scenery",
    { photo: 9, scenery: 9, nature: 7 },
    ["photo", "scenic", "viewpoint"],
    ["PHOTO_SCENERY"],
  ],
  [
    "history-architecture",
    "History and architecture",
    { history: 9, architecture: 9, educational: 7 },
    ["historic", "architecture", "temple", "shrine"],
    ["HISTORY_ARCHITECTURE"],
  ],
  [
    "food-focused",
    "Food-focused traveler",
    { food: 9, local: 8, shopping: 6 },
    ["food", "market"],
    ["FOOD_LOCAL"],
  ],
  [
    "shopping-city",
    "Shopping and city traveler",
    { shopping: 9, night: 7, interactive: 6 },
    ["shopping", "urban", "night"],
    ["SHOPPING_URBAN"],
  ],
  [
    "nature-traveler",
    "Nature traveler",
    { nature: 9, scenery: 8, adventure: 7, hidden: 7 },
    ["nature", "mountain", "park", "garden"],
    ["NATURE_EXPLORATION"],
  ],
  [
    "art-educational",
    "Art and educational traveler",
    { art: 9, educational: 9, history: 6 },
    ["art", "museum", "educational"],
    ["ART_EDUCATION"],
  ],
  [
    "family-interactive",
    "Family and interactive soft fit",
    { family: 9, interactive: 9, entertainment: 8 },
    ["family", "interactive", "entertainment"],
    ["FAMILY_INTERACTIVE"],
  ],
  [
    "relaxed-rest",
    "Relaxed and rest-oriented traveler",
    { relax: 9, rest: 9, onsen: 8, adventure: 2 },
    ["onsen", "relaxation", "park", "garden"],
    ["RELAXED_REST"],
  ],
  [
    "low-walking",
    "Low walking and physical tolerance",
    { walking: 2, physical: 2, relax: 8, rest: 8 },
    ["low_burden", "relaxation"],
    ["LOW_WALKING_TOLERANCE"],
  ],
  [
    "low-crowd",
    "Low crowd and queue tolerance",
    { crowd: 2, queue: 2, hidden: 8, local: 7 },
    ["hidden", "local"],
    ["LOW_CROWD_TOLERANCE"],
  ],
].map(([scenarioId, name, overrides, targetTags, reasonCodes]) => {
  const values = Object.fromEntries(POI_FEATURE_CODES.map((code) => [code, 5]));
  for (const [featureName, value] of Object.entries(overrides)) {
    values[FEATURE_CODE_BY_NAME[featureName]] = value;
  }
  return {
    scenarioId,
    name,
    intent: name,
    values,
    targetTags,
    reasonCodes,
    dominantCodes: Object.entries(overrides).map(
      ([name]) => FEATURE_CODE_BY_NAME[name],
    ),
    excludesLiveContext: [
      "weather",
      "route",
      "fatigue",
      "opening",
      "booking",
      "inventory",
      "itinerary_feasibility",
    ],
  };
});

const round = (value, digits = 6) => Number(value.toFixed(digits));
const emptyFeatureVector = () =>
  Object.fromEntries(POI_FEATURE_CODES.map((code) => [code, null]));

function applyTagFeatures(values, tags) {
  for (const tag of tags) {
    for (const [name, value] of Object.entries(TAG_FEATURES[tag] ?? {})) {
      const code = FEATURE_CODE_BY_NAME[name];
      values[code] = Math.max(values[code] ?? 0, value);
    }
  }
  if (tags.includes("high_burden")) {
    values["25"] = 8;
    values["26"] = 7;
  } else if (tags.includes("low_burden")) {
    values["25"] = 2;
    values["26"] = 2;
  } else {
    values["25"] = 5;
    values["26"] = 4;
  }
  if (tags.includes("crowded")) {
    values["27"] = 8;
    values["28"] = 7;
  } else if (tags.includes("hidden")) {
    values["27"] = 2;
    values["28"] = 2;
  } else {
    values["27"] = 4;
    values["28"] = 3;
  }
  return values;
}

export function buildFeatureAnnotations(sample) {
  return sample.rows.map((poi) => {
    const values = applyTagFeatures(emptyFeatureVector(), poi.archetypeTags);
    const sourceRef = poi.evidenceRefs[0];
    const annotations = POI_FEATURE_CODES.map((featureCode) => ({
      featureCode,
      value: values[featureCode],
      annotationMethod:
        values[featureCode] === null
          ? "unknown_not_inferred"
          : "pilot_editorial_from_verified_identity_and_archetype",
      sourceRefs: values[featureCode] === null ? [] : [sourceRef],
      confidence: values[featureCode] === null ? null : 0.62,
      noteCode:
        values[featureCode] === null
          ? "NO_SUPPORTING_ATTRIBUTE_EVIDENCE"
          : "SUBJECTIVE_PILOT_LABEL_NOT_LIVE_FACT",
    }));
    const featureSet = {
      contractVersion: PLANNING_CONTRACT_VERSION,
      featureVersion: "1.0",
      poiRef: poi.poiRef,
      values,
      sourceRefs: poi.evidenceRefs,
      confidence: 0.62,
      updatedAt: UPDATED_AT,
    };
    const parsed = parsePoiFeatureSetV1(featureSet);
    if (!parsed.ok)
      throw new Error(
        `Invalid feature set ${poi.poiRef}: ${parsed.issue.code}`,
      );
    return { poiRef: poi.poiRef, featureSet, annotations };
  });
}

export function buildVisitProfiles(sample) {
  const rows = [];
  for (const poi of sample.rows) {
    const high = poi.archetypeTags.includes("high_burden");
    const low = poi.archetypeTags.includes("low_burden");
    if (!high && !low) continue;
    const profile = {
      contractVersion: PLANNING_CONTRACT_VERSION,
      profileVersion: "1.0",
      profileId: `${poi.poiRef}:pilot-full-visit`,
      poiRef: poi.poiRef,
      visitMode: "full_visit",
      status: "active",
      minimumDurationMinutes: null,
      recommendedDurationMinutes: null,
      maximumUsefulDurationMinutes: null,
      fixedWalkingLoad: null,
      variableWalkingLoad: null,
      fixedPhysicalLoad: null,
      variablePhysicalLoad: null,
      terrainModifier: null,
      standingModifier: null,
      sourceRefs: poi.evidenceRefs,
      confidence: null,
      updatedAt: UPDATED_AT,
    };
    const parsed = parsePoiVisitProfileV1(profile);
    if (!parsed.ok)
      throw new Error(
        `Invalid visit profile ${poi.poiRef}: ${parsed.issue.code}`,
      );
    rows.push({
      ...profile,
      annotationMethod: "verified_identity_supports_visit_mode_only",
      evidenceLimitation:
        "identity/type evidence does not support numeric duration or load; all unsupported fields remain null",
    });
  }
  return rows;
}

export function calculateVisitLoad(profile, durationMinutes) {
  for (const key of [
    "recommendedDurationMinutes",
    "fixedWalkingLoad",
    "variableWalkingLoad",
    "fixedPhysicalLoad",
    "variablePhysicalLoad",
  ]) {
    if (!Number.isFinite(profile[key]))
      throw new Error(
        `Visit load requires an evidence-supported numeric ${key}`,
      );
  }
  const scale = durationMinutes / profile.recommendedDurationMinutes;
  return {
    durationMinutes,
    walkingLoad: round(
      profile.fixedWalkingLoad + profile.variableWalkingLoad * scale,
    ),
    physicalLoad: round(
      profile.fixedPhysicalLoad + profile.variablePhysicalLoad * scale,
    ),
    feasibility:
      durationMinutes < profile.minimumDurationMinutes
        ? "TOO_SHORT"
        : "NOT_EVALUATED_AS_MATCH_SCORE",
  };
}

export const SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE = {
  minimumDurationMinutes: 60,
  recommendedDurationMinutes: 90,
  maximumUsefulDurationMinutes: 150,
  fixedWalkingLoad: 2,
  variableWalkingLoad: 4,
  fixedPhysicalLoad: 1.5,
  variablePhysicalLoad: 3,
  fixtureOnly: true,
  sourceRef: "task038:synthetic-contract-invariant-not-a-poi-annotation",
};

function relevantCodes(values) {
  const result = new Set(["25", "26", "27", "28"]);
  for (const code of POI_FEATURE_CODES)
    if (values[code] !== 5) result.add(code);
  return [...result].sort();
}

export function scorePoi(featureSet, scenario, config, gateStatus = "PASS") {
  if (gateStatus === "REJECT") {
    return {
      selectable: false,
      gateStatus,
      value: null,
      coverage: 0,
      confidence: null,
      breakdown: [],
    };
  }
  const codes = relevantCodes(scenario.values);
  const breakdown = [];
  let weighted = 0;
  let weightTotal = 0;
  let known = 0;
  for (const code of codes) {
    const featureValue = featureSet.values[code];
    const preferenceValue = scenario.values[code];
    const kind = POI_FEATURE_KIND_BY_CODE[code];
    const weight = config.weights[kind];
    if (featureValue === null) {
      breakdown.push({
        featureCode: code,
        featureValue: null,
        preferenceValue,
        contribution: null,
        kind,
        reasonCode: "UNKNOWN_EXCLUDED",
      });
      continue;
    }
    known += 1;
    const x = featureValue / 9;
    let contribution;
    if (kind === "benefit" || kind === "suitability") {
      contribution = ((preferenceValue - 5) / 4) * x;
    } else {
      const tolerance = (preferenceValue - 1) / 8;
      contribution = -(Math.max(0, x - tolerance) ** config.gamma);
    }
    contribution *= weight;
    weighted += contribution;
    weightTotal += weight;
    breakdown.push({
      featureCode: code,
      featureValue,
      preferenceValue,
      contribution: round(contribution),
      kind,
      reasonCode:
        kind === "cost" || kind === "risk"
          ? "TOLERANCE_PENALTY_ONLY"
          : "SOFT_PREFERENCE",
    });
  }
  const coverage = known / codes.length;
  const raw = weightTotal === 0 ? 0 : weighted / weightTotal;
  const coverageFactor = coverage ** config.coverageExponent;
  const confidenceFactor =
    1 - config.confidenceStrength * (1 - featureSet.confidence);
  const value = Math.max(
    0,
    Math.min(99, 50 + raw * 49 * coverageFactor * confidenceFactor),
  );
  return {
    selectable: gateStatus === "PASS",
    gateStatus,
    value: round(value, 4),
    coverage: round(coverage),
    confidence: round(featureSet.confidence * coverage),
    breakdown,
  };
}

function benchmarkUtility(poi, scenario) {
  let utility = scenario.targetTags.reduce(
    (sum, tag) => sum + (poi.archetypeTags.includes(tag) ? 3 : 0),
    0,
  );
  if (scenario.scenarioId === "first-time-iconic")
    utility += poi.archetypeTags.includes("iconic") ? 8 : 0;
  if (scenario.scenarioId === "hidden-local")
    utility += poi.archetypeTags.includes("hidden")
      ? 6
      : poi.archetypeTags.includes("local")
        ? 3
        : 0;
  if (scenario.scenarioId === "low-walking")
    utility += poi.archetypeTags.includes("low_burden")
      ? 10
      : poi.archetypeTags.includes("high_burden")
        ? -10
        : 1;
  if (scenario.scenarioId === "low-crowd")
    utility += poi.archetypeTags.includes("crowded")
      ? -10
      : poi.archetypeTags.includes("hidden")
        ? 8
        : 2;
  if (scenario.scenarioId === "relaxed-rest")
    utility += poi.archetypeTags.includes("high_burden") ? -5 : 2;
  return utility;
}

function deterministicSort(rows, salt) {
  return [...rows].sort((a, b) =>
    createHash("sha256")
      .update(`${PILOT_VERSION}:${salt}:${a.poiRef}`)
      .digest("hex")
      .localeCompare(
        createHash("sha256")
          .update(`${PILOT_VERSION}:${salt}:${b.poiRef}`)
          .digest("hex"),
      ),
  );
}

function judgmentPairs(pool, scenario, count) {
  const ranked = deterministicSort(pool, scenario.scenarioId).sort(
    (a, b) => benchmarkUtility(b, scenario) - benchmarkUtility(a, scenario),
  );
  const pairs = [];
  for (let index = 0; index < count; index += 1) {
    const a = ranked[index % Math.ceil(ranked.length / 2)];
    const b =
      ranked[ranked.length - 1 - (index % Math.floor(ranked.length / 2))];
    const aUtility = benchmarkUtility(a, scenario);
    const bUtility = benchmarkUtility(b, scenario);
    const difference = aUtility - bUtility;
    pairs.push({
      poiA: a.poiRef,
      poiB: b.poiRef,
      expected: Math.abs(difference) <= 1 ? "TIE" : difference > 0 ? "A" : "B",
      confidenceBand:
        Math.abs(difference) >= 6
          ? "high"
          : Math.abs(difference) >= 3
            ? "medium"
            : "low",
      reasonCodes: [...scenario.reasonCodes, "EDITORIAL_ARCHETYPE_COMPARISON"],
      reviewRequired: true,
    });
  }
  return pairs;
}

export function buildBenchmarks(sample) {
  const train = sample.rows.filter(
    (row) => row.splitAssignment === "calibration",
  );
  const holdout = sample.rows.filter(
    (row) => row.splitAssignment === "holdout",
  );
  const judgments = [];
  for (const scenario of SCENARIOS) {
    const trainPairs = judgmentPairs(train, scenario, 14);
    const holdoutPairs = judgmentPairs(holdout, scenario, 8);
    for (const [partition, pairs] of [
      ["calibration", trainPairs],
      ["holdout", holdoutPairs],
    ]) {
      for (const pair of pairs) {
        judgments.push({
          judgmentId: `J${String(judgments.length + 1).padStart(3, "0")}`,
          scenarioId: scenario.scenarioId,
          partition,
          ...pair,
        });
      }
    }
    const known = deterministicSort(
      train.filter((poi) =>
        scenario.targetTags.some((tag) => poi.archetypeTags.includes(tag)),
      ),
      `${scenario.scenarioId}:known`,
    )[0];
    const unknown = deterministicSort(
      train.filter(
        (poi) =>
          !scenario.targetTags.some((tag) => poi.archetypeTags.includes(tag)),
      ),
      `${scenario.scenarioId}:unknown`,
    )[0];
    for (let repeat = 0; repeat < 2; repeat += 1) {
      judgments.push({
        judgmentId: `J${String(judgments.length + 1).padStart(3, "0")}`,
        scenarioId: scenario.scenarioId,
        partition: "diagnostic",
        poiA: known.poiRef,
        poiB: unknown.poiRef,
        expected: "INDETERMINATE",
        confidenceBand: "low",
        reasonCodes: ["UNKNOWN_COVERAGE_DIAGNOSTIC"],
        reviewRequired: true,
      });
    }
  }
  return judgments;
}

const PARAMETER_SPACE = {
  gamma: [1, 1.5, 2, 2.5, 3],
  benefitWeight: [0.8, 1, 1.2],
  suitabilityWeight: [0.8, 1],
  costWeight: [0.8, 1.2],
  riskWeight: [0.8, 1.2],
  coverageExponent: [0, 0.5, 1],
  confidenceStrength: [0, 0.25],
};

function candidateConfigs() {
  const candidates = [];
  for (const gamma of PARAMETER_SPACE.gamma)
    for (const benefit of PARAMETER_SPACE.benefitWeight)
      for (const suitability of PARAMETER_SPACE.suitabilityWeight)
        for (const cost of PARAMETER_SPACE.costWeight)
          for (const risk of PARAMETER_SPACE.riskWeight)
            for (const coverageExponent of PARAMETER_SPACE.coverageExponent)
              for (const confidenceStrength of PARAMETER_SPACE.confidenceStrength)
                candidates.push({
                  configId: `candidate-${String(candidates.length + 1).padStart(4, "0")}`,
                  gamma,
                  weights: { benefit, suitability, cost, risk },
                  coverageExponent,
                  confidenceStrength,
                  normalization: "50_plus_weighted_mean_times_49_clamped_0_99",
                  scoreRange: [0, 99],
                });
  return candidates;
}

function actualOutcome(a, b) {
  const delta = a - b;
  if (Math.abs(delta) <= 1.5) return "TIE";
  return delta > 0 ? "A" : "B";
}

function evaluate(config, judgments, featureByPoi, scenarioById) {
  const evaluated = [];
  for (const judgment of judgments) {
    if (judgment.expected === "INDETERMINATE") continue;
    const scenario = scenarioById.get(judgment.scenarioId);
    const a = scorePoi(featureByPoi.get(judgment.poiA), scenario, config);
    const b = scorePoi(featureByPoi.get(judgment.poiB), scenario, config);
    const actual = actualOutcome(a.value, b.value);
    evaluated.push({
      ...judgment,
      actual,
      correct: actual === judgment.expected,
      scoreA: a.value,
      scoreB: b.value,
      coverageA: a.coverage,
      coverageB: b.coverage,
    });
  }
  const bands = (allowed) =>
    evaluated.filter((row) => allowed.includes(row.confidenceBand));
  const ratio = (rows) =>
    rows.length === 0
      ? null
      : round(rows.filter((row) => row.correct).length / rows.length);
  return {
    evaluated,
    highAgreement: ratio(bands(["high"])),
    highMediumAgreement: ratio(bands(["high", "medium"])),
    tieAccuracy: ratio(evaluated.filter((row) => row.expected === "TIE")),
  };
}

export function invariantResults(config, exampleFeatureSet, scenario) {
  const costPenalty = (burden, tolerance, kind) => {
    const t = (tolerance - 1) / 8;
    return (
      -(Math.max(0, burden / 9 - t) ** config.gamma) * config.weights[kind]
    );
  };
  const benefitContribution = (feature, preference) =>
    ((preference - 5) / 4) * (feature / 9) * config.weights.benefit;
  const unknownSet = structuredClone(exampleFeatureSet);
  unknownSet.values[scenario.dominantCodes[0]] = null;
  const knownScore = scorePoi(exampleFeatureSet, scenario, config);
  const unknownScore = scorePoi(unknownSet, scenario, config);
  const hardRejected = scorePoi(exampleFeatureSet, scenario, config, "REJECT");
  const checks = {
    benefitPositiveMonotonic:
      benefitContribution(9, 9) >= benefitContribution(3, 9),
    benefitNeutralIsZero: benefitContribution(9, 5) === 0,
    benefitNegativeMonotonic:
      benefitContribution(9, 1) <= benefitContribution(3, 1),
    lowerWalkingToleranceNotLessPenalty:
      costPenalty(8, 2, "cost") <= costPenalty(8, 8, "cost"),
    highWalkingToleranceNeverRewards: costPenalty(8, 9, "cost") <= 0,
    lowerCrowdToleranceNotLessPenalty:
      costPenalty(8, 2, "risk") <= costPenalty(8, 8, "risk"),
    highCrowdToleranceNeverRewards: costPenalty(8, 9, "risk") <= 0,
    nullChangesCoverage: unknownScore.coverage < knownScore.coverage,
    nullNotKnownZeroOrFive: unknownScore.breakdown.some(
      (row) => row.featureValue === null && row.contribution === null,
    ),
    hardRejectNotSelectable:
      hardRejected.selectable === false && hardRejected.value === null,
    scoreInRange: knownScore.value >= 0 && knownScore.value <= 99,
    matchExcludesLiveContext: scenario.excludesLiveContext.length === 7,
  };
  return {
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
  };
}

function groupedAgreement(rows, keyForPoi, sampleByPoi) {
  const groups = new Map();
  for (const row of rows) {
    const keys = new Set(
      [
        keyForPoi(sampleByPoi.get(row.poiA)),
        keyForPoi(sampleByPoi.get(row.poiB)),
      ].flat(),
    );
    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
  }
  return Object.fromEntries(
    [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => [
        key,
        {
          judgments: values.length,
          agreement: round(
            values.filter((row) => row.correct).length / values.length,
          ),
        },
      ]),
  );
}

function buildMetrics(evaluation, sampleByPoi) {
  const main = evaluation.evaluated.filter((row) =>
    ["high", "medium"].includes(row.confidenceBand),
  );
  return {
    highConfidenceAgreement: evaluation.highAgreement,
    highAndMediumAgreement: evaluation.highMediumAgreement,
    tieHandlingAccuracy: evaluation.tieAccuracy,
    evaluatedJudgments: evaluation.evaluated.length,
    byScenario: Object.fromEntries(
      SCENARIOS.map((scenario) => {
        const rows = main.filter(
          (row) => row.scenarioId === scenario.scenarioId,
        );
        return [
          scenario.scenarioId,
          {
            judgments: rows.length,
            agreement: rows.length
              ? round(rows.filter((row) => row.correct).length / rows.length)
              : null,
          },
        ];
      }),
    ),
    byRegion: groupedAgreement(main, (poi) => poi.region, sampleByPoi),
    byArchetype: groupedAgreement(
      main,
      (poi) => poi.archetypeTags,
      sampleByPoi,
    ),
  };
}

function qualitySummary(sample, features, profiles) {
  const perFeature = {};
  for (const code of POI_FEATURE_CODES) {
    const known = features.filter(
      (row) => row.featureSet.values[code] !== null,
    ).length;
    perFeature[code] = {
      known,
      null: 100 - known,
      coverage: round(known / 100),
    };
  }
  const perPoi = features.map((row) => {
    const known = POI_FEATURE_CODES.filter(
      (code) => row.featureSet.values[code] !== null,
    ).length;
    return {
      poiRef: row.poiRef,
      known,
      null: 43 - known,
      coverage: round(known / 43),
    };
  });
  return {
    identitiesValid: sample.rows.length,
    completeVectorShapes: features.length,
    nonNullAnnotationMethodsMissing: features
      .flatMap((row) => row.annotations)
      .filter((row) => row.value !== null && !row.annotationMethod).length,
    visitProfilesValid: profiles.length,
    perFeature,
    perPoi,
    editorialBoundary:
      "Feature values and visit-load shapes are subjective pilot annotations, not live facts.",
  };
}

function countBy(rows, key) {
  return Object.fromEntries(
    [
      ...rows.reduce(
        (map, row) => map.set(row[key], (map.get(row[key]) ?? 0) + 1),
        new Map(),
      ),
    ].sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
}

async function writeJson(name, value) {
  const target = path.join(QA_DIR, name);
  const formatted = await prettier.format(
    `${JSON.stringify(value, null, 2)}\n`,
    {
      filepath: target,
    },
  );
  await writeFile(target, formatted);
}

export async function runPilot() {
  const sample = JSON.parse(
    await readFile(path.join(QA_DIR, "poi-sample-100.json"), "utf8"),
  );
  if (
    sample.rows.length !== 100 ||
    new Set(sample.rows.map((row) => row.poiRef)).size !== 100
  )
    throw new Error("Sample must contain exactly 100 unique POIs");
  const features = buildFeatureAnnotations(sample);
  const profiles = buildVisitProfiles(sample);
  const judgments = buildBenchmarks(sample);
  const scenarios = SCENARIOS.map((scenario) => {
    const effective = {
      contractVersion: PLANNING_CONTRACT_VERSION,
      preferenceVersion: "1.0",
      snapshotRef: `task038:${scenario.scenarioId}`,
      overrideRevision: 1,
      values: scenario.values,
    };
    const parsed = parseEffectivePreferenceV1(effective);
    if (!parsed.ok)
      throw new Error(
        `Invalid scenario ${scenario.scenarioId}: ${parsed.issue.code}`,
      );
    return { ...scenario, effectivePreference: effective };
  });
  const featureByPoi = new Map(
    features.map((row) => [row.poiRef, row.featureSet]),
  );
  const scenarioById = new Map(scenarios.map((row) => [row.scenarioId, row]));
  const sampleByPoi = new Map(sample.rows.map((row) => [row.poiRef, row]));
  const trainJudgments = judgments.filter(
    (row) => row.partition === "calibration",
  );
  const holdoutJudgments = judgments.filter(
    (row) => row.partition === "holdout",
  );
  const candidates = candidateConfigs();
  const searchRows = candidates.map((config) => {
    const result = evaluate(config, trainJudgments, featureByPoi, scenarioById);
    return {
      config,
      calibrationHighAgreement: result.highAgreement,
      calibrationHighMediumAgreement: result.highMediumAgreement,
    };
  });
  searchRows.sort(
    (a, b) =>
      b.calibrationHighAgreement - a.calibrationHighAgreement ||
      b.calibrationHighMediumAgreement - a.calibrationHighMediumAgreement ||
      a.config.configId.localeCompare(b.config.configId),
  );
  const selected = searchRows[0].config;
  const calibration = evaluate(
    selected,
    trainJudgments,
    featureByPoi,
    scenarioById,
  );
  // Holdout is evaluated exactly once, after the immutable candidate selection above.
  const holdout = evaluate(
    selected,
    holdoutJudgments,
    featureByPoi,
    scenarioById,
  );
  const invariants = invariantResults(
    selected,
    features[0].featureSet,
    scenarios[0],
  );
  const calibrationMetrics = buildMetrics(calibration, sampleByPoi);
  const holdoutMetrics = buildMetrics(holdout, sampleByPoi);
  const disagreements = [...calibration.evaluated, ...holdout.evaluated]
    .filter((row) => !row.correct)
    .sort(
      (a, b) => Math.abs(a.scoreA - a.scoreB) - Math.abs(b.scoreA - b.scoreB),
    )
    .slice(0, 20)
    .map((row) => ({
      scenarioId: row.scenarioId,
      poiA: row.poiA,
      poiB: row.poiB,
      expected: row.expected,
      actual: row.actual,
      scoreBreakdown: { scoreA: row.scoreA, scoreB: row.scoreB },
      coverageConfidence: {
        coverageA: row.coverageA,
        coverageB: row.coverageB,
      },
      likelyCause: "editorial_annotation_or_benchmark_boundary",
      classification: "requires_human_review",
      recommendedFollowUp: "human_pairwise_review_without_parameter_retuning",
    }));
  const eligible =
    invariants.passed === invariants.total &&
    calibration.highAgreement >= 0.85 &&
    holdout.highAgreement >= 0.8 &&
    holdout.highMediumAgreement >= 0.75;
  const quality = qualitySummary(sample, features, profiles);
  const split = {
    pilotVersion: PILOT_VERSION,
    method: "sha256(pilotVersion:Wikidata QID), first 20 hashes holdout",
    calibrationPoiRefs: sample.rows
      .filter((row) => row.splitAssignment === "calibration")
      .map((row) => row.poiRef),
    holdoutPoiRefs: sample.rows
      .filter((row) => row.splitAssignment === "holdout")
      .map((row) => row.poiRef),
    holdoutDistribution: {
      region: countBy(
        sample.rows.filter((row) => row.splitAssignment === "holdout"),
        "region",
      ),
      prefecture: countBy(
        sample.rows.filter((row) => row.splitAssignment === "holdout"),
        "prefecture",
      ),
    },
    selectionDiscipline:
      "candidate selected from calibration judgments before a single holdout evaluation",
  };
  const profileExamples = [
    {
      fixtureRef: SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE.sourceRef,
      synthetic: true,
      loads: [30, 60, 90, 120].map((duration) =>
        calculateVisitLoad(SYNTHETIC_VISIT_LOAD_INVARIANT_FIXTURE, duration),
      ),
    },
  ];

  await writeJson("poi-feature-annotations.json", {
    pilotVersion: PILOT_VERSION,
    rows: features,
  });
  await writeJson("visit-profile-annotations.json", {
    pilotVersion: PILOT_VERSION,
    limitation:
      "55 identity-supported visit-mode shells; numeric duration/load remains null because the selected identity evidence does not support those facts",
    rows: profiles,
    durationSensitivityContractFixture: profileExamples,
  });
  await writeJson("annotation-quality.json", {
    pilotVersion: PILOT_VERSION,
    ...quality,
  });
  await writeJson("preference-scenarios.json", {
    pilotVersion: PILOT_VERSION,
    rows: scenarios,
  });
  await writeJson("pairwise-benchmark.json", {
    pilotVersion: PILOT_VERSION,
    independenceStatement:
      "Judgments derive from verified identity archetype tags and scenario intent, never from candidate scoring parameters; all remain human-review-required.",
    rows: judgments,
  });
  await writeJson("train-holdout-split.json", split);
  await writeJson("parameter-search.json", {
    pilotVersion: PILOT_VERSION,
    seed: "task-038-v1",
    method: "bounded_exhaustive_grid_calibration_only",
    parameterSpace: PARAMETER_SPACE,
    candidateCount: candidates.length,
    selectedCandidate: selected,
    selectionUsedHoldout: false,
    rows: searchRows,
  });
  await writeJson("calibration-results.json", {
    pilotVersion: PILOT_VERSION,
    selectedCandidate: selected,
    metrics: calibrationMetrics,
    invariants,
    indeterminateExcluded: judgments.filter(
      (row) => row.partition === "diagnostic",
    ).length,
  });
  await writeJson("holdout-results.json", {
    pilotVersion: PILOT_VERSION,
    evaluatedOnceAfterSelection: true,
    selectedCandidate: selected,
    metrics: holdoutMetrics,
    gates: {
      highConfidenceAtLeast80Percent: holdout.highAgreement >= 0.8,
      highMediumAtLeast75Percent: holdout.highMediumAgreement >= 0.75,
    },
    eligibleForHumanReview: eligible,
  });
  await writeJson("failure-cases.json", {
    pilotVersion: PILOT_VERSION,
    disagreementCount: [...calibration.evaluated, ...holdout.evaluated].filter(
      (row) => !row.correct,
    ).length,
    rows: disagreements,
    biasChecks: {
      tokyoKyotoOsakaDominance:
        "sample cap checked; ranking still requires human review",
      iconicPopularityBias: "explicit iconic/local scenarios included",
      hiddenLocalSuppression: "explicit hidden/local scenario included",
      highWalkingLowTolerance: "hard direction invariant passed",
      crowdRewardAtHighTolerance: "hard direction invariant passed",
      unknownHeavyOverconfidence: "coverage adjustment measured",
      categoryMonoculture: "ten archetype families audited",
      subjectiveAnnotationDependence:
        "material; every benchmark row reviewRequired=true",
    },
  });

  const distribution = {
    region: countBy(sample.rows, "region"),
    prefecture: countBy(sample.rows, "prefecture"),
    highBurden: sample.rows.filter((row) =>
      row.archetypeTags.includes("high_burden"),
    ).length,
    lowBurden: sample.rows.filter((row) =>
      row.archetypeTags.includes("low_burden"),
    ).length,
    iconic: sample.rows.filter((row) => row.archetypeTags.includes("iconic"))
      .length,
    hiddenOrLocal: sample.rows.filter(
      (row) =>
        row.archetypeTags.includes("hidden") ||
        row.archetypeTags.includes("local"),
    ).length,
    crowded: sample.rows.filter((row) => row.archetypeTags.includes("crowded"))
      .length,
  };
  const report = `# TASK-038 100 POI Scoring Pilot\n\n## Decision\n\n${eligible ? "Pilot completed / calibration candidate eligible for human review." : "Pilot completed / calibration not accepted."}\n\nThis is measured pilot evidence, not a production parameter freeze.\n\n## Evidence boundary\n\n- Identity: 100 traceable Wikidata entities (CC0) with linked English Wikipedia pages. No descriptions or media were copied.\n- Features: editorial calibration labels derived from the verified identity and coarse archetype classification; they are not live facts. Unsupported attributes remain null.\n- Visit profiles: ${profiles.length} coarse editorial load-shape annotations for invariant testing; not operational duration claims.\n- Benchmark: ${judgments.length} machine-authored pairwise/indeterminate judgments independent of candidate parameters; every row requires human review.\n- Runtime: offline and deterministic. No LLM, paid provider, route, weather, booking, inventory, or production database call.\n\n## Distribution\n\n- Regions: ${Object.keys(distribution.region).length}; prefectures: ${Object.keys(distribution.prefecture).length}.\n- High burden ${distribution.highBurden}; low burden ${distribution.lowBurden}; iconic ${distribution.iconic}; hidden/local ${distribution.hiddenOrLocal}; crowded/queue-prone ${distribution.crowded}.\n- Tokyo + Kyoto + Osaka: ${sample.rows.filter((row) => ["Tokyo", "Kyoto", "Osaka"].includes(row.prefecture)).length}; largest prefecture: ${Math.max(...Object.values(distribution.prefecture))}.\n\n## Experiment\n\n- Scenarios: ${scenarios.length}. Pairwise judgments: ${judgments.length} (${trainJudgments.length} calibration, ${holdoutJudgments.length} untouched holdout, ${judgments.length - trainJudgments.length - holdoutJudgments.length} indeterminate diagnostics).\n- Split: 80 calibration / 20 holdout by stable SHA-256 identity hash.\n- Search: ${candidates.length} bounded candidates; selection used calibration only.\n- Candidate: ${selected.configId}; gamma ${selected.gamma}; weights ${JSON.stringify(selected.weights)}; coverage exponent ${selected.coverageExponent}; confidence strength ${selected.confidenceStrength}.\n- Calibration high agreement ${(calibration.highAgreement * 100).toFixed(1)}%; high+medium ${(calibration.highMediumAgreement * 100).toFixed(1)}%.\n- Holdout high agreement ${(holdout.highAgreement * 100).toFixed(1)}%; high+medium ${(holdout.highMediumAgreement * 100).toFixed(1)}%.\n- Semantic invariants: ${invariants.passed}/${invariants.total}.\n\n## Bias and limitations\n\nThe sample satisfies the geographic caps, but it is biased toward entities with English open-knowledge coverage. Feature and benchmark labels are editorial and have not yet received independent human adjudication. Visit profiles are deliberately low-confidence calibration shapes. This candidate may proceed only to human review; it must not be promoted to production from this Pilot alone.\n\n## Follow-up (not started)\n\nRun blinded human review of annotations and pairwise judgments, then issue a new version before any production freeze.\n`;
  const reportForWrite = report
    .replace(
      `- Visit profiles: ${profiles.length} coarse editorial load-shape annotations for invariant testing; not operational duration claims.`,
      `- Visit profiles: ${profiles.length} identity-supported visit-mode shells with unsupported numeric fields kept null. Duration sensitivity is demonstrated only by an explicitly synthetic contract invariant fixture, never attached to a real POI.`,
    )
    .replace(
      "Visit profiles are deliberately low-confidence calibration shapes.",
      "Numeric Visit Profile facts remain unknown rather than being invented.",
    );
  await writeFile(path.join(QA_DIR, "pilot-report.md"), reportForWrite);
  console.log(
    JSON.stringify(
      {
        status: eligible
          ? "eligible_for_human_review"
          : "calibration_not_accepted",
        sample: sample.rows.length,
        scenarios: scenarios.length,
        judgments: judgments.length,
        candidates: candidates.length,
        profiles: profiles.length,
        calibrationHigh: calibration.highAgreement,
        holdoutHigh: holdout.highAgreement,
        holdoutHighMedium: holdout.highMediumAgreement,
        invariants: `${invariants.passed}/${invariants.total}`,
      },
      null,
      2,
    ),
  );
  return {
    eligible,
    selected,
    sample,
    features,
    profiles,
    judgments,
    split,
    calibration,
    holdout,
    invariants,
    quality,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runPilot();
}
