"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.generated";
import { getSupabasePublicEnv } from "./public-env";

export function createSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, key);
}
