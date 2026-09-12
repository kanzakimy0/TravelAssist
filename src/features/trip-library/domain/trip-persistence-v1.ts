/** B persistence semantics only. A Trip contracts and accepted B domains stay authoritative. */
import {
  parseTripDraftFacts,
  parseWizardProgress,
  parseTripPlanSnapshot,
  type TripDraftFactsV1,
  type WizardProgressV1,
  type TripPlanSnapshotV1,
} from "../../../shared/contracts/trips/index";
import {
  boolean,
  integer,
  invalid,
  list,
  localDate,
  nullable,
  object,
  oneOf,
  parse,
  refine,
  text,
  type ContractResult,
  type Parsed,
  type Parser,
} from "../../../shared/contracts/trips/validation";
import {
  PREFERENCE_MAX_BYTES,
  emptyPreference,
  parsePreferenceV1,
  parsePreferencePatchV1,
  applyPreferencePatch,
  type PreferenceV1,
  type PreferencePatchV1,
} from "../../preferences/domain/preference-v1";
import {
  MAX_COMPANIONS_PER_USER,
  PLANNING_AGE_GROUPS,
  derivePlanningAgeGroup,
  parseCompanionTravelProfileV1,
  parseCompanionId,
  parseCompanionAgeSource,
  type CompanionInputV1,
} from "../../companions/domain/companion-v1";

// UTF-8 JSONB text bytes (including separator spaces), not subscription entitlements.
// SQL mirrors these constants; parity and byte-boundary tests guard that mirror.
export const TRIP_PERSISTENCE_MAX_BYTES = Object.freeze({
  draftFacts: 256 * 1024,
  wizardProgress: 4 * 1024,
  planSnapshot: 4 * 1024 * 1024,
  preferenceSnapshot: PREFERENCE_MAX_BYTES,
  preferenceOverridePatch: PREFERENCE_MAX_BYTES,
  partySnapshot: 128 * 1024,
});
export const TRIP_LIBRARY_STATES = ["draft", "saved", "history"] as const;
export type TripLibraryStateV1 = (typeof TRIP_LIBRARY_STATES)[number];
export const STORAGE_REVISION_MAX = 2147483647;

export class TripPersistenceValidationError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string = "$") {
    super(code);
    this.code = code;
    this.path = path;
    this.name = "TripPersistenceValidationError";
  }
}
function read<T>(parser: Parser<T>, input: unknown): T {
  const result = parse(parser, input);
  if (!result.ok)
    throw new TripPersistenceValidationError(
      result.issue.code,
      result.issue.path,
    );
  return result.value;
}

// Descriptor-safe JSON copy. Reject hidden fields/accessors, cycles, sparse arrays,
// non-JSON values and strings PostgreSQL cannot store, before canonical delegation.
// Count jsonb::text bytes: JSONB expands exponent numbers and inserts separator spaces.
function bounded<T>(parser: Parser<T>, max: number): Parser<T> {
  return (input, path) => {
    let bytes = 0;
    const charge = (n: number) => {
      bytes += n;
      if (bytes > max) invalid(path, "PAYLOAD_TOO_LARGE");
    };
    const stringBytes = (value: string) => {
      if (!value.isWellFormed() || value.includes("\u0000"))
        invalid(path, "INVALID_JSON_VALUE");
      // Iteration stops at the cap, even for a maliciously long input string.
      charge(2);
      for (const char of value) {
        const cp = char.codePointAt(0)!;
        charge(
          cp < 32
            ? [8, 9, 10, 12, 13].includes(cp)
              ? 2
              : 6
            : char === '"' || char === "\\"
              ? 2
              : cp <= 0x7f
                ? 1
                : cp <= 0x7ff
                  ? 2
                  : cp <= 0xffff
                    ? 3
                    : 4,
        );
      }
    };
    const copy = (value: unknown, depth: number): unknown => {
      if (depth > 32) invalid(path, "INVALID_JSON_VALUE");
      if (typeof value === "string") {
        stringBytes(value);
        return value;
      }
      if (value === null || typeof value === "boolean") {
        charge(JSON.stringify(value).length);
        return value;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        const encoded = JSON.stringify(value),
          exponent = /e([+-]?\d+)$/.exec(encoded);
        if (exponent) {
          const n = Number(exponent[1]);
          const digits = encoded.split("e")[0].replace(/[-.]/g, "").length;
          charge((value < 0 ? 1 : 0) + (n < 0 ? 1 - n + digits : n + 1));
        } else charge(encoded.length);
        return value;
      }
      if (Array.isArray(value)) {
        if (
          Object.getPrototypeOf(value) !== Array.prototype ||
          value.length > max ||
          Reflect.ownKeys(value).length !== value.length + 1
        )
          invalid(path, "INVALID_JSON_VALUE");
        charge(2);
        const output = [];
        for (let i = 0; i < value.length; i++) {
          const d = Object.getOwnPropertyDescriptor(value, String(i));
          if (!d?.enumerable || !("value" in d))
            invalid(path, "INVALID_JSON_VALUE");
          if (i) charge(2);
          output.push(copy(d.value, depth + 1));
        }
        return output;
      }
      if (
        !value ||
        typeof value !== "object" ||
        Object.getPrototypeOf(value) !== Object.prototype
      )
        invalid(path, "INVALID_JSON_VALUE");
      charge(2);
      const entries: [string, unknown][] = [];
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string") invalid(path, "INVALID_JSON_VALUE");
        const d = Object.getOwnPropertyDescriptor(value, key)!;
        if (!d.enumerable || !("value" in d))
          invalid(path, "INVALID_JSON_VALUE");
        if (entries.length) charge(2);
        stringBytes(key);
        charge(2);
        entries.push([key, copy(d.value, depth + 1)]);
      }
      return Object.fromEntries(entries);
    };
    return parser(copy(input, 0), path);
  };
}
function canonical<T>(
  delegate: (input: unknown) => ContractResult<T>,
): Parser<T> {
  return (input, path) => {
    const result = delegate(input);
    if (!result.ok)
      invalid(path + result.issue.path.slice(1), result.issue.code);
    return result.value;
  };
}
function accepted<T>(delegate: (input: unknown) => T, code: string): Parser<T> {
  return (input, path) => {
    try {
      return delegate(input);
    } catch {
      invalid(path, code);
    }
  };
}
const uuid = accepted(parseCompanionId, "INVALID_UUID");
const displayName = refine(text(200), (value, path) => {
  if (value !== value.trim() || [...value].length > 100)
    invalid(path, "INVALID_DISPLAY_NAME");
});
const timestamp = refine(text(40), (value, path) => {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(
      value,
    ) ||
    /[+-]14:(?!00)/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    invalid(path, "INVALID_INSTANT");
  localDate(value.slice(0, 10), path);
});
const party = refine(
  object({
    schemaVersion: oneOf(["1.0"]),
    includesOwner: boolean,
    ageReferenceDate: localDate,
    members: list(
      object({
        sourceCompanionId: uuid,
        displayName,
        planningAgeGroup: oneOf(PLANNING_AGE_GROUPS),
        travelProfile: accepted(
          parseCompanionTravelProfileV1,
          "INVALID_TRAVEL_PROFILE",
        ),
      }),
      MAX_COMPANIONS_PER_USER,
    ),
  }),
  (value, path) => {
    if (
      new Set(value.members.map((m) => m.sourceCompanionId)).size !==
      value.members.length
    )
      invalid(path, "DUPLICATE_COMPANION");
  },
);
export type TripPartySnapshotV1 = Parsed<typeof party>;
export function parseTripPartySnapshot(input: unknown): TripPartySnapshotV1 {
  return read(bounded(party, TRIP_PERSISTENCE_MAX_BYTES.partySnapshot), input);
}

const fields = {
  id: uuid,
  ownerUserId: uuid,
  creationKey: uuid,
  libraryState: oneOf(TRIP_LIBRARY_STATES),
  canonicalTripId: nullable(text(160)),
  draftFacts: bounded(
    canonical(parseTripDraftFacts),
    TRIP_PERSISTENCE_MAX_BYTES.draftFacts,
  ),
  wizardProgress: bounded(
    canonical(parseWizardProgress),
    TRIP_PERSISTENCE_MAX_BYTES.wizardProgress,
  ),
  planSnapshot: nullable(
    bounded(
      canonical(parseTripPlanSnapshot),
      TRIP_PERSISTENCE_MAX_BYTES.planSnapshot,
    ),
  ),
  preferenceSnapshot: bounded(
    accepted(parsePreferenceV1, "INVALID_PREFERENCE"),
    PREFERENCE_MAX_BYTES,
  ),
  preferenceSourceRevision: integer(0, STORAGE_REVISION_MAX),
  preferenceOverridePatch: bounded(
    accepted(parsePreferencePatchV1, "INVALID_PREFERENCE_PATCH"),
    PREFERENCE_MAX_BYTES,
  ),
  partySnapshot: bounded(party, TRIP_PERSISTENCE_MAX_BYTES.partySnapshot),
  storageRevision: integer(1, STORAGE_REVISION_MAX),
  frozenAt: nullable(timestamp),
  createdAt: timestamp,
  updatedAt: timestamp,
};
const record = refine(object(fields), (value, path) => {
  if (value.libraryState === "draft") {
    if (
      value.canonicalTripId !== null ||
      value.planSnapshot !== null ||
      value.frozenAt !== null
    )
      invalid(path, "INVALID_LIBRARY_STATE");
  } else if (
    !value.planSnapshot ||
    value.canonicalTripId !== value.planSnapshot.trip.id ||
    (value.libraryState === "history"
      ? value.frozenAt === null
      : value.frozenAt !== null)
  ) {
    invalid(path, "INVALID_LIBRARY_STATE");
  }
  if (
    value.preferenceSourceRevision === 0 &&
    Object.keys(value.preferenceSnapshot.values).length
  )
    invalid(path, "INVALID_PREFERENCE_SOURCE");
  accepted(
    () =>
      applyPreferencePatch(
        value.preferenceSnapshot,
        value.preferenceOverridePatch,
      ),
    "INVALID_EFFECTIVE_PREFERENCE",
  )(null, path);
});
export type TripLibraryRecordV1 = Parsed<typeof record>;
const aggregateMax = Object.values(TRIP_PERSISTENCE_MAX_BYTES).reduce(
  (a, b) => a + b,
  4096,
);
export function parseTripLibraryRecord(input: unknown): TripLibraryRecordV1 {
  return read(bounded(record, aggregateMax), input);
}

/** No DB access. The future authenticated creation service supplies a verified root. */
export function captureTripPreference(
  source: { preference: PreferenceV1; revision: number } | null,
): Pick<
  TripLibraryRecordV1,
  "preferenceSnapshot" | "preferenceSourceRevision"
> {
  const value = read(
    bounded(
      object({
        preference: accepted(parsePreferenceV1, "INVALID_PREFERENCE"),
        revision: integer(0, STORAGE_REVISION_MAX),
      }),
      PREFERENCE_MAX_BYTES + 128,
    ),
    source ?? { preference: emptyPreference(), revision: 0 },
  );
  if (value.revision === 0 && Object.keys(value.preference.values).length)
    throw new TripPersistenceValidationError("INVALID_PREFERENCE_SOURCE");
  return {
    preferenceSnapshot: value.preference,
    preferenceSourceRevision: value.revision,
  };
}
export function emptyTripPreferencePatch(): PreferencePatchV1 {
  return { schemaVersion: "1.0", set: {}, unset: [] };
}
export function effectiveTripPreference(
  snapshot: PreferenceV1,
  patch: PreferencePatchV1,
): PreferenceV1 {
  return applyPreferencePatch(snapshot, patch);
}

/** Input is selected, authorized Companion Master data, never a persisted whole profile. */
export function captureTripParty(
  draft: TripDraftFactsV1,
  referenceDate: string,
  includesOwner: boolean,
  members: readonly (Pick<
    CompanionInputV1,
    "displayName" | "birthDate" | "ageGroupFallback" | "travelProfile"
  > & { id: string })[],
): TripPartySnapshotV1 {
  const facts = read(fields.draftFacts, draft);
  const ageReferenceDate =
    facts.dates.mode === "exact" && facts.dates.departure
      ? facts.dates.departure
      : read(localDate, referenceDate);
  if (!Array.isArray(members) || members.length > MAX_COMPANIONS_PER_USER)
    throw new TripPersistenceValidationError("INVALID_PARTY_MEMBERS");
  return parseTripPartySnapshot({
    schemaVersion: "1.0",
    includesOwner,
    ageReferenceDate,
    members: members.map((member) => {
      const age = parseCompanionAgeSource(
        {
          birthDate: member.birthDate,
          ageGroupFallback: member.ageGroupFallback,
        },
        ageReferenceDate,
      );
      return {
        sourceCompanionId: member.id,
        displayName: member.displayName,
        planningAgeGroup: age.birthDate
          ? derivePlanningAgeGroup(age.birthDate, ageReferenceDate)
          : age.ageGroupFallback,
        travelProfile: member.travelProfile,
      };
    }),
  });
}
export function canTransitionTripLibrary(
  from: TripLibraryStateV1,
  to: TripLibraryStateV1,
): boolean {
  return (
    (from === "draft" && (to === "draft" || to === "saved")) ||
    (from === "saved" && (to === "saved" || to === "history"))
  );
}
function jsonIdentity(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return "[" + value.map(jsonIdentity).join(",") + "]";
  const v = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + jsonIdentity(v[k]))
      .join(",") +
    "}"
  );
}
/** Pure invariant guard only, not a write service or HTTP CAS contract. */
export function validateTripLibraryUpdate(
  previous: unknown,
  candidate: unknown,
): TripLibraryRecordV1 {
  const old = parseTripLibraryRecord(previous),
    next = parseTripLibraryRecord(candidate);
  if (!canTransitionTripLibrary(old.libraryState, next.libraryState))
    throw new TripPersistenceValidationError("INVALID_TRANSITION");
  if (
    old.storageRevision === STORAGE_REVISION_MAX ||
    next.storageRevision !== old.storageRevision + 1
  )
    throw new TripPersistenceValidationError("STALE_STORAGE_REVISION");
  for (const key of [
    "id",
    "ownerUserId",
    "creationKey",
    "preferenceSnapshot",
    "preferenceSourceRevision",
    "createdAt",
  ] as const)
    if (jsonIdentity(old[key]) !== jsonIdentity(next[key]))
      throw new TripPersistenceValidationError("IMMUTABLE_FIELD");
  return next;
}
/** Copy history into a new draft. Preserve context; never fabricate a new A Trip ID.
 * Preference capture for this NEW creation must be supplied explicitly by its owner.
 * 5.19 will authorize, orchestrate and persist; this helper performs no I/O.
 */
export function copyHistoryToDraft(
  history: unknown,
  creation: {
    id: string;
    creationKey: string;
    createdAt: string;
    preferenceSource: { preference: PreferenceV1; revision: number } | null;
  },
): TripLibraryRecordV1 {
  const source = parseTripLibraryRecord(history);
  if (source.libraryState !== "history")
    throw new TripPersistenceValidationError("HISTORY_REQUIRED");
  const copy = parseTripLibraryRecord({
    ...source,
    id: creation.id,
    creationKey: creation.creationKey,
    libraryState: "draft",
    canonicalTripId: null,
    planSnapshot: null,
    storageRevision: 1,
    frozenAt: null,
    createdAt: creation.createdAt,
    updatedAt: creation.createdAt,
    ...captureTripPreference(creation.preferenceSource),
    preferenceOverridePatch: emptyTripPreferencePatch(),
  });
  if (copy.id === source.id || copy.creationKey === source.creationKey)
    throw new TripPersistenceValidationError("NEW_IDENTITY_REQUIRED");
  return copy;
}

// Explicit aliases document that B stores A's types, not a second schema registry.
export type TripPersistenceCanonicalContent = {
  draftFacts: TripDraftFactsV1;
  wizardProgress: WizardProgressV1;
  planSnapshot: TripPlanSnapshotV1 | null;
};
