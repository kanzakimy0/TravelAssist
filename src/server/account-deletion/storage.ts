import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index";
import { AccountDeletionError } from "../../features/account-deletion/contract";
/** Read-only, verified-owner scoped gate. No bucket/object removal contract exists in v1. */
export async function requireNoOwnedStorage(verifiedOwner: string) {
  const rows = await getDb().execute(sql`select
    exists(select 1 from storage.objects where owner_id = ${verifiedOwner} or owner = ${verifiedOwner}::uuid)
    or exists(select 1 from storage.buckets where owner_id = ${verifiedOwner} or owner = ${verifiedOwner}::uuid) as blocked`);
  if (rows[0]?.blocked !== false)
    throw new AccountDeletionError("ACCOUNT_DELETION_BLOCKED");
}
