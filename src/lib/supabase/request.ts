import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createServerSupabaseClient } from "./server";

export const PRIVATE_AUTH_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Referrer-Policy": "no-referrer",
};

export function createRequestSupabase(
  request: NextRequest,
  secure: boolean,
  bindSignupFlow = false,
) {
  const writes = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const headers = new Headers(PRIVATE_AUTH_HEADERS);
  const client = createServerSupabaseClient(
    {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, cacheHeaders) {
        for (const cookie of cookies) {
          // Forward refreshed cookies to the render/Route Handler in this request.
          request.cookies.set(cookie.name, cookie.value);
          writes.set(cookie.name, cookie);
        }
        for (const [key, value] of Object.entries(cacheHeaders))
          headers.set(key, value);
      },
    },
    secure,
    bindSignupFlow,
  );

  function finish(response: NextResponse) {
    for (const { name, value, options } of writes.values())
      response.cookies.set(name, value, options);
    headers.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
  return { client, finish, next: () => finish(NextResponse.next({ request })) };
}
