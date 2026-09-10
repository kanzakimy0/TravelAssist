"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database.generated";
import { publicSupabaseConfig, sessionCookieOptions } from "./config";

/** Lazy browser singleton owned by the SDK, never a server-global client. */
export function createBrowserSupabaseClient() {
  const { url, key } = publicSupabaseConfig();
  return createBrowserClient<Database>(url, key, {
    cookieOptions: sessionCookieOptions(
      typeof window !== "undefined" && window.location.protocol === "https:",
    ),
  });
}
