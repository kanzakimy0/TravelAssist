"use client";
import { createBrowserSupabaseClient } from "../../lib/supabase/browser";
/** Cleanup is best effort; a failed/slow SDK must not strand a deleted user on a private page. */
export async function leaveDeletedAccount() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      createBrowserSupabaseClient()
        .auth.signOut({ scope: "local" })
        .catch(() => {}),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1000);
      }),
    ]);
  } catch {
    /* Auth hard deletion, not browser cleanup, is the security boundary. */
  } finally {
    if (timer) clearTimeout(timer);
    window.location.replace("/");
  }
}
