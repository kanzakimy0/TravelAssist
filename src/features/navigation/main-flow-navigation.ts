export type StartEntry = "step3" | null;

export const PLAN_SELECTION_BRIDGE_KEY = "travelassist.mock-plan-selection.v1";

const START_TO_PLANNER_PLAN: Readonly<Record<string, string>> = {
  "classic-balanced": "classic",
  "slow-depth": "depth",
  "efficient-explorer": "relax",
};

export function parseStartEntry(
  value: string | string[] | undefined,
): StartEntry {
  return value === "step3" ? "step3" : null;
}

export function startEntryStep(entry: StartEntry) {
  return entry === "step3" ? 2 : null;
}

export function plannerPlanForStartPlan(startPlanId: string | null) {
  return startPlanId ? (START_TO_PLANNER_PLAN[startPlanId] ?? null) : null;
}

export function persistPlannerPlanSelection(startPlanId: string) {
  const plannerPlanId = plannerPlanForStartPlan(startPlanId);
  if (!plannerPlanId || typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(PLAN_SELECTION_BRIDGE_KEY, plannerPlanId);
    return true;
  } catch {
    return false;
  }
}

export function readPlannerPlanSelection() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(PLAN_SELECTION_BRIDGE_KEY);
    return ["classic", "depth", "relax"].includes(value ?? "") ? value : null;
  } catch {
    return null;
  }
}
