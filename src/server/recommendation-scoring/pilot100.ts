import "server-only";

import runtimeManifestJson from "../../shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import { parseCanonicalPoiV1 } from "../../shared/contracts/poi/validation";
import {
  CanonicalPoiRuntimeIntegrityError,
  canonicalPoiRuntimeRepository,
} from "../poi-runtime/repository";
import type { AuthorizedRecommendationPoiRepository } from "./service";

/**
 * TASK-083's repository validates the manifest, dataset and active Master Codes
 * before this adapter can be constructed. This adds no candidate-data fallback.
 */
export const pilot100RecommendationRepository: AuthorizedRecommendationPoiRepository =
  Object.freeze({
    scope: "CANONICAL_POI_PILOT_100" as const,
    runtimeImportAuthorized: true as const,
    datasetRevision: canonicalPoiRuntimeRepository.datasetRevision,
    featureBaselineRevision:
      canonicalPoiRuntimeRepository.featureBaselineRevision,
    internalIds: Object.freeze([...runtimeManifestJson.internalIds]),
    async getByInternalId(internalId: string) {
      const record =
        await canonicalPoiRuntimeRepository.getByInternalId(internalId);
      if (record === null) return null;
      const parsed = parseCanonicalPoiV1(record);
      if (!parsed.ok) throw new CanonicalPoiRuntimeIntegrityError();
      return parsed.value;
    },
  });
