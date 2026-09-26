import {
  PLANNING_CONTRACT_VERSION,
  parsePoiPlanningProjectionV1,
  type PoiPlanningProjectionV1,
} from "../planning";

import type { CanonicalPoiV1, PoiValidationResult } from "./types";
import { parseCanonicalPoiV1 } from "./validation";

/**
 * Deterministic, lossless-for-planning projection. Canonical-only metadata such
 * as Provider IDs, rights, assets and names never crosses this boundary.
 */
export function projectCanonicalPoiToPlanningV1(
  input: unknown,
): PoiValidationResult<PoiPlanningProjectionV1> {
  const canonical = parseCanonicalPoiV1(input);
  if (!canonical.ok) return canonical;
  const poi: CanonicalPoiV1 = canonical.value;
  if (poi.features === null)
    return {
      ok: false,
      issues: [
        { path: "$.features", code: "FEATURE_SET_REQUIRED_FOR_PLANNING" },
      ],
    };

  const projection: PoiPlanningProjectionV1 = {
    contractVersion: PLANNING_CONTRACT_VERSION,
    poiRef: poi.internalId,
    featureSet: structuredClone(poi.features),
    visitProfiles: structuredClone(poi.visitProfiles),
    regionRefs: poi.regionRelations.map(({ regionRef }) => regionRef),
    factRefs: poi.facts.map(({ factId }) => factId),
  };
  const parsed = parsePoiPlanningProjectionV1(projection);
  if (!parsed.ok)
    return {
      ok: false,
      issues: [parsed.issue],
    };
  return { ok: true, value: parsed.value };
}
