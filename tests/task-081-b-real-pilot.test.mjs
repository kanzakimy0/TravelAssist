import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { POI_FEATURE_CODES } from "../src/shared/contracts/planning/features.ts";
import { parseCanonicalPoiDatasetV1 } from "../src/shared/contracts/poi/validation.ts";
import { canonicalPoiRuntimeRepository } from "../src/server/poi-runtime/repository.ts";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const dataset = read("src/shared/data/canonical-poi-pilot100.v1.json");
const runtime = read(
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const sample = read("data/poi/canonical/pilot-100/sample-manifest.v1.json");
const source = read(
  "docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json",
);
const overlay = read(
  "src/shared/data/canonical-poi-pilot100.feature43-overlay.v1.json",
);
const overlayManifest = read(
  "src/shared/data/canonical-poi-pilot100.feature43-overlay.manifest.v1.json",
);
const coverage = read("docs/qa/TASK-081-B/coverage-statistics.v1.json");
const provenance = read("docs/qa/TASK-081-B/provenance-audit.v1.json");
const decisions = readFileSync(
  "docs/qa/TASK-081-B/field-decisions.v1.jsonl",
  "utf8",
)
  .trimEnd()
  .split("\n")
  .map((line) => JSON.parse(line));
const unresolved = readFileSync(
  "docs/qa/TASK-081-B/unresolved-ledger.v1.jsonl",
  "utf8",
)
  .trimEnd()
  .split("\n")
  .map((line) => JSON.parse(line));

test("Pilot identity is exactly the admitted 100 with immutable admission snapshot", () => {
  assert.equal(runtime.runtimeImportAuthorized, true);
  assert.equal(runtime.candidateCorpusAuthorized, false);
  assert.equal(sha(JSON.stringify(dataset)), runtime.datasetSha256);
  assert.equal(
    sha(readFileSync("src/shared/data/canonical-poi-pilot100.v1.json")),
    runtime.datasetFileSha256,
  );
  assert.deepEqual(
    sample.records.map((row) => row.internalId),
    runtime.internalIds,
  );
  assert.deepEqual(
    overlay.records.map((row) => row.internalId),
    runtime.internalIds,
  );
  assert.deepEqual(
    overlay.records.map((row) => row.masterCode),
    runtime.masterCodes,
  );
  assert.equal(new Set(runtime.internalIds).size, 100);
  assert.equal(new Set(runtime.masterCodes).size, 100);
  assert.ok(dataset.records.every((row) => row.features === null));
  assert.equal(overlay.baseDatasetSha256, runtime.datasetSha256);
  assert.equal(overlay.sampleSelectionSha256, sample.selectionSha256);
  assert.equal(overlayManifest.overlaySha256, sha(JSON.stringify(overlay)));
  assert.equal(
    overlayManifest.overlayFileSha256,
    sha(
      readFileSync(
        "src/shared/data/canonical-poi-pilot100.feature43-overlay.v1.json",
      ),
    ),
  );
});

test("all 4,300 decisions are field-level, unique, provenance-bound, and null-safe", () => {
  assert.equal(decisions.length, 4300);
  assert.equal(unresolved.length, coverage.unresolvedCount);
  assert.equal(new Set(decisions.map((row) => row.reviewRef)).size, 4300);
  assert.equal(POI_FEATURE_CODES.length, 43);
  for (let index = 0; index < 100; index += 1) {
    const poi = dataset.records[index];
    const capsule = source.records[index];
    const cells = decisions.slice(index * 43, (index + 1) * 43);
    assert.deepEqual(
      cells.map((row) => row.featureCode),
      POI_FEATURE_CODES,
    );
    assert.ok(cells.every((row) => row.internalId === poi.internalId));
    assert.ok(cells.every((row) => row.masterCode === poi.masterCode));
    assert.ok(cells.every((row) => row.sourceRefs.includes(capsule.sourceRef)));
    assert.ok(
      cells.every(
        (row) => row.inspectedSourceSha256 === capsule.responseSha256,
      ),
    );
    assert.ok(cells.every((row) => row.decisionReason && row.reviewRef));
    assert.ok(
      cells.every((row) => row.value === null || Number.isInteger(row.value)),
    );
    for (const row of cells) {
      if (row.value === null) {
        assert.ok(
          row.state === "UNRESOLVED_NO_EVIDENCE" ||
            row.state === "LOW_CONFIDENCE_REVIEW",
        );
        assert.equal(row.evidenceHash, null);
      } else {
        assert.equal(row.state, "RESOLVED_INFERRED");
        assert.ok(row.evidenceLocator && row.evidenceHash);
        assert.ok(row.confidence >= 0.7);
        assert.ok(
          capsule.sourcePropertyIds.includes(row.evidenceClaim.property),
        );
      }
    }
    const expected = Object.fromEntries(
      cells.map((row) => [row.featureCode, row.value]),
    );
    const actual =
      overlay.records[index].features?.values ??
      Object.fromEntries(POI_FEATURE_CODES.map((code) => [code, null]));
    assert.deepEqual(actual, expected);
  }
  assert.equal(
    decisions.filter((row) => row.value !== null).length,
    coverage.resolvedCount,
  );
  assert.equal(
    decisions.filter((row) => row.state === "LOW_CONFIDENCE_REVIEW").length,
    coverage.lowConfidenceCount,
  );
  assert.equal(
    decisions.filter((row) => row.value === 0 || row.value === 5).length,
    0,
  );
  assert.equal(coverage.unexplainedDelta, 0);
  assert.equal(provenance.resolvedWithHashCount, coverage.resolvedCount);
  assert.equal(
    provenance.unresolvedWithReviewRefCount,
    coverage.unresolvedCount,
  );
});

test("runtime projects only validated canonical features and preserves 84 unscored POIs", async () => {
  const records = await canonicalPoiRuntimeRepository.list();
  assert.equal(records.length, 100);
  assert.equal(
    records.filter((row) => row.features === null).length,
    coverage.poiCoverageBins["0"],
  );
  const parsed = parseCanonicalPoiDatasetV1({
    ...dataset,
    records,
  });
  assert.equal(parsed.ok, true, JSON.stringify(parsed.issues));
  assert.deepEqual(
    records.map((row) => row.internalId),
    runtime.internalIds,
  );
  assert.equal(
    records.reduce(
      (count, row) =>
        count +
        Object.values(row.features?.values ?? {}).filter(
          (value) => value !== null,
        ).length,
      0,
    ),
    coverage.afterNonNull,
  );
});

test("all generated artifacts replay exactly from pinned evidence", () => {
  const run = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/register-route-ts.mjs",
      "tools/qa/task-081-b-real-pilot.mjs",
      "--check",
    ],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr + run.stdout);
});
