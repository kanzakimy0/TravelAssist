import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, desc, sql, getTableColumns, inArray } from "drizzle-orm";
import { getDb } from "../../db/index";
import { tripLibraryRecords as table } from "../../db/schema/trip-library";
import { travelPreferences } from "../../db/schema/travel-preferences";
import { companions } from "../../db/schema/companions";
import {
  parsePreferenceV1,
  applyPreferencePatch,
} from "../../features/preferences/domain/preference-v1";
import {
  parseCompanionAgeSource,
  parseCompanionTravelProfileV1,
} from "../../features/companions/domain/companion-v1";
import {
  parseTripLibraryRecord,
  captureTripPreference,
  captureTripParty,
  copyHistoryToDraft,
  validateTripLibraryUpdate,
  TripPersistenceValidationError,
  type TripLibraryRecordV1,
} from "../../features/trip-library/domain/trip-persistence-v1";
import {
  tripResource,
  parseTripSummary,
} from "../../features/trip-library/persistence/resource";
import {
  fail,
  type TripDraftRequestV1,
} from "../../features/trip-library/persistence/requests";
import { TripLibraryApiError } from "../../shared/contracts/trip-library/index";
import type { TripPlanSnapshotV1 } from "../../shared/contracts/trips/index";
import { encodeTripCursor, type TripListQuery } from "./query";
type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
// Preserve PostgreSQL microseconds. JS Date rounding is unsafe for keyset cursors.
const stamp = (
  column:
    typeof table.createdAt | typeof table.updatedAt | typeof table.frozenAt,
) =>
  sql<string>`to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const columns = {
  ...getTableColumns(table),
  createdAt: stamp(table.createdAt),
  updatedAt: stamp(table.updatedAt),
  frozenAt: stamp(table.frozenAt),
};
type Row = typeof table.$inferSelect;
function record(
  row: Omit<Row, "createdAt" | "updatedAt" | "frozenAt"> & {
    createdAt: string;
    updatedAt: string;
    frozenAt: string | null;
  },
) {
  const { creationIntentHash, ...content } = row;
  void creationIntentHash;
  try {
    return parseTripLibraryRecord(content);
  } catch {
    return fail("TRIP_LIBRARY_UNAVAILABLE");
  }
}
function identity(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(identity).join(",") + "]";
  const v = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + identity(v[k]))
      .join(",") +
    "}"
  );
}
export function creationIntentHash(intent: unknown) {
  return createHash("sha256")
    .update(identity({ version: 1, intent }))
    .digest("hex");
}
function candidate(input: unknown) {
  try {
    return parseTripLibraryRecord(input);
  } catch (e) {
    return fail(
      e instanceof TripPersistenceValidationError &&
        e.code === "PAYLOAD_TOO_LARGE"
        ? "PAYLOAD_TOO_LARGE"
        : "INVALID_TRIP_DRAFT_INPUT",
    );
  }
}
/** getDb has NO implicit RLS. Only a verified Auth owner reaches this gateway.
 * Every SELECT/UPDATE/DELETE is explicitly owner-scoped; INSERT always supplies that owner.
 * Root and Companion captures plus mutation run in the same database transaction. */
export function tripLibraryRepository(owner: string) {
  const owned = eq(table.ownerUserId, owner);
  const locate = (id: string) => and(owned, eq(table.id, id));
  async function transaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await getDb().transaction(run);
    } catch (e) {
      if (e instanceof TripLibraryApiError) throw e;
      let err: unknown = e;
      for (let i = 0; i < 4 && err && typeof err === "object"; i++) {
        const db = err as { code?: string; cause?: unknown };
        if (db.code === "23505") return fail("TRIP_LIBRARY_STATE_CONFLICT");
        if (db.code === "40001") return fail("STALE_TRIP_LIBRARY_REVISION");
        err = db.cause;
      }
      return fail("TRIP_LIBRARY_UNAVAILABLE");
    }
  }
  async function read(tx: Tx, id: string) {
    const [row] = await tx
      .select(columns)
      .from(table)
      .where(locate(id))
      .limit(1);
    if (!row) return fail("TRIP_LIBRARY_NOT_FOUND");
    return record(row);
  }
  async function preference(tx: Tx) {
    const [row] = await tx
      .select({
        payload: travelPreferences.payload,
        revision: travelPreferences.revision,
      })
      .from(travelPreferences)
      .where(eq(travelPreferences.ownerUserId, owner))
      .limit(1);
    return row
      ? { preference: parsePreferenceV1(row.payload), revision: row.revision }
      : null;
  }
  async function party(tx: Tx, input: TripDraftRequestV1) {
    const selection = input.partySelection;
    const rows = selection.companionIds.length
      ? await tx
          .select({
            id: companions.id,
            displayName: companions.displayName,
            birthDate: companions.birthDate,
            ageGroupFallback: companions.ageGroupFallback,
            travelProfile: companions.travelProfile,
          })
          .from(companions)
          .where(
            and(
              eq(companions.ownerUserId, owner),
              inArray(companions.id, selection.companionIds),
            ),
          )
          .limit(100)
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    try {
      const members = selection.companionIds.map((id) => {
        const row = byId.get(id);
        if (!row) return fail("COMPANION_SELECTION_INVALID");
        return {
          id: row.id,
          displayName: row.displayName,
          ...parseCompanionAgeSource(
            {
              birthDate: row.birthDate,
              ageGroupFallback: row.ageGroupFallback,
            },
            selection.ageReferenceDate,
          ),
          travelProfile: parseCompanionTravelProfileV1(row.travelProfile),
        };
      });
      return captureTripParty(
        input.draftFacts,
        selection.ageReferenceDate,
        selection.includesOwner,
        members,
      );
    } catch {
      return fail("COMPANION_SELECTION_INVALID");
    }
  }
  function validatePatch(
    snapshot: TripLibraryRecordV1["preferenceSnapshot"],
    input: TripDraftRequestV1,
  ) {
    try {
      applyPreferencePatch(snapshot, input.preferenceOverridePatch);
    } catch {
      return fail("INVALID_TRIP_PREFERENCE_PATCH");
    }
  }
  async function existing(tx: Tx, key: string, hash: string) {
    const [row] = await tx
      .select(columns)
      .from(table)
      .where(and(owned, eq(table.creationKey, key)))
      .limit(1);
    if (!row) return null;
    if (row.creationIntentHash !== hash) return fail("CREATION_KEY_CONFLICT");
    return tripResource(record(row));
  }
  async function insert(tx: Tx, value: TripLibraryRecordV1, hash: string) {
    // ON CONFLICT only targets this owner's creation key. The following owner read sees a concurrent winner.
    const { createdAt, updatedAt, frozenAt, ...data } = candidate(value);
    void createdAt;
    void updatedAt;
    void frozenAt;
    const [row] = await tx
      .insert(table)
      .values({ ...data, ownerUserId: owner, creationIntentHash: hash })
      .onConflictDoNothing({ target: [table.ownerUserId, table.creationKey] })
      .returning(columns);
    if (row) return { data: tripResource(record(row)), created: true };
    const retry = await existing(tx, value.creationKey, hash);
    if (!retry) return fail("TRIP_LIBRARY_UNAVAILABLE");
    return { data: retry, created: false };
  }
  function revision(current: TripLibraryRecordV1, expected: number) {
    if (current.storageRevision !== expected)
      return fail("STALE_TRIP_LIBRARY_REVISION");
  }
  async function mutate(
    id: string,
    expected: number,
    action: "update" | "save" | "history" | "delete",
    input?: TripDraftRequestV1 | TripPlanSnapshotV1,
  ) {
    return transaction(async (tx) => {
      const current = await read(tx, id);
      revision(current, expected);
      if (
        current.libraryState === "history" ||
        ((action === "update" || action === "delete") &&
          current.libraryState !== "draft") ||
        (action === "history" && current.libraryState !== "saved")
      )
        return fail("TRIP_LIBRARY_STATE_CONFLICT");
      const where = and(
        locate(id),
        eq(table.storageRevision, expected),
        eq(table.libraryState, current.libraryState),
      );
      if (action === "delete") {
        const rows = await tx
          .delete(table)
          .where(where)
          .returning({ id: table.id });
        if (!rows.length) return fail("STALE_TRIP_LIBRARY_REVISION");
        return null;
      }
      if (expected === 2147483647) return fail("TRIP_LIBRARY_STATE_CONFLICT");
      let next = { ...current, storageRevision: expected + 1 };
      if (action === "update") {
        const draft = input as TripDraftRequestV1;
        validatePatch(current.preferenceSnapshot, draft);
        next = {
          ...next,
          draftFacts: draft.draftFacts,
          wizardProgress: draft.wizardProgress,
          preferenceOverridePatch: draft.preferenceOverridePatch,
          partySnapshot: await party(tx, draft),
        };
      } else if (action === "save") {
        const plan = input as TripPlanSnapshotV1;
        if (
          current.canonicalTripId !== null &&
          current.canonicalTripId !== plan.trip.id
        )
          return fail("TRIP_LIBRARY_STATE_CONFLICT");
        next = {
          ...next,
          libraryState: "saved",
          planSnapshot: plan,
          canonicalTripId: plan.trip.id,
        };
      } else
        next = {
          ...next,
          libraryState: "history",
          frozenAt: new Date().toISOString(),
        };
      // The trigger supplies actual timestamps/freeze; this candidate is only the invariant preflight.
      const valid = validateTripLibraryUpdate(current, candidate(next));
      const [row] = await tx
        .update(table)
        .set({
          draftFacts: valid.draftFacts,
          wizardProgress: valid.wizardProgress,
          preferenceOverridePatch: valid.preferenceOverridePatch,
          partySnapshot: valid.partySnapshot,
          planSnapshot: valid.planSnapshot,
          canonicalTripId: valid.canonicalTripId,
          libraryState: valid.libraryState,
          storageRevision: valid.storageRevision,
        })
        .where(where)
        .returning(columns);
      if (!row) return fail("STALE_TRIP_LIBRARY_REVISION");
      return tripResource(record(row));
    });
  }
  return {
    read: (id: string) =>
      transaction(async (tx) => tripResource(await read(tx, id))),
    create: (input: TripDraftRequestV1) =>
      transaction(async (tx) => {
        const key = input.creationKey!;
        const hash = creationIntentHash({
          kind: "create",
          ...input,
          preferenceOverridePatch: {
            ...input.preferenceOverridePatch,
            unset: [...input.preferenceOverridePatch.unset].sort(),
          },
        });
        const retry = await existing(tx, key, hash);
        if (retry) return { data: retry, created: false };
        const captured = captureTripPreference(await preference(tx));
        validatePatch(captured.preferenceSnapshot, input);
        const now = new Date().toISOString();
        return insert(
          tx,
          candidate({
            id: randomUUID(),
            ownerUserId: owner,
            creationKey: key,
            libraryState: "draft",
            canonicalTripId: null,
            draftFacts: input.draftFacts,
            wizardProgress: input.wizardProgress,
            planSnapshot: null,
            ...captured,
            preferenceOverridePatch: input.preferenceOverridePatch,
            partySnapshot: await party(tx, input),
            storageRevision: 1,
            frozenAt: null,
            createdAt: now,
            updatedAt: now,
          }),
          hash,
        );
      }),
    copy: (id: string, expected: number, key: string) =>
      transaction(async (tx) => {
        const source = await read(tx, id);
        revision(source, expected);
        if (source.libraryState !== "history")
          return fail("TRIP_LIBRARY_STATE_CONFLICT");
        const hash = creationIntentHash({
          kind: "copy",
          sourceId: id,
          sourceRevision: expected,
          creationKey: key,
        });
        const retry = await existing(tx, key, hash);
        if (retry) return { data: retry, created: false };
        if (key === source.creationKey) return fail("CREATION_KEY_CONFLICT");
        const value = copyHistoryToDraft(source, {
          id: randomUUID(),
          creationKey: key,
          createdAt: new Date().toISOString(),
          preferenceSource: await preference(tx),
        });
        return insert(tx, value, hash);
      }),
    mutate,
    list: (query: TripListQuery) =>
      transaction(async (tx) => {
        // Summary projection only: no full draft/progress/party/preference/plan payload crosses SQL.
        const rows = await tx
          .select({
            id: table.id,
            libraryState: table.libraryState,
            canonicalTripId: table.canonicalTripId,
            storageRevision: table.storageRevision,
            title: sql<
              string | null
            >`coalesce(${table.planSnapshot}#>>'{trip,title}',${table.draftFacts}->>'title')`,
            destinations: sql<
              string[]
            >`jsonb_path_query_array(${table.draftFacts}, '$.destinations[*].name')`,
            departure: sql<
              string | null
            >`${table.draftFacts}#>>'{dates,departure}'`,
            returning: sql<
              string | null
            >`${table.draftFacts}#>>'{dates,returning}'`,
            participantCount: sql<number>`(${table.draftFacts}#>>'{participants,adults}')::int + (${table.draftFacts}#>>'{participants,children}')::int + (${table.draftFacts}#>>'{participants,infants}')::int + (${table.draftFacts}#>>'{participants,seniors}')::int`,
            wizardPhase: sql<string>`${table.wizardProgress}->>'phase'`,
            planStatus: sql<
              string | null
            >`${table.planSnapshot}#>>'{trip,status}'`,
            createdAt: stamp(table.createdAt),
            updatedAt: stamp(table.updatedAt),
            frozenAt: stamp(table.frozenAt),
          })
          .from(table)
          .where(
            and(
              owned,
              query.state === "all"
                ? undefined
                : eq(table.libraryState, query.state),
              query.cursor
                ? sql`(${table.updatedAt},${table.id}) < (${query.cursor.updatedAt}::timestamptz,${query.cursor.id}::uuid)`
                : undefined,
            ),
          )
          .orderBy(desc(table.updatedAt), desc(table.id))
          .limit(query.limit + 1);
        const items = rows.slice(0, query.limit).map(parseTripSummary);
        const last = items.at(-1);
        return {
          schemaVersion: "1.0" as const,
          items,
          nextCursor:
            rows.length > query.limit && last
              ? encodeTripCursor({ id: last.id, updatedAt: last.updatedAt })
              : null,
        };
      }),
  };
}
