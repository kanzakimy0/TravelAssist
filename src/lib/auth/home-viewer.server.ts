import "server-only";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authSiteOrigin } from "@/lib/auth/site";
import { homeViewerFromVerifiedUser, type HomeViewer } from "./home-viewer";

/** Public Home reads the existing session; it never creates a session or gates guests. */
export async function readHomeViewer(): Promise<HomeViewer | null> {
  const store = await cookies();
  if (
    !store
      .getAll()
      .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))
  )
    return null;
  try {
    const client = createServerSupabaseClient(
      { getAll: () => store.getAll() },
      authSiteOrigin().startsWith("https:"),
    );
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : homeViewerFromVerifiedUser(data.user);
  } catch {
    return null;
  }
}
