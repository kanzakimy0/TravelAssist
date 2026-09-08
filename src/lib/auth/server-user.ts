import "server-only";

import {
  isAuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import type { AuthResult, CurrentAuthUser } from "./contracts";
import { authFailure } from "./errors";

/** getUser contacts Auth; cookie/session JSON alone is never authorization proof. */
export async function getCurrentAuthUser(
  client: SupabaseClient<Database>,
): Promise<AuthResult<CurrentAuthUser | null>> {
  try {
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (isAuthSessionMissingError(error)) return { ok: true, data: null };
      const failure = authFailure(error);
      if (failure.code === "unauthenticated") return { ok: true, data: null };
      return failure;
    }
    return { ok: true, data: data.user ? { userId: data.user.id } : null };
  } catch (error) {
    return authFailure(error);
  }
}

export async function requireAuthUser(
  client: SupabaseClient<Database>,
): Promise<AuthResult<CurrentAuthUser>> {
  const result = await getCurrentAuthUser(client);
  if (!result.ok) return result;
  return result.data
    ? { ok: true, data: result.data }
    : { ok: false, code: "unauthenticated" };
}
