// B-internal API envelope. Preference semantics belong exclusively to 5.11.
import {
  emptyPreference,
  parsePreferenceV1,
  parsePreferencePatchV1,
  type PreferenceV1,
  type PreferencePatchV1,
} from "./core";
export type PreferenceResourceV1 = {
  preference: PreferenceV1;
  revision: number;
  updatedAt: string | null;
};
export const errorStatuses = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  INVALID_PREFERENCE: 400,
  PAYLOAD_TOO_LARGE: 413,
  STALE_PREFERENCE_REVISION: 409,
  PREFERENCE_UNAVAILABLE: 503,
} as const;
export type PreferenceErrorCode = keyof typeof errorStatuses;
export class PreferenceApiError extends Error {
  readonly code: PreferenceErrorCode;
  constructor(code: PreferenceErrorCode) {
    super(code);
    this.name = "PreferenceApiError";
    this.code = code;
  }
}
function exact(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    throw new PreferenceApiError("INVALID_REQUEST");
  const own = Reflect.ownKeys(input);
  if (
    own.length !== keys.length ||
    own.some((k) => typeof k !== "string" || !keys.includes(k))
  )
    throw new PreferenceApiError("INVALID_REQUEST");
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(input, key);
    if (!d?.enumerable || !("value" in d))
      throw new PreferenceApiError("INVALID_REQUEST");
    result[key] = d.value;
  }
  return result;
}
function revision(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0)
    throw new PreferenceApiError("INVALID_REQUEST");
  return input;
}
export function emptyPreferenceResource(): PreferenceResourceV1 {
  return { preference: emptyPreference(), revision: 0, updatedAt: null };
}
export function parsePreferenceResource(input: unknown): PreferenceResourceV1 {
  const value = exact(input, ["preference", "revision", "updatedAt"]);
  const rev = revision(value.revision),
    preference = parsePreferenceV1(value.preference);
  if (
    rev === 0
      ? value.updatedAt !== null || Object.keys(preference.values).length !== 0
      : typeof value.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(value.updatedAt))
  )
    throw new PreferenceApiError("INVALID_REQUEST");
  return {
    preference,
    revision: rev,
    updatedAt: value.updatedAt as string | null,
  };
}
export function parseResetRequest(input: unknown): {
  expectedRevision: number;
} {
  const value = exact(input, ["expectedRevision"]);
  return { expectedRevision: revision(value.expectedRevision) };
}
export function parsePatchRequest(input: unknown): {
  expectedRevision: number;
  patch: PreferencePatchV1;
} {
  const value = exact(input, ["expectedRevision", "patch"]);
  const expectedRevision = revision(value.expectedRevision);
  try {
    return { expectedRevision, patch: parsePreferencePatchV1(value.patch) };
  } catch {
    throw new PreferenceApiError("INVALID_PREFERENCE");
  }
}
