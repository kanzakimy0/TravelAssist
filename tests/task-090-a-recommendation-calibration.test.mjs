import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import manifest from "../src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import { interestCodes } from "../src/shared/contracts/preferences/index.ts";
import { SCORING_CONFIG_VERSION } from "../src/shared/recommendation-scoring/config.ts";
import {
  buildCalibration,
  buildProbeCatalog,
} from "../tools/qa/task-090-calibration.mjs";

const out = new URL("../docs/qa/TASK-090-A/", import.meta.url);
const read = (name) => readFileSync(new URL(name, out), "utf8");
const rows = (name) => read(name).trimEnd().split("\n").map(JSON.parse);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const calibration = buildCalibration();

test("every probe is uniquely identified, isolated, and mapped to a supported input", () => {
  const probes = buildProbeCatalog();
  assert.equal(probes.length, 98);
  assert.equal(new Set(probes.map((probe) => probe.probeId)).size, 98);
  assert.equal(
    probes.filter((probe) => probe.family === "interest").length,
    interestCodes.length * 2,
  );
  for (const probe of probes) {
    assert.ok(probe.factor);
    assert.ok(probe.expectedFeatureCodes.every((code) => /^\d{2}$/.test(code)));
    assert.ok(
      probe.expectedUnaffectedComponents.every(
        (name) => name !== probe.targetComponent,
      ),
    );
    assert.notDeepEqual(probe.stateA, probe.stateB);
    for (const key of ["preferenceValues", "context", "constraints"]) {
      if (
        !probe.factor.startsWith(
          key === "preferenceValues"
            ? "interests."
            : key === "context"
              ? "context."
              : "constraints.",
        ) &&
        ![
          "walking",
          "queue",
          "discovery",
          "mobility.noPublicTransit",
          "mobility.noBus",
          "mobility.noFerry",
        ].some((prefix) => probe.factor.includes(prefix))
      ) {
        assert.deepEqual(
          probe.stateA[key],
          probe.stateB[key],
          `${probe.probeId}: ${key} must stay frozen`,
        );
      }
    }
  }
  const interests = probes.filter((probe) => probe.family === "interest");
  for (const code of interestCodes) {
    assert.equal(
      interests.filter((probe) => probe.factor.endsWith(`.${code}`)).length,
      2,
    );
  }
});

test("all observations use only the frozen 100 admitted Canonical IDs and recomputable deltas", async () => {
  const { probes, observations, rankDeltas } = await calibration;
  assert.equal(manifest.internalIds.length, 100);
  assert.equal(observations.length, 9800);
  assert.equal(rankDeltas.length, 9800);
  assert.equal(
    new Set(observations.map((row) => `${row.probeId}:${row.poiId}`)).size,
    9800,
  );
  const allowed = new Map(
    manifest.internalIds.map((id, index) => [id, manifest.masterCodes[index]]),
  );
  for (let index = 0; index < observations.length; index += 1) {
    const row = observations[index];
    assert.equal(row.masterCode, allowed.get(row.poiId));
    assert.equal(row.probeId, probes[Math.floor(index / 100)].probeId);
    const a = row.stateA.matchScore,
      b = row.stateB.matchScore;
    assert.equal(row.delta.matchScore, a === null || b === null ? null : b - a);
    const rankA = row.stateA.rank,
      rankB = row.stateB.rank;
    assert.equal(
      row.delta.rank,
      rankA === null || rankB === null ? null : rankA - rankB,
    );
    assert.equal(rankDeltas[index].rankDelta, row.delta.rank);
    assert.equal(row.scoringConfigVersion, SCORING_CONFIG_VERSION);
    for (const trace of row.observedFeatureContributionDelta) {
      assert.equal(
        trace.delta,
        trace.before === null || trace.after === null
          ? null
          : trace.after - trace.before,
      );
    }
  }
});

test("directional, ordinal, isolation, anchor, and hard-constraint gates pass", async () => {
  const {
    calibrationSummary: summary,
    ordinal,
    anchorRows,
    summaries,
    observations,
  } = await calibration;
  assert.ok(summary.directionalPassRate >= 0.95);
  assert.ok(summary.counterDirectionRate <= 0.02);
  assert.equal(summary.unexplainedComponentMovementCount, 0);
  assert.equal(summary.hardConstraintPassRate, 1);
  assert.ok(anchorRows.length >= 30);
  assert.ok(anchorRows.every((row) => row.pass));
  assert.ok(
    ordinal
      .filter(
        (row) =>
          !["discovery", "season_sequence", "time_sequence"].includes(
            row.group,
          ) && row.monotonicityRate !== null,
      )
      .every((row) => row.monotonicityRate === 1),
  );
  assert.ok(
    ordinal
      .filter((row) =>
        ["discovery", "season_sequence", "time_sequence"].includes(row.group),
      )
      .every((row) => row.monotonicityRate === null),
  );
  assert.ok(
    summaries
      .filter((row) => row.expectedGate)
      .every((row) => row.hardGateCorrectCount === 100),
  );
  assert.ok(
    observations
      .filter((row) => row.directionCheck === "BLOCKED")
      .every(
        (row) => row.stateB.matchScore === null && row.stateB.rank === null,
      ),
  );
});

test("anomaly ledger is complete and never suppresses counter-direction or no-effect observations", async () => {
  const { observations, anomalies } = await calibration;
  const flagged = observations.filter(
    (row) =>
      row.directionCheck === "COUNTER_DIRECTION" ||
      (row.directionCheck === "NO_EFFECT" &&
        row.expectedDirection !== "not_applicable") ||
      row.unexpectedComponentChanges.length,
  );
  assert.equal(anomalies.length, flagged.length);
  assert.deepEqual(
    new Set(anomalies.map((row) => `${row.probeId}:${row.poiId}`)),
    new Set(flagged.map((row) => `${row.probeId}:${row.poiId}`)),
  );
  assert.ok(
    anomalies.every((row) =>
      [
        "expected interaction",
        "config issue",
        "mapping issue",
        "data issue",
        "scorer bug",
        "needs review",
      ].includes(row.classification),
    ),
  );
  assert.ok(anomalies.every((row) => row.responsibleTrace.length > 0));
});

test("no named-POI patch, frozen config hash, and byte-stable deterministic replay", async () => {
  const { files } = await calibration;
  const replay = JSON.parse(files["deterministic-replay.json"]);
  assert.equal(replay.canonicalDatasetSha256, manifest.datasetSha256);
  assert.equal(
    JSON.parse(files["config-before.json"]).scoringConfigVersion,
    SCORING_CONFIG_VERSION,
  );
  assert.equal(files["config-before.json"], files["config-after.json"]);
  assert.ok(
    !readFileSync(
      new URL("../tools/qa/task-090-calibration.mjs", import.meta.url),
      "utf8",
    ).includes("masterCode ==="),
  );
  for (const [name, content] of Object.entries(files)) {
    assert.equal(read(name), content, `${name}: byte-stable replay`);
    if (name !== "deterministic-replay.json")
      assert.equal(replay.files[name], sha(content));
  }
  assert.equal(rows("score-observations.jsonl").length, 9800);
  assert.equal(rows("rank-deltas.jsonl").length, 9800);
});
