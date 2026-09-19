import {
  parseSavedTrip,
  restoreTrip,
  tripSnapshot,
  tripSnapshotFingerprint,
  type TripSnapshot,
} from "./browser-trip";
import { emptyDetailDraft, type DetailDraftState } from "./detail-workspace";
import {
  tripReducer,
  type TripAction,
  type TripState,
  type TripUi,
} from "./trip-model";

/**
 * The mounted Planner has one editable client working copy.  `TripState` is
 * deliberately reused here: it remains the mature local domain reducer and
 * is not a second public Trip schema.
 */
export type PlannerWorkingState = Omit<TripState, "ui" | "notice">;
export type PlannerStoreUiState = TripUi & { notice: string };

export type PlannerStoreMeta = {
  localRevision: number;
  persistedFingerprint: string | null;
  hydratedFrom: "seed" | "browser" | "canonical" | "compatibility";
  canonicalRevision?: number;
};

export type PlannerStoreState = {
  working: PlannerWorkingState;
  ui: PlannerStoreUiState;
  draft: DetailDraftState;
  meta: PlannerStoreMeta;
};

export type PlannerStoreAction =
  | { type: "trip.apply"; action: TripAction }
  | { type: "draft.replace"; draft: DetailDraftState }
  | {
      type: "hydrate";
      snapshot: TripSnapshot;
      source: "browser" | "canonical";
      /** Canonical hydration carries its validated, non-browser context. */
      trip?: TripState;
      canonicalRevision?: number;
      force?: boolean;
    }
  | {
      type: "replace";
      trip: TripState;
      draft?: DetailDraftState;
      source?: "compatibility" | "canonical";
      canonicalRevision?: number;
    }
  | { type: "reset"; seed: TripState; draft?: DetailDraftState }
  | { type: "persistence.saved"; snapshot: TripSnapshot };

function splitTrip(trip: TripState): Pick<PlannerStoreState, "working" | "ui"> {
  const { ui, notice, ...working } = trip;
  return { working, ui: { ...ui, notice } };
}

export function selectPlannerTrip(state: PlannerStoreState): TripState {
  const { notice, ...ui } = state.ui;
  return { ...state.working, ui, notice };
}

function snapshotFor(state: PlannerStoreState) {
  return tripSnapshot(selectPlannerTrip(state), state.draft);
}

function replaceTrip(
  state: PlannerStoreState,
  trip: TripState,
  draft: DetailDraftState,
  meta: Partial<PlannerStoreMeta> = {},
): PlannerStoreState {
  const before = tripSnapshotFingerprint(snapshotFor(state));
  const after = tripSnapshotFingerprint(tripSnapshot(trip, draft));
  const changed = before !== after;
  return {
    ...state,
    ...splitTrip(structuredClone(trip)),
    draft: structuredClone(draft),
    meta: {
      ...state.meta,
      ...meta,
      localRevision: state.meta.localRevision + (changed ? 1 : 0),
    },
  };
}

export function createPlannerStore(
  seed: TripState,
  draft: DetailDraftState = emptyDetailDraft(),
): PlannerStoreState {
  const initial = structuredClone(seed);
  const initialDraft = structuredClone(draft);
  return {
    ...splitTrip(initial),
    draft: initialDraft,
    meta: {
      localRevision: 0,
      persistedFingerprint: tripSnapshotFingerprint(
        tripSnapshot(initial, initialDraft),
      ),
      hydratedFrom: "seed",
    },
  };
}

/** Pure reducer.  It owns no module-global mutable state. */
export function plannerStoreReducer(
  state: PlannerStoreState,
  action: PlannerStoreAction,
): PlannerStoreState {
  if (action.type === "trip.apply") {
    const current = selectPlannerTrip(state);
    const next = tripReducer(current, action.action);
    return next === current ? state : replaceTrip(state, next, state.draft);
  }
  if (action.type === "draft.replace") {
    const next = structuredClone(action.draft);
    return replaceTrip(state, selectPlannerTrip(state), next);
  }
  if (action.type === "replace") {
    return replaceTrip(state, action.trip, action.draft ?? state.draft, {
      hydratedFrom: action.source ?? "compatibility",
      ...(action.canonicalRevision === undefined
        ? {}
        : { canonicalRevision: action.canonicalRevision }),
    });
  }
  if (action.type === "reset") {
    const next = createPlannerStore(action.seed, action.draft);
    return {
      ...next,
      meta: {
        ...next.meta,
        localRevision: state.meta.localRevision + 1,
      },
    };
  }
  if (action.type === "hydrate") {
    const currentFingerprint = tripSnapshotFingerprint(snapshotFor(state));
    const locallyDirty = currentFingerprint !== state.meta.persistedFingerprint;
    const knownCanonicalRevision = state.meta.canonicalRevision;
    if (
      (!action.force && locallyDirty) ||
      (action.source === "canonical" &&
        action.canonicalRevision !== undefined &&
        knownCanonicalRevision !== undefined &&
        action.canonicalRevision <= knownCanonicalRevision)
    )
      return state;
    if (action.source === "canonical" && action.trip) {
      // The Canonical adapter has already run parseTripPlanSnapshot. Keep its
      // opaque source context out of the browser projection while replacing
      // the editable working copy atomically.
      const next = replaceTrip(state, action.trip, action.snapshot.draft, {
        hydratedFrom: "canonical",
        persistedFingerprint: tripSnapshotFingerprint(action.snapshot),
        ...(action.canonicalRevision === undefined
          ? {}
          : { canonicalRevision: action.canonicalRevision }),
      });
      return next;
    }
    // Re-validate browser input at the Store boundary. A stale/corrupt
    // payload is a no-op.
    const current = selectPlannerTrip(state);
    const saved = parseSavedTrip(
      JSON.stringify({
        version: 1,
        savedAt: "2000-01-01T00:00:00.000Z",
        snapshot: action.snapshot,
      }),
      current,
    );
    if (!saved) return state;
    const restored = restoreTrip(current, saved.snapshot);
    const next = replaceTrip(state, restored, saved.snapshot.draft, {
      hydratedFrom: action.source,
      persistedFingerprint: tripSnapshotFingerprint(saved.snapshot),
      ...(action.canonicalRevision === undefined
        ? {}
        : { canonicalRevision: action.canonicalRevision }),
    });
    return next;
  }
  if (action.type === "persistence.saved") {
    const currentFingerprint = tripSnapshotFingerprint(snapshotFor(state));
    const savedFingerprint = tripSnapshotFingerprint(action.snapshot);
    // A late save acknowledgement must never mark newer local work clean.
    if (currentFingerprint !== savedFingerprint) return state;
    return {
      ...state,
      meta: { ...state.meta, persistedFingerprint: savedFingerprint },
    };
  }
  return state;
}
