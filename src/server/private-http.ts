import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "../types/database.generated";
import { createRequestSupabase } from "../lib/supabase/request";
import { publicSupabaseConfig } from "../lib/supabase/config";
import { requireAuthUser } from "../lib/auth/server-user";
import { authSiteOrigin } from "../lib/auth/site";
type CommonError =
  | "AUTH_REQUIRED"
  | "AUTH_UNAVAILABLE"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE";
type Failure = (code: CommonError) => Error;
export const PRIVATE_API_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization, Cookie",
};
export const PRIVATE_HTTP_MAX_BYTES = 80 * 1024;
// Extracted from TASK-045: explicit Bearer never falls back to Cookie.
export async function verifiedPrivateRequest(
  request: NextRequest,
  mutation: boolean,
  failure: Failure,
  onFinish: (finish: (response: NextResponse) => NextResponse) => void,
) {
  const authorization = request.headers.get("authorization");
  let client;
  if (authorization !== null) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw failure("AUTH_REQUIRED");
    try {
      const { url, key } = publicSupabaseConfig();
      client = createClient<Database>(url, key, {
        global: { headers: { Authorization: "Bearer " + match[1] } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    } catch {
      throw failure("AUTH_UNAVAILABLE");
    }
  } else {
    if (
      !request.cookies
        .getAll()
        .some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
    )
      throw failure("AUTH_REQUIRED");
    try {
      const context = createRequestSupabase(
        request,
        authSiteOrigin().startsWith("https:"),
      );
      client = context.client;
      onFinish(context.finish);
    } catch {
      throw failure("AUTH_UNAVAILABLE");
    }
  }
  const auth = await requireAuthUser(client);
  if (!auth.ok)
    throw failure(
      auth.code === "unauthenticated" ? "AUTH_REQUIRED" : "AUTH_UNAVAILABLE",
    );
  if (
    mutation &&
    authorization === null &&
    request.headers.get("origin") !== authSiteOrigin()
  )
    throw failure("FORBIDDEN");
  if (request.nextUrl.search) throw failure("INVALID_REQUEST");
  return { client, owner: auth.data.userId };
}
export async function readPrivateJson(
  request: Request,
  failure: Failure,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw failure("INVALID_REQUEST");
  const declared = request.headers.get("content-length");
  if (
    declared &&
    /^\d+$/.test(declared) &&
    Number(declared) > PRIVATE_HTTP_MAX_BYTES
  )
    throw failure("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw failure("INVALID_REQUEST");
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > PRIVATE_HTTP_MAX_BYTES) {
        void reader.cancel().catch(() => {});
        throw failure("PAYLOAD_TOO_LARGE");
      }
      parts.push(part.value);
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)),
      );
    } catch {
      throw failure("INVALID_REQUEST");
    }
  } finally {
    reader.releaseLock();
  }
}
