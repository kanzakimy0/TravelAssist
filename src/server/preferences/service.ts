import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import { publicSupabaseConfig } from "../../lib/supabase/config";
import { requireAuthUser } from "../../lib/auth/server-user";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { object, parse } from "../../shared/contracts/trips/validation";
import { uuid } from "../../shared/contracts/preferences";
import {
  createDraftInput,
  updateDraftInput,
  updateOverrideInput,
  updatePreferenceInput,
} from "../../shared/contracts/preferences/drafts";
import { preferenceRepository } from "./repository";

export async function runTravelPersistence(
  accessToken: string,
  operation: string,
  input: unknown,
) {
  // Supabase verifies the token; never trust a decoded claim, browser owner or getSession().
  if (!accessToken || accessToken.length > 16384)
    throw new Error("AUTH_REQUIRED");
  const { url, key } = publicSupabaseConfig();
  const auth = createClient<Database>(url, key, {
    global: { headers: { Authorization: "Bearer " + accessToken } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return runAuthenticatedTravelPersistence(auth, operation, input);
}

/** Reuses TASK-018 verified-user primitive for cookie and bearer consumers. */
export async function runAuthenticatedTravelPersistence(
  client: SupabaseClient<Database>,
  operation: string,
  input: unknown,
) {
  const identity = await requireAuthUser(client);
  if (!identity.ok)
    throw new Error(
      identity.code === "unauthenticated"
        ? "AUTH_REQUIRED"
        : "AUTH_UNAVAILABLE",
    );
  if (!parse(uuid, identity.data.userId).ok) throw new Error("AUTH_REQUIRED");
  const owner = identity.data.userId;
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`set local role authenticated`);
    await tx.execute(
      sql`select set_config('request.jwt.claim.sub',${owner},true),set_config('request.jwt.claims',${JSON.stringify({ sub: owner, role: "authenticated" })},true)`,
    );
    // Serialize creation + preference snapshot for this owner. No global lock.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${owner},0))`,
    );
    const repo = preferenceRepository(tx, owner);
    switch (operation) {
      case "getPreference":
        if (!parse(object({}), input).ok) throw new Error("INVALID_INPUT");
        return repo.getTravelPreference();
      case "updatePreference": {
        const p = parse(updatePreferenceInput, input);
        if (!p.ok) throw new Error("INVALID_INPUT");
        return repo.updateTravelPreference(p.value.revision, p.value.patch);
      }
      case "createDraft": {
        const p = parse(createDraftInput, input);
        if (!p.ok) throw new Error("INVALID_INPUT");
        return repo.createTripDraft(p.value.creationKey, p.value.content);
      }
      case "getDraft":
      case "getEffectivePreference": {
        const p = parse(object({ id: uuid }), input);
        if (!p.ok) throw new Error("INVALID_INPUT");
        return operation === "getDraft"
          ? repo.getTripDraft(p.value.id)
          : repo.getEffectiveTripPreference(p.value.id);
      }
      case "listDrafts":
        if (!parse(object({}), input).ok) throw new Error("INVALID_INPUT");
        return repo.listTripDrafts();
      case "updateDraft": {
        const p = parse(updateDraftInput, input);
        if (!p.ok) throw new Error("INVALID_INPUT");
        return repo.updateTripDraft(
          p.value.id,
          p.value.revision,
          p.value.content,
        );
      }
      case "updateOverrides": {
        const p = parse(updateOverrideInput, input);
        if (!p.ok) throw new Error("INVALID_INPUT");
        return repo.updateTripPreferenceOverrides(
          p.value.id,
          p.value.revision,
          p.value.patch,
        );
      }
      default:
        throw new Error("INVALID_OPERATION");
    }
  });
}
