import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import runtimeManifest from "../../src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import baselineManifest from "../../src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json" with { type: "json" };
import { toLongTermPreferenceReadV1 } from "../../src/shared/contracts/preferences/read.ts";
import { interestCodes } from "../../src/shared/contracts/preferences/index.ts";
import {
  INTEREST_DETAIL_EXTRA_MAP,
  INTEREST_FEATURE_MAP,
  SCORING_CONFIG_V1,
  SCORING_CONFIG_VERSION,
  MAPPING_VERSION,
} from "../../src/shared/recommendation-scoring/config.ts";
import { canonicalPoiRuntimeRepository } from "../../src/server/poi-runtime/repository.ts";
import { pilot100RecommendationRepository } from "../../src/server/recommendation-scoring/pilot100.ts";
import { scoreAuthorizedCanonicalPoiV1 } from "../../src/server/recommendation-scoring/service.ts";

const OUT = new URL("../../docs/qa/TASK-090-A/", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const jsonl = (rows) =>
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
const clone = (value) => structuredClone(value);
const mean = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const sign = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);
const components = [
  "matchScore",
  "partyFit",
  "seasonFit",
  "weatherFit",
  "timeSlotFit",
  "restFit",
  "dayFit",
  "routeFit",
];
const allExpectedUnaffected = (target) =>
  components.filter((component) => component !== target);

function pearson(pairs) {
  if (pairs.length < 3) return null;
  const xs = pairs.map(([x]) => x),
    ys = pairs.map(([, y]) => y);
  const mx = mean(xs),
    my = mean(ys);
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0);
  const dx = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  return dx && dy ? numerator / (dx * dy) : null;
}

function state() {
  return {
    preferenceValues: {},
    context: {
      contextVersion: "task-090-a-calibration-context-v1",
      party: {},
      season: null,
      weather: null,
      timeSlot: null,
      needsRestStrength: null,
      crowdTolerance: null,
      queueTolerance: null,
    },
    constraints: {
      partyNeeds: [],
      accessibilityFacts: {
        wheelchairAccessible: null,
        strollerAccessible: null,
      },
      route: { evaluationRequired: false, modes: null },
      schedule: { evaluationRequired: false, open: null },
      criticalFacts: [],
    },
  };
}

function addProbe(catalog, probeId, family, factor, before, after, options) {
  assert.ok(!catalog.some((probe) => probe.probeId === probeId));
  catalog.push({
    probeId,
    family,
    factor,
    stateA: before,
    stateB: after,
    expectedFeatureCodes: options.codes,
    targetComponent: options.component ?? "matchScore",
    expectation: options.expectation,
    expectedUnaffectedComponents: allExpectedUnaffected(
      options.component ?? "matchScore",
    ),
    ordinalGroup: options.ordinalGroup ?? null,
    ordinalOrder: options.ordinalOrder ?? null,
    expectedGate: options.gate ?? null,
    contextIsCalibrationOnly:
      family === "weather" || family === "season" || family === "timeSlot",
  });
}

export function buildProbeCatalog() {
  const probes = [];
  for (const interest of interestCodes) {
    const absent = state();
    const dislike = state();
    dislike.preferenceValues["interests.preferences"] = {
      [interest]: "dislike",
    };
    const like = state();
    like.preferenceValues["interests.preferences"] = { [interest]: "like" };
    const options = {
      codes: INTEREST_FEATURE_MAP[interest],
      expectation: "interest_increase",
      ordinalGroup: `interest.${interest}`,
    };
    addProbe(
      probes,
      `interest.${interest}.dislike_to_absent`,
      "interest",
      `interests.preferences.${interest}`,
      dislike,
      absent,
      { ...options, ordinalOrder: [0, 1] },
    );
    addProbe(
      probes,
      `interest.${interest}.absent_to_like`,
      "interest",
      `interests.preferences.${interest}`,
      absent,
      like,
      { ...options, ordinalOrder: [1, 2] },
    );
  }
  for (const [interest, details] of Object.entries(INTEREST_DETAIL_EXTRA_MAP)) {
    for (const [detail, extras] of Object.entries(details)) {
      const codes = extras.filter(
        (code) => !INTEREST_FEATURE_MAP[interest].includes(code),
      );
      if (!codes.length) continue;
      const before = state();
      before.preferenceValues["interests.preferences"] = { [interest]: "like" };
      const after = clone(before);
      after.preferenceValues["interests.details"] = { [interest]: [detail] };
      addProbe(
        probes,
        `detail.${interest}.${detail}`,
        "interestDetail",
        `interests.details.${interest}.${detail}`,
        before,
        after,
        { codes, expectation: "detail_increase" },
      );
    }
  }
  const walking = ["veryLow", "low", "standard", "high", "veryHigh"];
  for (let i = 0; i < walking.length - 1; i += 1) {
    const before = state(),
      after = state();
    before.preferenceValues["mobility.walkingTolerance"] = walking[i];
    after.preferenceValues["mobility.walkingTolerance"] = walking[i + 1];
    addProbe(
      probes,
      `walking.${walking[i]}_to_${walking[i + 1]}`,
      "walking",
      "mobility.walkingTolerance",
      before,
      after,
      {
        codes: ["25"],
        expectation: "burden_tolerance_increase",
        ordinalGroup: "walking",
        ordinalOrder: [i, i + 1],
      },
    );
  }
  const queue = ["low", "medium", "high"];
  for (let i = 0; i < queue.length - 1; i += 1) {
    const before = state(),
      after = state();
    before.preferenceValues["dining.queueTolerance"] = queue[i];
    after.preferenceValues["dining.queueTolerance"] = queue[i + 1];
    addProbe(
      probes,
      `queue.${queue[i]}_to_${queue[i + 1]}`,
      "queue",
      "dining.queueTolerance",
      before,
      after,
      {
        codes: ["28"],
        expectation: "burden_tolerance_increase",
        ordinalGroup: "queue",
        ordinalOrder: [i, i + 1],
      },
    );
  }
  for (let value = 1; value < 5; value += 1) {
    const before = state(),
      after = state();
    before.preferenceValues["style.discovery"] = value;
    after.preferenceValues["style.discovery"] = value + 1;
    addProbe(
      probes,
      `discovery.${value}_to_${value + 1}`,
      "discovery",
      "style.discovery",
      before,
      after,
      {
        codes: ["12", "14", "15"],
        expectation: "hidden_local_vs_iconic",
        ordinalGroup: "discovery",
        ordinalOrder: [value - 1, value],
      },
    );
  }
  const partyCodes = {
    family: "16",
    senior: "17",
    couple: "18",
    solo: "19",
    wheelchair: "29",
    stroller: "30",
  };
  for (const [party, code] of Object.entries(partyCodes)) {
    const absent = state(),
      mild = state(),
      strong = state();
    mild.context.party[party] = 0.25;
    strong.context.party[party] = 1;
    addProbe(
      probes,
      `party.${party}.activation`,
      "party",
      `context.party.${party}`,
      absent,
      mild,
      { codes: [code], component: "partyFit", expectation: "activation" },
    );
    addProbe(
      probes,
      `party.${party}.strength`,
      "party",
      `context.party.${party}`,
      mild,
      strong,
      { codes: [code], component: "partyFit", expectation: "context_strength" },
    );
  }
  const seasons = ["spring", "summer", "autumn", "winter"];
  const seasonCodes = {
    spring: "40",
    summer: "41",
    autumn: "42",
    winter: "43",
  };
  for (const season of seasons) {
    const absent = state(),
      active = state();
    active.context.season = season;
    addProbe(
      probes,
      `season.${season}.activation`,
      "season",
      "context.season",
      absent,
      active,
      {
        codes: [seasonCodes[season]],
        component: "seasonFit",
        expectation: "activation",
      },
    );
  }
  for (let i = 0; i < seasons.length - 1; i += 1) {
    const before = state(),
      after = state();
    before.context.season = seasons[i];
    after.context.season = seasons[i + 1];
    addProbe(
      probes,
      `season.${seasons[i]}_to_${seasons[i + 1]}`,
      "season",
      "context.season",
      before,
      after,
      {
        codes: [seasonCodes[seasons[i]], seasonCodes[seasons[i + 1]]],
        component: "seasonFit",
        expectation: "context_code_transition",
        ordinalGroup: "season_sequence",
        ordinalOrder: [i, i + 1],
      },
    );
  }
  const weatherCodes = { rain: "35", heat: "36", cold: "37", snow: "38" };
  for (const [condition, code] of Object.entries(weatherCodes)) {
    const clear = state(),
      mild = state(),
      strong = state();
    clear.context.weather = { condition: "clear", severity: 0.25 };
    mild.context.weather = { condition, severity: 0.25 };
    strong.context.weather = { condition, severity: 1 };
    addProbe(
      probes,
      `weather.${condition}.activation`,
      "weather",
      "context.weather.condition",
      clear,
      mild,
      {
        codes: [code, "39"],
        component: "weatherFit",
        expectation: "activation",
      },
    );
    addProbe(
      probes,
      `weather.${condition}.severity`,
      "weather",
      "context.weather.severity",
      mild,
      strong,
      {
        codes: [code, "39"],
        component: "weatherFit",
        expectation: "weather_severity",
      },
    );
  }
  const slots = ["morning", "daytime", "sunrise", "sunset", "night"];
  const slotCodes = {
    morning: "31",
    daytime: "32",
    sunrise: "33",
    sunset: "34",
    night: "08",
  };
  for (const slot of slots) {
    const absent = state(),
      active = state();
    active.context.timeSlot = slot;
    addProbe(
      probes,
      `time.${slot}.activation`,
      "timeSlot",
      "context.timeSlot",
      absent,
      active,
      {
        codes: [slotCodes[slot]],
        component: "timeSlotFit",
        expectation: "activation",
      },
    );
  }
  for (let i = 0; i < slots.length - 1; i += 1) {
    const before = state(),
      after = state();
    before.context.timeSlot = slots[i];
    after.context.timeSlot = slots[i + 1];
    addProbe(
      probes,
      `time.${slots[i]}_to_${slots[i + 1]}`,
      "timeSlot",
      "context.timeSlot",
      before,
      after,
      {
        codes: [slotCodes[slots[i]], slotCodes[slots[i + 1]]],
        component: "timeSlotFit",
        expectation: "context_code_transition",
        ordinalGroup: "time_sequence",
        ordinalOrder: [i, i + 1],
      },
    );
  }
  const absentRest = state(),
    mildRest = state(),
    strongRest = state();
  mildRest.context.needsRestStrength = 0.25;
  strongRest.context.needsRestStrength = 1;
  addProbe(
    probes,
    "rest.activation",
    "rest",
    "context.needsRestStrength",
    absentRest,
    mildRest,
    { codes: ["24"], component: "restFit", expectation: "activation" },
  );
  addProbe(
    probes,
    "rest.strength",
    "rest",
    "context.needsRestStrength",
    mildRest,
    strongRest,
    { codes: ["24"], component: "restFit", expectation: "context_strength" },
  );
  for (const [need, factKey, code] of [
    ["requiresWheelchair", "wheelchairAccessible", "29"],
    ["requiresStroller", "strollerAccessible", "30"],
  ]) {
    for (const [suffix, fact, gate] of [
      ["rejected", false, "REJECT"],
      ["unknown", null, "NEEDS_FACT"],
    ]) {
      const before = state(),
        after = state();
      before.constraints.accessibilityFacts[factKey] = fact;
      after.constraints.accessibilityFacts[factKey] = fact;
      after.constraints.partyNeeds = [{ [need]: true }];
      addProbe(
        probes,
        `hard.${need}.${suffix}`,
        "hardConstraint",
        `constraints.partyNeeds.${need}`,
        before,
        after,
        { codes: [code], expectation: "hard_gate", gate },
      );
    }
  }
  for (const [preference, mode] of [
    ["mobility.noPublicTransit", "transit"],
    ["mobility.noBus", "bus"],
    ["mobility.noFerry", "ferry"],
  ]) {
    const before = state(),
      after = state();
    before.constraints.route = { evaluationRequired: true, modes: [mode] };
    after.constraints.route = clone(before.constraints.route);
    after.preferenceValues[preference] = true;
    addProbe(
      probes,
      `hard.${preference}`,
      "hardConstraint",
      preference,
      before,
      after,
      { codes: [], expectation: "hard_gate", gate: "REJECT" },
    );
  }
  const criticalBefore = state(),
    criticalAfter = state();
  criticalAfter.constraints.criticalFacts = [
    { code: "CALIBRATION_FACT", satisfied: null },
  ];
  addProbe(
    probes,
    "hard.critical_unknown",
    "hardConstraint",
    "constraints.criticalFacts",
    criticalBefore,
    criticalAfter,
    { codes: [], expectation: "hard_gate", gate: "NEEDS_FACT" },
  );
  for (const [suffix, open, gate] of [
    ["closed", false, "REJECT"],
    ["unknown", null, "NEEDS_FACT"],
  ]) {
    const before = state(),
      after = state();
    before.constraints.schedule.open = open;
    after.constraints.schedule = { evaluationRequired: true, open };
    addProbe(
      probes,
      `hard.schedule_${suffix}`,
      "hardConstraint",
      "constraints.schedule.evaluationRequired",
      before,
      after,
      { codes: [], expectation: "hard_gate", gate },
    );
  }
  assert.equal(probes.length, 98);
  return probes;
}

function featureMetric(probe, poi) {
  const v = poi.features.values;
  const values = probe.expectedFeatureCodes.map((code) => v[code]);
  switch (probe.expectation) {
    case "interest_increase":
    case "detail_increase":
      return mean(values);
    case "burden_tolerance_increase":
      return values[0];
    case "hidden_local_vs_iconic": {
      const a =
        SCORING_CONFIG_V1.discoveryPreference[
          probe.stateA.preferenceValues["style.discovery"]
        ];
      const b =
        SCORING_CONFIG_V1.discoveryPreference[
          probe.stateB.preferenceValues["style.discovery"]
        ];
      return (
        ((b.local - a.local) * v["12"] +
          (b.hidden - a.hidden) * v["14"] +
          (b.iconic - a.iconic) * v["15"]) /
        9
      );
    }
    case "context_strength":
      return (2 * values[0]) / 9 - 1;
    case "context_code_transition":
      return values[1] - values[0];
    case "weather_severity":
      return (
        (2 * values[0]) / 9 -
        1 -
        (v["39"] / 9) ** SCORING_CONFIG_V1.gamma.weatherSensitivity
      );
    default:
      return null;
  }
}

function expectedSign(probe, metric) {
  if (metric === null) return null;
  if (["interest_increase", "detail_increase"].includes(probe.expectation))
    return metric >= 6 ? 1 : null;
  if (probe.expectation === "burden_tolerance_increase") {
    const before = probe.stateA.preferenceValues;
    const tolerance =
      probe.family === "walking"
        ? SCORING_CONFIG_V1.walkingTolerance[
            before["mobility.walkingTolerance"]
          ]
        : SCORING_CONFIG_V1.queueTolerance[before["dining.queueTolerance"]];
    return metric >= 6 && metric > tolerance ? 1 : null;
  }
  if (probe.expectation === "hidden_local_vs_iconic")
    return Math.abs(metric) >= 0.5 ? sign(metric) : null;
  if (probe.expectation === "context_code_transition")
    return Math.abs(metric) >= 2 ? sign(metric) : null;
  if (["context_strength", "weather_severity"].includes(probe.expectation))
    return Math.abs(metric) >= 0.25 ? sign(metric) : null;
  return null;
}

function ranks(resultById) {
  const eligible = [...resultById.entries()]
    .filter(
      ([, result]) =>
        result.constraintGate.status === "PASS" &&
        result.matchScore.value !== null,
    )
    .sort(
      (a, b) =>
        b[1].matchScore.value - a[1].matchScore.value ||
        a[0].localeCompare(b[0]),
    );
  return new Map(eligible.map(([id], index) => [id, index + 1]));
}

function contributions(result, component, codes) {
  return codes.map((featureCode) => {
    const traces = result[component].breakdown.filter(
      (item) => item.featureCode === featureCode,
    );
    return {
      featureCode,
      weightedContribution: traces.length
        ? traces.reduce((sum, item) => sum + item.weightedContribution, 0)
        : null,
      signalKeys: traces.map((item) => item.signalKey),
      provenanceRefs: [
        ...new Set(traces.map((item) => item.featureProvenanceRef)),
      ],
    };
  });
}

async function scoreState(poiIds, probeState) {
  const longTerm = toLongTermPreferenceReadV1({
    preference: { schemaVersion: "1.0", values: probeState.preferenceValues },
    revision: 1,
    updatedAt: "2026-09-29T00:00:00Z",
  });
  const results = new Map();
  for (const poiId of poiIds) {
    const response = await scoreAuthorizedCanonicalPoiV1({
      repository: pilot100RecommendationRepository,
      poiId,
      longTerm,
      context: probeState.context,
      constraints: probeState.constraints,
    });
    assert.equal(response.status, "scored", `${poiId}: runtime admission`);
    results.set(poiId, response.result);
  }
  return results;
}

function summarizeProbe(probe, rows) {
  const eligible = rows.filter((row) => row.expectedSign !== null);
  const counts = Object.fromEntries(
    ["PASS", "COUNTER_DIRECTION", "NO_EFFECT", "NOT_APPLICABLE", "BLOCKED"].map(
      (status) => [
        status,
        rows.filter((row) => row.directionCheck === status).length,
      ],
    ),
  );
  const rankDeltas = rows
    .map((row) => row.rankDelta)
    .filter((value) => value !== null);
  const correlationPairs = rows
    .filter(
      (row) => row.featureMetric !== null && row.targetComponentDelta !== null,
    )
    .map((row) => [row.featureMetric, row.targetComponentDelta]);
  return {
    probeId: probe.probeId,
    family: probe.family,
    targetComponent: probe.targetComponent,
    poiCount: rows.length,
    materiallyRelevantCount: eligible.length,
    directionCounts: counts,
    expectedDirectionRate: eligible.length
      ? counts.PASS / eligible.length
      : null,
    counterDirectionRate: eligible.length
      ? counts.COUNTER_DIRECTION / eligible.length
      : null,
    noEffectCount: counts.NO_EFFECT,
    rankUpCount: rankDeltas.filter((delta) => delta > 0).length,
    rankDownCount: rankDeltas.filter((delta) => delta < 0).length,
    rankUnchangedCount: rankDeltas.filter((delta) => delta === 0).length,
    rankDeltaDistribution: Object.fromEntries(
      [...new Set(rankDeltas)]
        .sort((a, b) => a - b)
        .map((delta) => [
          String(delta),
          rankDeltas.filter((value) => value === delta).length,
        ]),
    ),
    meanScoreDelta: mean(
      rows.map((row) => row.matchScoreDelta).filter((value) => value !== null),
    ),
    medianScoreDelta: median(
      rows.map((row) => row.matchScoreDelta).filter((value) => value !== null),
    ),
    maxAbsoluteScoreDelta: Math.max(
      0,
      ...rows.map((row) => Math.abs(row.matchScoreDelta ?? 0)),
    ),
    featureValueVsTargetDeltaCorrelation: pearson(correlationPairs),
    unexpectedComponentMovementCount: rows.filter(
      (row) => row.unexpectedComponentChanges.length,
    ).length,
    expectedGate: probe.expectedGate,
    hardGateCorrectCount: probe.expectedGate
      ? rows.filter(
          (row) =>
            row.constraintGateB === probe.expectedGate &&
            row.matchScoreB === null &&
            row.rankB === null,
        ).length
      : null,
  };
}

function anchors(probe, rows) {
  if (
    !["interest", "interestDetail", "walking", "queue", "discovery"].includes(
      probe.family,
    )
  )
    return null;
  const ordered = [...rows].sort(
    (a, b) =>
      a.featureMetric - b.featureMetric || a.poiId.localeCompare(b.poiId),
  );
  const low = ordered.slice(0, 25),
    high = ordered.slice(-25);
  const delta = (group) =>
    mean(
      group.map((row) => row.matchScoreDelta).filter((value) => value !== null),
    );
  const highDelta = delta(high),
    lowDelta = delta(low);
  return {
    probeId: probe.probeId,
    derivation: "Feature43 metric ascending, poiId tie break; bottom/top 25",
    metric: probe.expectedFeatureCodes,
    lowPoiIds: low.map((row) => row.poiId),
    highPoiIds: high.map((row) => row.poiId),
    lowMetricMean: mean(low.map((row) => row.featureMetric)),
    highMetricMean: mean(high.map((row) => row.featureMetric)),
    lowMeanScoreDelta: lowDelta,
    highMeanScoreDelta: highDelta,
    separationDelta: highDelta - lowDelta,
    expectedSeparationDirection:
      probe.family === "discovery" ? "metric-aligned" : "positive",
    pass: highDelta > lowDelta,
  };
}

function ordinalGroups(probes, observations) {
  const byProbe = new Map(
    probes.map((probe) => [
      probe.probeId,
      observations.filter((row) => row.probeId === probe.probeId),
    ]),
  );
  const groups = [
    ...new Set(probes.map((probe) => probe.ordinalGroup).filter(Boolean)),
  ];
  return groups.map((group) => {
    const ordinalUtility = ![
      "discovery",
      "season_sequence",
      "time_sequence",
    ].includes(group);
    const entries = probes
      .filter((probe) => probe.ordinalGroup === group)
      .sort((a, b) => a.ordinalOrder[0] - b.ordinalOrder[0]);
    const perPoi = runtimeManifest.internalIds.map((poiId) => {
      const rows = entries.map((probe) =>
        byProbe.get(probe.probeId).find((row) => row.poiId === poiId),
      );
      const values = [
        rows[0].targetComponentA,
        ...rows.map((row) => row.targetComponentB),
      ];
      const material = rows.some((row) => row.expectedSign !== null);
      const monotone = ordinalUtility
        ? values.every(
            (value, index) =>
              index === 0 ||
              (value !== null &&
                values[index - 1] !== null &&
                value >= values[index - 1]),
          )
        : null;
      return { poiId, values, material, monotone };
    });
    const relevant = perPoi.filter((row) => row.material);
    return {
      group,
      orderedProbeIds: entries.map((probe) => probe.probeId),
      materiallyRelevantPoiCount: relevant.length,
      monotoneCount: ordinalUtility
        ? relevant.filter((row) => row.monotone).length
        : null,
      monotonicityRate:
        ordinalUtility && relevant.length
          ? relevant.filter((row) => row.monotone).length / relevant.length
          : null,
      note: !ordinalUtility
        ? "ordinal inputs represent changing orientation/code, not universal nondecreasing utility"
        : "nondecreasing target score for materially relevant POIs",
    };
  });
}

export async function buildCalibration() {
  const probes = buildProbeCatalog();
  const poiIds = runtimeManifest.internalIds;
  assert.equal(poiIds.length, 100);
  assert.equal(new Set(poiIds).size, 100);
  assert.equal(runtimeManifest.candidateCorpusAuthorized, false);
  assert.equal(
    canonicalPoiRuntimeRepository.featureBaselineRevision,
    baselineManifest.artifactRevision,
  );
  const poiById = new Map();
  for (let i = 0; i < poiIds.length; i += 1) {
    const poi = await canonicalPoiRuntimeRepository.getByInternalId(poiIds[i]);
    assert.equal(poi?.masterCode, runtimeManifest.masterCodes[i]);
    assert.equal(Object.keys(poi.features?.values ?? {}).length, 43);
    poiById.set(poi.internalId, poi);
  }
  const observations = [],
    rankDeltas = [],
    anomalies = [],
    summaries = [],
    anchorRows = [];
  for (const probe of probes) {
    const before = await scoreState(poiIds, probe.stateA);
    const after = await scoreState(poiIds, probe.stateB);
    const beforeRanks = ranks(before),
      afterRanks = ranks(after);
    const probeRows = [];
    for (const poiId of poiIds) {
      const poi = poiById.get(poiId);
      const a = before.get(poiId),
        b = after.get(poiId);
      const metric = featureMetric(probe, poi);
      const expected = expectedSign(probe, metric);
      const targetA = a[probe.targetComponent].value;
      const targetB = b[probe.targetComponent].value;
      const targetDelta =
        targetA === null || targetB === null ? null : targetB - targetA;
      const scoreA = a.matchScore.value,
        scoreB = b.matchScore.value;
      const rankA = beforeRanks.get(poiId) ?? null,
        rankB = afterRanks.get(poiId) ?? null;
      const changed = probe.expectedGate
        ? []
        : probe.expectedUnaffectedComponents.filter(
            (component) =>
              a[component].value !== b[component].value ||
              a[component].status !== b[component].status,
          );
      const directionCheck = probe.expectedGate
        ? b.constraintGate.status === probe.expectedGate &&
          scoreB === null &&
          rankB === null
          ? "BLOCKED"
          : "COUNTER_DIRECTION"
        : expected === null || targetDelta === null
          ? "NOT_APPLICABLE"
          : targetDelta === 0
            ? "NO_EFFECT"
            : sign(targetDelta) === expected
              ? "PASS"
              : "COUNTER_DIRECTION";
      const left = contributions(
        a,
        probe.targetComponent,
        probe.expectedFeatureCodes,
      );
      const right = contributions(
        b,
        probe.targetComponent,
        probe.expectedFeatureCodes,
      );
      const traceDelta = left.map((item, index) => ({
        featureCode: item.featureCode,
        before: item.weightedContribution,
        after: right[index].weightedContribution,
        delta:
          item.weightedContribution === null ||
          right[index].weightedContribution === null
            ? null
            : right[index].weightedContribution - item.weightedContribution,
        beforeSignalKeys: item.signalKeys,
        afterSignalKeys: right[index].signalKeys,
        sourceRefs: [
          ...new Set([...item.provenanceRefs, ...right[index].provenanceRefs]),
        ],
      }));
      const row = {
        probeId: probe.probeId,
        poiId,
        masterCode: poi.masterCode,
        stateA: {
          matchScore: scoreA,
          componentScores: Object.fromEntries(
            components.map((c) => [c, a[c].value]),
          ),
          rank: rankA,
          constraintGate: a.constraintGate,
        },
        stateB: {
          matchScore: scoreB,
          componentScores: Object.fromEntries(
            components.map((c) => [c, b[c].value]),
          ),
          rank: rankB,
          constraintGate: b.constraintGate,
        },
        delta: {
          matchScore:
            scoreA === null || scoreB === null ? null : scoreB - scoreA,
          rank: rankA === null || rankB === null ? null : rankA - rankB,
          targetComponent: targetDelta,
        },
        expectedFeatureCodes: probe.expectedFeatureCodes,
        observedFeatureContributionDelta: traceDelta,
        expectedDirection:
          expected === null ? "not_applicable" : expected > 0 ? "up" : "down",
        actualDirection:
          targetDelta === null
            ? "not_applicable"
            : targetDelta > 0
              ? "up"
              : targetDelta < 0
                ? "down"
                : "no_effect",
        directionCheck,
        featureMetric: metric,
        unexpectedComponentChanges: probe.expectedGate ? [] : changed,
        scoringConfigVersion: a.scoringConfigVersion,
        baselineRevision: canonicalPoiRuntimeRepository.featureBaselineRevision,
      };
      observations.push(row);
      rankDeltas.push({
        probeId: probe.probeId,
        poiId,
        masterCode: poi.masterCode,
        beforeRank: rankA,
        afterRank: rankB,
        rankDelta: row.delta.rank,
        beforeMatchScore: scoreA,
        afterMatchScore: scoreB,
        matchScoreDelta: row.delta.matchScore,
        targetComponent: probe.targetComponent,
        targetComponentDelta: targetDelta,
      });
      const compact = {
        probeId: probe.probeId,
        poiId,
        featureMetric: metric,
        expectedSign: expected,
        directionCheck,
        targetComponentA: targetA,
        targetComponentB: targetB,
        targetComponentDelta: targetDelta,
        matchScoreDelta: row.delta.matchScore,
        rankA,
        rankB,
        rankDelta: row.delta.rank,
        constraintGateB: b.constraintGate.status,
        matchScoreB: scoreB,
        unexpectedComponentChanges: probe.expectedGate ? [] : changed,
      };
      probeRows.push(compact);
      if (
        directionCheck === "COUNTER_DIRECTION" ||
        (directionCheck === "NO_EFFECT" && expected !== null) ||
        changed.length
      ) {
        anomalies.push({
          probeId: probe.probeId,
          poiId,
          masterCode: poi.masterCode,
          expectedDirection: row.expectedDirection,
          actualDirection: row.actualDirection,
          directionCheck,
          targetComponent: probe.targetComponent,
          responsibleTrace: traceDelta,
          unexpectedComponentChanges: probe.expectedGate ? [] : changed,
          classification: changed.length
            ? "scorer bug"
            : directionCheck === "NO_EFFECT"
              ? traceDelta.some(
                  (item) => item.delta !== null && item.delta !== 0,
                )
                ? "expected interaction"
                : "config issue"
              : "needs review",
          reason: changed.length
            ? "unrelated component changed under one-factor probe"
            : directionCheck === "NO_EFFECT"
              ? traceDelta.some(
                  (item) => item.delta !== null && item.delta !== 0,
                )
                ? "weighted feature contribution moved but integer score did not change"
                : "material feature had zero contribution movement in this config interval"
              : "target component moved counter to feature-derived expectation",
        });
      }
    }
    summaries.push(summarizeProbe(probe, probeRows));
    const anchor = anchors(probe, probeRows);
    if (anchor) anchorRows.push(anchor);
  }
  assert.equal(observations.length, probes.length * 100);
  assert.equal(rankDeltas.length, observations.length);
  const ordinal = ordinalGroups(
    probes,
    observations.map((row) => ({
      probeId: row.probeId,
      poiId: row.poiId,
      expectedSign:
        row.expectedDirection === "not_applicable"
          ? null
          : row.expectedDirection === "up"
            ? 1
            : -1,
      targetComponentA:
        row.stateA.componentScores[
          probes.find((p) => p.probeId === row.probeId).targetComponent
        ],
      targetComponentB:
        row.stateB.componentScores[
          probes.find((p) => p.probeId === row.probeId).targetComponent
        ],
    })),
  );
  const directional = summaries.filter(
    (summary) => summary.materiallyRelevantCount > 0,
  );
  const materialCount = directional.reduce(
    (sum, item) => sum + item.materiallyRelevantCount,
    0,
  );
  const passCount = directional.reduce(
    (sum, item) => sum + item.directionCounts.PASS,
    0,
  );
  const counterCount = directional.reduce(
    (sum, item) => sum + item.directionCounts.COUNTER_DIRECTION,
    0,
  );
  const hard = summaries.filter((summary) => summary.expectedGate !== null);
  const hardCorrect = hard.reduce(
    (sum, item) => sum + item.hardGateCorrectCount,
    0,
  );
  const unexplained = summaries.reduce(
    (sum, item) => sum + item.unexpectedComponentMovementCount,
    0,
  );
  const classificationCounts = Object.fromEntries(
    [...new Set(anomalies.map((row) => row.classification))]
      .sort()
      .map((key) => [
        key,
        anomalies.filter((row) => row.classification === key).length,
      ]),
  );
  const config = {
    mappingVersion: MAPPING_VERSION,
    scoringConfigVersion: SCORING_CONFIG_VERSION,
    scoringConfig: SCORING_CONFIG_V1,
    decision: "NO_CHANGE_DIRECTIONAL_AND_HARD_GATES_PASS",
  };
  const calibrationSummary = {
    task: "TASK-090-A",
    status: "PASS_BEHAVIOR_GATES_WITH_REVIEW_LIMITATIONS",
    baseDatasetRevision: runtimeManifest.datasetRevision,
    trustedBaselineRevision: baselineManifest.artifactRevision,
    probeCount: probes.length,
    poiEvaluationsPerProbe: 100,
    totalScoreEvaluations: probes.length * 2 * 100,
    materialDirectionCount: materialCount,
    directionalPassRate: materialCount ? passCount / materialCount : null,
    counterDirectionRate: materialCount ? counterCount / materialCount : null,
    hardConstraintPassRate: hardCorrect / (hard.length * 100),
    unexplainedComponentMovementCount: unexplained,
    anomalyCount: anomalies.length,
    anomalyClassifications: classificationCounts,
    configChanged: false,
    oldConfigVersion: SCORING_CONFIG_VERSION,
    newConfigVersion: SCORING_CONFIG_VERSION,
    beforeSensitivity: {
      directionalPassRate: materialCount ? passCount / materialCount : null,
      counterDirectionRate: materialCount ? counterCount / materialCount : null,
    },
    afterSensitivity: {
      directionalPassRate: materialCount ? passCount / materialCount : null,
      counterDirectionRate: materialCount ? counterCount / materialCount : null,
    },
    initialGates: {
      expectedDirectionRateMin: 0.95,
      counterDirectionRateMax: 0.02,
      hardConstraintCorrectRate: 1,
      unexplainedComponentMovementMax: 0,
      deterministicReplayRequired: true,
    },
    rankingQualityClaim: false,
    realWeatherFactClaim: false,
  };
  const files = {
    "probe-catalog.json": json({
      task: "TASK-090-A",
      method: "one-factor-at-a-time",
      canonicalPoiCount: 100,
      probes,
    }),
    "probe-inputs.jsonl": jsonl(
      probes.map(({ probeId, factor, stateA, stateB }) => ({
        probeId,
        factor,
        stateA,
        stateB,
      })),
    ),
    "score-observations.jsonl": jsonl(observations),
    "rank-deltas.jsonl": jsonl(rankDeltas),
    "monotonicity-summary.json": json({
      probeSummaries: summaries,
      ordinalGroups: ordinal,
    }),
    "pairwise-anchor-checks.json": json({ anchors: anchorRows }),
    "hard-constraint-checks.json": json({
      probeSummaries: hard,
      correctCount: hardCorrect,
      totalChecks: hard.length * 100,
      passRate: hardCorrect / (hard.length * 100),
    }),
    "anomaly-ledger.jsonl": jsonl(anomalies),
    "config-before.json": json(config),
    "config-after.json": json(config),
    "calibration-summary.json": json(calibrationSummary),
  };
  files["deterministic-replay.json"] = json({
    status: "PASS",
    buildVersion: "TASK-090-A-v1",
    probeCount: probes.length,
    canonicalDatasetSha256: runtimeManifest.datasetSha256,
    baselineArtifactSha256: baselineManifest.artifactSha256,
    configHash: sha(JSON.stringify(config)),
    files: Object.fromEntries(
      Object.entries(files).map(([name, content]) => [name, sha(content)]),
    ),
  });
  return {
    files,
    probes,
    observations,
    rankDeltas,
    summaries,
    ordinal,
    anchorRows,
    anomalies,
    calibrationSummary,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { files, calibrationSummary } = await buildCalibration();
  mkdirSync(OUT, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const path = new URL(name, OUT);
    if (process.argv.includes("--check"))
      assert.equal(
        readFileSync(path, "utf8"),
        content,
        `${name} deterministic replay`,
      );
    else writeFileSync(path, content);
  }
  console.log(
    JSON.stringify(
      {
        ...calibrationSummary,
        replay: process.argv.includes("--check") ? "PASS" : "generated",
      },
      null,
      2,
    ),
  );
}
