import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "../../types/database.generated";
import { createRequestSupabase } from "../../lib/supabase/request";
import { publicSupabaseConfig } from "../../lib/supabase/config";
import { requireAuthUser } from "../../lib/auth/server-user";
import { authSiteOrigin } from "../../lib/auth/site";
import {
  PreferenceApiError,
  errorStatuses,
  parsePatchRequest,
  parseResetRequest,
} from "../../features/preferences/persistence/preference-resource";
import { preferenceRepository } from "./repository";

export const PREFERENCE_HTTP_MAX_BYTES = 80 * 1024;
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization, Cookie",
};
export async function readPreferenceJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new PreferenceApiError("INVALID_REQUEST");
  const declared = request.headers.get("content-length");
  if (
    declared &&
    /^\d+$/.test(declared) &&
    Number(declared) > PREFERENCE_HTTP_MAX_BYTES
  )
    throw new PreferenceApiError("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new PreferenceApiError("INVALID_REQUEST");
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > PREFERENCE_HTTP_MAX_BYTES) {
        void reader.cancel().catch(() => {});
        throw new PreferenceApiError("PAYLOAD_TOO_LARGE");
      }
      parts.push(part.value);
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)),
      );
    } catch {
      throw new PreferenceApiError("INVALID_REQUEST");
    }
  } finally {
    reader.releaseLock();
  }
}
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
    const authorization = request.headers.get("authorization");
    let client;
    try {
      if (authorization !== null) {
        const match = /^Bearer ([^\s]+)$/i.exec(authorization);
        if (!match) throw new PreferenceApiError("AUTH_REQUIRED");
        const { url, key } = publicSupabaseConfig();
        client = createClient<Database>(url, key, {
          global: { headers: { Authorization: "Bearer " + match[1] } },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
      } else {
        if (
          !request.cookies
            .getAll()
            .some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
        )
          throw new PreferenceApiError("AUTH_REQUIRED");
        const context = createRequestSupabase(
          request,
          authSiteOrigin().startsWith("https:"),
        );
        client = context.client;
        finish = context.finish;
      }
    } catch (error) {
      if (error instanceof PreferenceApiError) throw error;
      throw new PreferenceApiError("AUTH_UNAVAILABLE");
    }
    const auth = await requireAuthUser(client);
    if (!auth.ok)
      throw new PreferenceApiError(
        auth.code === "unauthenticated" ? "AUTH_REQUIRED" : "AUTH_UNAVAILABLE",
      );
    if (
      operation !== "get" &&
      authorization === null &&
      request.headers.get("origin") !== authSiteOrigin()
    )
      throw new PreferenceApiError("FORBIDDEN");
    // There are no request-selected owners or resource IDs, including query aliases.
    if (request.nextUrl.search) throw new PreferenceApiError("INVALID_REQUEST");
    const repository = preferenceRepository(client, auth.data.userId);
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
