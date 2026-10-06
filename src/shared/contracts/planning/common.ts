export const PLANNING_CONTRACT_VERSION = "1.0" as const;

export type PlanningContractVersion = typeof PLANNING_CONTRACT_VERSION;
export type PlanningId = string;
export type Instant = string;

export type PlanningValidationIssue = {
  path: string;
  code: string;
};

export type PlanningValidationResult<T> =
  { ok: true; value: T } | { ok: false; issue: PlanningValidationIssue };

export const CONSTRAINT_GATE_STATUSES = [
  "PASS",
  "REJECT",
  "NEEDS_FACT",
] as const;
export type ConstraintGateStatus = (typeof CONSTRAINT_GATE_STATUSES)[number];

export const FEASIBILITY_STATUSES = [
  "PASS",
  "WARNING",
  "CRITICAL",
  "NEEDS_FACT",
] as const;
export type FeasibilityStatus = (typeof FEASIBILITY_STATUSES)[number];

export type PlanningRange = {
  low: number | null;
  typical: number | null;
  high: number | null;
};
