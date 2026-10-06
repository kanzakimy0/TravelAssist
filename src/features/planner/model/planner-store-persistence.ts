import {
  parseSavedTrip,
  tripSnapshot,
  type SavedTrip,
  type TripSnapshot,
} from "./browser-trip";
import { selectPlannerTrip, type PlannerStoreState } from "./planner-store";
import type { TripState } from "./trip-model";

/** The only browser persistence projection for the mounted Planner Store. */
export function projectPlannerStore(state: PlannerStoreState): TripSnapshot {
  return tripSnapshot(selectPlannerTrip(state), state.draft);
}

/** Validation stays before hydrate; localStorage is never a writable Store. */
export function parsePlannerStoreSnapshot(
  raw: string | null,
  seed: TripState,
): SavedTrip | null {
  return parseSavedTrip(raw, seed);
}
