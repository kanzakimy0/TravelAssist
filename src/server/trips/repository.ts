import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import { requireAuthUser } from "../../lib/auth/server-user";
import { getDb } from "../../db/index";
import {
  trips,
  tripPlans,
  tripDays,
  itineraryItems,
} from "../../db/schema/trips";
import {
  itemToRow,
  requireUuid,
  rowsToSnapshot,
  TripPersistenceError,
  validatedSnapshot,
} from "./projection";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Snapshot = ReturnType<typeof validatedSnapshot>;

async function readTree(tx: Tx, id: string) {
  const [trip] = await tx.select().from(trips).where(eq(trips.id, id));
  if (!trip) throw new TripPersistenceError("NOT_FOUND");
  const plans = await tx
    .select()
    .from(tripPlans)
    .where(eq(tripPlans.tripId, id));
  const days = plans.length
    ? await tx
        .select()
        .from(tripDays)
        .where(
          inArray(
            tripDays.planId,
            plans.map((p) => p.id),
          ),
        )
    : [];
  const items = days.length
    ? await tx
        .select()
        .from(itineraryItems)
        .where(
          inArray(
            itineraryItems.dayId,
            days.map((d) => d.id),
          ),
        )
    : [];
  return rowsToSnapshot({ trip, plans, days, items });
}
async function insertDays(tx: Tx, plan: Snapshot["plans"][number]) {
  for (const d of plan.days) {
    await tx.insert(tripDays).values({
      id: d.id,
      planId: plan.id,
      dayNumber: d.dayNumber,
      localDate: d.localDate,
      timezone: d.timezone,
    });
    const items = [
      ...d.items.map((i, n) => itemToRow(i, d.id, "scheduled", n)),
      ...d.alternatives.map((i, n) => itemToRow(i, d.id, "alternative", n)),
    ];
    // Bound parameter count for valid large contracts.
    for (let n = 0; n < items.length; n += 200)
      await tx.insert(itineraryItems).values(items.slice(n, n + 200));
  }
}
function publicFailure(error: unknown): never {
  if (error instanceof TripPersistenceError) throw error;
  const candidates = [error, error instanceof Error ? error.cause : null];
  const codes = candidates.map((e) =>
    e && typeof e === "object" && "code" in e ? String(e.code) : "",
  );
  if (codes.some((c) => c.startsWith("23") || c === "PT409"))
    throw new TripPersistenceError("CONSTRAINT_CONFLICT");
  if (codes.some((c) => c === "40001" || c === "40P01"))
    throw new TripPersistenceError("STALE_TRIP");
  // No SQL, credential, input payload or other user's details escape the DAL.
  throw new TripPersistenceError("DATABASE_FAILURE");
}

/** Internal DAL only. The supplied request-scoped client must represent the actual caller.
 * Every operation verifies Auth server-side and uses transaction-local authenticated RLS.
 * No HTTP API / Server Action / UI persistence wiring is introduced by TASK-019.
 */
export function createTripRepository(
  auth: SupabaseClient<Database>,
  database: () => Db = getDb,
) {
  async function run<T>(
    operation: (tx: Tx, userId: string) => Promise<T>,
    readOnly = false,
  ): Promise<T> {
    const user = await requireAuthUser(auth);
    if (!user.ok) throw new TripPersistenceError("UNAUTHENTICATED");
    try {
      return await database().transaction(
        async (tx) => {
          await tx.execute(
            sql`select set_config('request.jwt.claim.sub',${user.data.userId},true), set_config('request.jwt.claims',${JSON.stringify({ sub: user.data.userId, role: "authenticated" })},true)`,
          );
          await tx.execute(sql`set local role authenticated`);
          return operation(tx, user.data.userId);
        },
        {
          isolationLevel: "repeatable read",
          accessMode: readOnly ? "read only" : "read write",
        },
      );
    } catch (error) {
      return publicFailure(error);
    }
  }
  return {
    async create(input: unknown) {
      const s = validatedSnapshot(input);
      if (s.trip.revision !== 1 || s.plans.some((p) => p.revision !== 1))
        throw new TripPersistenceError("INITIAL_REVISION_REQUIRED");
      return run(async (tx, userId) => {
        await tx.insert(trips).values({
          id: s.trip.id,
          ownerUserId: userId,
          title: s.trip.title,
          status: s.trip.status,
          defaultTimezone: s.trip.defaultTimezone,
          activePlanId: s.trip.activePlanId,
          provenance: s.provenance,
        });
        for (const [position, p] of s.plans.entries()) {
          await tx
            .insert(tripPlans)
            .values({ id: p.id, tripId: s.trip.id, title: p.title, position });
          await insertDays(tx, p);
        }
        return readTree(tx, s.trip.id);
      });
    },
    async read(tripId: string) {
      requireUuid(tripId);
      return run((tx) => readTree(tx, tripId), true);
    },
    async replace(input: unknown) {
      const s = validatedSnapshot(input);
      return run(async (tx) => {
        const [current] = await tx
          .select()
          .from(trips)
          .where(eq(trips.id, s.trip.id))
          .for("update");
        if (!current) throw new TripPersistenceError("NOT_FOUND");
        if (current.revision !== s.trip.revision)
          throw new TripPersistenceError("STALE_TRIP");
        const existing = await tx
          .select()
          .from(tripPlans)
          .where(eq(tripPlans.tripId, s.trip.id))
          .for("update");
        for (const p of s.plans) {
          const old = existing.find((e) => e.id === p.id);
          if (old ? old.revision !== p.revision : p.revision !== 1)
            throw new TripPersistenceError("STALE_PLAN");
        }
        // Root CAS precedes all child writes. SQL coalesces all changes in this transaction.
        await tx
          .update(trips)
          .set({
            title: s.trip.title,
            status: s.trip.status,
            defaultTimezone: s.trip.defaultTimezone,
            activePlanId: s.trip.activePlanId,
            provenance: s.provenance,
            revision: s.trip.revision,
          })
          .where(
            and(eq(trips.id, s.trip.id), eq(trips.revision, s.trip.revision)),
          );
        const removed = existing.filter(
          (p) => !s.plans.some((x) => x.id === p.id),
        );
        if (removed.length)
          await tx.delete(tripPlans).where(
            inArray(
              tripPlans.id,
              removed.map((p) => p.id),
            ),
          );
        // Replace normalized child rows atomically, never upsert an ID belonging to another tree.
        // No history/booking table currently references these IDs. Future FK consumers need a delta writer.
        for (const [position, p] of s.plans.entries()) {
          if (existing.some((e) => e.id === p.id)) {
            await tx
              .update(tripPlans)
              .set({ title: p.title, position, revision: p.revision })
              .where(eq(tripPlans.id, p.id));
            await tx.delete(tripDays).where(eq(tripDays.planId, p.id));
          } else
            await tx.insert(tripPlans).values({
              id: p.id,
              tripId: s.trip.id,
              title: p.title,
              position,
            });
          await insertDays(tx, p);
        }
        return readTree(tx, s.trip.id);
      });
    },
    async remove(tripId: string, expectedRevision: number) {
      requireUuid(tripId);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
        throw new TripPersistenceError("STALE_TRIP");
      return run(async (tx) => {
        const [current] = await tx
          .select()
          .from(trips)
          .where(eq(trips.id, tripId))
          .for("update");
        if (!current) throw new TripPersistenceError("NOT_FOUND");
        if (current.revision !== expectedRevision)
          throw new TripPersistenceError("STALE_TRIP");
        await tx
          .delete(trips)
          .where(
            and(eq(trips.id, tripId), eq(trips.revision, expectedRevision)),
          );
      });
    },
  };
}
