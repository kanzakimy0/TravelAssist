import {
  parsePreferenceResource,
  PreferenceApiError,
  errorStatuses,
  type PreferenceResourceV1,
} from "./preference-resource";
import {
  parsePreferencePatchV1,
  type PreferencePatchV1,
} from "../domain/preference-v1";
export async function preferenceRequest(
  method: "GET" | "PATCH" | "POST",
  body?: unknown,
  signal?: AbortSignal,
): Promise<PreferenceResourceV1> {
  let response: Response;
  try {
    response = await fetch(
      method === "POST" ? "/api/preferences/reset" : "/api/preferences",
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        signal,
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
  } catch {
    throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
  }
  if (!response.ok || result?.ok !== true) {
    const code = result?.error?.code;
    throw new PreferenceApiError(
      typeof code === "string" && Object.hasOwn(errorStatuses, code)
        ? (code as keyof typeof errorStatuses)
        : "PREFERENCE_UNAVAILABLE",
    );
  }
  try {
    return parsePreferenceResource(result.data);
  } catch {
    throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
  }
}
export const preferenceClient = {
  read: (signal?: AbortSignal) => preferenceRequest("GET", undefined, signal),
  patch: (expectedRevision: number, patch: PreferencePatchV1) =>
    preferenceRequest("PATCH", {
      expectedRevision,
      patch: parsePreferencePatchV1(patch),
    }),
  reset: (expectedRevision: number) =>
    preferenceRequest("POST", { expectedRevision }),
};
