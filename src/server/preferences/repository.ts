import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { getDb } from "../../db";
import {
  travelPreferences,
  tripDrafts,
  tripPreferenceSnapshots,
  tripPreferenceOverrides,
} from "../../db/schema/travel-preferences";
import {
  applyPreferencePatch,
  effectivePreference,
  emptyPreference,
  parsePreference,
  type PreferencePatchV1,
} from "../../shared/contracts/preferences";
import {
  parseDraftResponse,
  type DraftContent,
} from "../../shared/contracts/preferences/drafts";
export type PreferenceTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

/** Internal only. tx MUST already have a verified authenticated owner and RLS claims. */
export function preferenceRepository(tx: PreferenceTransaction, owner: string) {
  const fail = (code: string): never => {
    throw new Error(code);
  };
  async function preference() {
    const [row] = await tx
      .select()
      .from(travelPreferences)
      .where(eq(travelPreferences.ownerUserId, owner));
    const parsed = parsePreference(row?.payload ?? emptyPreference());
    if (!parsed.ok) return fail("STORED_PREFERENCE_INVALID");
    return { revision: row?.revision ?? 0, preference: parsed.value };
  }
  async function draft(id: string) {
    const [row] = await tx
      .select()
      .from(tripDrafts)
      .where(and(eq(tripDrafts.ownerUserId, owner), eq(tripDrafts.id, id)));
    if (!row) fail("NOT_FOUND");
    const [baseline] = await tx
      .select()
      .from(tripPreferenceSnapshots)
      .where(
        and(
          eq(tripPreferenceSnapshots.ownerUserId, owner),
          eq(tripPreferenceSnapshots.tripDraftId, id),
        ),
      );
    const [overrides] = await tx
      .select()
      .from(tripPreferenceOverrides)
      .where(
        and(
          eq(tripPreferenceOverrides.ownerUserId, owner),
          eq(tripPreferenceOverrides.tripDraftId, id),
        ),
      );
    if (!baseline || !overrides) fail("INCOMPLETE_DRAFT");
    const response = parseDraftResponse({
      id: row.id,
      creationKey: row.creationKey,
      status: row.status,
      revision: row.revision,
      content: { facts: row.facts, progress: row.progress },
      snapshot: baseline.payload,
      sourcePreferenceRevision: baseline.sourcePreferenceRevision,
      overrides: overrides.payload,
      overrideRevision: overrides.revision,
      effective: effectivePreference(baseline.payload, overrides.payload),
    });
    if (!response.ok) return fail("STORED_DRAFT_INVALID");
    return response.value;
  }
  return {
    getTravelPreference: preference,
    async updateTravelPreference(revision: number, patch: PreferencePatchV1) {
      const current = await preference();
      if (current.revision !== revision) fail("STALE_REVISION");
      const payload = applyPreferencePatch(current.preference, patch);
      if (revision === 0)
        await tx
          .insert(travelPreferences)
          .values({ ownerUserId: owner, payload });
      else {
        const rows = await tx
          .update(travelPreferences)
          .set({ payload, revision: revision + 1 })
          .where(
            and(
              eq(travelPreferences.ownerUserId, owner),
              eq(travelPreferences.revision, revision),
            ),
          )
          .returning();
        if (!rows.length) fail("STALE_REVISION");
      }
      return preference();
    },
    async createTripDraft(creationKey: string, content: DraftContent) {
      // The key identifies ONE intent, not a content hash. Retries never overwrite it.
      const [existing] = await tx
        .select({ id: tripDrafts.id })
        .from(tripDrafts)
        .where(
          and(
            eq(tripDrafts.ownerUserId, owner),
            eq(tripDrafts.creationKey, creationKey),
          ),
        );
      if (existing) return draft(existing.id);
      const [row] = await tx
        .insert(tripDrafts)
        .values({ ownerUserId: owner, creationKey, ...content })
        .returning({ id: tripDrafts.id });
      // SQL initializes baseline and sparse overrides atomically, including direct inserts.
      return draft(row.id);
    },
    getTripDraft: draft,
    async listTripDrafts() {
      const rows = await tx
        .select({ id: tripDrafts.id })
        .from(tripDrafts)
        .where(
          and(
            eq(tripDrafts.ownerUserId, owner),
            eq(tripDrafts.status, "active"),
          ),
        )
        .orderBy(sql`${tripDrafts.updatedAt} desc`)
        .limit(50);
      return Promise.all(rows.map((row) => draft(row.id)));
    },
    async updateTripDraft(id: string, revision: number, content: DraftContent) {
      const rows = await tx
        .update(tripDrafts)
        .set({ ...content, revision: revision + 1 })
        .where(
          and(
            eq(tripDrafts.ownerUserId, owner),
            eq(tripDrafts.id, id),
            eq(tripDrafts.revision, revision),
          ),
        )
        .returning({ id: tripDrafts.id });
      if (!rows.length) fail("STALE_REVISION_OR_NOT_FOUND");
      return draft(id);
    },
    async updateTripPreferenceOverrides(
      id: string,
      revision: number,
      patch: PreferencePatchV1,
    ) {
      const current = await draft(id);
      if (current.overrideRevision !== revision) fail("STALE_REVISION");
      const payload = applyPreferencePatch(current.overrides, patch);
      effectivePreference(current.snapshot, payload); // Cross-layer contradictions fail atomically.
      const rows = await tx
        .update(tripPreferenceOverrides)
        .set({ payload, revision: revision + 1 })
        .where(
          and(
            eq(tripPreferenceOverrides.ownerUserId, owner),
            eq(tripPreferenceOverrides.tripDraftId, id),
            eq(tripPreferenceOverrides.revision, revision),
          ),
        )
        .returning();
      if (!rows.length) fail("STALE_REVISION");
      return draft(id);
    },
    async getEffectiveTripPreference(id: string) {
      return (await draft(id)).effective;
    },
  };
}
