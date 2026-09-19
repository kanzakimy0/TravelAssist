import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { getDb } from "../../db/index";
import {
  trips,
  tripPlans,
  tripDays,
  itineraryItems,
} from "../../db/schema/trips";
import {
  itemToRow,
  rowsToSnapshot,
  TripPersistenceError,
  validatedSnapshot,
} from "./projection";
type Db = ReturnType<typeof getDb>;
export type TripTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Tx = TripTransaction;
type Snapshot = ReturnType<typeof validatedSnapshot>;

/** Internal primitives: caller owns the transaction and must establish verified Auth/RLS. */
export async function setTripActor(tx: Tx, userId: string) {
  await tx.execute(
    sql`select set_config('request.jwt.claim.sub',${userId},true), set_config('request.jwt.claims',${JSON.stringify({ sub: userId, role: "authenticated" })},true)`,
  );
  await tx.execute(sql`set local role authenticated`);
}
export async function lockTripTree(tx: Tx, id: string) {
  const [root] = await tx
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .for("update");
  if (!root) throw new TripPersistenceError("NOT_FOUND");
  await tx
    .select()
    .from(tripPlans)
    .where(eq(tripPlans.tripId, id))
    .orderBy(tripPlans.id)
    .for("update");
  return readTree(tx, id);
}
export async function readTree(tx: Tx, id: string) {
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
export async function insertDays(tx: Tx, plan: Snapshot["plans"][number]) {
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

/** Existing 8.5 writer, optionally restricted to one existing plan for Engine apply.
 * Root CAS and SQL revision coalescing remain canonical; unrelated plans stay untouched. */
export async function replaceTripTree(
  tx: Tx,
  input: unknown,
  targetPlanId?: string,
) {
  const s = validatedSnapshot(input);
  const selectedPlans = targetPlanId
    ? s.plans.filter((p) => p.id === targetPlanId)
    : s.plans;
  if (targetPlanId && selectedPlans.length !== 1)
    throw new TripPersistenceError("NOT_FOUND");
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
  for (const p of selectedPlans) {
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
    .where(and(eq(trips.id, s.trip.id), eq(trips.revision, s.trip.revision)));
  const removed = targetPlanId
    ? []
    : existing.filter((p) => !s.plans.some((x) => x.id === p.id));
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
    if (targetPlanId && p.id !== targetPlanId) continue;
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
}
