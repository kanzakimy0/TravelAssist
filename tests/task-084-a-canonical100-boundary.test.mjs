import assert from "node:assert/strict";
import test from "node:test";

import runtimeManifest from "../src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import { toLongTermPreferenceReadV1 } from "../src/shared/contracts/preferences/read.ts";
import { canonicalPoiRuntimeRepository } from "../src/server/poi-runtime/repository.ts";
import { pilot100RecommendationRepository } from "../src/server/recommendation-scoring/pilot100.ts";
import { scoreAuthorizedCanonicalPoiV1 } from "../src/server/recommendation-scoring/service.ts";

test("100 admitted Canonical IDs are recognized; all 100 missing 43D sets fail closed", async () => {
  const ids = runtimeManifest.internalIds;
  assert.equal(ids.length, 100);
  assert.equal(new Set(ids).size, 100);
  assert.equal(
    pilot100RecommendationRepository.datasetRevision,
    runtimeManifest.datasetRevision,
  );
  assert.deepEqual(pilot100RecommendationRepository.internalIds, ids);
  assert.equal(runtimeManifest.runtimeImportAuthorized, true);
  assert.equal(runtimeManifest.candidateCorpusAuthorized, false);

  const preference = toLongTermPreferenceReadV1({
    preference: { schemaVersion: "1.0", values: {} },
    revision: 0,
    updatedAt: null,
  });
  let recognized = 0;
  let featureUnavailable = 0;
  for (const poiId of ids) {
    const canonical =
      await canonicalPoiRuntimeRepository.getByInternalId(poiId);
    assert.equal(canonical?.internalId, poiId);
    assert.equal(canonical?.features, null);
    recognized += 1;
    const result = await scoreAuthorizedCanonicalPoiV1({
      repository: pilot100RecommendationRepository,
      poiId,
      longTerm: preference,
      context: { contextVersion: "task-084-canonical-boundary-smoke-v1" },
    });
    assert.deepEqual(result, {
      status: "unavailable",
      reason: "FEATURE43_UNAVAILABLE",
    });
    featureUnavailable += 1;
  }
  assert.equal(recognized, 100);
  assert.equal(featureUnavailable, 100);
});
