/** B-owned additive v1 save handoff. Browser-safe; A depends only on this public surface. */
import type { TripPlanSnapshotV1 } from "../trips/index";
export type TripPersistenceHandleV1 = {
  recordId: string;
  storageRevision: number;
};
export type TripSavePlanRequestV1 = { planSnapshot: TripPlanSnapshotV1 };
export type TripSavePlanResultV1 = TripPersistenceHandleV1 & {
  canonicalTripId: string;
  libraryState: "saved";
  updatedAt: string;
};
export const tripLibraryErrorStatuses = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_TRIP_DRAFT_INPUT: 400,
  INVALID_TRIP_PLAN_INPUT: 400,
  INVALID_TRIP_PREFERENCE_PATCH: 400,
  TRIP_LIBRARY_NOT_FOUND: 404,
  STALE_TRIP_LIBRARY_REVISION: 409,
  TRIP_LIBRARY_STATE_CONFLICT: 409,
  CREATION_KEY_CONFLICT: 409,
  COMPANION_SELECTION_INVALID: 409,
  TRIP_LIBRARY_UNAVAILABLE: 500,
} as const;
export type TripLibraryErrorCode = keyof typeof tripLibraryErrorStatuses;
export class TripLibraryApiError extends Error {
  readonly code: TripLibraryErrorCode;
  constructor(code: TripLibraryErrorCode) {
    super(code);
    this.name = "TripLibraryApiError";
    this.code = code;
  }
}
export function tripIfMatch(revision: number): string {
  if (!Number.isInteger(revision) || revision < 1 || revision > 2147483647)
    throw new TripLibraryApiError("INVALID_REQUEST");
  return '"' + revision + '"';
}
