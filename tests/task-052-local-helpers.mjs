import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
// Local-only execution credential; never serialize it, its CLI output, or SDK responses.
export function localDeletionSecret(local) {
  try {
    const p = require.resolve("supabase/package.json"),
      pkg = JSON.parse(readFileSync(p, "utf8"));
    const status = JSON.parse(
      execFileSync(
        process.execPath,
        [resolve(dirname(p), pkg.bin.supabase), "status", "--output", "json"],
        {
          env: local.env,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30000,
        },
      ),
    );
    assert.equal(status.API_URL, local.api);
    assert.equal(status.DB_URL, local.databaseUrl);
    assert.ok(/^sb_secret_[A-Za-z0-9_-]+$/.test(status.SECRET_KEY));
    return status.SECRET_KEY;
  } catch {
    throw Error(
      "Local-only deletion credential unavailable; raw output withheld",
    );
  }
}
export const ownerColumns = {
  profiles: "id",
  profile_settings: "user_id",
  emergency_contacts: "user_id",
  travel_preferences: "owner_user_id",
  companions: "owner_user_id",
  companion_groups: "owner_user_id",
  companion_group_members: "owner_user_id",
  trip_library_records: "owner_user_id",
};
export async function inventory(db, id) {
  const data = {
    auth_users: await db`select * from auth.users where id=${id}`,
  };
  for (const [table, column] of Object.entries(ownerColumns))
    data[table] =
      await db`select * from ${db("public." + table)} where ${db(column)}=${id}`;
  // Keep complete rows only in memory for exact before/after comparison.
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      Array.from(v).sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
      ),
    ]),
  );
}
export function counts(data) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length]),
  );
}
