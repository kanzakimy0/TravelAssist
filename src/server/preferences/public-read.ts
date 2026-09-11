import "server-only";
import { NextRequest } from "next/server";
import { handlePreference } from "./http";
import { decodePreferenceReadResponse } from "../../lib/preferences/read-response";
/** Forward refresh/deletion chunks verbatim; retain the composing route's own cookies. */
export function finalizePreferenceReadResponse<T extends Response>(
  upstream: Response,
  response: T,
): T {
  for (const value of upstream.headers.getSetCookie())
    response.headers.append("Set-Cookie", value);
  for (const key of ["Pragma", "Expires", "Referrer-Policy"]) {
    const value = upstream.headers.get(key);
    if (value !== null) response.headers.set(key, value);
  }
  response.headers.set("Cache-Control", "private, no-store");
  const vary = new Set(
    (response.headers.get("Vary") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  for (const value of (upstream.headers.get("Vary") ?? "").split(","))
    if (value.trim()) vary.add(value.trim());
  vary.add("Authorization");
  vary.add("Cookie");
  response.headers.set("Vary", [...vary].join(", "));
  return response;
}
/** Always call finish on the outer response, including failure responses. */
export async function readCurrentLongTermPreferenceForRequest(
  request: NextRequest,
) {
  // The caller owns its URL/query/body and cookies. Auth refresh may mutate the
  // dedicated request, so copy headers and never clone/consume the business body.
  const preferenceRequest = new NextRequest(
    new URL("/api/preferences", request.url),
    {
      method: "GET",
      headers: new Headers(request.headers),
      signal: request.signal,
    },
  );
  const upstream = await handlePreference(preferenceRequest, "get");
  const result = await decodePreferenceReadResponse(upstream, request.signal);
  return {
    result,
    finish: <T extends Response>(response: T): T =>
      finalizePreferenceReadResponse(upstream, response),
  };
}
