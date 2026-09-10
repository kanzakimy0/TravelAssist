import type { Instant, PlanningContractVersion, PlanningId } from "./common";
import type { PoiFeatureSetV1 } from "./features";

export const VISIT_MODES = [
  "full_visit",
  "quick_visit",
  "photo_stop",
  "exterior_only",
  "pass_through",
  "custom",
] as const;
export type VisitMode = (typeof VISIT_MODES)[number] | (string & {});

/**
 * Load values are normalized planning priors in 0..9. They describe fixed and
 * duration-variable portions of a standard visit, not actual traveler fatigue.
 */
export type PoiVisitProfileV1 = {
  contractVersion: PlanningContractVersion;
  profileVersion: "1.0";
  profileId: PlanningId;
  poiRef: PlanningId;
  visitMode: VisitMode;
  status: "active" | "deprecated";
  minimumDurationMinutes: number | null;
  recommendedDurationMinutes: number | null;
  maximumUsefulDurationMinutes: number | null;
  fixedWalkingLoad: number | null;
  variableWalkingLoad: number | null;
  fixedPhysicalLoad: number | null;
  variablePhysicalLoad: number | null;
  terrainModifier: number | null;
  standingModifier: number | null;
  sourceRefs: PlanningId[];
  confidence: number | null;
  updatedAt: Instant;
};

export type PoiPlanningProjectionV1 = {
  contractVersion: PlanningContractVersion;
  poiRef: PlanningId;
  featureSet: PoiFeatureSetV1;
  visitProfiles: PoiVisitProfileV1[];
  regionRefs: PlanningId[];
  factRefs: PlanningId[];
};

export type VisitInstanceV1 = {
  contractVersion: PlanningContractVersion;
  poiRef: PlanningId;
  visitProfileRef: PlanningId;
  visitMode: VisitMode;
  plannedDurationMinutes: number;
  scheduledStart: Instant | null;
  scheduledEnd: Instant | null;
};
