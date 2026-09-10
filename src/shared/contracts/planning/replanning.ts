import type { Instant, PlanningContractVersion, PlanningId } from "./common";

export const REPLAN_SCOPES = [
  "current_item",
  "current_timeslot",
  "rest_of_day",
  "next_n_days",
  "remaining_trip",
  "macro_remaining_trip",
] as const;
export type ReplanScopeV1 = (typeof REPLAN_SCOPES)[number];

export const REPLAN_TRIGGER_TYPES = [
  "user_request",
  "schedule_drift",
  "overrun",
  "underrun",
  "fatigue_update",
  "location_deviation",
  "weather_change",
  "transport_delay",
  "transport_cancelled",
  "route_unavailable",
  "place_closed",
  "opening_fact_change",
  "booking_fact_change",
  "missed_anchor",
  "constraint_change",
  "provider_fact_change",
  "system_feasibility_violation",
] as const;
export type ReplanTriggerTypeV1 = (typeof REPLAN_TRIGGER_TYPES)[number];

export type RuntimeOverlaySnapshotV1 = {
  contractVersion: PlanningContractVersion;
  tripRef: PlanningId;
  planRef: PlanningId;
  runtimeRevision: number;
  currentDayRef: PlanningId | null;
  currentItemRef: PlanningId | null;
  executionStateByItem: Record<
    PlanningId,
    | "PLANNED"
    | "READY"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED"
    | "BLOCKED"
  >;
  observedAt: Instant;
};

export type ReplanTriggerV1 = {
  contractVersion: PlanningContractVersion;
  triggerId: PlanningId;
  triggerType: ReplanTriggerTypeV1;
  subjectRef: PlanningId;
  effectiveAt: Instant;
  observedAt: Instant;
  sourceRef: PlanningId;
  severity: "info" | "warning" | "critical";
  correlationId: PlanningId | null;
};

export type ReplanProtectionSummaryV1 = {
  completedImmutableRefs: PlanningId[];
  inProgressProtectedRefs: PlanningId[];
  userLockedRefs: PlanningId[];
  bookingProtectedRefs: PlanningId[];
  paymentProtectedRefs: PlanningId[];
  systemHardRefs: PlanningId[];
};

export type ReplanAssessmentV1 = {
  contractVersion: PlanningContractVersion;
  runId: PlanningId;
  triggerRef: PlanningId;
  status:
    | "no_action"
    | "repairable"
    | "needs_fact"
    | "needs_user_confirmation"
    | "blocked_no_feasible_repair";
  scope: ReplanScopeV1;
  nextNDays: number | null;
  earliestMutableAt: Instant;
  affectedRefs: PlanningId[];
  protection: ReplanProtectionSummaryV1;
  nextHardAnchorRef: PlanningId | null;
  scheduleOffsetMinutes: number;
  fatigueDelta: number | null;
  issueCodes: string[];
  factRefs: PlanningId[];
  baseTripRevision: number;
  basePlanRevision: number;
  baseRuntimeRevision: number;
};

export type RepairAttemptV1 = {
  attemptId: PlanningId;
  strategyCode: string;
  status: "accepted" | "rejected" | "partial" | "needs_ai";
  issueCodesBefore: string[];
  issueCodesAfter: string[];
  affectedRefs: PlanningId[];
  elapsedMilliseconds: number | null;
};

export type ReplanProposalV1 = {
  contractVersion: PlanningContractVersion;
  proposalId: PlanningId;
  runId: PlanningId;
  triggerRef: PlanningId;
  scope: ReplanScopeV1;
  earliestMutableAt: Instant;
  baseTripRevision: number;
  basePlanRevision: number;
  baseRuntimeRevision: number;
  selectedRepairAttemptRef: PlanningId;
  repairAttempts: RepairAttemptV1[];
  protectedRefs: PlanningId[];
  affectedRefs: PlanningId[];
  factRefs: PlanningId[];
  reasonCodes: string[];
  changeSetRef: PlanningId | null;
};
