import type {
  ConstraintGateStatus,
  FeasibilityStatus,
  PlanningContractVersion,
  PlanningId,
} from "./common";
import type {
  PoiFeatureCode,
  PoiFeatureValue,
  PreferenceValue,
} from "./features";
import type { VisitMode } from "./poi";

export const SCORE_COMPONENTS = [
  "matchScore",
  "partyFit",
  "seasonFit",
  "weatherFit",
  "dayFit",
  "routeFit",
  "currentSuitability",
] as const;
export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];

export type ScoreBreakdownV1 = {
  featureCode: PoiFeatureCode | null;
  preferenceValue: PreferenceValue | null;
  featureValue: PoiFeatureValue;
  contribution: number;
  confidence: number | null;
  reasonCode: string;
};

export type PlanningScoreV1 = {
  component: ScoreComponent;
  value: number;
  coverage: number;
  confidence: number | null;
  status: "scored" | "partial" | "needs_fact" | "not_applicable";
  configVersion: string;
  breakdown: ScoreBreakdownV1[];
};

export type PlanningScoreSetV1 = {
  contractVersion: PlanningContractVersion;
  subjectRef: PlanningId;
  scores: Record<ScoreComponent, PlanningScoreV1 | null>;
  overallValue: number | null;
  overallConfigVersion: string | null;
};

export type ConstraintGateResultV1 = {
  contractVersion: PlanningContractVersion;
  status: ConstraintGateStatus;
  reasonCodes: string[];
  factRefs: PlanningId[];
};

export type FeasibilityIssueV1 = {
  code: string;
  severity: Exclude<FeasibilityStatus, "PASS">;
  subjectRef: PlanningId;
  requiredValue: number | string | null;
  actualValue: number | string | null;
  shortfallOrExcess: number | null;
  factRefs: PlanningId[];
  repairHints: string[];
};

export type FeasibilityResultV1 = {
  contractVersion: PlanningContractVersion;
  status: FeasibilityStatus;
  scope: "item" | "transition" | "day" | "trip";
  subjectRef: PlanningId;
  issues: FeasibilityIssueV1[];
  metrics: {
    scheduledMinutes: number | null;
    transitionMinutes: number | null;
    bufferMinutes: number | null;
    walkingLoad: number | null;
    physicalLoad: number | null;
    remainingFatigueBudget: number | null;
  };
  visit: {
    visitMode: VisitMode;
    plannedDurationMinutes: number;
    minimumDurationMinutes: number | null;
    recommendedDurationMinutes: number | null;
    maximumUsefulDurationMinutes: number | null;
    visitWalkingLoad: number | null;
    visitPhysicalLoad: number | null;
    loadSource:
      "detailed_fact_model" | "estimated_from_feature_summary" | "unknown";
  } | null;
  factRefs: PlanningId[];
  configVersion: string;
};
