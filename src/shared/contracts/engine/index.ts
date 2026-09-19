/** Runtime types for the existing 4.20 / 4.20.1 contract, not a new protocol. */
import type { TripPlanSnapshotV1, PlanItemV1 } from "../trips";
export type OpaqueId = string;
export type Instant = string;

export type ChangeSetV0_1 = {
  engineContractVersion: "0.1";
  tripContractVersion: "1.0";
  changeSetId: OpaqueId;
  idempotencyKey: OpaqueId;
  target: {
    tripId: TripPlanSnapshotV1["trip"]["id"];
    planId: TripPlanSnapshotV1["plans"][number]["id"];
  };
  baseVersion: {
    tripRevision: TripPlanSnapshotV1["trip"]["revision"];
    planRevision: TripPlanSnapshotV1["plans"][number]["revision"];
  };
  source: {
    kind: "user" | "ai" | "system" | "provider_event";
    actorRef: OpaqueId;
    correlationId: OpaqueId | null;
    proposalRef: OpaqueId | null;
  };
  reason: string;
  operations: EngineOperationV0_1[];
  factRefs: ProviderFactRefV0_1[];
};

export type ProviderFactRefV0_1 = {
  factId: OpaqueId;
  factKind: string;
  subjectRef: OpaqueId;
  provider: string;
  observedAt: Instant;
  expiresAt: Instant;
  confidence: number | null;
};

export type OperationBase = {
  operationId: OpaqueId;
  op: OperationCode;
  reason: string | null;
};

export type OperationCode =
  | "ADD_ITEM"
  | "UPDATE_ITEM"
  | "MOVE_ITEM"
  | "DELETE_ITEM"
  | "SKIP_ITEM"
  | "RESTORE_ITEM"
  | "REPLACE_ITEM"
  | "REPLACE_TRANSPORT"
  | "UPDATE_TIME"
  | "UPDATE_DURATION"
  | "UPDATE_PLACE"
  | "LINK_BOOKING"
  | "UPDATE_BOOKING_STATUS"
  | "LOCK_ITEM"
  | "UNLOCK_ITEM"
  | "REORDER_ITEMS"
  | "REPLAN_DAY"
  | "REPLAN_RANGE";

export type CanonicalSchedule = PlanItemV1["schedule"];
export type CanonicalPlace = PlanItemV1["place"];
export type CanonicalLock = PlanItemV1["lockLevel"];

export type EngineOperationV0_1 = OperationBase &
  (
    | {
        op: "ADD_ITEM";
        dayId: OpaqueId;
        position: number;
        item: PlanItemV1;
      }
    | {
        op: "MOVE_ITEM";
        itemId: OpaqueId;
        toDayId: OpaqueId;
        toPosition: number;
        schedule: CanonicalSchedule;
      }
    | { op: "DELETE_ITEM"; itemId: OpaqueId }
    | {
        op: "REPLACE_ITEM";
        itemId: OpaqueId;
        replacement: PlanItemV1;
      }
    | {
        op: "UPDATE_TIME";
        itemId: OpaqueId;
        schedule: CanonicalSchedule;
      }
    | {
        op: "UPDATE_PLACE";
        itemId: OpaqueId;
        place: CanonicalPlace;
      }
    | {
        op: "LOCK_ITEM" | "UNLOCK_ITEM";
        itemId: OpaqueId;
        toLockLevel: CanonicalLock;
      }
    | {
        op: "REORDER_ITEMS";
        dayId: OpaqueId;
        orderedItemIds: OpaqueId[];
      }
    | {
        op:
          | "UPDATE_ITEM"
          | "SKIP_ITEM"
          | "RESTORE_ITEM"
          | "REPLACE_TRANSPORT"
          | "UPDATE_DURATION"
          | "LINK_BOOKING"
          | "UPDATE_BOOKING_STATUS"
          | "REPLAN_DAY"
          | "REPLAN_RANGE";
        targetRef: OpaqueId | null;
      }
  );

export type EngineOutcome =
  "accepted" | "needsConfirmation" | "blocked" | "unsupported";

export type EngineResultV0_1 = {
  engineContractVersion: "0.1";
  requestKind: "validate" | "preview" | "apply" | "rollback";
  outcome: EngineOutcome;
  changeSetId: OpaqueId;
  idempotencyKey: OpaqueId;
  payloadHash: string;
  observedVersion: {
    tripRevision: number;
    planRevision: number;
  } | null;
  resultingVersion: {
    tripRevision: number;
    planRevision: number;
  } | null;
  issues: EngineIssueV0_1[];
  assessment?: ReasonablenessReportV0_1; // Optional 4.20.1 output; see section 24.
  confirmationRequirements: ConfirmationRequirementV0_1[];
  preview: PreviewV0_1 | null;
  replay: {
    duplicate: boolean;
    originalChangeSetId: OpaqueId | null;
  };
  transaction: {
    status: "not_started" | "committed" | "rolled_back" | "outcome_unknown";
    retryable: boolean;
  };
};

export type EngineIssueV0_1 = {
  code: string;
  category:
    | "input"
    | "authorization"
    | "version"
    | "lock"
    | "booking"
    | "budget"
    | "schedule"
    | "location"
    | "provider_fact"
    | "idempotency"
    | "transaction"
    | "rollback";
  severity: "warning" | "confirmation" | "blocking";
  path: string | null;
  operationId: OpaqueId | null;
  subjectRef: OpaqueId | null;
  retryable: boolean;
  details: Record<string, string | number | boolean | null>;
};

export type ConfirmationRequirementV0_1 = {
  code: string;
  operationIds: OpaqueId[];
  subjectRefs: OpaqueId[];
  summaryKey: string;
  expiresAt: Instant | null;
};

export type PreviewV0_1 = {
  previewHash: string;
  baseVersion: {
    tripRevision: number;
    planRevision: number;
  };
  affected: {
    dayIds: OpaqueId[];
    itemIds: OpaqueId[];
    bookingRefs: OpaqueId[];
  };
  before: TripPlanSnapshotV1;
  after: TripPlanSnapshotV1;
  impact: {
    scheduleConflicts: OpaqueId[];
    amountDeltaMinor: number | null;
    currency: string | null;
    routeFactsUsed: OpaqueId[];
  };
};

export type AssessmentStatus =
  "accepted" | "warning" | "needsConfirmation" | "blocked" | "unsupported";

export type AssessmentScope =
  | { kind: "item"; planId: OpaqueId; dayId: OpaqueId; itemId: OpaqueId }
  | { kind: "day"; planId: OpaqueId; dayId: OpaqueId }
  | { kind: "itinerary"; planId: OpaqueId; dayIds: OpaqueId[] };

export type AssessmentEvidenceRef = {
  kind: "canonical_schedule" | "profile" | "rule" | "provider_fact" | "context";
  ref: OpaqueId;
  version: string;
};

export type DurationEvidence = {
  basis: "planned_schedule" | "observed_fact" | "unknown";
  evaluatedMinutes: number | null;
  minimumMinutes: number | null;
  recommendedMinutes: number | null;
  visitModeRef: OpaqueId | null;
  sourceRefs: AssessmentEvidenceRef[];
};

export type AssessmentImpact = {
  metric:
    "physical_load" | "fatigue_impact" | "schedule_conflict" | "day_overload";
  state: "evaluated" | "not_evaluated" | "insufficient_inputs" | "unsupported";
  direction: "increase" | "decrease" | "unchanged" | "unknown";
  value: number | null;
  unit: string | null;
  modelRef: OpaqueId | null;
  modelVersion: string | null;
  durationBasis: DurationEvidence["basis"];
  relatedItemIds: OpaqueId[];
  relatedDayIds: OpaqueId[];
  sourceRefs: AssessmentEvidenceRef[];
};

export type RuleAssessment = {
  assessmentId: OpaqueId;
  scope: AssessmentScope;
  dimension:
    | "duration"
    | "physical_load"
    | "fatigue"
    | "schedule"
    | "day_capacity"
    | "itinerary_reasonableness";
  status: AssessmentStatus;
  reasonableness: "reasonable" | "unreasonable" | "undetermined";
  ruleRef: OpaqueId;
  ruleVersion: string;
  reasonCodes: string[];
  issueIndexes: number[];
  relatedAssessmentIds: OpaqueId[];
  duration: DurationEvidence | null;
  impacts: AssessmentImpact[];
  sourceRefs: AssessmentEvidenceRef[];
};

export type ReasonablenessReportV0_1 = {
  amendment: "4.20.1";
  evaluatedAt: Instant;
  observedVersion: EngineResultV0_1["observedVersion"];
  contextFingerprint: string;
  policyRef: OpaqueId;
  policyVersion: string;
  status: AssessmentStatus;
  reasonableness: "reasonable" | "unreasonable" | "undetermined";
  coverage: {
    scope: AssessmentScope;
    dimension: RuleAssessment["dimension"];
    state:
      "evaluated" | "not_evaluated" | "insufficient_inputs" | "unsupported";
    assessmentIds: OpaqueId[];
  }[];
  assessments: RuleAssessment[];
};
