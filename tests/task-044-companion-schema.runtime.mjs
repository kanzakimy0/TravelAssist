// Mandatory real Local Supabase gate. No mocks or silent skips.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  companions,
  companionGroups,
  companionGroupMembers,
} from "../src/db/schema/companions.ts";
import {
  derivePlanningAgeGroup,
  parseCompanionTravelProfileV1,
} from "../src/features/companions/domain/companion-v1.ts";
import { localRuntime } from "./task-018-local-helpers.mjs";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
import {
  validProfiles,
  invalidProfiles,
  emptyProfile,
  fullProfile,
  ageVectors,
  nearLimitJson,
} from "./task-044-companion-fixtures.mjs";

function runtime() {
  const previous = process.env.DOCKER_HOST,
    context = process.env.DOCKER_CONTEXT;
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
      "TASK-044 Local Supabase unavailable: BLOCKED; raw credentials withheld",
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
async function sqlReject(operation, expected = "23514") {
  let code = null;
  try {
    await operation();
  } catch (error) {
    code = error.code;
  }
  assert.ok(
    (Array.isArray(expected) ? expected : [expected]).includes(code),
    "Expected SQL rejection " + expected + "; received " + code,
  );
}
const tables = [companions, companionGroups, companionGroupMembers];
test("TASK-044 real Local Auth / DB / RLS acceptance", async (t) => {
  const local = runtime(),
    { db, admin } = local;
  const ids = [],
    clients = [],
    rows = [],
    groups = [];
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Requires empty reset Local DB",
    );
    await t.test(
      "exact tables, Drizzle columns/constraints/indexes, RLS and invoker functions",
      async () => {
        for (const table of tables) {
          const config = getTableConfig(table),
            name = config.name;
          const columns =
            await db`select column_name,is_nullable,data_type from information_schema.columns where table_schema='public' and table_name=${name} order by ordinal_position`;
          assert.deepEqual(
            columns.map((x) => x.column_name),
            config.columns.map((x) => x.name),
          );
          for (const column of config.columns)
            assert.equal(
              columns.find((x) => x.column_name === column.name).is_nullable,
              column.notNull ? "NO" : "YES",
            );
          const constraints =
            await db`select conname,contype,confdeltype,confrelid::regclass::text as target from pg_constraint where conrelid=${"public." + name}::regclass`;
          assert.deepEqual(
            constraints
              .filter((x) => x.contype === "c")
              .map((x) => x.conname)
              .sort(),
            config.checks.map((x) => x.name).sort(),
          );
          assert.deepEqual(
            constraints
              .filter((x) => x.contype === "f")
              .map((x) => x.conname)
              .sort(),
            config.foreignKeys.map((x) => x.getName()).sort(),
          );
          assert.ok(
            constraints
              .filter((x) => x.contype === "f")
              .every((x) => x.confdeltype === "c"),
          );
          assert.deepEqual(
            constraints
              .filter((x) => x.contype === "u")
              .map((x) => x.conname)
              .sort(),
            config.uniqueConstraints.map((x) => x.name).sort(),
          );
          const indexes =
            await db`select indexname from pg_indexes where schemaname='public' and tablename=${name}`;
          for (const index of config.indexes)
            assert.ok(indexes.some((x) => x.indexname === index.config.name));
          assert.equal(config.enableRLS, true);
          assert.equal(
            (
              await db`select relrowsecurity from pg_class where oid=${"public." + name}::regclass`
            )[0].relrowsecurity,
            true,
          );
          const policies =
            await db`select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename=${name}`;
          assert.deepEqual(
            policies.map((x) => x.policyname).sort(),
            config.policies.map((x) => x.name).sort(),
          );
          assert.deepEqual(policies.map((x) => x.cmd).sort(), [
            "DELETE",
            "INSERT",
            "SELECT",
            "UPDATE",
          ]);
          for (const p of policies) {
            assert.deepEqual(p.roles, ["authenticated"]);
            for (const expr of [p.qual, p.with_check].filter(Boolean))
              assert.match(expr, /auth.uid\(\).*owner_user_id/s);
          }
          for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
            const [grants] =
              await db`select has_table_privilege('anon',${"public." + name},${privilege}) as anon, has_table_privilege('authenticated',${"public." + name},${privilege}) as owner,has_table_privilege('service_role',${"public." + name},${privilege}) as service`;
            assert.deepEqual(grants, {
              anon: false,
              owner: true,
              service: true,
            });
          }
        }
        const functions =
          await db`select proname,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and proname in ('is_companion_travel_profile_v1','guard_companion_revision','guard_companion_birth_date','guard_companion_member_audit')`;
        assert.equal(functions.length, 4);
        for (const fn of functions) {
          assert.equal(fn.prosecdef, false);
          assert.deepEqual(fn.proconfig, ["search_path=pg_catalog"]);
        }
      },
    );
    for (let i = 0; i < 2; i++) {
      const email = "task044-" + randomUUID() + "@example.test",
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
      [clientA] = clients;
    await t.test(
      "two real Auth owners CRUD; defaults never infer needs; virtual owner groups",
      async () => {
        for (let i = 0; i < 2; i++) {
          const client = clients[i],
            owner = ids[i];
          const row = success(
            await client
              .from("companions")
              .insert({
                owner_user_id: owner,
                display_name: "Synthetic companion",
                age_group_fallback: i ? "senior" : "child",
                relationship_code: "family",
                gender_code: "female",
                created_at: "2000-01-01",
                updated_at: "2000-01-01",
              })
              .select()
              .single(),
          );
          assert.equal(row.revision, 1);
          assert.deepEqual(row.travel_profile, emptyProfile());
          assert.notEqual(row.created_at, "2000-01-01T00:00:00+00:00");
          rows.push(row);
          const group = success(
            await client
              .from("companion_groups")
              .insert({
                owner_user_id: owner,
                name: "Synthetic group",
                includes_owner: !!i,
              })
              .select()
              .single(),
          );
          assert.equal(group.revision, 1);
          assert.equal(group.includes_owner, !!i);
          groups.push(group);
          const updated = success(
            await client
              .from("companions")
              .update({
                revision: 2,
                display_name: "Updated companion",
                travel_profile: fullProfile(),
              })
              .eq("id", row.id)
              .select()
              .single(),
          );
          assert.equal(updated.revision, 2);
          assert.deepEqual(updated.travel_profile, fullProfile());
          assert.equal(
            success(
              await client
                .from("companion_groups")
                .update({ revision: 2, includes_owner: !i })
                .eq("id", group.id)
                .select()
                .single(),
            ).includes_owner,
            !i,
          );
          success(
            await client.from("companion_group_members").insert({
              owner_user_id: owner,
              group_id: group.id,
              companion_id: row.id,
              sort_order: 0,
            }),
          );
          assert.equal(
            success(
              await client
                .from("companion_group_members")
                .update({ sort_order: 1 })
                .eq("group_id", group.id)
                .select()
                .single(),
            ).sort_order,
            1,
          );
          assert.equal(
            success(await client.from("companions").select()).length,
            1,
          );
          assert.equal(
            success(await client.from("companion_groups").select()).length,
            1,
          );
          assert.equal(
            success(await client.from("companion_group_members").select())
              .length,
            1,
          );
        }
      },
    );
    for (let i = 0; i < 2; i++)
      for (const table of tables) {
        const name = getTableConfig(table).name;
        await t.test(
          name +
            " owner " +
            i +
            " cannot access/spoof other owner; anon CRUD denied",
          async () => {
            const own = clients[i],
              other = ids[1 - i];
            const fixture =
              name === "companions"
                ? {
                    owner_user_id: other,
                    display_name: "Spoof",
                    age_group_fallback: "adult",
                  }
                : name === "companion_groups"
                  ? { owner_user_id: other, name: "Spoof" }
                  : {
                      owner_user_id: other,
                      group_id: groups[1 - i].id,
                      companion_id: rows[1 - i].id,
                      sort_order: 2,
                    };
            const patch =
              name === "companion_group_members"
                ? { sort_order: 3 }
                : { revision: 3 };
            assert.deepEqual(
              success(await own.from(name).select().eq("owner_user_id", other)),
              [],
            );
            assert.deepEqual(
              success(
                await own
                  .from(name)
                  .update(patch)
                  .eq("owner_user_id", other)
                  .select(),
              ),
              [],
            );
            assert.deepEqual(
              success(
                await own
                  .from(name)
                  .delete()
                  .eq("owner_user_id", other)
                  .select(),
              ),
              [],
            );
            assert.equal(
              (await own.from(name).insert(fixture)).error?.code,
              "42501",
            );
            const anon = createClient(local.api, local.key, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            for (const op of [
              () => anon.from(name).select(),
              () => anon.from(name).insert(fixture),
              () => anon.from(name).update(patch).eq("owner_user_id", other),
              () => anon.from(name).delete().eq("owner_user_id", other),
            ])
              assert.equal((await op()).error?.code, "42501");
          },
        );
      }
    for (const table of [companions, companionGroups]) {
      const name = getTableConfig(table).name,
        row = name === "companions" ? rows[0] : groups[0];
      await t.test(
        name +
          " initial/update revision, immutable identity and DB audit guards",
        async () => {
          const base =
            name === "companions"
              ? {
                  owner_user_id: a,
                  display_name: "Revision fixture",
                  age_group_fallback: "adult",
                }
              : { owner_user_id: a, name: "Revision fixture" };
          for (const revision of [null, 0, -1, 2, 9])
            assert.equal(
              (await clientA.from(name).insert({ ...base, revision })).error
                ?.code,
              "23514",
            );
          for (const revision of [null, 0, 1, 2, 4])
            assert.equal(
              (await clientA.from(name).update({ revision }).eq("id", row.id))
                .error?.code,
              "40001",
            );
          assert.equal(
            (
              await clientA
                .from(name)
                .update({ revision: 3, owner_user_id: b })
                .eq("id", row.id)
            ).error?.code,
            "55000",
          );
          assert.equal(
            (
              await clientA
                .from(name)
                .update({ revision: 3, id: randomUUID() })
                .eq("id", row.id)
            ).error?.code,
            "55000",
          );
          const before = success(
            await clientA.from(name).select().eq("id", row.id).single(),
          );
          const after = success(
            await clientA
              .from(name)
              .update({
                revision: 3,
                created_at: "1999-01-01",
                updated_at: "1999-01-01",
              })
              .eq("id", row.id)
              .select()
              .single(),
          );
          assert.equal(after.created_at, before.created_at);
          assert.ok(
            Date.parse(after.updated_at) > Date.parse(before.updated_at),
          );
          // Same expected revision loses after the preceding update.
          assert.equal(
            (await clientA.from(name).update({ revision: 3 }).eq("id", row.id))
              .error?.code,
            "40001",
          );
        },
      );
    }
    for (const [name, profile] of validProfiles)
      await t.test("real SQL/TS valid profile " + name, async () => {
        const encoded = JSON.stringify(profile);
        assert.deepEqual(parseCompanionTravelProfileV1(profile), profile);
        assert.equal(
          (
            await db`select public.is_companion_travel_profile_v1(${encoded}::text::jsonb) as valid`
          )[0].valid,
          true,
        );
        const [row] =
          await db`insert into public.companions(owner_user_id,display_name,age_group_fallback,travel_profile) values(${a},'Profile parity','adult',${encoded}::text::jsonb) returning id,travel_profile`;
        assert.deepEqual(row.travel_profile, profile);
        await db`delete from public.companions where id=${row.id}`;
      });
    for (const [name, profile] of invalidProfiles)
      await t.test("real SQL/TS invalid profile " + name, async () => {
        const encoded = JSON.stringify(profile);
        assert.throws(() => parseCompanionTravelProfileV1(profile));
        assert.equal(
          (
            await db`select public.is_companion_travel_profile_v1(${encoded}::text::jsonb) as valid`
          )[0].valid,
          false,
        );
        await sqlReject(
          () =>
            db`insert into public.companions(owner_user_id,display_name,age_group_fallback,travel_profile) values(${a},'Invalid parity','adult',${encoded}::text::jsonb)`,
        );
      });
    await t.test(
      "8191-byte legal serialization normalizes; SQL NULL and oversized JSON rejected",
      async () => {
        assert.equal(Buffer.byteLength(nearLimitJson), 8191);
        const [row] =
          await db`select public.is_companion_travel_profile_v1(${nearLimitJson}::text::jsonb) as valid,octet_length((${nearLimitJson}::text::jsonb)::text) as bytes`;
        assert.equal(row.valid, true);
        assert.ok(row.bytes < 8192);
        assert.equal(
          (
            await db`select public.is_companion_travel_profile_v1(null) as valid`
          )[0].valid,
          false,
        );
        await sqlReject(
          () =>
            db`insert into public.companions(owner_user_id,display_name,age_group_fallback,travel_profile) values(${a},'SQL NULL','adult',null)`,
          ["23502", "23514"],
        );
      },
    );
    await t.test(
      "DOB/fallback XOR, finite date bounds, UTC future guard and stored age boundaries",
      async () => {
        for (const patch of [
          { birth_date: null, age_group_fallback: null },
          { birth_date: "2000-01-01", age_group_fallback: "adult" },
          { birth_date: "9999-12-31", age_group_fallback: null },
          { birth_date: "infinity", age_group_fallback: null },
          { birth_date: "-infinity", age_group_fallback: null },
          { birth_date: "0001-01-01 BC", age_group_fallback: null },
          { birth_date: null, age_group_fallback: "成年人" },
        ]) {
          assert.equal(
            (
              await clientA.from("companions").insert({
                owner_user_id: a,
                display_name: "Invalid age",
                ...patch,
              })
            ).error?.code,
            "23514",
          );
        }
        for (const birth of ["2025-02-29", "2026-02-30"])
          assert.equal(
            (
              await clientA.from("companions").insert({
                owner_user_id: a,
                display_name: "Invalid date",
                birth_date: birth,
              })
            ).error?.code,
            "22008",
          );
        for (const fallback of ["infant", "child", "adult", "senior"]) {
          const row = success(
            await clientA
              .from("companions")
              .insert({
                owner_user_id: a,
                display_name: "Fallback fixture",
                age_group_fallback: fallback,
              })
              .select()
              .single(),
          );
          assert.deepEqual(row.travel_profile, emptyProfile());
          success(await clientA.from("companions").delete().eq("id", row.id));
        }
        for (const [birth, reference, expected] of ageVectors) {
          const [row] =
            await db`insert into public.companions(owner_user_id,display_name,birth_date) values(${a},'Age fixture',${birth}::date) returning id,birth_date::text`;
          assert.equal(
            derivePlanningAgeGroup(row.birth_date, reference),
            expected,
          );
          await db`delete from public.companions where id=${row.id}`;
        }
        for (const timezone of ["Pacific/Kiritimati", "America/Los_Angeles"]) {
          await db.begin(async (tx) => {
            await tx`select set_config('TimeZone',${timezone},true)`;
            const [today] =
              await tx`select (statement_timestamp() at time zone 'UTC')::date::text as date`;
            const [row] =
              await tx`insert into public.companions(owner_user_id,display_name,birth_date) values(${a},'UTC today',${today.date}::date) returning id`;
            await tx`delete from public.companions where id=${row.id}`;
          });
        }
        assert.equal(
          (
            await clientA
              .from("companions")
              .update({
                birth_date: "9999-12-31",
                age_group_fallback: null,
                revision: 4,
              })
              .eq("id", rows[0].id)
          ).error?.code,
          "23514",
        );
      },
    );
    await t.test(
      "scalar bounds, stable optional metadata and storage-only avatar path",
      async () => {
        const base = {
          owner_user_id: a,
          display_name: "Bounds",
          age_group_fallback: "adult",
        };
        for (const patch of [
          { display_name: "" },
          { display_name: " " },
          { display_name: " padded " },
          { display_name: "x".repeat(101) },
          { relationship_code: "母亲" },
          { relationship_label: "x".repeat(101) },
          { gender_code: "女" },
          { avatar_path: "blob:local" },
          { avatar_path: "https://example.test/a.png" },
          { avatar_path: "/absolute" },
          { avatar_path: "../traversal" },
          { avatar_path: "avatars/../x" },
          { avatar_path: "a\\b" },
          { avatar_path: "x".repeat(1025) },
        ])
          assert.equal(
            (await clientA.from("companions").insert({ ...base, ...patch }))
              .error?.code,
            "23514",
          );
        const valid = success(
          await clientA
            .from("companions")
            .insert({
              ...base,
              display_name: "界".repeat(100),
              relationship_label: "界".repeat(100),
              avatar_path: "avatars/person.png",
              gender_code: "other",
              relationship_code: "other",
            })
            .select()
            .single(),
        );
        success(await clientA.from("companions").delete().eq("id", valid.id));
        for (const patch of [
          { name: "" },
          { name: " " },
          { name: " padded " },
          { name: "x".repeat(101) },
          { description: "x".repeat(301) },
        ])
          assert.equal(
            (
              await clientA
                .from("companion_groups")
                .insert({ owner_user_id: a, name: "Group", ...patch })
            ).error?.code,
            "23514",
          );
        assert.equal(
          (
            await clientA
              .from("companion_groups")
              .insert({ owner_user_id: a, name: "Group", includes_owner: null })
          ).error?.code,
          "23502",
        );
        assert.equal(
          (
            await clientA
              .from("companions")
              .insert({ ...base, id: "self-yuki" })
          ).error?.code,
          "22P02",
        );
      },
    );
    await t.test(
      "same-owner composite FKs survive trusted SQL bypass; membership uniqueness and audit",
      async () => {
        const group = groups[0].id,
          companion = rows[0].id;
        await sqlReject(
          () =>
            db`insert into public.companion_group_members values(${a},${groups[1].id},${companion},4,now())`,
          "23503",
        );
        await sqlReject(
          () =>
            db`insert into public.companion_group_members values(${a},${group},${rows[1].id},4,now())`,
          "23503",
        );
        await sqlReject(
          () =>
            db`insert into public.companion_group_members values(${b},${group},${rows[1].id},4,now())`,
          "23503",
        );
        await sqlReject(
          () =>
            db`update public.companion_group_members set companion_id=${rows[1].id} where group_id=${group}`,
          "23503",
        );
        await sqlReject(
          () =>
            db`update public.companion_group_members set group_id=${groups[1].id}, sort_order=9 where group_id=${group}`,
          "23503",
        );
        assert.equal(
          (
            await clientA.from("companion_group_members").insert({
              owner_user_id: a,
              group_id: group,
              companion_id: companion,
              sort_order: 2,
            })
          ).error?.code,
          "23505",
        );
        const extra = success(
          await clientA
            .from("companions")
            .insert({
              owner_user_id: a,
              display_name: "Second",
              age_group_fallback: "adult",
            })
            .select()
            .single(),
        );
        for (const [sort_order, code] of [
          [1, "23505"],
          [-1, "23514"],
          [null, "23502"],
        ])
          assert.equal(
            (
              await clientA.from("companion_group_members").insert({
                owner_user_id: a,
                group_id: group,
                companion_id: extra.id,
                sort_order,
              })
            ).error?.code,
            code,
          );
        const member = success(
          await clientA
            .from("companion_group_members")
            .insert({
              owner_user_id: a,
              group_id: group,
              companion_id: extra.id,
              sort_order: 2,
              created_at: "1999-01-01",
            })
            .select()
            .single(),
        );
        assert.ok(Date.parse(member.created_at) > Date.parse("2000-01-01"));
        assert.equal(
          (
            await clientA
              .from("companion_group_members")
              .update({ owner_user_id: b })
              .eq("companion_id", extra.id)
          ).error?.code,
          "55000",
        );
        const update = success(
          await clientA
            .from("companion_group_members")
            .update({ created_at: "1999-01-01", sort_order: 3 })
            .eq("companion_id", extra.id)
            .select()
            .single(),
        );
        assert.equal(update.created_at, member.created_at);
        assert.equal(
          success(
            await clientA
              .from("companion_group_members")
              .delete()
              .eq("companion_id", extra.id)
              .select(),
          ).length,
          1,
        );
        success(await clientA.from("companions").delete().eq("id", extra.id));
      },
    );
    await t.test(
      "Drizzle real roundtrip, Companion and Group delete cascade only their memberships",
      async () => {
        const orm = drizzle(db);
        const [companion] = await orm
          .insert(companions)
          .values({
            ownerUserId: a,
            displayName: "Drizzle",
            ageGroupFallback: "adult",
          })
          .returning();
        assert.deepEqual(companion.travelProfile, emptyProfile());
        const [group] = await orm
          .insert(companionGroups)
          .values({ ownerUserId: a, name: "Drizzle", includesOwner: true })
          .returning();
        await orm.insert(companionGroupMembers).values([
          {
            ownerUserId: a,
            groupId: group.id,
            companionId: companion.id,
            sortOrder: 0,
          },
          {
            ownerUserId: a,
            groupId: groups[0].id,
            companionId: companion.id,
            sortOrder: 4,
          },
          {
            ownerUserId: a,
            groupId: group.id,
            companionId: rows[0].id,
            sortOrder: 1,
          },
        ]);
        assert.equal(
          success(
            await clientA
              .from("companions")
              .delete()
              .eq("id", companion.id)
              .select(),
          ).length,
          1,
        );
        assert.equal(
          (
            await orm
              .select()
              .from(companionGroupMembers)
              .where(eq(companionGroupMembers.companionId, companion.id))
          ).length,
          0,
        );
        assert.equal(
          (
            await orm
              .select()
              .from(companionGroups)
              .where(eq(companionGroups.id, group.id))
          ).length,
          1,
        );
        assert.equal(
          (
            await orm
              .select()
              .from(companions)
              .where(eq(companions.id, rows[0].id))
          ).length,
          1,
        );
        assert.equal(
          success(
            await clientA
              .from("companion_groups")
              .delete()
              .eq("id", group.id)
              .select(),
          ).length,
          1,
        );
        assert.equal(
          (
            await orm
              .select()
              .from(companionGroupMembers)
              .where(eq(companionGroupMembers.groupId, group.id))
          ).length,
          0,
        );
        assert.equal(
          (
            await orm
              .select()
              .from(companionGroupMembers)
              .where(eq(companionGroupMembers.groupId, groups[0].id))
          ).length,
          1,
        );
      },
    );
    await t.test(
      "Auth A deletion cascades all A rows, preserves every B table",
      async () => {
        success(await admin.auth.admin.deleteUser(a));
        for (const table of tables) {
          const name = getTableConfig(table).name;
          assert.equal(
            Number(
              (
                await db`select count(*) from ${db("public." + name)} where owner_user_id=${a}`
              )[0].count,
            ),
            0,
          );
          assert.equal(
            Number(
              (
                await db`select count(*) from ${db("public." + name)} where owner_user_id=${b}`
              )[0].count,
            ),
            1,
          );
        }
      },
    );
  } finally {
    for (const id of ids) {
      const exists = await db`select id from auth.users where id=${id}`;
      if (exists.length) success(await admin.auth.admin.deleteUser(id));
    }
    try {
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
        "All temporary Auth fixtures removed",
      );
      for (const table of tables)
        assert.equal(
          Number(
            (
              await db`select count(*) from ${db("public." + getTableConfig(table).name)}`
            )[0].count,
          ),
          0,
          "All temporary Companion fixtures removed",
        );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
