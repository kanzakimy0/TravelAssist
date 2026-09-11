// Explicit, real Local-only acceptance. Never skipped or replaced by mocks.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { travelPreferences } from "../src/db/schema/travel-preferences.ts";
import { localRuntime } from "./task-018-local-helpers.mjs";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
import {
  validPayloads,
  invalidPayloads,
  payload,
} from "./task-042-preference-fixtures.mjs";

function runtime() {
  // The existing Auth helper defaults to a Unix socket; explicitly resolve the
  // selected local Docker context for Windows, without accepting remote engines.
  const previous = process.env.DOCKER_HOST;
  const context = process.env.DOCKER_CONTEXT;
  try {
    const env = localEnv(process.env);
    const endpoint =
      !env.DOCKER_HOST || env.DOCKER_CONTEXT
        ? JSON.parse(
            execFileSync("docker", ["context", "inspect"], {
              env,
              encoding: "utf8",
              windowsHide: true,
              stdio: ["ignore", "pipe", "pipe"],
              timeout: 10000,
            }),
          )[0].Endpoints.docker.Host
        : env.DOCKER_HOST;
    process.env.DOCKER_HOST = assertLocalEndpoint(endpoint);
    delete process.env.DOCKER_CONTEXT;
    return localRuntime();
  } catch {
    throw new Error(
      "TASK-042 real Local Supabase unavailable; DB acceptance BLOCKED (raw credentials withheld)",
    );
  } finally {
    if (previous === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = previous;
    if (context !== undefined) process.env.DOCKER_CONTEXT = context;
  }
}
function success(result) {
  assert.equal(result.error?.code ?? null, null, "Local request must succeed");
  return result.data;
}

test("TASK-042 real Local Auth, SQL validation, Drizzle and RLS", async (t) => {
  const local = runtime();
  const { db, admin } = local;
  const ids = [];
  const clients = [];
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Requires reset Local DB, never a populated/shared project",
    );
    await t.test(
      "table, exact Drizzle columns/checks/FK/policies and invoker functions",
      async () => {
        const config = getTableConfig(travelPreferences);
        const columns =
          await db`select column_name, is_nullable, data_type from information_schema.columns where table_schema='public' and table_name='travel_preferences' order by ordinal_position`;
        assert.deepEqual(
          columns.map((x) => x.column_name),
          ["owner_user_id", "payload", "revision", "created_at", "updated_at"],
        );
        assert.deepEqual(
          columns.map((x) => x.column_name),
          config.columns.map((x) => x.name),
        );
        assert.ok(columns.every((x) => x.is_nullable === "NO"));
        assert.deepEqual(
          columns.map((x) => x.data_type),
          [
            "uuid",
            "jsonb",
            "integer",
            "timestamp with time zone",
            "timestamp with time zone",
          ],
        );
        assert.equal(config.enableRLS, true);
        assert.equal(
          (
            await db`select relrowsecurity from pg_class where oid='public.travel_preferences'::regclass`
          )[0].relrowsecurity,
          true,
        );
        const fk =
          await db`select conname, confdeltype, confrelid::regclass::text as target from pg_constraint where conrelid='public.travel_preferences'::regclass and contype='f'`;
        assert.equal(fk[0].conname, config.foreignKeys[0].getName());
        assert.equal(fk[0].confdeltype, "c");
        assert.equal(fk[0].target, "auth.users");
        const checks =
          await db`select conname from pg_constraint where conrelid='public.travel_preferences'::regclass and contype='c'`;
        assert.deepEqual(
          checks.map((x) => x.conname).sort(),
          config.checks.map((x) => x.name).sort(),
        );
        const policies =
          await db`select policyname, cmd, qual, with_check, roles from pg_policies where tablename='travel_preferences' and schemaname='public'`;
        assert.deepEqual(
          policies.map((x) => x.policyname).sort(),
          config.policies.map((x) => x.name).sort(),
        );
        assert.deepEqual(policies.map((x) => x.cmd).sort(), [
          "INSERT",
          "SELECT",
          "UPDATE",
        ]);
        for (const policy of policies) {
          assert.deepEqual(policy.roles, ["authenticated"]);
          for (const expression of [policy.qual, policy.with_check].filter(
            Boolean,
          )) {
            assert.match(expression, /auth.uid\(\).*owner_user_id/s);
            assert.doesNotMatch(expression, /\btrue\b/);
          }
        }
        const functions =
          await db`select prosecdef, proconfig from pg_proc where oid in ('public.is_travel_preference_v1(jsonb)'::regprocedure,'public.guard_travel_preference_revision()'::regprocedure)`;
        assert.equal(functions.length, 2);
        assert.ok(
          functions.every(
            (x) =>
              !x.prosecdef && x.proconfig.includes("search_path=pg_catalog"),
          ),
        );
        assert.equal(
          (
            await db`select has_function_privilege('anon','public.is_travel_preference_v1(jsonb)','execute') as allowed`
          )[0].allowed,
          false,
        );
      },
    );
    for (let i = 0; i < 2; i++) {
      const email = "task042-" + randomUUID() + "@example.test";
      const password = randomUUID() + "aA!9";
      const created = success(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      ids.push(created.user.id);
      const client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      success(await client.auth.signInWithPassword({ email, password }));
      clients.push(client);
    }
    const [a, b] = ids;
    const [clientA, clientB] = clients;
    await t.test(
      "two real Auth users insert/read/update only their own roots",
      async () => {
        for (let i = 0; i < 2; i++) {
          const row = success(
            await clients[i]
              .from("travel_preferences")
              .insert({ owner_user_id: ids[i] })
              .select()
              .single(),
          );
          assert.deepEqual(row.payload, payload());
          assert.equal(row.revision, 1);
          const updated = success(
            await clients[i]
              .from("travel_preferences")
              .update({
                payload: payload({ "style.planning": 5 }),
                revision: 2,
              })
              .eq("owner_user_id", ids[i])
              .select()
              .single(),
          );
          assert.equal(updated.revision, 2);
          assert.deepEqual(
            success(
              await clients[i]
                .from("travel_preferences")
                .select("owner_user_id"),
            ),
            [{ owner_user_id: ids[i] }],
          );
        }
      },
    );
    await t.test(
      "cross-user select/update/upsert/insert fail; owner and anon cannot delete",
      async () => {
        assert.deepEqual(
          success(
            await clientB
              .from("travel_preferences")
              .select()
              .eq("owner_user_id", a),
          ),
          [],
        );
        assert.deepEqual(
          success(
            await clientB
              .from("travel_preferences")
              .update({ payload: payload(), revision: 3 })
              .eq("owner_user_id", a)
              .select(),
          ),
          [],
        );
        assert.equal(
          (
            await clientB
              .from("travel_preferences")
              .insert({ owner_user_id: a })
          ).error?.code,
          "42501",
        );
        assert.equal(
          (
            await clientB
              .from("travel_preferences")
              .upsert({ owner_user_id: a, payload: payload(), revision: 1 })
          ).error?.code,
          "42501",
        );
        assert.equal(
          (
            await clientA
              .from("travel_preferences")
              .delete()
              .eq("owner_user_id", a)
          ).error?.code,
          "42501",
        );
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        for (const operation of [
          () => anon.from("travel_preferences").select(),
          () => anon.from("travel_preferences").insert({ owner_user_id: a }),
          () =>
            anon
              .from("travel_preferences")
              .update({ revision: 3 })
              .eq("owner_user_id", a),
          () => anon.from("travel_preferences").delete().eq("owner_user_id", a),
        ])
          assert.equal((await operation()).error?.code, "42501");
      },
    );
    for (const [i, value] of validPayloads.entries())
      await t.test("DB accepts independent valid vector " + i, async () => {
        assert.equal(
          (
            await db`select public.is_travel_preference_v1(${db.json(value)}) as valid`
          )[0].valid,
          true,
        );
        const result =
          await db`update public.travel_preferences set payload=${db.json(value)},revision=revision+1 where owner_user_id=${a} returning payload`;
        assert.deepEqual(result[0].payload, value);
      });
    for (const [i, value] of invalidPayloads.entries())
      await t.test("DB rejects independent invalid vector " + i, async () => {
        assert.equal(
          (
            await db`select public.is_travel_preference_v1(${db.json(value)}) as valid`
          )[0].valid,
          false,
        );
        await assert.rejects(
          db`update public.travel_preferences set payload=${db.json(value)},revision=revision+1 where owner_user_id=${a}`,
          (e) => e.code === "23514" || (value === null && e.code === "23502"),
        );
      });
    await t.test(
      "DB rejects malformed JSON text and oversized payload independently",
      async () => {
        await assert.rejects(
          db`select public.is_travel_preference_v1(${'{"values":'}::text::jsonb)`,
          (e) => e.code === "22P02",
        );
        assert.equal(
          (await db`select public.is_travel_preference_v1(null) as valid`)[0]
            .valid,
          false,
        );
        await assert.rejects(
          db`update public.travel_preferences set payload=null,revision=revision+1 where owner_user_id=${a}`,
          (e) => e.code === "23502",
        );
      },
    );
    await t.test(
      "revision guard, immutable owner, server audit timestamps and reset",
      async () => {
        const before = (
          await db`select * from public.travel_preferences where owner_user_id=${a}`
        )[0];
        for (const revision of [
          null,
          0,
          -1,
          before.revision,
          before.revision + 2,
        ])
          await assert.rejects(
            db`update public.travel_preferences set revision=${revision} where owner_user_id=${a}`,
            (e) => e.code === "40001",
          );
        await assert.rejects(
          db`update public.travel_preferences set owner_user_id=${b},revision=revision+1 where owner_user_id=${a}`,
          (e) => e.code === "55000",
        );
        await assert.rejects(
          db`insert into public.travel_preferences(owner_user_id,revision) values (${randomUUID()},0)`,
          (e) => e.code === "23514",
        );
        await assert.rejects(
          db`insert into public.travel_preferences(owner_user_id) values (${randomUUID()})`,
          (e) => e.code === "23503",
        );
        await assert.rejects(
          db`insert into public.travel_preferences(owner_user_id) values (${a})`,
          (e) => e.code === "23505",
        );
        const reset = success(
          await clientA
            .from("travel_preferences")
            .update({
              payload: payload(),
              revision: before.revision + 1,
              created_at: "1900-01-01",
              updated_at: "1900-01-01",
            })
            .eq("owner_user_id", a)
            .select()
            .single(),
        );
        assert.deepEqual(reset.payload, payload());
        assert.equal(reset.revision, before.revision + 1);
        assert.equal(
          new Date(reset.created_at).valueOf(),
          before.created_at.valueOf(),
        );
        assert.ok(
          new Date(reset.updated_at).valueOf() >= before.updated_at.valueOf(),
        );
      },
    );
    await t.test(
      "Drizzle real query under owner RLS and mirrored checks",
      async () => {
        const orm = drizzle(db);
        await orm.transaction(async (tx) => {
          await tx.execute(sql`set local role authenticated`);
          await tx.execute(
            sql`select set_config('request.jwt.claim.sub',${a},true)`,
          );
          const rows = await tx.select().from(travelPreferences);
          assert.equal(rows.length, 1);
          assert.equal(rows[0].ownerUserId, a);
          await tx
            .update(travelPreferences)
            .set({
              payload: payload({ "style.planning": 4 }),
              revision: rows[0].revision + 1,
            })
            .where(eq(travelPreferences.ownerUserId, a));
        });
        const dialect = new PgDialect();
        const check = getTableConfig(travelPreferences).checks.find(
          (x) => x.name === "travel_preferences_payload_check",
        );
        const expression = dialect.sqlToQuery(check.value).sql;
        assert.equal(
          (
            await db.unsafe(
              "select " +
                expression +
                " as valid from (select $1::jsonb as payload) travel_preferences",
              [JSON.stringify(payload({ "style.planning": 6 }))],
            )
          )[0].valid,
          false,
        );
      },
    );
    await t.test(
      "real Auth deletion cascades A, preserves B, and fixtures are removed",
      async () => {
        success(await admin.auth.admin.deleteUser(a));
        assert.equal(
          (
            await db`select * from public.travel_preferences where owner_user_id=${a}`
          ).length,
          0,
        );
        assert.equal(
          (
            await db`select * from public.travel_preferences where owner_user_id=${b}`
          ).length,
          1,
        );
        ids.splice(ids.indexOf(a), 1);
      },
    );
  } finally {
    try {
      for (const id of ids) success(await admin.auth.admin.deleteUser(id));
      assert.equal(
        Number(
          (await db`select count(*) from public.travel_preferences`)[0].count,
        ),
        0,
      );
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
      );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
