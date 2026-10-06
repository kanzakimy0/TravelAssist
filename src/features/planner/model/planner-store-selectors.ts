import { tripSnapshot, tripSnapshotFingerprint } from "./browser-trip";
import { selectPlannerTrip, type PlannerStoreState } from "./planner-store";

export { selectPlannerTrip } from "./planner-store";

export function selectPlannerDraft(state: PlannerStoreState) {
  return state.draft;
}

export function selectPlannerStoreDirty(state: PlannerStoreState) {
  const fingerprint = tripSnapshotFingerprint(
    tripSnapshot(selectPlannerTrip(state), state.draft),
  );
  return fingerprint !== state.meta.persistedFingerprint;
}

export function selectPlannerLocalRevision(state: PlannerStoreState) {
  return state.meta.localRevision;
}
