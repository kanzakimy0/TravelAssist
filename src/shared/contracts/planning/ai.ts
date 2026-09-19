import type { PlanningContractVersion, PlanningId } from "./common";
import type { SparsePreferenceV1 } from "./features";

export const AI_TASK_TYPES = [
  "macro_corridor_choice",
  "region_choice",
  "stay_cluster_choice",
  "poi_choice",
  "poi_order",
  "poi_replacement",
  "day_balance_choice",
  "route_alternative_choice",
  "replan_soft_choice",
  "semantic_preference_resolution",
] as const;
export type AiTaskTypeV1 = (typeof AI_TASK_TYPES)[number];

export const AI_CONTEXT_EXPANSION_CODES = [
  "need_route_detail",
  "need_weather_detail",
  "need_score_detail",
  "need_adjacent_day",
  "need_semantic_detail",
  "need_stay_context",
] as const;
export type AiContextExpansionCodeV1 =
  (typeof AI_CONTEXT_EXPANSION_CODES)[number];

export type ContextScopeV1 = {
  kind: "trip" | "region" | "day" | "timeslot" | "item" | "event";
  tripRef: PlanningId;
  dayIndex: number | null;
  regionLocalId: number | null;
  itemLocalId: number | null;
  window: readonly [startMinute: number, endMinute: number] | null;
};

export type TripCompactStateV1 = {
  tripDays: number;
  macroPath: number[];
  currentRegion: number | null;
  currentDay: number | null;
  currentWindow: readonly [number, number] | null;
  partySummary: string;
  budgetBand: string | null;
  tripStyle: string | null;
  lockedAnchors: number[];
  completedRefs: number[];
  inProgressRef: number | null;
  currentLoad: readonly [walking: number, physical: number] | null;
  adjacentBoundary: string | null;
};

export type ConstraintCompactV1 = {
  code: string;
  targetLocalId: number | null;
  value: string | number | boolean | null;
  hard: boolean;
};

export type CandidateProjectionV1 = {
  id: number;
  entityKind: "poi" | "region" | "corridor" | "route" | "item" | "stay_cluster";
  status: "candidate" | "blocked";
  name: string | null;
  metrics: Record<string, number | string | boolean | null>;
  reasonTags: string[];
};

export type RouteCompactV1 = {
  id: number | null;
  routeRef: PlanningId;
  source: "live_fact" | "planning_prior";
  durationMinutes: number;
  fareMinor: number | null;
  currency: string | null;
  transfers: number | null;
  walkMinutes: number | null;
  reliability: number | null;
  arrivalMinute: number | null;
  departureMinute: number | null;
  freshness: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNKNOWN";
  flags: string[];
};

export type WeatherCompactV1 = {
  rainRisk: number | null;
  heatRisk: number | null;
  coldRisk: number | null;
  snowValue: number | null;
  outdoorFit: number | null;
  transportRisk: number | null;
  volatility: number | null;
  freshness: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNKNOWN";
};

export type DecisionRequestV1 = {
  kind: "choose" | "order" | "patch" | "resolve_preference";
  minimumSelections: number;
  maximumSelections: number;
  orderTargetIds: number[];
  allowedOperations: AiCompactOperationCodeV1[];
};

export type AiCompactContextV1 = {
  contractVersion: PlanningContractVersion;
  v: "1";
  runId: PlanningId;
  task: AiTaskTypeV1;
  scope: ContextScopeV1;
  state: TripCompactStateV1;
  preference: SparsePreferenceV1 | null;
  constraints: ConstraintCompactV1[];
  candidates: CandidateProjectionV1[];
  route: RouteCompactV1 | null;
  weather: WeatherCompactV1 | null;
  request: DecisionRequestV1;
  precision: "normal" | "fine";
};

/** Kept inside the trusted gateway and not serialized into AiCompactContextV1. */
export type LocalIdMapV1 = {
  runId: PlanningId;
  entries: {
    localId: number;
    entityKind: CandidateProjectionV1["entityKind"];
    domainRef: PlanningId;
    candidate: boolean;
  }[];
};

export const AI_DECISION_STATUSES = [
  "decision",
  "need_more_context",
  "no_valid_choice",
  "abstain",
] as const;
export type AiDecisionStatusV1 = (typeof AI_DECISION_STATUSES)[number];

export const AI_COMPACT_OPERATION_CODES = [
  "ADD",
  "REMOVE",
  "REPLACE",
  "MOVE_BEFORE",
  "MOVE_AFTER",
  "REORDER",
  "CHOOSE_ROUTE",
  "SET_VISIT_MODE",
] as const;
export type AiCompactOperationCodeV1 =
  (typeof AI_COMPACT_OPERATION_CODES)[number];

export type AiCompactOpV1 =
  | { op: "ADD"; candidateId: number; afterItemId: number | null }
  | { op: "REMOVE"; itemId: number }
  | { op: "REPLACE"; itemId: number; candidateId: number }
  | { op: "MOVE_BEFORE"; itemId: number; anchorItemId: number }
  | { op: "MOVE_AFTER"; itemId: number; anchorItemId: number }
  | { op: "REORDER"; orderedItemIds: number[] }
  | { op: "CHOOSE_ROUTE"; routeId: number }
  | { op: "SET_VISIT_MODE"; itemId: number; visitModeCode: string };

export type AiChoiceDecisionV1 = {
  kind: "choice";
  selectedIds: number[];
  backupIds: number[];
};
export type AiOrderingDecisionV1 = {
  kind: "ordering";
  orderedIds: number[];
};
export type AiPatchDecisionV1 = {
  kind: "patch";
  operations: AiCompactOpV1[];
  backupIds: number[];
};
export type AiSemanticPreferenceDecisionV1 = {
  kind: "semantic_preference";
  soft: {
    featureCode: string;
    value: number;
    targetLayer: "trip_override" | "learning_proposal";
    evidenceKind: "explicit_user" | "inferred";
  }[];
  hardConstraintCandidates: {
    constraintCode: string;
    evidenceKind: "explicit_user";
  }[];
};
export type AiDecisionPayloadV1 =
  | AiChoiceDecisionV1
  | AiOrderingDecisionV1
  | AiPatchDecisionV1
  | AiSemanticPreferenceDecisionV1;

export type AiContextExpansionRequestV1 = {
  needs: AiContextExpansionCodeV1[];
  targetIds: number[];
};

export type AiDecisionResponseV1 = {
  contractVersion: PlanningContractVersion;
  v: "1";
  runId: PlanningId;
  task: AiTaskTypeV1;
  status: AiDecisionStatusV1;
  decision: AiDecisionPayloadV1 | null;
  contextRequest: AiContextExpansionRequestV1 | null;
  reasonCodes: string[];
  confidenceBand: "low" | "medium" | "high" | null;
  uncertaintyCodes: string[];
};

export type AiDecisionValidationContext = {
  runId: PlanningId;
  task: AiTaskTypeV1;
  localIdMap: LocalIdMapV1;
  request: DecisionRequestV1;
};
