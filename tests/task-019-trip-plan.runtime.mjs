// Explicit real Local gate; no URL/credential arguments or cloud environment input.
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { getTableConfig } from "drizzle-orm/pg-core";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
import * as schema from "../src/db/schema/trips.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import {
  snapshotFixture,
  boundaryFixture,
  semanticSnapshot,
} from "./task-019-fixtures.mjs";

function localSettings() {
  try {
    const env = localEnv(process.env);
    const endpoint =
      env.DOCKER_HOST ||
      JSON.parse(
        execFileSync("docker", ["context", "inspect"], {
          env,
          encoding: "utf8",
        }),
      )[0].Endpoints.docker.Host;
    env.DOCKER_HOST = assertLocalEndpoint(endpoint);
    delete env.DOCKER_CONTEXT;
    assert.equal(
      execFileSync(
        "docker",
        [
          "inspect",
          "--format",
          '{{ index .Config.Labels "com.supabase.cli.project" }}',
          "supabase_db_travelassist",
        ],
        { env, encoding: "utf8" },
      ).trim(),
      "travelassist",
    );
    const pkg = createRequire(import.meta.url).resolve("supabase/package.json");
    const data = JSON.parse(
      execFileSync(
        process.execPath,
        [
          resolve(
            dirname(pkg),
            JSON.parse(readFileSync(pkg, "utf8")).bin.supabase,
          ),
          "status",
          "--output",
          "json",
        ],
        {
          cwd: new URL("../", import.meta.url),
          env,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      ),
    );
    for (const key of ["API_URL", "DB_URL"]) {
      const u = new URL(data[key]);
      assert.ok(["127.0.0.1", "localhost"].includes(u.hostname));
      assert.equal(u.search, "");
      assert.equal(u.port, key === "DB_URL" ? "54322" : "54321");
    }
    return data;
  } catch {
    throw new Error(
      "TASK019_LOCAL_PREFLIGHT_FAILED (credential output withheld)",
    );
  }
}
test("TASK-019 real Local Auth, SQL, RLS, transaction and projection acceptance", async (t) => {
  const settings = localSettings();
  const db = postgres(settings.DB_URL, {
    prepare: false,
    max: 4,
    onnotice: () => {},
    connect_timeout: 10,
  });
  const orm = drizzle(db, { schema });
  const opts = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };
  const admin = createClient(settings.API_URL, settings.SERVICE_ROLE_KEY, opts);
  const anon = createClient(settings.API_URL, settings.ANON_KEY, opts);
  const users = [];
  const clients = [];
  const tables = ["trips", "trip_plans", "trip_days", "itinerary_items"];
  const asUser = (user, callback) =>
    db.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub',${user},true),set_config('request.jwt.claims',${JSON.stringify({ sub: user, role: "authenticated" })},true)`;
      await tx`set local role authenticated`;
      return callback(tx);
    });
  const rejected = async (query, params, code) =>
    assert.rejects(
      asUser(users[0], (tx) => tx.unsafe(query, params)),
      (e) => e.code === code,
    );
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "requires empty task Local DB",
    );
    for (let n = 0; n < 2; n++) {
      const email = `task019-${randomUUID()}@example.test`;
      const password = randomUUID() + "aA7!";
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(created.error, null);
      users.push(created.data.user.id);
      const client = createClient(settings.API_URL, settings.ANON_KEY, opts);
      const login = await client.auth.signInWithPassword({ email, password });
      assert.equal(login.error, null);
      clients.push(client);
    }
    const repoA = createTripRepository(clients[0], () => orm),
      repoB = createTripRepository(clients[1], () => orm);
    await t.test("two actual Auth users independently verified", async () => {
      assert.notEqual(users[0], users[1]);
      for (let n = 0; n < 2; n++)
        assert.equal((await clients[n].auth.getUser()).data.user.id, users[n]);
    });
    await t.test(
      "SQL columns/types/nullability/PK/FK/indexes/RLS agree with Drizzle",
      async () => {
        for (const table of Object.values(schema)) {
          const c = getTableConfig(table);
          const columns =
            await db`select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name=${c.name} order by ordinal_position`;
          assert.deepEqual(
            columns.map((x) => [
              x.column_name,
              x.data_type,
              x.is_nullable === "NO",
            ]),
            c.columns.map((x) => [x.name, x.getSQLType(), x.notNull]),
          );
          const keys =
            await db`select conname,contype,confdeltype from pg_constraint where conrelid=${"public." + c.name}::regclass`;
          assert.equal(keys.filter((x) => x.contype === "p").length, 1);
          assert.equal(
            keys.filter((x) => x.contype === "f").length,
            c.foreignKeys.length,
          );
          assert.ok(keys.some((x) => x.contype === "c"));
          for (const fk of c.foreignKeys) {
            const actual = keys.find((x) => x.conname === fk.getName());
            assert.ok(actual, fk.getName());
            assert.equal(
              actual.confdeltype,
              fk.onDelete === "cascade" ? "c" : "a",
            );
          }
          for (const key of c.uniqueConstraints)
            assert.ok(
              keys.some((x) => x.conname === key.name && x.contype === "u"),
            );
          assert.equal(
            (
              await db`select relrowsecurity from pg_class where oid=${"public." + c.name}::regclass`
            )[0].relrowsecurity,
            true,
          );
          const policies =
            await db`select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename=${c.name}`;
          assert.equal(policies.length, 1);
          assert.equal(policies[0].policyname, c.policies[0].name);
          assert.deepEqual(policies[0].roles, ["authenticated"]);
          assert.equal(policies[0].cmd, "ALL");
          assert.match(policies[0].qual, /auth.uid/);
          assert.ok(policies[0].with_check);
          for (const idx of c.indexes)
            assert.equal(
              (
                await db`select indexname from pg_indexes where schemaname='public' and indexname=${idx.config.name}`
              ).length,
              1,
            );
        }
        const fk = (
          await db`select condeferrable,condeferred,pg_get_constraintdef(oid) as def from pg_constraint where conname='trips_active_plan_fk'`
        )[0];
        assert.equal(fk.condeferrable, true);
        assert.equal(fk.condeferred, true);
        assert.match(
          fk.def,
          /FOREIGN KEY \(id, active_plan_id\).*trip_plans\(trip_id, id\)/,
        );
      },
    );
    for (const [name, factory] of [
      ["minimum", () => snapshotFixture(false)],
      ["full multi-plan multi-day buckets", snapshotFixture],
      ["DST / dateline / unknown / confirmed booking", boundaryFixture],
    ])
      await t.test(`real round-trip ${name}`, async () => {
        const input = factory();
        const saved = await repoA.create(input);
        assert.deepEqual(semanticSnapshot(saved), semanticSnapshot(input));
        assert.deepEqual(await repoA.read(saved.trip.id), saved);
        assert.equal(saved.trip.revision, 1);
        assert.ok(saved.plans.every((p) => p.revision === 1));
        await repoA.remove(saved.trip.id, 1);
      });
    let a = await repoA.create(snapshotFixture()),
      b = await repoB.create(snapshotFixture());
    const ids = [
      a.trip.id,
      a.plans[0].id,
      a.plans[0].days[0].id,
      a.plans[0].days[0].items[0].id,
    ];
    await t.test(
      "owner reads all four tables; user B cannot select/update/delete A rows",
      async () => {
        for (let n = 0; n < tables.length; n++) {
          const table = tables[n];
          const own = await clients[0]
            .from(table)
            .select("id")
            .eq("id", ids[n]);
          assert.equal(own.error, null);
          assert.equal(own.data.length, 1);
          const hidden = await clients[1]
            .from(table)
            .select("id")
            .eq("id", ids[n]);
          assert.equal(hidden.error, null);
          assert.equal(hidden.data.length, 0);
          const update = await clients[1]
            .from(table)
            .update(n === 2 ? { timezone: "UTC" } : { title: "not allowed" })
            .eq("id", ids[n])
            .select("id");
          assert.equal(update.error, null);
          assert.equal(update.data.length, 0);
          const del = await clients[1]
            .from(table)
            .delete()
            .eq("id", ids[n])
            .select("id");
          assert.equal(del.error, null);
          assert.equal(del.data.length, 0);
        }
        await assert.rejects(
          repoB.read(a.trip.id),
          (e) => e.code === "NOT_FOUND",
        );
        await assert.rejects(repoB.replace(a), (e) => e.code === "NOT_FOUND");
        await assert.rejects(
          repoB.remove(a.trip.id, a.trip.revision),
          (e) => e.code === "NOT_FOUND",
        );
      },
    );
    await t.test("anon denied read and write on every table", async () => {
      for (const table of tables)
        for (const operation of [
          anon.from(table).select("id"),
          anon.from(table).insert({}),
          anon.from(table).update({ id: randomUUID() }).eq("id", randomUUID()),
          anon.from(table).delete().eq("id", randomUUID()),
        ]) {
          const r = await operation;
          assert.ok(r.error);
        }
    });
    await t.test(
      "cross-user INSERT / parent FK escape denied in all four tables",
      async () => {
        const rows = [
          {
            id: randomUUID(),
            owner_user_id: users[0],
            title: "escape",
            status: "draft",
            default_timezone: "UTC",
            provenance: "fixture",
          },
          { id: randomUUID(), trip_id: ids[0], title: "escape", position: 5 },
          {
            id: randomUUID(),
            plan_id: ids[1],
            day_number: 8,
            local_date: "2027-01-01",
            timezone: "UTC",
          },
          {
            id: randomUUID(),
            day_id: ids[2],
            placement: "scheduled",
            position: 9,
            kind: "place",
            title: "escape",
            lock_level: "none",
            assessment: "unknown",
            booking_status: "unknown",
          },
        ];
        for (let n = 0; n < tables.length; n++) {
          const r = await clients[1].from(tables[n]).insert(rows[n]);
          assert.equal(r.error?.code, "42501");
        }
      },
    );
    await t.test(
      "immutable IDs, owner and every parent; activePlan same-trip FK",
      async () => {
        for (const [table, column, id, value] of [
          ["trips", "owner_user_id", a.trip.id, users[1]],
          ["trip_plans", "trip_id", a.plans[0].id, b.trip.id],
          ["trip_days", "plan_id", a.plans[0].days[0].id, b.plans[0].id],
          [
            "itinerary_items",
            "day_id",
            a.plans[0].days[0].items[0].id,
            b.plans[0].days[0].id,
          ],
        ])
          await rejected(
            `update public.${table} set ${column}=$1 where id=$2`,
            [value, id],
            "PT409",
          );
        for (let n = 0; n < tables.length; n++)
          await rejected(
            `update public.${tables[n]} set id=$1 where id=$2`,
            [randomUUID(), ids[n]],
            "PT409",
          );
        await rejected(
          "update public.trips set active_plan_id=$1 where id=$2",
          [b.plans[0].id, a.trip.id],
          "23503",
        );
      },
    );
    await t.test(
      "duplicate day/order/item, invalid placement/date/coordinates/booking checks",
      async () => {
        await rejected(
          "update public.trip_days set day_number=1 where id=$1",
          [a.plans[0].days[1].id],
          "23505",
        );
        await rejected(
          "update public.itinerary_items set position=0 where id=$1",
          [a.plans[0].days[0].items[1].id],
          "23505",
        );
        for (const [set, code] of [
          ["placement='bad'", "23514"],
          ["latitude=91,longitude=0,place_name='test'", "23514"],
          ["latitude=1,longitude=null,place_name='test'", "23514"],
          ["booking_status='confirmed'", "23514"],
          ["end_at=start_at", "23514"],
          ["start_timezone=null", "23514"],
          ["kind='INVALID'", "23514"],
        ])
          await rejected(
            `update public.itinerary_items set ${set} where id=$1`,
            [ids[3]],
            code,
          );
        await rejected(
          "update public.trip_days set day_number=0 where id=$1",
          [ids[2]],
          "23514",
        );
        await rejected(
          "update public.trip_days set local_date='2027-02-30' where id=$1",
          [ids[2]],
          "22008",
        );
        await rejected(
          "insert into public.trip_days(id,plan_id,day_number,local_date,timezone) values($1,$2,8,'2027-01-01','UTC')",
          [ids[2], ids[1]],
          "23505",
        );
      },
    );
    await t.test(
      "SQL revision jumps and tx marker tampering denied",
      async () => {
        for (const [table, id] of [
          ["trips", ids[0]],
          ["trip_plans", ids[1]],
        ]) {
          await rejected(
            `update public.${table} set revision=99 where id=$1`,
            [id],
            "PT409",
          );
          await rejected(
            `update public.${table} set revision_txid=0 where id=$1`,
            [id],
            "PT409",
          );
        }
      },
    );
    await t.test(
      "snapshot transaction increments revisions once, stale trip and plan rejected",
      async () => {
        const original = structuredClone(a);
        a.trip.title = "updated";
        a.plans[0].days[0].items[0].title = "updated item";
        a = await repoA.replace(a);
        assert.equal(a.trip.revision, 2);
        assert.equal(a.plans[0].revision, 2);
        await assert.rejects(
          repoA.replace(original),
          (e) => e.code === "STALE_TRIP",
        );
        const stalePlan = structuredClone(a);
        stalePlan.plans[0].revision = 1;
        await assert.rejects(
          repoA.replace(stalePlan),
          (e) => e.code === "STALE_PLAN",
        );
        await assert.rejects(
          repoA.remove(a.trip.id, 1),
          (e) => e.code === "STALE_TRIP",
        );
      },
    );
    await t.test(
      "direct child mutations invalidate parent trip and plan tokens",
      async () => {
        const before = await repoA.read(a.trip.id);
        await asUser(users[0], async (tx) => {
          await tx`update public.itinerary_items set assessment='critical' where id=${ids[3]}`;
          await tx`update public.itinerary_items set lock_level='user_lock' where id=${ids[3]}`;
        });
        a = await repoA.read(a.trip.id);
        assert.equal(a.trip.revision, before.trip.revision + 1);
        assert.equal(a.plans[0].revision, before.plans[0].revision + 1);
        await assert.rejects(
          repoA.replace(before),
          (e) => e.code === "STALE_TRIP",
        );
        assert.equal(a.plans[0].days[0].items[0].booking.status, "unknown");
      },
    );
    await t.test(
      "mid-write unique collision rolls back root, revisions and child deletes",
      async () => {
        const before = await repoA.read(a.trip.id),
          bad = structuredClone(before);
        bad.trip.title = "must roll back";
        bad.plans[0].days[0].items[0].id = b.plans[0].days[0].items[0].id;
        await assert.rejects(
          repoA.replace(bad),
          (e) => e.code === "CONSTRAINT_CONFLICT",
        );
        assert.deepEqual(await repoA.read(a.trip.id), before);
      },
    );
    await t.test(
      "concurrent same-version writers: exactly one wins",
      async () => {
        const before = await repoA.read(a.trip.id);
        const writes = await Promise.allSettled([
          repoA.replace({
            ...before,
            trip: { ...before.trip, title: "writer one" },
          }),
          repoA.replace({
            ...before,
            trip: { ...before.trip, title: "writer two" },
          }),
        ]);
        assert.equal(writes.filter((x) => x.status === "fulfilled").length, 1);
        assert.equal(
          writes.filter(
            (x) => x.status === "rejected" && x.reason.code === "STALE_TRIP",
          ).length,
          1,
        );
        a = await repoA.read(a.trip.id);
      },
    );
    await t.test(
      "active-plan deletion requires explicit clear; day and plan cascade",
      async () => {
        const temp = await repoA.create(snapshotFixture());
        await rejected(
          "delete from public.trip_plans where id=$1",
          [temp.trip.activePlanId],
          "23503",
        );
        await asUser(users[0], async (tx) => {
          await tx`delete from public.trip_days where id=${temp.plans[0].days[0].id}`;
        });
        assert.equal(
          (
            await db`select id from public.itinerary_items where day_id=${temp.plans[0].days[0].id}`
          ).length,
          0,
        );
        await asUser(users[0], async (tx) => {
          await tx`update public.trips set active_plan_id=null where id=${temp.trip.id}`;
          await tx`delete from public.trip_plans where id=${temp.plans[0].id}`;
        });
        assert.equal(
          (
            await db`select id from public.trip_days where plan_id=${temp.plans[0].id}`
          ).length,
          0,
        );
        const fresh = await repoA.read(temp.trip.id);
        await repoA.remove(fresh.trip.id, fresh.trip.revision);
      },
    );
    await t.test(
      "new plan / removal / active switch preserve normalized tree",
      async () => {
        const edit = await repoA.read(a.trip.id);
        const p = {
          id: randomUUID(),
          title: "New candidate",
          revision: 1,
          days: [],
        };
        edit.plans.push(p);
        edit.trip.activePlanId = p.id;
        a = await repoA.replace(edit);
        assert.equal(a.plans.at(-1).revision, 1);
        assert.equal(a.trip.activePlanId, p.id);
        const reduced = { ...a, plans: a.plans.filter((x) => x.id === p.id) };
        a = await repoA.replace(reduced);
        assert.equal(a.plans.length, 1);
      },
    );
    await t.test(
      "ancestor trigger definer is confined and not directly callable",
      async () => {
        const [fn] =
          await db`select prosecdef,proconfig from pg_proc where oid='public.touch_trip_tree_ancestors()'::regprocedure`;
        assert.equal(fn.prosecdef, true);
        assert.deepEqual(fn.proconfig, ["search_path=pg_catalog"]);
        for (const role of ["anon", "authenticated"])
          assert.equal(
            (
              await db`select has_function_privilege(${role},'public.touch_trip_tree_ancestors()','EXECUTE') as allowed`
            )[0].allowed,
            false,
          );
        await rejected(
          "select public.touch_trip_tree_ancestors()",
          [],
          "42501",
        );
      },
    );
    await t.test(
      "pooled privileged connection has no leaked caller role/claims",
      async () => {
        const rows =
          await db`select current_user, current_setting('request.jwt.claim.sub',true) as sub`;
        assert.equal(rows[0].current_user, "postgres");
        assert.ok(!rows[0].sub);
      },
    );
    await t.test(
      "account removal cascades entire tree, other owner unaffected",
      async () => {
        const result = await admin.auth.admin.deleteUser(users[1]);
        assert.equal(result.error, null);
        assert.equal(
          (await db`select id from public.trips where id=${b.trip.id}`).length,
          0,
        );
        assert.equal(
          (await db`select id from public.trip_plans where id=${b.plans[0].id}`)
            .length,
          0,
        );
        assert.equal(
          (
            await db`select id from public.trip_days where id=${b.plans[0].days[0].id}`
          ).length,
          0,
        );
        assert.equal(
          (
            await db`select id from public.itinerary_items where id=${b.plans[0].days[0].items[0].id}`
          ).length,
          0,
        );
        assert.equal((await repoA.read(a.trip.id)).trip.id, a.trip.id);
      },
    );
  } finally {
    try {
      for (const id of users) {
        const remains = await db`select id from auth.users where id=${id}`;
        if (remains.length)
          assert.equal(
            (await admin.auth.admin.deleteUser(id)).error,
            null,
            "temporary user cleanup failed",
          );
      }
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
      );
      for (const table of tables)
        assert.equal(
          Number(
            (await db.unsafe(`select count(*) from public.${table}`))[0].count,
          ),
          0,
        );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
