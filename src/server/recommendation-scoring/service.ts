import "server-only";

import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";
import { parseCanonicalPoiV1 } from "../../shared/contracts/poi/validation";
import type { LongTermPreferenceReadV1 } from "../../shared/contracts/preferences/read";
import type { PreferenceV1 } from "../../shared/contracts/preferences/core";
import {
  scorePoiRecommendationV1,
  type HardConstraintInputV1,
  type PoiRecommendationResultV1,
  type ScoringContextV1,
} from "../../shared/recommendation-scoring";

export type AuthorizedRecommendationPoiRepository = {
  readonly scope: "CANONICAL_POI_PILOT_100";
  readonly runtimeImportAuthorized: true;
  readonly datasetRevision: string;
  readonly internalIds: readonly string[];
  getByInternalId(internalId: string): Promise<CanonicalPoiV1 | null>;
};
export type RecommendationServiceResultV1 =
  | { status: "scored"; result: PoiRecommendationResultV1 }
  | {
      status: "unavailable";
      reason:
        | "CANONICAL_RUNTIME_UNAUTHORIZED"
        | "POI_NOT_IN_AUTHORIZED_SET"
        | "POI_NOT_FOUND"
        | "FEATURE43_UNAVAILABLE"
        | "CANONICAL_POI_INVALID";
    };

export async function scoreAuthorizedCanonicalPoiV1(input: {
  repository: AuthorizedRecommendationPoiRepository | null;
  poiId: string;
  longTerm: LongTermPreferenceReadV1;
  tripSnapshot?: PreferenceV1 | null;
  tripSnapshotRef?: string | null;
  tripOverride?: PreferenceV1 | null;
  tripOverrideRevision?: number | null;
  context: ScoringContextV1;
  constraints?: HardConstraintInputV1;
}): Promise<RecommendationServiceResultV1> {
  const repository = input.repository;
  if (
    !repository ||
    repository.scope !== "CANONICAL_POI_PILOT_100" ||
    repository.runtimeImportAuthorized !== true
  )
    return { status: "unavailable", reason: "CANONICAL_RUNTIME_UNAUTHORIZED" };
  if (!repository.internalIds.includes(input.poiId))
    return { status: "unavailable", reason: "POI_NOT_IN_AUTHORIZED_SET" };
  const poi = await repository.getByInternalId(input.poiId);
  if (!poi) return { status: "unavailable", reason: "POI_NOT_FOUND" };
  const parsed = parseCanonicalPoiV1(poi);
  if (!parsed.ok || poi.internalId !== input.poiId)
    return { status: "unavailable", reason: "CANONICAL_POI_INVALID" };
  if (!poi.features)
    return { status: "unavailable", reason: "FEATURE43_UNAVAILABLE" };
  return {
    status: "scored",
    result: scorePoiRecommendationV1({
      poiRef: poi.internalId,
      features: poi.features,
      longTerm: input.longTerm,
      tripSnapshot: input.tripSnapshot,
      tripSnapshotRef: input.tripSnapshotRef,
      tripOverride: input.tripOverride,
      tripOverrideRevision: input.tripOverrideRevision,
      context: input.context,
      constraints: input.constraints,
      dataRevision: repository.datasetRevision,
    }),
  };
}
