import "server-only";
import {
  PRIVATE_API_HEADERS,
  PRIVATE_HTTP_MAX_BYTES,
  readPrivateJson,
  verifiedPrivateRequest,
} from "../private-http";

import { NextRequest, NextResponse } from "next/server";

import {
  PreferenceApiError,
  errorStatuses,
  parsePatchRequest,
  parseResetRequest,
} from "../../features/preferences/persistence/preference-resource";
import { preferenceRepository } from "./repository";

export const PREFERENCE_HTTP_MAX_BYTES = PRIVATE_HTTP_MAX_BYTES;
const headers = PRIVATE_API_HEADERS;
export const readPreferenceJson = (request: Request) =>
  readPrivateJson(request, (code) => new PreferenceApiError(code));
export async function handlePreference(
  request: NextRequest,
  operation: "get" | "patch" | "reset",
) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  function respond(body: unknown, status = 200) {
    const response = NextResponse.json(body, { status, headers });
    const result = finish ? finish(response) : response;
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("Vary", "Authorization, Cookie");
    return result;
  }
  try {
    const { client, owner } = await verifiedPrivateRequest(
      request,
      operation !== "get",
      (code) => new PreferenceApiError(code),
      (value) => {
        finish = value;
      },
    );
    const repository = preferenceRepository(client, owner);
    if (operation === "get")
      return respond({ ok: true, data: await repository.read() });
    const body = await readPreferenceJson(request);
    if (operation === "patch") {
      const { expectedRevision, patch } = parsePatchRequest(body);
      return respond({
        ok: true,
        data: await repository.patch(expectedRevision, patch),
      });
    }
    const { expectedRevision } = parseResetRequest(body);
    return respond({
      ok: true,
      data: await repository.reset(expectedRevision),
    });
  } catch (error) {
    const code =
      error instanceof PreferenceApiError
        ? error.code
        : "PREFERENCE_UNAVAILABLE";
    return respond({ ok: false, error: { code } }, errorStatuses[code]);
  }
}
