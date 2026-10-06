// Real Local Supabase/Auth/PostgREST/SQL acceptance. No silent skips; credentials remain in memory.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { tripLibraryRecords } from "../src/db/schema/trip-library.ts";
import {
  parseTripLibraryRecord,
  validateTripLibraryUpdate,
  TRIP_PERSISTENCE_MAX_BYTES as caps,
} from "../src/features/trip-library/domain/trip-persistence-v1.ts";
import {
  record,
  fromRow,
  toRow,
  party,
  member,
  preference,
  patch,
  forbiddenPartyKeys,
  jsonbText,
  planAtBytes,
} from "./task-048-trip-fixtures.mjs";
const table = "trip_library_records";
function success(result) {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local operation must succeed; error code=" +
      (result.error?.code ?? "none"),
  );
  return result.data;
}
async function rejected(operation, expected = "23514") {
  let code = null;
  try {
    const result = await operation();
    code = result?.error?.code ?? null;
  } catch (error) {
    code = error.code;
  }
  assert.ok(
    [expected].flat().includes(code),
    `Expected rejection ${expected}, got ${code}`,
  );
}
test("TASK-048 real Local Auth / aggregate / RLS / revision / history acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    { db, admin } = local,
    ids = [],
    clients = [];
  const orm = drizzle(db);
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Requires a clean reset Local DB",
    );
    await t.test(
      "Drizzle mirrors real columns, constraints, indexes, RLS and a single owner SELECT policy",
      async () => {
        const config = getTableConfig(tripLibraryRecords);
        const columns =
          await db`select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name=${table} order by ordinal_position`;
        assert.deepEqual(
          columns.map((c) => c.column_name),
          config.columns.map((c) => c.name),
        );
        for (const col of config.columns)
          assert.equal(
            columns.find((c) => c.column_name === col.name).is_nullable,
            col.notNull ? "NO" : "YES",
          );
        const constraints =
          await db`select conname,contype,confdeltype,confrelid::regclass::text as target from pg_constraint where conrelid='public.trip_library_records'::regclass`;
        assert.deepEqual(
          constraints
            .filter((c) => c.contype === "c")
            .map((c) => c.conname)
            .sort(),
          config.checks.map((c) => c.name).sort(),
        );
        assert.deepEqual(
          constraints
            .filter((c) => c.contype === "u")
            .map((c) => c.conname)
            .sort(),
          config.uniqueConstraints.map((c) => c.name).sort(),
        );
        const fks = constraints.filter((c) => c.contype === "f");
        assert.equal(fks.length, 1);
        assert.equal(fks[0].target, "auth.users");
        assert.equal(fks[0].confdeltype, "c");
        assert.equal(fks[0].conname, config.foreignKeys[0].getName());
        const indexes =
          await db`select indexname,indexdef from pg_indexes where schemaname='public' and tablename=${table}`;
        for (const index of config.indexes)
          assert.ok(indexes.some((x) => x.indexname === index.config.name));
        assert.match(
          indexes.find(
            (x) => x.indexname === "trip_library_records_canonical_unique",
          ).indexdef,
          /UNIQUE.*owner_user_id, canonical_trip_id.*WHERE.*IS NOT NULL/,
        );
        assert.equal(
          (
            await db`select relrowsecurity from pg_class where oid='public.trip_library_records'::regclass`
          )[0].relrowsecurity,
          true,
        );
        const policies =
          await db`select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename=${table}`;
        assert.equal(policies.length, 1);
        assert.equal(policies[0].policyname, config.policies[0].name);
        assert.equal(policies[0].cmd, "SELECT");
        assert.deepEqual(policies[0].roles, ["authenticated"]);
        assert.match(policies[0].qual, /auth.uid\(\).*owner_user_id/s);
        assert.equal(policies[0].with_check, null);
        const functions =
          await db`select proname,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and proname in ('is_trip_library_envelope_v1','is_trip_party_snapshot_v1','guard_trip_library_record_v1')`;
        assert.equal(functions.length, 3);
        for (const fn of functions) {
          assert.equal(fn.prosecdef, false);
          assert.deepEqual(fn.proconfig, ["search_path=pg_catalog"]);
        }
        assert.equal(
          Number(
            (
              await db`select count(*) from pg_class c, lateral aclexplode(c.relacl) a where c.oid='public.trip_library_records'::regclass and a.grantee=0`
            )[0].count,
          ),
          0,
        );
        for (const privilege of [
          "SELECT",
          "INSERT",
          "UPDATE",
          "DELETE",
          "TRUNCATE",
          "REFERENCES",
          "TRIGGER",
        ]) {
          const [grants] =
            await db`select has_table_privilege('anon','public.trip_library_records',${privilege}) as anon, has_table_privilege('authenticated','public.trip_library_records',${privilege}) as authenticated`;
          assert.deepEqual(grants, {
            anon: false,
            authenticated: privilege === "SELECT",
          });
        }
      },
    );
    for (let i = 0; i < 2; i++) {
      const email = "task048-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const user = success(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      ids.push(user.user.id);
      const client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      success(await client.auth.signInWithPassword({ email, password }));
      clients.push(client);
    }
    const [a, b] = ids,
      [clientA, clientB] = clients;
    const create = async (owner = a, overrides = {}) => {
      const row = { ...toRow(record()), owner_user_id: owner, ...overrides };
      return success(await admin.from(table).insert(row).select().single());
    };
    const change = async (row, values) =>
      success(
        await admin
          .from(table)
          .update({ storage_revision: row.storage_revision + 1, ...values })
          .eq("id", row.id)
          .select()
          .single(),
      );
    const asSaved = async (row) => {
      const p = record("saved").planSnapshot;
      p.trip.id = "canonical-trip-" + randomUUID();
      return change(row, {
        library_state: "saved",
        canonical_trip_id: p.trip.id,
        plan_snapshot: p,
      });
    };
    const existing = [await create(a), await create(b)];
    await t.test(
      "real Auth A/B owner reads and cross-owner filters return no rows; anon and no credentials denied",
      async () => {
        for (let i = 0; i < 2; i++) {
          const rows = success(await clients[i].from(table).select());
          assert.equal(rows.length, 1);
          assert.equal(rows[0].id, existing[i].id);
          assert.deepEqual(
            success(
              await clients[i]
                .from(table)
                .select()
                .eq("id", existing[1 - i].id),
            ),
            [],
          );
          assert.deepEqual(
            success(
              await clients[i]
                .from(table)
                .select()
                .eq("owner_user_id", ids[1 - i]),
            ),
            [],
          );
        }
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await rejected(() => anon.from(table).select(), "42501");
        assert.equal(
          (await fetch(local.api + "/rest/v1/" + table)).status,
          401,
        );
        for (const client of [clientA, clientB, anon])
          for (const target of existing) {
            await rejected(
              () =>
                client.from(table).insert({
                  ...target,
                  id: randomUUID(),
                  creation_key: randomUUID(),
                }),
              "42501",
            );
            await rejected(
              () =>
                client
                  .from(table)
                  .update({ storage_revision: 2 })
                  .eq("id", target.id),
              "42501",
            );
            await rejected(
              () => client.from(table).delete().eq("id", target.id),
              "42501",
            );
            await rejected(() => client.from(table).upsert(target), "42501");
          }
        assert.equal(
          Number(
            (await db`select count(*) from public.trip_library_records`)[0]
              .count,
          ),
          2,
        );
      },
    );
    await t.test(
      "Drizzle real roundtrip delegates to canonical parser and keeps non-UUID ID / A revisions",
      async () => {
        const value = record("saved");
        value.ownerUserId = a;
        value.canonicalTripId = value.planSnapshot.trip.id = "not-a-uuid/trip";
        const { createdAt, updatedAt, ...input } = value;
        void createdAt;
        void updatedAt;
        const [stored] = await orm
          .insert(tripLibraryRecords)
          .values(input)
          .returning();
        const parsed = parseTripLibraryRecord(fromRow(toRow(stored)));
        assert.equal(parsed.canonicalTripId, "not-a-uuid/trip");
        assert.equal(parsed.storageRevision, 1);
        assert.equal(
          parsed.planSnapshot.trip.revision,
          value.planSnapshot.trip.revision,
        );
        const [reread] = await orm
          .select()
          .from(tripLibraryRecords)
          .where(eq(tripLibraryRecords.id, stored.id));
        assert.deepEqual(reread.draftFacts, value.draftFacts);
        assert.deepEqual(reread.planSnapshot, value.planSnapshot);
      },
    );
    await t.test(
      "owner-scoped creation and canonical uniqueness include saved/history; multiple null Trip IDs allowed",
      async () => {
        await rejected(
          () => admin.from(table).insert({ ...existing[0], id: randomUUID() }),
          "23505",
        );
        await create(b, { creation_key: existing[0].creation_key });
        await create();
        await create();
        const saved = await asSaved(await create());
        await rejected(
          () =>
            admin.from(table).insert({
              ...saved,
              id: randomUUID(),
              creation_key: randomUUID(),
              storage_revision: 1,
            }),
          "23505",
        );
        await create(b, {
          library_state: "saved",
          canonical_trip_id: saved.canonical_trip_id,
          plan_snapshot: saved.plan_snapshot,
        });
        await change(saved, { library_state: "history" });
        await rejected(
          () =>
            admin.from(table).insert({
              ...saved,
              id: randomUUID(),
              creation_key: randomUUID(),
              storage_revision: 1,
            }),
          "23505",
        );
      },
    );
    for (const from of ["draft", "saved", "history"])
      for (const to of ["draft", "saved", "history"])
        await t.test(`real lifecycle ${from} -> ${to}`, async () => {
          let old = await create();
          if (from !== "draft") old = await asSaved(old);
          if (from === "history")
            old = await change(old, { library_state: "history" });
          const p = record("saved").planSnapshot;
          p.trip.id = old.canonical_trip_id ?? "transition-" + randomUUID();
          const values = {
            library_state: to,
            canonical_trip_id: to === "draft" ? null : p.trip.id,
            plan_snapshot: to === "draft" ? null : p,
            frozen_at: to === "history" ? "1999-01-01T00:00:00Z" : null,
            storage_revision: old.storage_revision + 1,
          };
          if (
            [
              "draft:draft",
              "draft:saved",
              "saved:saved",
              "saved:history",
            ].includes(`${from}:${to}`)
          ) {
            const next = await change(old, values);
            validateTripLibraryUpdate(fromRow(old), fromRow(next));
            assert.deepEqual(next.draft_facts, old.draft_facts);
            assert.deepEqual(next.wizard_progress, old.wizard_progress);
            assert.equal(next.created_at, old.created_at);
            if (to === "history") {
              assert.equal(next.frozen_at, next.updated_at);
              assert.ok(Date.parse(next.frozen_at) > Date.parse("2020-01-01"));
            }
          } else
            await rejected(
              () => admin.from(table).update(values).eq("id", old.id),
              from === "history" ? "55000" : "23514",
            );
        });
    await t.test(
      "storage revision insert/stale/gaps/NULL guards and a real simultaneous update race",
      async () => {
        for (const storage_revision of [0, 2, null, -1])
          await rejected(
            () =>
              admin.from(table).insert({
                ...toRow(record()),
                owner_user_id: a,
                storage_revision,
              }),
            "23514",
          );
        const row = await create();
        for (const storage_revision of [0, 1, 3, null, -1])
          await rejected(
            () =>
              admin.from(table).update({ storage_revision }).eq("id", row.id),
            "40001",
          );
        const race = await Promise.all(
          ["A", "B"].map((title) =>
            admin
              .from(table)
              .update({
                storage_revision: 2,
                draft_facts: { ...row.draft_facts, title },
              })
              .eq("id", row.id)
              .select(),
          ),
        );
        assert.deepEqual(race.map((x) => x.error?.code ?? "OK").sort(), [
          "40001",
          "OK",
        ]);
        const final = success(
          await admin.from(table).select().eq("id", row.id).single(),
        );
        assert.equal(final.storage_revision, 2);
        assert.ok(["A", "B"].includes(final.draft_facts.title));
      },
    );
    await t.test(
      "immutable IDs / owner / creation preference, timestamp ownership and atomic rejected aggregate",
      async () => {
        const row = await create(a, {
          preference_snapshot: preference({ "style.pace": 3 }),
          preference_source_revision: 5,
        });
        const patches = [
          { id: randomUUID() },
          { owner_user_id: b },
          { creation_key: randomUUID() },
          { preference_source_revision: 6 },
          { preference_snapshot: preference({ "style.pace": 2 }) },
        ];
        for (const p of patches)
          await rejected(
            () =>
              admin
                .from(table)
                .update({
                  ...p,
                  storage_revision: 2,
                  draft_facts: { ...row.draft_facts, title: "Must not commit" },
                })
                .eq("id", row.id),
            "55000",
          );
        assert.deepEqual(
          success(await admin.from(table).select().eq("id", row.id).single()),
          row,
        );
        const updated = await change(row, {
          created_at: "1999-01-01",
          updated_at: "1999-01-01",
          preference_override_patch: patch({ "style.pace": 1 }),
        });
        assert.equal(updated.created_at, row.created_at);
        assert.ok(Date.parse(updated.updated_at) > Date.parse("2020-01-01"));
      },
    );
    await t.test(
      "history rejects every UPDATE including no-op, allows hard delete and keeps other records",
      async () => {
        let row = await asSaved(await create());
        row = await change(row, { library_state: "history" });
        for (const p of [
          {},
          { storage_revision: row.storage_revision + 1 },
          { frozen_at: row.frozen_at },
          { party_snapshot: party() },
          { preference_override_patch: patch({ "style.pace": 1 }) },
          { library_state: "saved", frozen_at: null },
        ])
          await rejected(
            () =>
              admin
                .from(table)
                .update(Object.keys(p).length ? p : { id: row.id })
                .eq("id", row.id),
            "55000",
          );
        assert.deepEqual(
          success(await admin.from(table).select().eq("id", row.id).single()),
          row,
        );
        success(await admin.from(table).delete().eq("id", row.id));
        assert.deepEqual(
          success(await admin.from(table).select().eq("id", row.id)),
          [],
        );
        assert.equal(
          success(await clientB.from(table).select().eq("id", existing[1].id))
            .length,
          1,
        );
      },
    );
    await t.test(
      "long-term Preference changes never rewrite snapshots; trip patches never write back",
      async () => {
        success(
          await clientA.from("travel_preferences").insert({
            owner_user_id: a,
            payload: preference({
              "style.pace": 4,
              "mobility.fewerTransfers": true,
            }),
          }),
        );
        const root = success(
          await clientA.from("travel_preferences").select().single(),
        );
        const row = await create(a, {
          preference_snapshot: root.payload,
          preference_source_revision: root.revision,
        });
        success(
          await clientA
            .from("travel_preferences")
            .update({ revision: 2, payload: preference({ "style.pace": 1 }) })
            .eq("owner_user_id", a),
        );
        const updated = await change(row, {
          preference_override_patch: patch(
            { "mobility.fewerTransfers": false },
            ["style.pace"],
          ),
        });
        assert.deepEqual(updated.preference_snapshot, root.payload);
        assert.equal(updated.preference_source_revision, 1);
        assert.deepEqual(
          success(await clientA.from("travel_preferences").select().single())
            .payload,
          preference({ "style.pace": 1 }),
        );
        assert.deepEqual(existing[0].preference_snapshot, preference());
        assert.equal(existing[0].preference_source_revision, 0);
      },
    );
    await t.test(
      "Companion master deletion and edits never rewrite detached party; no source FK",
      async () => {
        const companion = success(
          await clientA
            .from("companions")
            .insert({
              owner_user_id: a,
              display_name: "Master",
              age_group_fallback: "adult",
            })
            .select()
            .single(),
        );
        const snapshot = {
          ...party(),
          members: [
            {
              ...member(),
              sourceCompanionId: companion.id,
              displayName: "Captured",
            },
          ],
        };
        let row = await create(a, { party_snapshot: snapshot });
        row = await asSaved(row);
        row = await change(row, { library_state: "history" });
        success(
          await clientA
            .from("companions")
            .update({ display_name: "Edited", revision: 2 })
            .eq("id", companion.id),
        );
        success(
          await clientA.from("companions").delete().eq("id", companion.id),
        );
        assert.deepEqual(
          success(await admin.from(table).select().eq("id", row.id).single())
            .party_snapshot,
          snapshot,
        );
      },
    );
    for (const column of [
      "draft_facts",
      "wizard_progress",
      "plan_snapshot",
      "preference_snapshot",
      "preference_override_patch",
      "party_snapshot",
    ])
      await t.test(
        `SQL ${column} rejects wrong envelope/version/type`,
        async () => {
          const base = { ...toRow(record("saved")), owner_user_id: a };
          base.canonical_trip_id = base.plan_snapshot.trip.id =
            "shape-" + randomUUID();
          for (const value of [
            null,
            [],
            true,
            "string",
            {},
            { contractVersion: "2.0", schemaVersion: "2.0" },
            { contractVersion: 1.0, schemaVersion: 1.0 },
          ])
            await rejected(
              () =>
                admin.from(table).insert({
                  ...base,
                  id: randomUUID(),
                  creation_key: randomUUID(),
                  [column]: value,
                }),
              ["23514", "23502"],
            );
        },
      );
    await t.test(
      "SQL lifecycle nullability, canonical ID match and finite history cannot be bypassed",
      async () => {
        const base = toRow(record());
        base.owner_user_id = a;
        for (const p of [
          { library_state: "saved" },
          { canonical_trip_id: "wrong" },
          { plan_snapshot: {} },
          { frozen_at: "2026-01-01" },
          { library_state: "future" },
          {
            library_state: "history",
            canonical_trip_id: "example-trip",
            plan_snapshot: record("saved").planSnapshot,
            frozen_at: "2026-01-01",
          },
          { preference_source_revision: -1 },
          {
            preference_source_revision: 0,
            preference_snapshot: preference({ "style.pace": 3 }),
          },
        ])
          await rejected(
            () => admin.from(table).insert({ ...base, ...p }),
            "23514",
          );
        const saved = toRow(record("saved"));
        saved.owner_user_id = a;
        for (const id of ["wrong", "", " padded ", "x".repeat(161)])
          await rejected(
            () => admin.from(table).insert({ ...saved, canonical_trip_id: id }),
            "23514",
          );
        for (const id of [1, null, {}])
          await rejected(
            () =>
              admin.from(table).insert({
                ...saved,
                plan_snapshot: {
                  ...saved.plan_snapshot,
                  trip: { ...saved.plan_snapshot.trip, id },
                },
              }),
            "23514",
          );
      },
    );
    await t.test(
      "SQL party enforces minimized shape, strict dates, count, unique ordered UUID traces",
      async () => {
        for (const key of forbiddenPartyKeys) {
          await rejected(() =>
            admin.from(table).insert({
              ...toRow(record()),
              owner_user_id: a,
              party_snapshot: {
                ...party(),
                members: [{ ...member(), [key]: "Sensitive synthetic" }],
              },
            }),
          );
        }
        for (const p of [
          { ...party(), ageReferenceDate: "2027-02-30" },
          { ...party(), ageReferenceDate: "0000-01-01" },
          { ...party(), includesOwner: "true" },
          { ...party(), members: [{ ...member(), sourceCompanionId: "self" }] },
          { ...party(), members: Array.from({ length: 101 }, member) },
          {
            ...party(),
            members: [
              {
                ...member(),
                travelProfile: {
                  schemaVersion: "1.0",
                  mobilityNeeds: ["secret-diagnosis"],
                  diningNeeds: [],
                  activityInterests: [],
                },
              },
            ],
          },
        ])
          await rejected(() =>
            admin.from(table).insert({
              ...toRow(record()),
              owner_user_id: a,
              party_snapshot: p,
            }),
          );
        const m = member();
        await rejected(() =>
          admin.from(table).insert({
            ...toRow(record()),
            owner_user_id: a,
            party_snapshot: { ...party(), members: [m, m] },
          }),
        );
        const members = Array.from({ length: 100 }, member),
          row = await create(a, { party_snapshot: { ...party(), members } });
        assert.deepEqual(row.party_snapshot.members, members);
      },
    );
    await t.test(
      "SQL/TS caps and serialized UTF-8 fixture sizes agree at the exact canonical plan boundary",
      async () => {
        for (const [key, max] of Object.entries(caps)) {
          const value = record("saved")[key];
          const [size] =
            await db`select octet_length(${JSON.stringify(value)}::jsonb::text) as bytes`;
          assert.equal(size.bytes, Buffer.byteLength(jsonbText(value)));
          assert.ok(size.bytes < max);
        }
        for (const [column, key] of [
          ["draft_facts", "draftFacts"],
          ["wizard_progress", "wizardProgress"],
          ["plan_snapshot", "planSnapshot"],
        ]) {
          const base = {
            contractVersion: "1.0",
            trip: { id: "size-trip" },
            padding: "",
          };
          const bytes = Buffer.byteLength(jsonbText(base)),
            remaining = caps[key] - bytes;
          const exact = {
            ...base,
            padding:
              "界".repeat(Math.floor(remaining / 3)) +
              "x".repeat(remaining % 3),
          };
          const [check] =
            await db`select public.is_trip_library_envelope_v1(${JSON.stringify(exact)},'contractVersion',${caps[key]}) as valid, octet_length(${JSON.stringify(exact)}::jsonb::text) as bytes`;
          assert.deepEqual(check, { valid: true, bytes: caps[key] });
          assert.equal(
            (
              await db`select public.is_trip_library_envelope_v1(${JSON.stringify({ ...exact, padding: exact.padding + "x" })},'contractVersion',${caps[key]}) as valid`
            )[0].valid,
            false,
          );
          const shape = {
            ...toRow(record("saved")),
            owner_user_id: a,
            canonical_trip_id: "size-" + randomUUID(),
          };
          shape.plan_snapshot.trip.id = shape.canonical_trip_id;
          if (column === "plan_snapshot") {
            shape.canonical_trip_id = "size-trip";
            exact.trip.id = "size-trip";
          }
          await rejected(() =>
            admin.from(table).insert({
              ...shape,
              [column]: { ...exact, padding: exact.padding + "x" },
            }),
          );
        }
        const atLimit = planAtBytes(caps.planSnapshot),
          r = record("saved");
        r.ownerUserId = a;
        r.planSnapshot = atLimit;
        assert.deepEqual(parseTripLibraryRecord(r).planSnapshot, atLimit);
        const [size] =
          await db`select octet_length(${JSON.stringify(atLimit)}::jsonb::text) as bytes`;
        assert.equal(size.bytes, caps.planSnapshot);
        const stored = await create(a, {
          library_state: "saved",
          canonical_trip_id: r.canonicalTripId,
          plan_snapshot: atLimit,
        });
        assert.deepEqual(stored.plan_snapshot, atLimit);
        atLimit.trip.title += "x";
        assert.throws(
          () => parseTripLibraryRecord({ ...r, planSnapshot: atLimit }),
          (e) => e.code === "PAYLOAD_TOO_LARGE",
        );
        await rejected(() =>
          admin
            .from(table)
            .update({ storage_revision: 2, plan_snapshot: atLimit })
            .eq("id", stored.id),
        );
      },
    );
    await t.test(
      "Auth deletion cascades only A's aggregate; B records survive with their original contents",
      async () => {
        const before = success(await clientB.from(table).select().order("id"));
        assert.ok(before.length > 0);
        success(await admin.auth.admin.deleteUser(a));
        assert.equal(
          Number(
            (
              await db`select count(*) from public.trip_library_records where owner_user_id=${a}`
            )[0].count,
          ),
          0,
        );
        assert.deepEqual(
          success(await clientB.from(table).select().order("id")),
          before,
        );
      },
    );
  } finally {
    for (const id of ids)
      if ((await db`select id from auth.users where id=${id}`).length)
        success(await admin.auth.admin.deleteUser(id));
    try {
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
        "All temporary Auth users removed",
      );
      assert.equal(
        Number(
          (await db`select count(*) from public.trip_library_records`)[0].count,
        ),
        0,
        "All aggregate fixtures removed",
      );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
