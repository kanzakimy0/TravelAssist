import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import manifest from "../src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import baseline from "../src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json" with { type: "json" };
import { POI_FEATURE_CODES } from "../src/shared/contracts/planning/features.ts";
import { toLongTermPreferenceReadV1 } from "../src/shared/contracts/preferences/read.ts";
import { pilot100RecommendationRepository } from "../src/server/recommendation-scoring/pilot100.ts";
import { scoreAuthorizedCanonicalPoiV1 } from "../src/server/recommendation-scoring/service.ts";
import { buildRealPilot100 } from "../tools/qa/task-084-real-pilot100.mjs";

const out = new URL("../docs/qa/TASK-084/real-pilot100/", import.meta.url);
const read = (name) => readFileSync(new URL(name, out), "utf8");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const rows = (name) => read(name).trimEnd().split("\n").map(JSON.parse);

test("frozen Canonical Pilot has 100 admitted IDs, 43 cells each and no fabricated values", () => {
  const pois = JSON.parse(read("pilot-pois.v1.json"));
  const cells = rows("feature43-match-matrix.jsonl");
  const results = rows("poi-match-results.jsonl");
  assert.equal(pois.pois.length, 100);
  assert.equal(cells.length, 4300);
  assert.equal(results.length, 100);
  assert.deepEqual(
    pois.pois.map((poi) => poi.poiId),
    manifest.internalIds,
  );
  assert.deepEqual(
    pois.pois.map((poi) => poi.masterCode),
    manifest.masterCodes,
  );
  assert.equal(
    new Set(cells.map((row) => `${row.poiId}:${row.featureCode}`)).size,
    4300,
  );
  assert.equal(new Set(results.map((row) => row.poiId)).size, 100);
  for (let i = 0; i < 100; i += 1) {
    const group = cells.slice(i * 43, (i + 1) * 43);
    assert.deepEqual(
      group.map((row) => row.featureCode),
      POI_FEATURE_CODES,
    );
    assert.ok(group.every((row) => row.poiId === manifest.internalIds[i]));
    assert.ok(group.every((row) => row.masterCode === manifest.masterCodes[i]));
    assert.ok(
      group.every(
        (row) =>
          row.baselineFeatureValue ===
          baseline.records[i].featureSet.values[row.featureCode],
      ),
    );
    assert.ok(group.every((row) => row.confidence === null));
    assert.ok(
      group.every((row) =>
        row.trace.every((trace) =>
          trace.featureProvenanceRef.startsWith("TRUSTED_INTERNAL_BASELINE:"),
        ),
      ),
    );
    assert.equal(
      results[i].aggregateRecomputationTrace.matchScore.value,
      results[i].matchScore.value,
    );
  }
  assert.equal(
    cells.filter((row) => row.signalSource === "not_applicable").length,
    2000,
  );
  assert.ok(
    cells.every(
      (row) =>
        row.normalizedContribution === null ||
        (row.normalizedContribution >= -1 && row.normalizedContribution <= 1),
    ),
  );
  assert.ok(results.every((row) => row.constraintGate.status === "PASS"));
});

test("all Pilot outputs replay byte-for-byte and published hashes match", async () => {
  const first = await buildRealPilot100();
  const second = await buildRealPilot100();
  const replay = JSON.parse(read("deterministic-replay.json"));
  assert.deepEqual(first.outputs, second.outputs);
  for (const [name, content] of Object.entries(first.outputs)) {
    assert.equal(read(name), content);
    if (name !== "deterministic-replay.json")
      assert.equal(replay.files[name], sha(content));
  }
  assert.equal(replay.status, "PASS");
  assert.equal(first.notApplicableCells, 2000);
});

test("candidate-only ID fails closed and hard closure cannot be averaged into a score", async () => {
  const input = JSON.parse(read("pilot-input.v1.json"));
  const longTerm = toLongTermPreferenceReadV1(input.longTerm);
  const common = {
    repository: pilot100RecommendationRepository,
    longTerm,
    context: input.context,
  };
  assert.deepEqual(
    await scoreAuthorizedCanonicalPoiV1({
      ...common,
      poiId: "candidate:unadmitted",
    }),
    { status: "unavailable", reason: "POI_NOT_IN_AUTHORIZED_SET" },
  );
  const rejected = await scoreAuthorizedCanonicalPoiV1({
    ...common,
    poiId: manifest.internalIds[0],
    constraints: { schedule: { evaluationRequired: true, open: false } },
  });
  assert.equal(rejected.status, "scored");
  assert.equal(rejected.result.constraintGate.status, "REJECT");
  assert.deepEqual(rejected.result.constraintGate.reasonCodes, [
    "SCHEDULE_CLOSED",
  ]);
  assert.equal(rejected.result.matchScore.value, null);
});
