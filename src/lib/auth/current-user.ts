import "server-only";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../supabase/server";
import { authSiteOrigin } from "./site";
import { getCurrentAuthUser } from "./server-user";
import { authFailure } from "./errors";

/** Server Component read primitive. Proxy persists refreshes before rendering.
 * Mutations must use the request adapter, not this read-only cookie port.
 */
export async function currentAuthUser() {
  try {
    const cookieStore = await cookies();
    const client = createServerSupabaseClient(
      {
        getAll: () => cookieStore.getAll(),
      },
      authSiteOrigin().startsWith("https:"),
    );
    return await getCurrentAuthUser(client);
  } catch (error) {
    return authFailure(error);
  }
}
