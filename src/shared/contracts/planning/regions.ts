import type {
  Instant,
  PlanningContractVersion,
  PlanningId,
  PlanningRange,
} from "./common";

export const REGION_TYPES = [
  "country",
  "macro_area",
  "prefecture",
  "municipality",
  "travel_region",
  "district",
  "stay_cluster",
  "onsen_resort",
  "gateway",
] as const;
export type RegionType = (typeof REGION_TYPES)[number];

export const REGION_RELATION_TYPES = [
  "contains",
  "adjacent",
  "overlaps",
  "gateway_of",
] as const;
export type RegionRelationType = (typeof REGION_RELATION_TYPES)[number];

export type GatewayProfileV1 = {
  gatewayKind: "rail" | "airport" | "bus" | "port" | "road" | "mixed";
  transportNodeRefs: PlanningId[];
  servedRegionRefs: PlanningId[];
  luggageEasePrior: number | null;
  transferEasePrior: number | null;
  centralityPrior: number | null;
  sourceRefs: PlanningId[];
  confidence: number | null;
};

export type TravelRegionNodeV1 = {
  contractVersion: PlanningContractVersion;
  schemaVersion: "1.0";
  regionId: PlanningId;
  masterCode: string;
  regionType: RegionType;
  names: {
    nameJa: string | null;
    nameZhCn: string | null;
    nameEn: string | null;
    aliases: string[];
  };
  center: { longitude: number; latitude: number } | null;
  geometryRef: PlanningId | null;
  geometryKind: "administrative" | "tourism" | "cluster" | "point" | "unknown";
  gatewayProfile: GatewayProfileV1 | null;
  sourceRefs: PlanningId[];
  revision: number;
};

export type RegionRelationV1 = {
  relationId: PlanningId;
  relationType: RegionRelationType;
  fromRegionRef: PlanningId;
  toRegionRef: PlanningId;
  confidence: number | null;
  sourceRefs: PlanningId[];
  validFrom: Instant | null;
  validUntil: Instant | null;
  lifecycleStatus: "active" | "deprecated";
  revision: number;
};

export type TravelEdgeVariantV1 = {
  variantId: PlanningId;
  mode:
    "rail" | "bus" | "car" | "flight" | "ferry" | "walk" | "mixed" | "other";
  gatewayFromRef: PlanningId | null;
  gatewayToRef: PlanningId | null;
  typicalDurationMinutes: PlanningRange;
  typicalCostJpy: PlanningRange;
  typicalTransfers: PlanningRange;
  typicalWalkMinutes: PlanningRange;
  frequencyBand:
    "very_high" | "high" | "medium" | "low" | "very_low" | "unknown";
  reservationPrior:
    | "usually_not_needed"
    | "optional"
    | "often_recommended"
    | "usually_required"
    | "unknown";
  sourceRefs: PlanningId[];
  observedAt: Instant | null;
  validUntil: Instant | null;
  confidence: number | null;
};

export type TravelEdgeV1 = {
  contractVersion: PlanningContractVersion;
  edgeId: PlanningId;
  fromRegionRef: PlanningId;
  toRegionRef: PlanningId;
  scope: "macro" | "local" | "gateway";
  planningPrior: {
    tripCompatibility: number | null;
    dayTripFit: number | null;
    sameDayTransitionFit: number | null;
    overnightTransitionFit: number | null;
    scenicTransition: number | null;
    slowTravelFit: number | null;
    luggageEase: number | null;
    reliabilityPrior: number | null;
    detourPenaltyPrior: number | null;
  };
  recommendedStayAfterArrivalDays: number | null;
  variants: TravelEdgeVariantV1[];
  sourceRefs: PlanningId[];
  confidence: number | null;
  revision: number;
  lifecycleStatus: "active" | "deprecated" | "seasonal";
};

/** Static sparse planning graph. Live route/timetable truth stays in the Route contract. */
export type TravelRegionGraphV1 = {
  contractVersion: PlanningContractVersion;
  graphSchemaVersion: "1.0";
  graphDataRevision: string;
  nodes: TravelRegionNodeV1[];
  relations: RegionRelationV1[];
  travelEdges: TravelEdgeV1[];
};
