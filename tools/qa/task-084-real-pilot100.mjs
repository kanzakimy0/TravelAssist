import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import runtimeManifest from "../../src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import baselineManifest from "../../src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json" with { type: "json" };
import {
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
} from "../../src/shared/contracts/planning/features.ts";
import { toLongTermPreferenceReadV1 } from "../../src/shared/contracts/preferences/read.ts";
import { canonicalPoiRuntimeRepository } from "../../src/server/poi-runtime/repository.ts";
import { pilot100RecommendationRepository } from "../../src/server/recommendation-scoring/pilot100.ts";
import { scoreAuthorizedCanonicalPoiV1 } from "../../src/server/recommendation-scoring/service.ts";
import { SCORING_CONFIG_V1 } from "../../src/shared/recommendation-scoring/config.ts";

const OUT = new URL("../../docs/qa/TASK-084/real-pilot100/", import.meta.url);
const inputText = readFileSync(new URL("pilot-input.v1.json", OUT), "utf8");
const frozenInput = JSON.parse(inputText);
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
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const jsonl = (rows) =>
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const near = (a, b) => Math.abs(a - b) < 1e-12;

function recomputeComponent(envelope, traces) {
  const ordered = [...traces].sort((a, b) => a.order - b.order);
  const requestedWeight = ordered.reduce((sum, item) => sum + item.weight, 0);
  const knownBaseWeight = ordered.reduce(
    (sum, item) => sum + (item.featureValue === null ? 0 : item.weight),
    0,
  );
  const knownWeight = ordered.reduce(
    (sum, item) =>
      sum +
      (item.featureValue === null || item.featureConfidence === null
        ? 0
        : item.weight * item.featureConfidence),
    0,
  );
  const weightedSum = ordered.reduce(
    (sum, item) => sum + item.weightedContribution,
    0,
  );
  const coverage = requestedWeight
    ? clamp(knownWeight / requestedWeight, 0, 1)
    : 0;
  const confidence = knownBaseWeight
    ? clamp(knownWeight / knownBaseWeight, 0, 1)
    : 0;
  const knownRaw = knownWeight ? clamp(weightedSum / knownWeight, -1, 1) : 0;
  const adjustedRaw = coverage * knownRaw;
  const value = knownWeight
    ? clamp(
        Math.round(SCORING_CONFIG_V1.scoreMax * ((adjustedRaw + 1) / 2)),
        SCORING_CONFIG_V1.scoreMin,
        SCORING_CONFIG_V1.scoreMax,
      )
    : null;
  const status = requestedWeight
    ? knownWeight
      ? "scored"
      : "neutral_default"
    : "not_applicable";
  assert.ok(near(requestedWeight, envelope.requestedWeight));
  assert.ok(near(knownWeight, envelope.knownWeight));
  assert.ok(near(coverage, envelope.coverage));
  assert.ok(near(confidence, envelope.confidence));
  assert.ok(near(knownRaw, envelope.knownRaw));
  assert.ok(near(adjustedRaw, envelope.adjustedRaw));
  assert.equal(value, envelope.value);
  assert.equal(status, envelope.status);
  return {
    requestedWeight,
    knownWeight,
    weightedSum,
    coverage,
    confidence,
    knownRaw,
    adjustedRaw,
    value,
    status,
    traceCount: ordered.length,
  };
}

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const bins = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `${i * 10}-${i === 9 ? 99 : i * 10 + 9}`,
      0,
    ]),
  );
  for (const value of sorted)
    bins[
      `${Math.min(9, Math.floor(value / 10)) * 10}-${value >= 90 ? 99 : Math.floor(value / 10) * 10 + 9}`
    ] += 1;
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    max: sorted.at(-1) ?? null,
    mean: sorted.length
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : null,
    median: sorted.length ? (sorted[49] + sorted[50]) / 2 : null,
    bins,
  };
}

function unitDistribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const frequencies = {};
  for (const value of sorted) {
    const key = value.toFixed(3);
    frequencies[key] = (frequencies[key] ?? 0) + 1;
  }
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    max: sorted.at(-1) ?? null,
    mean: sorted.length
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : null,
    median: sorted.length ? (sorted[49] + sorted[50]) / 2 : null,
    frequencies,
  };
}

export async function buildRealPilot100() {
  assert.equal(frozenInput.inputId, "pilot-full-coverage-v1");
  assert.match(frozenInput.purpose, /NOT_A_USER/);
  assert.equal(frozenInput.tripSnapshot, null);
  assert.equal(frozenInput.tripOverride, null);
  assert.equal(frozenInput.context.season, null);
  assert.equal(frozenInput.context.weather, null);
  assert.equal(frozenInput.context.timeSlot, null);
  assert.equal(frozenInput.constraints.schedule.evaluationRequired, false);
  assert.equal(frozenInput.constraints.route.evaluationRequired, false);
  assert.equal(runtimeManifest.runtimeImportAuthorized, true);
  assert.equal(runtimeManifest.candidateCorpusAuthorized, false);
  assert.equal(baselineManifest.baselineAttachAuthorized, true);
  assert.equal(baselineManifest.candidateCorpusAuthorized, false);
  assert.equal(runtimeManifest.internalIds.length, 100);
  assert.equal(new Set(runtimeManifest.internalIds).size, 100);
  assert.equal(POI_FEATURE_CODES.length, 43);
  assert.equal(
    canonicalPoiRuntimeRepository.featureBaselineRevision,
    baselineManifest.artifactRevision,
  );

  const longTerm = toLongTermPreferenceReadV1(frozenInput.longTerm);
  const poiRows = [];
  const cellRows = [];
  const resultRows = [];
  for (let i = 0; i < runtimeManifest.internalIds.length; i += 1) {
    const poiId = runtimeManifest.internalIds[i];
    const poi = await canonicalPoiRuntimeRepository.getByInternalId(poiId);
    assert.ok(poi?.features, `missing authorized Feature43: ${poiId}`);
    assert.equal(poi.internalId, poiId);
    assert.equal(poi.masterCode, runtimeManifest.masterCodes[i]);
    assert.equal(Object.keys(poi.features.values).length, 43);
    poiRows.push({
      poiId,
      masterCode: poi.masterCode,
      baselineRevision: baselineManifest.artifactRevision,
      baselineSourceRef: poi.features.sourceRefs[0],
    });
    const response = await scoreAuthorizedCanonicalPoiV1({
      repository: pilot100RecommendationRepository,
      poiId,
      longTerm,
      tripSnapshot: frozenInput.tripSnapshot,
      tripSnapshotRef: frozenInput.tripSnapshotRef,
      tripOverride: frozenInput.tripOverride,
      tripOverrideRevision: frozenInput.tripOverrideRevision,
      context: frozenInput.context,
      constraints: frozenInput.constraints,
    });
    assert.equal(response.status, "scored", `scorer unavailable: ${poiId}`);
    const result = response.result;
    assert.equal(result.constraintGate.status, "PASS");
    const byCode = new Map(POI_FEATURE_CODES.map((code) => [code, []]));
    for (const component of components) {
      result[component].breakdown.forEach((item, order) => {
        assert.ok(byCode.has(item.featureCode));
        byCode.get(item.featureCode).push({ ...item, order });
      });
    }
    const thisPoiCells = [];
    for (const [featureCode, featureName] of POI_FEATURE_DEFINITIONS) {
      const baselineFeatureValue = poi.features.values[featureCode];
      assert.ok(
        Number.isInteger(baselineFeatureValue) &&
          baselineFeatureValue >= 0 &&
          baselineFeatureValue <= 9,
      );
      const trace = byCode.get(featureCode);
      assert.ok(
        trace.every((item) => item.featureValue === baselineFeatureValue),
      );
      const scoringComponent = Object.fromEntries(
        components.map((component) => {
          const matched = trace.filter((item) => item.component === component);
          return [component, matched.length ? "applicable" : "not_applicable"];
        }),
      );
      const reasonCode = [
        ...new Set(
          result.reasons
            .filter((reason) => reason.featureCode === featureCode)
            .map((reason) => reason.code),
        ),
      ];
      const weight = trace.reduce((sum, item) => sum + item.weight, 0);
      const weightedContribution = trace.reduce(
        (sum, item) => sum + item.weightedContribution,
        0,
      );
      const cell = {
        poiId,
        masterCode: poi.masterCode,
        featureCode,
        featureName,
        baselineFeatureValue,
        baselineRevision: baselineManifest.artifactRevision,
        baselineSourceRef: poi.features.sourceRefs[0],
        scoringComponent,
        preferenceSignal: trace
          .filter((item) => item.preferenceValue !== null)
          .map((item) => ({
            key: item.signalKey,
            value: item.preferenceValue,
          })),
        contextSignal: trace
          .filter((item) => item.contextStrength !== null)
          .map((item) => ({
            key: item.signalKey,
            strength: item.contextStrength,
          })),
        signalSource: trace.length
          ? [...new Set(trace.map((item) => item.signalSource))]
          : "not_applicable",
        weight,
        normalizedContribution: weight ? weightedContribution / weight : null,
        weightedContribution,
        coverageContribution: trace.reduce(
          (sum, item) =>
            sum +
            (item.featureValue === null || item.featureConfidence === null
              ? 0
              : item.weight * item.featureConfidence),
          0,
        ),
        confidence: poi.features.confidence,
        effectiveScoringConfidence: trace.length
          ? trace[0].featureConfidence
          : null,
        confidenceBasis: trace.length
          ? "TRUSTED_INTERNAL_BASELINE_POLICY"
          : "not_applicable",
        reasonCode: reasonCode.length ? reasonCode : "not_applicable",
        trace,
      };
      thisPoiCells.push(cell);
      cellRows.push(cell);
    }
    const aggregateRecomputationTrace = Object.fromEntries(
      components.map((component) => [
        component,
        recomputeComponent(
          result[component],
          thisPoiCells.flatMap((cell) =>
            cell.trace.filter((item) => item.component === component),
          ),
        ),
      ]),
    );
    assert.ok(Number.isInteger(result.matchScore.value));
    assert.ok(result.matchScore.value >= 0 && result.matchScore.value <= 99);
    resultRows.push({
      poiId,
      masterCode: poi.masterCode,
      matchScore: result.matchScore,
      partyFit: result.partyFit,
      seasonFit: result.seasonFit,
      weatherFit: result.weatherFit,
      timeSlotFit: result.timeSlotFit,
      restFit: result.restFit,
      dayFit: result.dayFit,
      routeFit: result.routeFit,
      constraintGate: result.constraintGate,
      coverage: result.matchScore.coverage,
      confidence: result.matchScore.confidence,
      positiveReasons: result.reasons.filter(
        (reason) =>
          reason.evidence.contribution !== null &&
          reason.evidence.contribution >= 0,
      ),
      negativeReasons: result.reasons.filter(
        (reason) =>
          reason.evidence.contribution === null ||
          reason.evidence.contribution < 0,
      ),
      aggregateRecomputationTrace,
      scoringRevision: result.dataRevision,
      mappingVersion: result.mappingVersion,
      scoringConfigVersion: result.scoringConfigVersion,
    });
  }
  assert.equal(poiRows.length, 100);
  assert.equal(cellRows.length, 4300);
  assert.equal(resultRows.length, 100);
  assert.equal(
    new Set(cellRows.map((row) => `${row.poiId}:${row.featureCode}`)).size,
    4300,
  );
  assert.ok(cellRows.every((row) => row.baselineFeatureValue !== null));
  const notApplicableCells = cellRows.filter((row) =>
    Object.values(row.scoringComponent).every(
      (status) => status === "not_applicable",
    ),
  ).length;
  const matchScoreDistribution = distribution(
    resultRows.map((row) => row.matchScore.value),
  );
  const coverageDistribution = unitDistribution(
    resultRows.map((row) => row.coverage),
  );
  const confidenceDistribution = unitDistribution(
    resultRows.map((row) => row.confidence),
  );
  const descending = [...resultRows].sort(
    (a, b) =>
      b.matchScore.value - a.matchScore.value || a.poiId.localeCompare(b.poiId),
  );
  const ascending = [...resultRows].sort(
    (a, b) =>
      a.matchScore.value - b.matchScore.value || a.poiId.localeCompare(b.poiId),
  );
  const rank = (rows) =>
    rows.map((row) => ({
      poiId: row.poiId,
      masterCode: row.masterCode,
      matchScore: row.matchScore.value,
    }));
  const outputs = {
    "pilot-pois.v1.json": json({
      inputId: frozenInput.inputId,
      count: 100,
      canonicalDatasetRevision: runtimeManifest.datasetRevision,
      baselineRevision: baselineManifest.artifactRevision,
      pois: poiRows,
    }),
    "feature43-match-matrix.jsonl": jsonl(cellRows),
    "poi-match-results.jsonl": jsonl(resultRows),
    "component-summary.json": json({
      inputId: frozenInput.inputId,
      componentStatuses: Object.fromEntries(
        components.map((component) => [
          component,
          Object.fromEntries(
            [
              "scored",
              "not_applicable",
              "neutral_default",
              "blocked",
              "needs_fact",
            ].map((status) => [
              status,
              resultRows.filter((row) => row[component].status === status)
                .length,
            ]),
          ),
        ]),
      ),
      componentNotApplicableCells: Object.fromEntries(
        components.map((component) => [
          component,
          cellRows.filter(
            (row) => row.scoringComponent[component] === "not_applicable",
          ).length,
        ]),
      ),
    }),
    "coverage-summary.json": json({
      inputId: frozenInput.inputId,
      poiCount: 100,
      dimensions: 43,
      cellEvaluations: 4300,
      aggregateResults: 100,
      missingCells: 0,
      duplicateCells: 0,
      notApplicableCells,
      matchScoreDistribution,
      coverageDistribution,
      confidenceDistribution,
      confidenceInterpretation:
        "dataset-level trusted baseline scoring weight; not per-cell external evidence certainty",
      noObservedWeatherSeasonSchedulePartyOrRouteFacts: true,
    }),
    "ranking-smoke.json": json({
      status: "DETERMINISTIC_PILOT_SMOKE",
      qualityValidated: false,
      inputId: frozenInput.inputId,
      top10: rank(descending.slice(0, 10)),
      top20: rank(descending.slice(0, 20)),
      bottom10: rank(ascending.slice(0, 10)),
    }),
  };
  outputs["deterministic-replay.json"] = json({
    status: "PASS",
    repeatBuildsByteStable: true,
    inputSha256: sha(inputText),
    canonicalDatasetSha256: runtimeManifest.datasetSha256,
    baselineArtifactSha256: baselineManifest.artifactSha256,
    files: Object.fromEntries(
      Object.entries(outputs).map(([name, content]) => [name, sha(content)]),
    ),
  });
  return { outputs, poiRows, cellRows, resultRows, notApplicableCells };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { outputs } = await buildRealPilot100();
  mkdirSync(OUT, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    const path = new URL(name, OUT);
    if (process.argv.includes("--check"))
      assert.equal(readFileSync(path, "utf8"), content, name);
    else writeFileSync(path, content);
  }
  console.log(
    `TASK-084 real Pilot: 100 POIs, 43 dimensions, 4,300 cells, 100 aggregates; ${process.argv.includes("--check") ? "replay PASS" : "generated"}`,
  );
}
