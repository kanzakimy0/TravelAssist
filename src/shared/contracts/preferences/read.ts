import { PreferenceValidationError, type PreferenceV1 } from "./core";
import { parsePreferenceResource } from "./persistence-resource";
export const PREFERENCE_READ_CONTRACT_VERSION = "1.0" as const;
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
export type ReadonlyPreferenceV1 = DeepReadonly<PreferenceV1>;
export type LongTermPreferenceReadV1 = {
  readonly contractVersion: "1.0";
  readonly scope: "long_term";
  readonly sourceRevision: number;
  readonly sourceUpdatedAt: string | null;
  readonly preference: ReadonlyPreferenceV1;
};
export type PreferenceReadErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_UNAVAILABLE"
  | "PREFERENCE_UNAVAILABLE"
  | "INVALID_PREFERENCE_RESPONSE"
  | "UNSUPPORTED_PREFERENCE_VERSION"
  | "REQUEST_CANCELLED";
export type PreferenceReadResultV1 =
  | { readonly ok: true; readonly data: LongTermPreferenceReadV1 }
  | { readonly ok: false; readonly code: PreferenceReadErrorCode };
export class PreferenceReadValidationError extends Error {
  readonly code:
    "INVALID_PREFERENCE_RESPONSE" | "UNSUPPORTED_PREFERENCE_VERSION";
  constructor(
    code: "INVALID_PREFERENCE_RESPONSE" | "UNSUPPORTED_PREFERENCE_VERSION",
  ) {
    super(code);
    this.name = "PreferenceReadValidationError";
    this.code = code;
  }
}
function invalid(): never {
  throw new PreferenceReadValidationError("INVALID_PREFERENCE_RESPONSE");
}
function exact(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    invalid();
  const own = Reflect.ownKeys(input);
  if (
    own.length !== keys.length ||
    own.some((k) => typeof k !== "string" || !keys.includes(k))
  )
    invalid();
  return Object.fromEntries(
    keys.map((k) => {
      const d = Object.getOwnPropertyDescriptor(input, k);
      if (!d?.enumerable || !("value" in d)) invalid();
      return [k, d.value];
    }),
  );
}
function freeze<T>(input: T): DeepReadonly<T> {
  if (input && typeof input === "object") {
    for (const value of Object.values(input)) freeze(value);
    Object.freeze(input);
  }
  return input as DeepReadonly<T>;
}
// Preserve the exact DB string; Date.parse alone accepts non-ISO/rolled-over dates.
function validInstant(input: string): boolean {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(
      input,
    );
  if (!m) return false;
  const [, y, month, day, h, minute, second, zone] = m;
  const year = Number(y),
    mo = Number(month),
    d = Number(day);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year > 0 &&
    mo >= 1 &&
    mo <= 12 &&
    d >= 1 &&
    d <= days[mo - 1] &&
    Number(h) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59 &&
    (zone === "Z" ||
      (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4)) <= 59)) &&
    Number.isFinite(Date.parse(input))
  );
}
export function toLongTermPreferenceReadV1(
  input: unknown,
): LongTermPreferenceReadV1 {
  try {
    // Use the single accepted resource + canonical Preference parsers first.
    const resource = parsePreferenceResource(input);
    if (
      resource.revision > 2147483647 ||
      (resource.updatedAt !== null && !validInstant(resource.updatedAt))
    )
      invalid();
    return freeze({
      contractVersion: PREFERENCE_READ_CONTRACT_VERSION,
      scope: "long_term" as const,
      sourceRevision: resource.revision,
      sourceUpdatedAt: resource.updatedAt,
      preference: resource.preference,
    });
  } catch (error) {
    if (error instanceof PreferenceReadValidationError) throw error;
    if (
      error instanceof PreferenceValidationError &&
      error.code === "UNSUPPORTED_VERSION"
    )
      throw new PreferenceReadValidationError("UNSUPPORTED_PREFERENCE_VERSION");
    invalid();
  }
}
export function parseLongTermPreferenceReadV1(
  input: unknown,
): LongTermPreferenceReadV1 {
  const value = exact(input, [
    "contractVersion",
    "scope",
    "sourceRevision",
    "sourceUpdatedAt",
    "preference",
  ]);
  if (value.contractVersion !== PREFERENCE_READ_CONTRACT_VERSION)
    throw new PreferenceReadValidationError("UNSUPPORTED_PREFERENCE_VERSION");
  if (value.scope !== "long_term") invalid();
  return toLongTermPreferenceReadV1({
    preference: value.preference,
    revision: value.sourceRevision,
    updatedAt: value.sourceUpdatedAt,
  });
}
