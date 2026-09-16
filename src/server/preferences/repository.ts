import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import {
  applyPreferencePatch,
  emptyPreference,
  parsePreferenceV1,
  type PreferencePatchV1,
} from "../../features/preferences/domain/preference-v1";
import {
  emptyPreferenceResource,
  parsePreferenceResource,
  PreferenceApiError,
} from "../../features/preferences/persistence/preference-resource";

// The caller supplies only the request-scoped, verified user client and Auth ID.
// Every read/write also passes through existing travel_preferences owner RLS.
export function preferenceRepository(
  client: SupabaseClient<Database>,
  owner: string,
) {
  const columns = "payload,revision,updated_at";
  function resource(row: {
    payload: unknown;
    revision: number;
    updated_at: string;
  }) {
    try {
      return parsePreferenceResource({
        preference: row.payload,
        revision: row.revision,
        updatedAt: row.updated_at,
      });
    } catch {
      throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
    }
  }
  async function read() {
    const { data, error } = await client
      .from("travel_preferences")
      .select(columns)
      .eq("owner_user_id", owner)
      .maybeSingle();
    if (error) throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
    return data ? resource(data) : emptyPreferenceResource();
  }
  async function write(expectedRevision: number, patch?: PreferencePatchV1) {
    const current = await read();
    if (current.revision !== expectedRevision)
      throw new PreferenceApiError("STALE_PREFERENCE_REVISION");
    if (!patch && expectedRevision === 0) return current;
    let payload;
    try {
      payload = parsePreferenceV1(
        patch
          ? applyPreferencePatch(current.preference, patch)
          : emptyPreference(),
      );
    } catch {
      throw new PreferenceApiError("INVALID_PREFERENCE");
    }
    if (expectedRevision === 2147483647)
      throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
    const query =
      expectedRevision === 0
        ? client
            .from("travel_preferences")
            .insert({ owner_user_id: owner, payload, revision: 1 })
        : client
            .from("travel_preferences")
            .update({ payload, revision: expectedRevision + 1 })
            .eq("owner_user_id", owner)
            .eq("revision", expectedRevision);
    const { data, error } = await query.select(columns).maybeSingle();
    if (error) {
      if (error.code === "23505" || error.code === "40001")
        throw new PreferenceApiError("STALE_PREFERENCE_REVISION");
      throw new PreferenceApiError("PREFERENCE_UNAVAILABLE");
    }
    if (!data) throw new PreferenceApiError("STALE_PREFERENCE_REVISION");
    // Return exactly the row committed by this CAS, not a subsequent read.
    return resource(data);
  }
  return {
    read,
    patch: (expected: number, patch: PreferencePatchV1) =>
      write(expected, patch),
    reset: (expected: number) => write(expected),
  };
}
