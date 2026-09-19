import "server-only";
import { and, eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import { requireAuthUser } from "../../lib/auth/server-user";
import { getDb } from "../../db/index";
import { trips, tripPlans } from "../../db/schema/trips";
import {
  requireUuid,
  TripPersistenceError,
  validatedSnapshot,
} from "./projection";

import {
  readTree,
  insertDays,
  replaceTripTree,
  setTripActor,
  type TripTransaction,
} from "./transaction";

type Db = ReturnType<typeof getDb>;
type Tx = TripTransaction;

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
          await setTripActor(tx, user.data.userId);
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
      return run((tx) => replaceTripTree(tx, s));
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
