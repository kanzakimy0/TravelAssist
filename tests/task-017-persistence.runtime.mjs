// Explicit Local gate. All synthetic Auth and product fixtures are transactionally rolled back.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { localConnection } from "./task-017-local-db.mjs";
import * as schema from "../src/db/schema/travel-preferences.ts";
import { preferenceRepository } from "../src/server/preferences/repository.ts";
import {
  fullDraftFixture,
  progressFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import {
  parsePreference,
  preferenceFields,
} from "../src/shared/contracts/preferences/index.ts";
import { POST } from "../src/app/api/travel-persistence/route.ts";
const content = () => ({
  facts: fullDraftFixture(),
  progress: progressFixture(),
});
const patch = (set, unset = []) => ({ schemaVersion: "1.0", set, unset });
const tables = Object.values(schema).map(getTableConfig);
const ident = (x) => '"' + x.replaceAll('"', '""') + '"';
function rawAdapter(orm) {
  const tx = (strings, ...values) => orm.execute(sql(strings, ...values));
  tx.unsafe = (query, params = []) => {
    const parts = query.split(/(\$\d+)/);
    return orm.execute(
      sql.join(
        parts.map((part) =>
          /^\$\d+$/.test(part)
            ? sql`${params[Number(part.slice(1)) - 1]}`
            : sql.raw(part),
        ),
        sql.raw(""),
      ),
    );
  };
  tx.json = (value) => JSON.stringify(value);
  tx.savepoint = (work) => orm.transaction((sp) => work(rawAdapter(sp)));
  return tx;
}
test("TASK-017 real Local migration, Drizzle, snapshot and cross-user RLS", async (t) => {
  const db = localConnection(),
    users = [randomUUID(), randomUUID()],
    rollback = new Error("ROLLBACK_TASK017");
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Use only empty task Local DB",
    );
    try {
      await drizzle(db, { schema }).transaction(async (orm) => {
        const tx = rawAdapter(orm);
        for (const user of users)
          await tx`insert into auth.users(id) values(${user})`;
        async function role(name, user = "") {
          assert.ok(["postgres", "authenticated", "anon"].includes(name));
          await tx.unsafe("set local role " + name);
          await tx`select set_config('request.jwt.claim.sub',${user},true),set_config('request.jwt.claims',${JSON.stringify({ ...(user ? { sub: user } : {}), role: name })},true)`;
          assert.equal((await tx`select current_user`)[0].current_user, name);
        }
        const rejected = (query, params, code) =>
          assert.rejects(
            tx.savepoint((sp) => sp.unsafe(query, params)),
            (e) => (e.cause?.code ?? e.code) === code,
          );
        await t.test(
          "all four SQL tables match typed columns/checks/policies and enable RLS",
          async () => {
            for (const table of tables) {
              const columns =
                await tx`select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name=${table.name} order by ordinal_position`;
              assert.deepEqual(
                columns.map((c) => [
                  c.column_name,
                  c.data_type,
                  c.is_nullable === "NO",
                ]),
                table.columns.map((c) => [c.name, c.getSQLType(), c.notNull]),
              );
              const checks =
                await tx`select conname from pg_constraint where conrelid=${"public." + table.name}::regclass and contype='c'`;
              assert.deepEqual(
                checks.map((c) => c.conname).sort(),
                table.checks.map((c) => c.name).sort(),
              );
              assert.equal(
                (
                  await tx`select relrowsecurity from pg_class where oid=${"public." + table.name}::regclass`
                )[0].relrowsecurity,
                true,
              );
              const policies =
                await tx`select policyname,roles,qual,with_check from pg_policies where schemaname='public' and tablename=${table.name}`;
              assert.deepEqual(
                policies.map((p) => p.policyname).sort(),
                table.policies.map((p) => p.name).sort(),
              );
              for (const p of policies) {
                assert.deepEqual(p.roles, ["authenticated"]);
                assert.match(
                  p.qual ?? p.with_check,
                  /auth.uid\(\).*owner_user_id/s,
                );
              }
            }
            const names = (
              await tx`select tablename from pg_tables where schemaname='public'`
            ).map((x) => x.tablename);
            assert.deepEqual(
              names.sort(),
              [
                "profiles",
                "profile_settings",
                "emergency_contacts",
                ...tables.map((t) => t.name),
              ].sort(),
            );
          },
        );
        await role("authenticated", users[0]);
        const a = preferenceRepository(orm, users[0]);
        let first;
        await t.test(
          "own long-term preferences save via Drizzle; draft copies exact revision and zero money",
          async () => {
            const pref = await a.updateTravelPreference(
              0,
              patch({
                "mobility.lessWalking": true,
                "attractions.nature": "like",
                "style.pace": 3,
              }),
            );
            assert.equal(pref.revision, 1);
            first = await a.createTripDraft(randomUUID(), content());
            assert.deepEqual(first.snapshot, pref.preference);
            assert.equal(first.sourcePreferenceRevision, 1);
            assert.equal(first.content.facts.budget.diningPerDayMinor, 0);
            assert.deepEqual(first.content.progress, content().progress);
          },
        );
        await t.test(
          "long-term update never rewrites old snapshot; override changes only effective preference",
          async () => {
            await a.updateTravelPreference(
              1,
              patch({
                "mobility.lessWalking": false,
                "attractions.nature": "veryLike",
              }),
            );
            let d = await a.getTripDraft(first.id);
            assert.equal(d.snapshot.values["attractions.nature"], "like");
            d = await a.updateTripPreferenceOverrides(
              first.id,
              1,
              patch({
                "mobility.lessWalking": false,
                "attractions.nature": "neutral",
              }),
            );
            assert.equal(d.effective.values["mobility.lessWalking"], false);
            assert.equal(d.effective.values["attractions.nature"], "neutral");
            assert.equal(
              (await a.getTravelPreference()).preference.values[
                "attractions.nature"
              ],
              "veryLike",
            );
            d = await a.updateTripPreferenceOverrides(
              first.id,
              2,
              patch({}, ["attractions.nature"]),
            );
            assert.equal(d.effective.values["attractions.nature"], "like");
          },
        );
        await t.test(
          "same creation intent is idempotent; stale draft/override/preference revisions cannot overwrite",
          async () => {
            assert.equal(
              (await a.createTripDraft(first.creationKey, content())).id,
              first.id,
            );
            const next = content();
            next.facts.title = "Saved next step";
            const d = await a.updateTripDraft(first.id, first.revision, next);
            assert.equal(d.revision, 2);
            await assert.rejects(
              () => a.updateTripDraft(first.id, 1, content()),
              /STALE_REVISION/,
            );
            await assert.rejects(
              () => a.updateTripPreferenceOverrides(first.id, 1, patch({})),
              /STALE_REVISION/,
            );
            await assert.rejects(
              () => a.updateTravelPreference(1, patch({})),
              /STALE_REVISION/,
            );
            assert.equal(
              (await a.getTripDraft(first.id)).content.facts.title,
              "Saved next step",
            );
          },
        );
        await t.test(
          "authenticated clients cannot update immutable snapshots or forge another owner",
          async () => {
            await rejected(
              "update public.trip_preference_snapshots set payload=payload where trip_draft_id=$1",
              [first.id],
              "42501",
            );
            await rejected(
              "insert into public.travel_preferences(owner_user_id) values($1)",
              [users[1]],
              "42501",
            );
            await rejected(
              "update public.trip_drafts set owner_user_id=$1,revision=revision+1 where id=$2",
              [users[1], first.id],
              "40001",
            );
            await rejected(
              "update public.trip_drafts set creation_key=$1,revision=revision+1 where id=$2",
              [randomUUID(), first.id],
              "55000",
            );
          },
        );
        await role("authenticated", users[1]);
        const b = preferenceRepository(orm, users[1]);
        let second;
        await t.test(
          "B cannot read A; importing same facts snapshots B's preference, never author's preference",
          async () => {
            await assert.rejects(() => b.getTripDraft(first.id), /NOT_FOUND/);
            await b.updateTravelPreference(
              0,
              patch({ "mobility.lessWalking": false }),
            );
            second = await b.createTripDraft(first.creationKey, first.content);
            assert.notEqual(first.id, second.id);
            assert.deepEqual(second.snapshot.values, {
              "mobility.lessWalking": false,
            });
            for (const table of tables) {
              assert.equal(
                (
                  await tx.unsafe(
                    "select * from public." +
                      ident(table.name) +
                      " where owner_user_id=$1",
                    [users[0]],
                  )
                ).length,
                0,
              );
            }
            assert.equal(
              (
                await tx.unsafe(
                  "update public.trip_drafts set revision=revision+1 where id=$1 returning id",
                  [first.id],
                )
              ).length,
              0,
            );
            assert.equal(
              (
                await tx.unsafe(
                  "update public.trip_preference_overrides set revision=revision+1 where trip_draft_id=$1 returning trip_draft_id",
                  [first.id],
                )
              ).length,
              0,
            );
          },
        );
        await role("authenticated", users[0]);
        await t.test(
          "A cannot read/update B's four private domains",
          async () => {
            for (const table of tables) {
              assert.equal(
                (
                  await tx.unsafe(
                    "select * from public." +
                      ident(table.name) +
                      " where owner_user_id=$1",
                    [users[1]],
                  )
                ).length,
                0,
              );
              if (table.name !== "trip_preference_snapshots")
                assert.equal(
                  (
                    await tx.unsafe(
                      "update public." +
                        ident(table.name) +
                        " set revision=revision+1 where owner_user_id=$1 returning owner_user_id",
                      [users[1]],
                    )
                  ).length,
                  0,
                );
            }
            await assert.rejects(() => a.getTripDraft(second.id), /NOT_FOUND/);
          },
        );
        await role("anon");
        await t.test(
          "anon cannot select, insert, update or delete any private domain",
          async () => {
            for (const table of tables)
              for (const query of [
                "select * from public." + ident(table.name),
                "insert into public." +
                  ident(table.name) +
                  "(owner_user_id) values('" +
                  users[0] +
                  "')",
                "update public." +
                  ident(table.name) +
                  " set owner_user_id=owner_user_id",
                "delete from public." + ident(table.name),
              ])
                await rejected(query, [], "42501");
          },
        );
        await role("authenticated", "");
        await t.test(
          "authenticated without subject sees zero private rows",
          async () => {
            for (const table of tables)
              assert.equal(
                (await tx.unsafe("select * from public." + ident(table.name)))
                  .length,
                0,
              );
          },
        );
        await role("postgres");
        await t.test(
          "SQL preference validation and TypeScript agree on known keys and invalid values",
          async () => {
            const candidates = [
              false,
              true,
              0,
              1,
              2,
              3,
              4,
              5,
              6,
              null,
              "neutral",
              "unset",
              "like",
              "dislike",
              "veryLike",
              "relaxed",
              "balanced",
              "efficient",
              "priority",
              "notSpecial",
              "medium",
              "low",
              "high",
              "value",
              "economical",
              "moderate",
              "flexible",
              [],
              ["美食"],
              ["unknown"],
              ["美食", "美食"],
              {},
            ];
            for (const key of [
              ...Object.keys(preferenceFields),
              "dates",
              "radar",
              "owner_user_id",
            ]) {
              for (const value of candidates) {
                const payload = {
                  schemaVersion: "1.0",
                  values: { [key]: value },
                };
                const actual = (
                  await tx`select public.is_travel_preference_v1(${tx.json(payload)}) as valid`
                )[0].valid;
                assert.equal(
                  actual,
                  parsePreference(payload).ok,
                  key + ":" + JSON.stringify(value),
                );
              }
            }
            for (const payload of [
              null,
              {},
              [],
              { schemaVersion: "1.0", values: {} },
              { schemaVersion: "2.0", values: {} },
              { schemaVersion: "1.0", values: {}, owner_user_id: users[0] },
            ]) {
              assert.equal(
                (
                  await tx`select public.is_travel_preference_v1(${tx.json(payload)}) as valid`
                )[0].valid,
                parsePreference(payload).ok,
              );
            }
            await rejected(
              "update public.travel_preferences set payload=$1,revision=revision+1 where owner_user_id=$2",
              [
                JSON.stringify({
                  schemaVersion: "1.0",
                  values: { date: "2027-01-01" },
                }),
                users[0],
              ],
              "23514",
            );
            await rejected(
              "update public.trip_preference_snapshots set payload=payload where trip_draft_id=$1",
              [first.id],
              "55000",
            );
          },
        );
        await t.test(
          "owner deletion cascades own four domains and preserves B; no profile side effects",
          async () => {
            await tx`delete from auth.users where id=${users[0]}`;
            for (const table of tables) {
              assert.equal(
                (
                  await tx.unsafe(
                    "select * from public." +
                      ident(table.name) +
                      " where owner_user_id=$1",
                    [users[0]],
                  )
                ).length,
                0,
              );
              assert.equal(
                (
                  await tx.unsafe(
                    "select * from public." +
                      ident(table.name) +
                      " where owner_user_id=$1",
                    [users[1]],
                  )
                ).length,
                1,
              );
            }
            assert.equal(
              Number((await tx`select count(*) from public.profiles`)[0].count),
              0,
            );
          },
        );
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    await t.test("all fixtures rolled back", async () => {
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
      );
      for (const table of tables)
        assert.equal(
          Number(
            (
              await db.unsafe(
                "select count(*) from public." + ident(table.name),
              )
            )[0].count,
          ),
          0,
        );
    });
  } finally {
    await db.end({ timeout: 5 });
  }
});
test("browser API requires bearer authentication and does not leak secrets or cache private data", async () => {
  const response = await POST(
    new Request("http://localhost/api/travel-persistence", {
      method: "POST",
      body: JSON.stringify({
        operation: "getPreference",
        input: { owner_user_id: randomUUID() },
      }),
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { ok: false, code: "AUTH_REQUIRED" });
});
