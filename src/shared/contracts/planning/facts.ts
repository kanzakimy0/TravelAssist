import type { Instant, PlanningContractVersion, PlanningId } from "./common";

export const FACT_KINDS = [
  "poi_identity",
  "poi_location",
  "poi_operational_calendar",
  "poi_temporary_closure",
  "poi_price",
  "poi_reservation_policy",
  "poi_accessibility",
  "poi_visit_profile",
  "route_plan",
  "route_disruption",
  "transport_timetable",
  "weather_forecast",
  "weather_current",
  "weather_alert",
  "crowd_estimate",
  "queue_estimate",
  "booking_status",
  "booking_policy",
  "inventory_availability",
  "live_price",
  "runtime_location",
  "runtime_item_state",
  "runtime_schedule_offset",
] as const;
export type FactKindV1 = (typeof FACT_KINDS)[number];

export const SOURCE_KINDS = [
  "official",
  "provider",
  "open_data",
  "human_verified",
  "user_confirmed",
  "runtime_observed",
  "derived",
  "master_prior",
  "ai_labeled",
] as const;
export type SourceKindV1 = (typeof SOURCE_KINDS)[number];
export type AuthorityBandV1 = "A" | "B" | "C" | "D";

export const FRESHNESS_STATES = [
  "CURRENT",
  "AGING",
  "STALE",
  "EXPIRED",
  "UNKNOWN",
] as const;
export type FreshnessStateV1 = (typeof FRESHNESS_STATES)[number];

export const FACT_USABILITY_ACTIONS = [
  "USE",
  "USE_WITH_WARNING",
  "REFRESH",
  "FALLBACK",
  "BLOCK",
] as const;
export type FactUsabilityActionV1 = (typeof FACT_USABILITY_ACTIONS)[number];

export const DECISION_USES = [
  "DISCOVERY",
  "DRAFT_PLANNING",
  "PLAN_CONFIRMATION",
  "LIVE_EXECUTION",
  "MUTATION_PROTECTION",
  "MONEY_OR_BOOKING_ACTION",
] as const;
export type DecisionUseV1 = (typeof DECISION_USES)[number];

export type PlanningFactRefV1 = {
  contractVersion: PlanningContractVersion;
  factId: PlanningId;
  factKind: FactKindV1;
  subjectRef: PlanningId;
  source: {
    sourceKind: SourceKindV1;
    provider: string | null;
    sourceRef: PlanningId;
    authorityBand: AuthorityBandV1;
  };
  observedAt: Instant;
  effectiveAt: Instant | null;
  validFrom: Instant | null;
  validUntil: Instant | null;
  /** Decision safety horizon; it does not assert that reality changes here. */
  expiresAt: Instant | null;
  confidence: number | null;
  status: "active" | "superseded" | "revoked" | "unknown";
  revision: string | number | null;
};

export type PlanningPriorRefV1 = {
  contractVersion: PlanningContractVersion;
  priorId: PlanningId;
  priorKind: "poi_feature" | "region_profile" | "travel_edge" | "visit_profile";
  subjectRef: PlanningId;
  configVersion: string;
  sourceRefs: PlanningId[];
};

export type FactUsabilityV1 = {
  contractVersion: PlanningContractVersion;
  factRef: PlanningId;
  decisionUse: DecisionUseV1;
  freshness: FreshnessStateV1;
  action: FactUsabilityActionV1;
  reasonCodes: string[];
  evaluatedAt: Instant;
};
