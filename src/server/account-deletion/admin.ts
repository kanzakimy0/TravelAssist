import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "../../lib/supabase/config";
import { AccountDeletionError } from "../../features/account-deletion/contract";
import { requireNoOwnedStorage } from "./storage";
/** Only the HTTP boundary's live-verified current Auth owner may call this operation. */
export async function deleteVerifiedAuthUser(
  verifiedOwner: string,
): Promise<void> {
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        verifiedOwner,
      ) ||
      verifiedOwner.trim() !== verifiedOwner
    )
      throw new AccountDeletionError("ACCOUNT_DELETION_UNAVAILABLE");
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key || key.trim() !== key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key))
      throw new AccountDeletionError("ACCOUNT_DELETION_UNAVAILABLE");
    const { url } = publicSupabaseConfig();
    await requireNoOwnedStorage(verifiedOwner);
    // Never expose this client or use it for ordinary product reads/writes.
    const admin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { error } = await admin.auth.admin.deleteUser(verifiedOwner, false);
    if (error) throw new AccountDeletionError("ACCOUNT_DELETION_UNAVAILABLE");
  } catch (error) {
    if (error instanceof AccountDeletionError) throw error;
    throw new AccountDeletionError("ACCOUNT_DELETION_UNAVAILABLE");
  }
}
