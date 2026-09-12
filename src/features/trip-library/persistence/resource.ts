import {
  parse,
  object,
  text,
  nullable,
  list,
  oneOf,
  integer,
  localDate,
  code,
  type Parsed,
} from "../../../shared/contracts/trips/validation";
import { parseTripStorageTimestamp } from "../domain/trip-persistence-v1";
import {
  parseTripLibraryRecord,
  effectiveTripPreference,
  type TripLibraryRecordV1,
} from "../domain/trip-persistence-v1";
import type { PreferenceV1 } from "../../preferences/domain/preference-v1";
import { TripLibraryApiError } from "../../../shared/contracts/trip-library/index";
export type TripLibraryResourceV1 = Omit<TripLibraryRecordV1, "ownerUserId"> & {
  schemaVersion: "1.0";
  effectivePreference: PreferenceV1;
};
export function tripResource(
  record: TripLibraryRecordV1,
): TripLibraryResourceV1 {
  const { ownerUserId, ...data } = parseTripLibraryRecord(record);
  void ownerUserId;
  return {
    schemaVersion: "1.0",
    ...data,
    effectivePreference: effectiveTripPreference(
      record.preferenceSnapshot,
      record.preferenceOverridePatch,
    ),
  };
}
// Reconstitute only an internal validation owner; ownership is never asserted by a client DTO.
export function parseTripResource(input: unknown): TripLibraryResourceV1 {
  if (!input || typeof input !== "object")
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  const { schemaVersion, effectivePreference, ...data } = input as Record<
    string,
    unknown
  >;
  if (schemaVersion !== "1.0" || Object.hasOwn(data, "ownerUserId"))
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  const parsed = tripResource(
    parseTripLibraryRecord({
      ...data,
      ownerUserId: "00000000-0000-0000-0000-000000000001",
    }),
  );
  // Effective Preference is derived from authoritative snapshot + patch, never trusted as a second root.
  void effectivePreference;
  return parsed;
}
const summaryParser = object({
  id: text(36),
  libraryState: oneOf(["draft", "saved", "history"]),
  canonicalTripId: nullable(text(160)),
  storageRevision: integer(1, 2147483647),
  title: nullable(text(200)),
  destinations: list(text(200), 100),
  departure: nullable(localDate),
  returning: nullable(localDate),
  participantCount: integer(0, 4000),
  wizardPhase: oneOf([
    "familiarity",
    "preferences",
    "trip_basics",
    "generating",
    "plan_selection",
  ]),
  planStatus: nullable(code),
  createdAt: (v: unknown) => parseTripStorageTimestamp(v),
  updatedAt: (v: unknown) => parseTripStorageTimestamp(v),
  frozenAt: nullable((v: unknown) => parseTripStorageTimestamp(v)),
});
export type TripLibrarySummaryV1 = Parsed<typeof summaryParser>;
export type TripLibraryPageV1 = {
  schemaVersion: "1.0";
  items: TripLibrarySummaryV1[];
  nextCursor: string | null;
};
export function parseTripSummary(input: unknown): TripLibrarySummaryV1 {
  const result = parse(summaryParser, input);
  if (!result.ok) throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  return result.value;
}
export function parseTripPage(input: unknown): TripLibraryPageV1 {
  const result = parse(
    object({
      schemaVersion: oneOf(["1.0"]),
      items: list(summaryParser, 50),
      nextCursor: nullable(text(256)),
    }),
    input,
  );
  if (
    !result.ok ||
    (result.value.nextCursor !== null &&
      !/^[A-Za-z0-9_-]+$/.test(result.value.nextCursor))
  )
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  return result.value;
}
