import type {
  ConstraintGateStatus,
  FeasibilityStatus,
  Instant,
  PlanningContractVersion,
  PlanningId,
} from "./common";
import type { ScoreComponent } from "./scoring";

export const CANDIDATE_STAGES = [
  "region_candidate",
  "corridor_candidate",
  "poi_expansion",
  "hard_filter",
  "scoring",
  "route_feasibility",
  "itinerary_feasibility",
  "pareto",
  "diversity",
  "top_n",
  "ai",
  "revalidate",
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export const CANDIDATE_STATUSES = [
  "active",
  "selected",
  "backup",
  "rejected",
  "needs_fact",
  "dominated",
  "pruned_by_budget",
  "pruned_by_diversity",
  "pruned_by_limit",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type CandidateReasonV1 = {
  code: string;
  stage: CandidateStage;
  severity: "info" | "warning" | "blocking";
  subjectRef: PlanningId;
  relatedCandidateRef: PlanningId | null;
  factRefs: PlanningId[];
};

export type PlanningCandidateV1 = {
  contractVersion: PlanningContractVersion;
  runId: PlanningId;
  candidateId: PlanningId;
  domainRef: PlanningId;
  candidateKind: "region" | "corridor" | "poi";
  stage: CandidateStage;
  status: CandidateStatus;
  anchor: "must_go" | "want_go" | "prefer" | "avoid" | "must_avoid" | null;
  protection: { mustGo: boolean; locked: boolean; protected: boolean };
  gate: ConstraintGateStatus | null;
  feasibility: {
    route: FeasibilityStatus | null;
    itinerary: FeasibilityStatus | null;
  };
  scoreRefs: Partial<Record<ScoreComponent, PlanningId>>;
  factRefs: PlanningId[];
  reasons: CandidateReasonV1[];
  parentCandidateIds: PlanningId[];
};

export type CandidateRunV1 = {
  contractVersion: PlanningContractVersion;
  runId: PlanningId;
  pipelineVersion: "1.0";
  configVersion: string;
  tripRef: PlanningId | null;
  preferenceSnapshotRef: PlanningId;
  contextSnapshotRef: PlanningId;
  graphVersion: string;
  poiFeatureVersion: string;
  scope: "macro" | "region" | "day" | "timeslot" | "replan";
  candidates: PlanningCandidateV1[];
  countsByStage: Partial<Record<CandidateStage, number>>;
  startedAt: Instant;
  completedAt: Instant | null;
};
