import type { Instant, PlanningContractVersion, PlanningId } from "./common";
import type { CandidateStage } from "./candidates";
import type { FreshnessStateV1, FactUsabilityActionV1 } from "./facts";

export type CandidateStageTraceV1 = {
  stage: CandidateStage;
  inputCount: number;
  outputCount: number;
  rejectedCount: number;
  needsFactCount: number;
  elapsedMilliseconds: number | null;
  rejectionReasonCounts: Record<string, number>;
  fallbackCodes: string[];
};

export type FactUsageTraceV1 = {
  factRef: PlanningId;
  factKind: string;
  subjectRef: PlanningId;
  freshnessAtDecision: FreshnessStateV1;
  actionAtDecision: FactUsabilityActionV1;
  authorityBand: "A" | "B" | "C" | "D" | null;
  confidence: number | null;
  observedAt: Instant | null;
  fallbackFromFactRef: PlanningId | null;
};

export type AiUsageTraceV1 = {
  aiRunRef: PlanningId;
  taskType: string;
  contextContractVersion: string;
  decisionContractVersion: string;
  modelClass: "low_cost" | "standard" | "high_reasoning" | "unknown";
  providerClass: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  latencyMilliseconds: number | null;
  expansionRounds: number;
  retryCount: number;
  status:
    "decision" | "need_more_context" | "no_valid_choice" | "abstain" | "error";
  reasonCodes: string[];
};

export type ProviderUsageTraceV1 = {
  callRef: PlanningId;
  capability:
    | "route"
    | "weather"
    | "poi"
    | "booking"
    | "price"
    | "availability"
    | "other";
  providerClass: string;
  requestPurpose: string;
  status:
    | "ok"
    | "timeout"
    | "rate_limited"
    | "unavailable"
    | "contract_error"
    | "other_error";
  latencyMilliseconds: number | null;
  cacheHit: boolean | null;
  factRefsProduced: PlanningId[];
  billableUnits: number | null;
  costMinor: number | null;
  currency: string | null;
};

export type DecisionRunV1 = {
  contractVersion: PlanningContractVersion;
  traceVersion: "1.0";
  decisionRunId: PlanningId;
  kind:
    | "initial_plan"
    | "macro_plan"
    | "region_plan"
    | "day_plan"
    | "item_choice"
    | "route_choice"
    | "plan_review"
    | "replan"
    | "runtime_repair"
    | "user_explanation";
  trigger: {
    kind: string;
    eventRef: PlanningId | null;
    userIntentCode: string | null;
    occurredAt: Instant;
  };
  scope: {
    kind: "trip" | "region" | "day" | "timeslot" | "item" | "event";
    subjectRef: PlanningId;
  };
  tripRef: PlanningId;
  planRef: PlanningId | null;
  inputVersionRefs: {
    tripContractVersion: string;
    tripRevision: number;
    planRevision: number | null;
    runtimeRevision: number | null;
    preferenceSnapshotRef: PlanningId;
    preferenceOverrideRevision: number;
    poiFeatureVersion: string;
    regionGraphVersion: string;
  };
  policyVersionRefs: Record<string, string>;
  startedAt: Instant;
  completedAt: Instant | null;
  outcome:
    | "selected"
    | "proposal_created"
    | "needs_user_confirmation"
    | "no_valid_choice"
    | "blocked"
    | "abstained"
    | "superseded"
    | "stale_before_apply"
    | "applied"
    | "rejected_by_user"
    | "failed";
  stageTraces: CandidateStageTraceV1[];
  factUsage: FactUsageTraceV1[];
  scoreRefs: PlanningId[];
  paretoRecordRefs: PlanningId[];
  diversityRecordRefs: PlanningId[];
  repairAttemptRefs: PlanningId[];
  aiUsed: boolean;
  aiUsage: AiUsageTraceV1[];
  providerUsage: ProviderUsageTraceV1[];
  fallbackCodes: string[];
  finalDecisionRef: PlanningId | null;
  proposalRef: PlanningId | null;
  engineValidationRef: PlanningId | null;
  changeSetRef: PlanningId | null;
  previewRef: PlanningId | null;
  applyResultRef: PlanningId | null;
  userOutcome:
    | "accepted"
    | "rejected"
    | "modified_then_accepted"
    | "ignored"
    | "reverted_later"
    | "not_applicable";
};
