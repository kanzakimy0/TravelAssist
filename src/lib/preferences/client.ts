import type { PreferenceReadResultV1 } from "../../shared/contracts/preferences";
import { decodePreferenceReadResponse } from "./read-response";
/** Same-origin, request-time read. No account cache, defaults or mutation surface. */
export async function readCurrentLongTermPreference(
  options: { signal?: AbortSignal } = {},
): Promise<PreferenceReadResultV1> {
  const { signal } = options;
  if (signal?.aborted) return { ok: false, code: "REQUEST_CANCELLED" };
  try {
    const response = await fetch("/api/preferences", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    return await decodePreferenceReadResponse(response, signal);
  } catch {
    return {
      ok: false,
      code: signal?.aborted ? "REQUEST_CANCELLED" : "PREFERENCE_UNAVAILABLE",
    };
  }
}
