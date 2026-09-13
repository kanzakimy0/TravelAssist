import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
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
import { catalog, verifyCatalog } from "./task-054-catalog.mjs";
import { manifest, read, sha256 } from "./task-054-migration-helpers.mjs";

const success = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local fixture/request succeeds (raw response withheld)",
  );
  return r.data;
};
const reject = (r, codes = ["42501"]) =>
  assert.ok(
    codes.includes(r.error?.code),
    "Expected authorization/constraint rejection; got " +
      (r.error?.code ?? "success"),
  );

test("TASK-054 real migration catalog, two-user isolation, invariants and accepted account-delete cascade", async (t) => {
  const local = preferenceLocalRuntime();
  const { db, admin } = local;
  const users = [];
  const completed = [];
  let app;
  const accept = async (name, run) => {
    let passed = false;
    await t.test(name, async () => {
      await run();
      passed = true;
      completed.push(name);
    });
    assert.ok(passed, "Stop dependent acceptance after failed precondition");
  };
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Requires dedicated reset Local Supabase",
    );
    const state = await catalog(db);
    await accept(
      "replayed history, all tables/columns/defaults/checks/keys/indexes/policies/triggers/RPC types agree",
      async () => verifyCatalog(db, state),
    );
    for (let i = 0; i < 2; i++) {
      const email = "task054-" + randomUUID() + "@example.test",
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
      const trip = { ...record(), ownerUserId: id };
      user.rows.trip_library_records = toRow(trip);
      // Fixture setup only: the accepted Trip Library contract has no direct client writes.
      success(
        await admin
          .from("trip_library_records")
          .insert(user.rows.trip_library_records),
      );
    }
    const [a, b] = users;
    const anon = createClient(local.api, local.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await accept(
      "positive own reads and denied SELECT/INSERT/UPDATE/DELETE for every data family in both directions",
      async () => {
        for (const [owner, other] of [
          [a, b],
          [b, a],
        ]) {
          const before = await inventory(db, owner.id);
          assert.ok(
            Object.values(counts(before)).every((count) => count === 1),
            "Every owned table is populated before isolation probes",
          );
          for (const [table, column] of Object.entries(ownerColumns)) {
            assert.equal(
              success(
                await owner.client.from(table).select("*").eq(column, owner.id),
              ).length,
              1,
              table + " own SELECT",
            );
            assert.equal(
              success(
                await other.client.from(table).select("*").eq(column, owner.id),
              ).length,
              0,
              table + " cross SELECT",
            );
            reject(await anon.from(table).select("*"));
            reject(await other.client.from(table).insert(owner.rows[table]));
            const patch =
              table === "profiles"
                ? { display_name: "Forbidden edit" }
                : table === "profile_settings"
                  ? { locale: "fr" }
                  : table === "emergency_contacts"
                    ? { name: "Forbidden edit" }
                    : table === "companion_group_members"
                      ? { sort_order: 1 }
                      : table === "trip_library_records"
                        ? { storage_revision: 2 }
                        : { revision: 2 };
            const update = await other.client
              .from(table)
              .update(patch)
              .eq(column, owner.id)
              .select();
            const remove = await other.client
              .from(table)
              .delete()
              .eq(column, owner.id)
              .select();
            for (const r of [update, remove]) {
              if (r.error) reject(r);
              else assert.equal(r.data.length, 0, table + " hidden write");
            }
          }
          assert.ok(
            JSON.stringify(await inventory(db, owner.id)) ===
              JSON.stringify(before),
            "Victim rows unchanged after all foreign probes",
          );
        }
      },
    );
    await accept(
      "RPC cross-owner update/delete and foreign membership fail without aggregate changes",
      async () => {
        const before = await inventory(db, a.id);
        for (const name of ["mutate_companion_v1", "mutate_companion_group_v1"])
          for (const action of ["update", "delete"]) {
            const id =
              a.rows[
                name === "mutate_companion_v1"
                  ? "companions"
                  : "companion_groups"
              ].id;
            reject(
              await b.client.rpc(name, {
                p_action: action,
                p_id: id,
                p_expected_revision: 1,
              }),
              ["P0001"],
            );
            reject(
              await anon.rpc(name, {
                p_action: action,
                p_id: id,
                p_expected_revision: 1,
              }),
            );
          }
        reject(
          await b.client.rpc("mutate_companion_group_v1", {
            p_action: "create",
            p_name: "Forbidden group",
            p_includes_owner: false,
            p_member_ids: [a.rows.companions.id],
          }),
          ["P0001"],
        );
        // Valid RLS owner with mismatched parent owner must fail composite FK checks.
        reject(
          await b.client.from("companion_group_members").insert({
            owner_user_id: b.id,
            group_id: a.rows.companion_groups.id,
            companion_id: b.rows.companions.id,
            sort_order: 1,
          }),
          ["23503"],
        );
        assert.ok(
          JSON.stringify(await inventory(db, a.id)) === JSON.stringify(before),
          "RPC probes leave victim aggregate unchanged",
        );
      },
    );
    await accept(
      "accepted CAS, immutable ownership, JSON versions and Trip creation intent survive replay",
      async () => {
        for (const table of [
          "travel_preferences",
          "companions",
          "companion_groups",
        ]) {
          reject(
            await a.client
              .from(table)
              .update({ revision: 1 })
              .eq("owner_user_id", a.id),
            ["40001"],
          );
          reject(
            await a.client
              .from(table)
              .update({ owner_user_id: b.id, revision: 2 })
              .eq("owner_user_id", a.id),
            ["55000", "42501"],
          );
          success(
            await a.client
              .from(table)
              .update({ revision: 2 })
              .eq("owner_user_id", a.id),
          );
        }
        reject(
          await a.client
            .from("travel_preferences")
            .update({
              revision: 3,
              payload: { schemaVersion: "9.0", values: {} },
            })
            .eq("owner_user_id", a.id),
          ["23514"],
        );
        reject(
          await a.client
            .from("companions")
            .update({ revision: 3, travel_profile: { schemaVersion: "9.0" } })
            .eq("owner_user_id", a.id),
          ["23514"],
        );
        for (const [patch, code] of [
          [{ storage_revision: 1 }, "40001"],
          [{ storage_revision: 2, owner_user_id: b.id }, "55000"],
          [
            { storage_revision: 2, creation_intent_hash: "a".repeat(64) },
            "55000",
          ],
          [
            { storage_revision: 2, draft_facts: { contractVersion: "9.0" } },
            "23514",
          ],
        ])
          reject(
            await admin
              .from("trip_library_records")
              .update(patch)
              .eq("owner_user_id", a.id),
            [code],
          );
      },
    );
    await accept(
      "DELETE /api/account removes populated owner and all eight B families, preserving second user",
      async () => {
        local.env.DATABASE_URL = local.databaseUrl;
        local.env.SUPABASE_SECRET_KEY = localDeletionSecret(local);
        app = await startApp(local);
        const before = await inventory(db, b.id);
        assert.ok(
          Object.values(counts(await inventory(db, a.id))).every(
            (count) => count === 1,
          ),
        );
        const response = await fetch(app.origin + "/api/account", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + a.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validDeletion()),
        });
        assert.equal(
          response.status,
          204,
          "Accepted deletion HTTP path succeeds",
        );
        assert.equal(await response.text(), "");
        assert.ok(
          Object.values(counts(await inventory(db, a.id))).every(
            (count) => count === 0,
          ),
          "No Auth or B-owned orphan rows remain",
        );
        a.deleted = true;
        assert.ok(
          JSON.stringify(await inventory(db, b.id)) === JSON.stringify(before),
          "Other account survives cascade exactly",
        );
      },
    );
    await mkdir(".artifacts/task054", { recursive: true });
    await writeFile(
      ".artifacts/task054/catalog.json",
      JSON.stringify(state, null, 2) + "\n",
    );
    await writeFile(
      ".artifacts/task054/runtime.json",
      JSON.stringify(
        {
          status: "PASS",
          baseline: manifest.baseline,
          completed,
          generatedTypesSha256: sha256(read("src/types/database.generated.ts")),
          realAuthUsers: 2,
          productionStagingMutation: false,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    try {
      if (app) await app.stop();
      for (const user of users) {
        if (!user.deleted) success(await admin.auth.admin.deleteUser(user.id));
        user.client?.auth.stopAutoRefresh();
      }
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
        "All task users removed",
      );
      for (const table of Object.keys(ownerColumns))
        assert.equal(
          Number(
            (await db`select count(*) from ${db("public." + table)}`)[0].count,
          ),
          0,
          table + " cleanup",
        );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
