import {
  toLongTermPreferenceReadV1,
  PreferenceReadValidationError,
  type PreferenceReadResultV1,
} from "../../shared/contracts/preferences";
/** Shared transport decoding for the browser and server read facades. */
export async function decodePreferenceReadResponse(
  response: Response,
  signal?: AbortSignal,
): Promise<PreferenceReadResultV1> {
  if (signal?.aborted) return { ok: false, code: "REQUEST_CANCELLED" };
  if (response.status === 401) return { ok: false, code: "AUTH_REQUIRED" };
  let body;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: signal?.aborted
        ? "REQUEST_CANCELLED"
        : response.ok
          ? "INVALID_PREFERENCE_RESPONSE"
          : "PREFERENCE_UNAVAILABLE",
    };
  }
  if (signal?.aborted) return { ok: false, code: "REQUEST_CANCELLED" };
  if (!response.ok)
    return {
      ok: false,
      code:
        response.status === 503 && body?.error?.code === "AUTH_UNAVAILABLE"
          ? "AUTH_UNAVAILABLE"
          : "PREFERENCE_UNAVAILABLE",
    };
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 2 ||
    body.ok !== true ||
    !Object.hasOwn(body, "data")
  )
    return { ok: false, code: "INVALID_PREFERENCE_RESPONSE" };
  try {
    return { ok: true, data: toLongTermPreferenceReadV1(body.data) };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof PreferenceReadValidationError
          ? error.code
          : "INVALID_PREFERENCE_RESPONSE",
    };
  }
}
