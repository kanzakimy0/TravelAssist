import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.generated";
import { getSupabasePublicEnv } from "./public-env";

/**
 * Request-scoped user client. Auth flows/proxy/session refresh belong to TASK 8.3.
 * RSC default is read-only. A future Route Handler must provide setAll that
 * writes BOTH cookies and the SDK's cache headers to its actual response.
 */
export async function createSupabaseServerClient(
  adapter?: CookieMethodsServer,
) {
  const { url, key } = getSupabasePublicEnv();
  const cookieStore = adapter ? undefined : await cookies();
  return createServerClient<Database>(url, key, {
    cookies: adapter ?? {
      getAll: () => cookieStore!.getAll(),
      setAll: () => {
        throw new Error(
          "Cookie writes require an explicit response cookie/header adapter; read-only Server Component client cannot refresh sessions.",
        );
      },
    },
  });
}
