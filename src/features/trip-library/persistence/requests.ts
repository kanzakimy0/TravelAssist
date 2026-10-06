import {
  parseCompanionId,
  MAX_COMPANIONS_PER_USER,
} from "../../companions/domain/companion-v1";
import {
  parsePreferencePatchV1,
  type PreferencePatchV1,
} from "../../preferences/domain/preference-v1";
import {
  emptyTripPreferencePatch,
  parseTripDraftContent,
  parseTripProgressContent,
  parseTripPlanContent,
  TripPersistenceValidationError,
} from "../domain/trip-persistence-v1";
import { localDate, parse } from "../../../shared/contracts/trips/validation";
import {
  TripLibraryApiError,
  type TripLibraryErrorCode,
} from "../../../shared/contracts/trip-library/index";
export const TRIP_HTTP_MAX_BYTES = Object.freeze({
  create: 512 * 1024,
  update: 512 * 1024,
  save: 4608 * 1024,
  copy: 16 * 1024,
});
export const fail = (code: TripLibraryErrorCode): never => {
  throw new TripLibraryApiError(code);
};
export function exactObject(
  input: unknown,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    return fail("INVALID_REQUEST");
  const out: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || ![...required, ...optional].includes(key))
      return fail("INVALID_REQUEST");
    const d = Object.getOwnPropertyDescriptor(input, key)!;
    if (!d.enumerable || !("value" in d)) return fail("INVALID_REQUEST");
    Object.defineProperty(out, key, { value: d.value, enumerable: true });
  }
  if (required.some((k) => !Object.hasOwn(out, k)))
    return fail("INVALID_REQUEST");
  return out;
}
export function tripRecordId(input: unknown) {
  try {
    return parseCompanionId(input);
  } catch {
    return fail("INVALID_REQUEST");
  }
}
export function parseTripIfMatch(input: string | null) {
  if (!input || !/^"[1-9]\d{0,9}"$/.test(input)) return fail("INVALID_REQUEST");
  const n = Number(input.slice(1, -1));
  if (n > 2147483647) return fail("INVALID_REQUEST");
  return n;
}
function checked<T>(fn: () => T, code: TripLibraryErrorCode): T {
  try {
    return fn();
  } catch (e) {
    return fail(
      e instanceof TripPersistenceValidationError &&
        e.code === "PAYLOAD_TOO_LARGE"
        ? "PAYLOAD_TOO_LARGE"
        : code,
    );
  }
}
export type PartySelectionV1 = {
  includesOwner: boolean;
  companionIds: string[];
  ageReferenceDate: string;
};
export function parseTripDraftRequest(input: unknown, create = false) {
  const body = exactObject(
    input,
    create
      ? [
          "schemaVersion",
          "creationKey",
          "draftFacts",
          "wizardProgress",
          "partySelection",
        ]
      : [
          "draftFacts",
          "wizardProgress",
          "preferenceOverridePatch",
          "partySelection",
        ],
    create ? ["preferenceOverridePatch"] : [],
  );
  if (create && body.schemaVersion !== "1.0") return fail("INVALID_REQUEST");
  const draftFacts = checked(
    () => parseTripDraftContent(body.draftFacts),
    "INVALID_TRIP_DRAFT_INPUT",
  );
  const wizardProgress = checked(
    () => parseTripProgressContent(body.wizardProgress),
    "INVALID_TRIP_DRAFT_INPUT",
  );
  const preferenceOverridePatch: PreferencePatchV1 = checked(
    () =>
      parsePreferencePatchV1(
        Object.hasOwn(body, "preferenceOverridePatch")
          ? body.preferenceOverridePatch
          : emptyTripPreferencePatch(),
      ),
    "INVALID_TRIP_PREFERENCE_PATCH",
  );
  const party = exactObject(
    body.partySelection,
    ["includesOwner", "companionIds"],
    ["ageReferenceDate"],
  );
  if (
    typeof party.includesOwner !== "boolean" ||
    !Array.isArray(party.companionIds) ||
    party.companionIds.length > MAX_COMPANIONS_PER_USER
  )
    return fail("INVALID_REQUEST");
  const ids = party.companionIds.map(tripRecordId);
  if (new Set(ids).size !== ids.length) return fail("INVALID_REQUEST");
  if (
    Object.hasOwn(party, "ageReferenceDate") &&
    !parse(localDate, party.ageReferenceDate).ok
  )
    return fail("INVALID_REQUEST");
  const date =
    draftFacts.dates.mode === "exact"
      ? draftFacts.dates.departure
      : party.ageReferenceDate;
  const parsedDate = parse(localDate, date);
  if (!parsedDate.ok) return fail("INVALID_REQUEST");
  const partySelection: PartySelectionV1 = {
    includesOwner: party.includesOwner,
    companionIds: ids,
    ageReferenceDate: parsedDate.value,
  };
  return {
    draftFacts,
    wizardProgress,
    preferenceOverridePatch,
    partySelection,
    ...(create ? { creationKey: tripRecordId(body.creationKey) } : {}),
  };
}
export type TripDraftRequestV1 = ReturnType<typeof parseTripDraftRequest>;
export function parseTripSaveRequest(input: unknown) {
  const body = exactObject(input, ["schemaVersion", "planSnapshot"]);
  if (body.schemaVersion !== "1.0") return fail("INVALID_REQUEST");
  const plan = checked(
    () => parseTripPlanContent(body.planSnapshot),
    "INVALID_TRIP_PLAN_INPUT",
  );
  if (!plan) return fail("INVALID_TRIP_PLAN_INPUT");
  return plan;
}
export function parseTripCopyRequest(input: unknown) {
  const body = exactObject(input, ["schemaVersion", "creationKey"]);
  if (body.schemaVersion !== "1.0") return fail("INVALID_REQUEST");
  return tripRecordId(body.creationKey);
}
