import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

/** Privileged service-role client. Callers MUST authorize each operation. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required when the admin client is used.",
    );
  }
  if (!secret.startsWith("sb_secret_")) {
    throw new Error(
      "The admin client requires a server-only Supabase secret key.",
    );
  }
  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
