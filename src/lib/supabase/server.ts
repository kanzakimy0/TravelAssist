import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "../../types/database.generated";
import { publicSupabaseConfig, sessionCookieOptions } from "./config";

/** Call once per request. Cookie writes + cache headers belong to the caller. */
export function createServerSupabaseClient(
  cookies: CookieMethodsServer,
  secure: boolean,
) {
  const { url, key } = publicSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies,
    cookieOptions: sessionCookieOptions(secure),
  });
}
