import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/trips.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { snapshotFixture } from "./task-019-fixtures.mjs";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import {
  localDeletionSecret,
  ownerColumns,
  inventory,
  counts,
} from "./task-052-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { validDeletion } from "./task-052-account-deletion-fixtures.mjs";
import { record, toRow } from "./task-048-trip-fixtures.mjs";
const aTables = ["trips", "trip_plans", "trip_days", "itinerary_items"];
const success = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local request succeeds; raw response withheld",
  );
  return r.data;
};
async function aInventory(db, id) {
  const rows = {
    trips: await db`select * from public.trips where owner_user_id=${id}`,
    trip_plans:
      await db`select p.* from public.trip_plans p join public.trips t on t.id=p.trip_id where t.owner_user_id=${id}`,
    trip_days:
      await db`select d.* from public.trip_days d join public.trip_plans p on p.id=d.plan_id join public.trips t on t.id=p.trip_id where t.owner_user_id=${id}`,
    itinerary_items:
      await db`select i.* from public.itinerary_items i join public.trip_days d on d.id=i.day_id join public.trip_plans p on p.id=d.plan_id join public.trips t on t.id=p.trip_id where t.owner_user_id=${id}`,
  };
  for (const table of aTables)
    rows[table] = Array.from(rows[table]).sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  return rows;
}
test("TASK-062 live A/B coexistence and public account deletion across all twelve tables", async (t) => {
  const local = preferenceLocalRuntime();
  const { db, admin } = local;
  const users = [];
  let app;
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated empty Local DB required",
    );
    for (let i = 0; i < 2; i++) {
      const email = "task062-" + randomUUID() + "@example.test",
        password = randomUUID() + "aA!9";
      const id = success(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      ).user.id;
      const user = { id };
      users.push(user);
      user.client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      user.token = success(
        await user.client.auth.signInWithPassword({ email, password }),
      ).session.access_token;
      const companion = randomUUID(),
        group = randomUUID(),
        contact = randomUUID();
      user.rows = {
        profiles: { id, display_name: "Synthetic traveller" },
        profile_settings: { user_id: id, locale: "en", timezone: "Asia/Tokyo" },
        emergency_contacts: {
          id: contact,
          user_id: id,
          name: "Synthetic contact",
          relationship: "friend",
          phone_e164: "+819012345678",
        },
        travel_preferences: { owner_user_id: id },
        companions: {
          id: companion,
          owner_user_id: id,
          display_name: "Synthetic companion",
          age_group_fallback: "adult",
        },
        companion_groups: {
          id: group,
          owner_user_id: id,
          name: "Synthetic group",
        },
        companion_group_members: {
          owner_user_id: id,
          group_id: group,
          companion_id: companion,
          sort_order: 0,
        },
      };
      for (const [table, row] of Object.entries(user.rows))
        success(await user.client.from(table).insert(row));
      user.repo = createTripRepository(user.client, () =>
        drizzle(db, { schema }),
      );
      user.plan = await user.repo.create(snapshotFixture());
      const trip = {
        ...record("saved"),
        ownerUserId: id,
        canonicalTripId: user.plan.trip.id,
        planSnapshot: user.plan,
      };
      user.rows.trip_library_records = toRow(trip);
      // Fixture setup only: the accepted Trip Library contract has no direct client writes.
      success(
        await admin
          .from("trip_library_records")
          .insert(user.rows.trip_library_records),
      );
    }

    const [a, b] = users;
    await t.test(
      "both accounts simultaneously populate every A and B table",
      async () => {
        for (const user of users) {
          assert.ok(
            Object.values(counts(await inventory(db, user.id))).every(
              (n) => n === 1,
            ),
          );
          assert.ok(
            Object.values(counts(await aInventory(db, user.id))).every(
              (n) => n > 0,
            ),
          );
        }
      },
    );
    await t.test(
      "Trip CAS does not overwrite B preferences, companions or detached saved snapshots",
      async () => {
        const before = await inventory(db, a.id);
        const stale = structuredClone(a.plan);
        a.plan.trip.title = "Changed canonical title";
        a.plan = await a.repo.replace(a.plan);
        assert.equal(a.plan.trip.revision, stale.trip.revision + 1);
        await assert.rejects(a.repo.replace(stale));
        assert.deepEqual(await inventory(db, a.id), before);
        const stored = success(
          await a.client
            .from("trip_library_records")
            .select("plan_snapshot,storage_revision")
            .eq("owner_user_id", a.id),
        )[0];
        assert.equal(stored.storage_revision, 1);
        assert.equal(stored.plan_snapshot.trip.revision, 1);
        assert.notEqual(stored.plan_snapshot.trip.title, a.plan.trip.title);
      },
    );
    await t.test(
      "B writes leave canonical Trip Plan tree and revisions unchanged",
      async () => {
        const before = await aInventory(db, a.id);
        success(
          await a.client
            .from("profiles")
            .update({ display_name: "Updated synthetic traveller" })
            .eq("id", a.id),
        );
        success(
          await a.client
            .from("travel_preferences")
            .update({ revision: 2 })
            .eq("owner_user_id", a.id),
        );
        assert.deepEqual(await aInventory(db, a.id), before);
      },
    );
    await t.test(
      "accepted DELETE /api/account cascades all A and B rows and preserves the other account",
      async () => {
        local.env.DATABASE_URL = local.databaseUrl;
        local.env.SUPABASE_SECRET_KEY = localDeletionSecret(local);
        app = await startApp(local);
        const beforeA = await aInventory(db, b.id),
          beforeB = await inventory(db, b.id);
        const response = await fetch(app.origin + "/api/account", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + a.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validDeletion()),
        });
        assert.equal(response.status, 204);
        assert.equal(await response.text(), "");
        a.deleted = true;
        assert.ok(
          Object.values(counts(await inventory(db, a.id))).every(
            (n) => n === 0,
          ),
        );
        assert.ok(
          Object.values(counts(await aInventory(db, a.id))).every(
            (n) => n === 0,
          ),
        );
        assert.deepEqual(await aInventory(db, b.id), beforeA);
        assert.deepEqual(await inventory(db, b.id), beforeB);
      },
    );
  } finally {
    try {
      if (app) await app.stop();
      for (const user of users) {
        if (!user.deleted) success(await admin.auth.admin.deleteUser(user.id));
        user.client?.auth.stopAutoRefresh();
      }
      for (const table of [
        "auth.users",
        ...Object.keys(ownerColumns).map((t) => "public." + t),
        ...aTables.map((t) => "public." + t),
      ])
        assert.equal(
          Number((await db`select count(*) from ${db(table)}`)[0].count),
          0,
          table + " cleanup",
        );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
