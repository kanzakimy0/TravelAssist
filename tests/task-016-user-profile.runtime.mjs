// Explicit runtime gate: node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
// No remote URL input. Temporary auth fixtures and mutations always roll back.
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
import * as schema from "../src/db/schema/index.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
// Keep this historical suite scoped to its three profile domains.
const tables = [
  schema.profiles,
  schema.profileSettings,
  schema.emergencyContacts,
].map(getTableConfig);
const dialect = new PgDialect();
const ident = (value) => '"' + value.replaceAll('"', '""') + '"';

function localConnection() {
  const env = localEnv(process.env);
  let endpoint = env.DOCKER_HOST;
  try {
    if (!endpoint || env.DOCKER_CONTEXT) {
      endpoint = JSON.parse(
        execFileSync("docker", ["context", "inspect"], {
          env,
          encoding: "utf8",
        }),
      )[0].Endpoints.docker.Host;
    }
    env.DOCKER_HOST = assertLocalEndpoint(endpoint);
    delete env.DOCKER_CONTEXT;
    const label = execFileSync(
      "docker",
      [
        "inspect",
        "--format",
        '{{ index .Config.Labels "com.supabase.cli.project" }}',
        "supabase_db_travelassist",
      ],
      { env, encoding: "utf8" },
    ).trim();
    assert.equal(label, "travelassist");
    const pkgPath = require.resolve("supabase/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const raw = execFileSync(
      process.execPath,
      [
        resolve(dirname(pkgPath), pkg.bin.supabase),
        "status",
        "--output",
        "json",
      ],
      {
        cwd: root,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      },
    );
    const url = new URL(JSON.parse(raw).DB_URL);
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
    assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
    assert.equal(url.port, "54322");
    assert.equal(url.pathname, "/postgres");
    assert.equal(url.search, "");
    // Never print/store the CLI JSON or connection URL.
    return postgres(url.href, {
      prepare: false,
      max: 1,
      onnotice: () => {},
      connect_timeout: 10,
    });
  } catch {
    throw new Error(
      "Local TASK-016 database preflight failed; raw credential-bearing output withheld.",
    );
  }
}

test("TASK-016 real Local schema, Drizzle parity, constraints and RLS isolation", async (t) => {
  const db = localConnection();
  const rollback = new Error("TASK016_ROLLBACK_FIXTURES");
  const users = [randomUUID(), randomUUID(), randomUUID()];
  try {
    const initialUsers = Number(
      (await db`select count(*) from auth.users`)[0].count,
    );
    assert.equal(
      initialUsers,
      0,
      "Run only against the verified from-zero task Local database",
    );
    for (const table of tables)
      assert.equal(
        Number(
          (
            await db.unsafe(`select count(*) from public.${ident(table.name)}`)
          )[0].count,
        ),
        0,
      );
    try {
      await db.begin(async (tx) => {
        const role = async (name, user = "") => {
          assert.ok(["postgres", "authenticated", "anon"].includes(name));
          await tx.unsafe(`set local role ${name}`);
          await tx`select set_config('request.jwt.claim.sub', ${user}, true)`;
          await tx`select set_config('request.jwt.claims', ${JSON.stringify({ ...(user ? { sub: user } : {}), role: name })}, true)`;
          assert.equal((await tx`select current_user`)[0].current_user, name);
        };
        const rejected = async (query, params, code) => {
          await assert.rejects(
            tx.savepoint(async (sp) => sp.unsafe(query, params)),
            (error) => error.code === code,
          );
        };
        const insert = (table, values) =>
          tx.unsafe(
            `insert into public.${ident(table)} (${Object.keys(values).map(ident).join(",")}) values (${Object.keys(
              values,
            )
              .map((_, i) => `$${i + 1}`)
              .join(",")}) returning *`,
            Object.values(values),
          );

        await t.test(
          "catalog matches Drizzle columns, PK/FK/cascade, checks, RLS and policies",
          async () => {
            for (const table of tables) {
              const columns =
                await tx`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name=${table.name} order by ordinal_position`;
              assert.deepEqual(
                columns.map((c) => [
                  c.column_name,
                  c.data_type,
                  c.is_nullable === "NO",
                ]),
                table.columns.map((c) => [c.name, c.getSQLType(), c.notNull]),
              );
              for (const col of table.columns.filter((c) => c.hasDefault)) {
                assert.ok(
                  columns.find((c) => c.column_name === col.name)
                    .column_default,
                  col.name,
                );
              }
              const keys =
                await tx`select conname, contype, confdeltype, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=${`public.${table.name}`}::regclass`;
              assert.deepEqual(
                keys
                  .filter((c) => c.contype === "c")
                  .map((c) => c.conname)
                  .sort(),
                table.checks.map((c) => c.name).sort(),
              );
              assert.equal(keys.filter((c) => c.contype === "p").length, 1);
              assert.match(
                keys.find((c) => c.contype === "p").definition,
                new RegExp(
                  `PRIMARY KEY \\(${table.columns.find((c) => c.primary).name}\\)`,
                ),
              );
              const fk = keys.filter((c) => c.contype === "f");
              assert.equal(fk.length, 1);
              assert.equal(fk[0].conname, table.foreignKeys[0].getName());
              assert.equal(fk[0].confdeltype, "c");
              assert.match(
                fk[0].definition,
                /REFERENCES auth.users\(id\) ON DELETE CASCADE/,
              );
              assert.equal(
                (
                  await tx`select relrowsecurity from pg_class where oid=${`public.${table.name}`}::regclass`
                )[0].relrowsecurity,
                true,
              );
              const policies =
                await tx`select policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public' and tablename=${table.name}`;
              assert.deepEqual(
                policies.map((p) => p.policyname).sort(),
                table.policies.map((p) => p.name).sort(),
              );
              for (const p of policies) {
                const mirror = table.policies.find(
                  (c) => c.name === p.policyname,
                );
                assert.equal(p.cmd.toLowerCase(), mirror.for);
                assert.deepEqual(p.roles, ["authenticated"]);
                for (const field of ["qual", "with_check"]) {
                  const expression = p[field];
                  if (expression) {
                    assert.match(expression, /auth.uid\(\)/);
                    assert.match(
                      expression,
                      new RegExp(
                        table.name === "profiles"
                          ? "\\bid\\b"
                          : "\\buser_id\\b",
                      ),
                    );
                    assert.doesNotMatch(expression, /\btrue\b/);
                  }
                }
                if (p.cmd === "UPDATE") assert.ok(p.qual && p.with_check);
              }
            }
            const indexes =
              await tx`select indexdef from pg_indexes where schemaname='public' and indexname='emergency_contacts_user_id_idx'`;
            assert.equal(indexes.length, 1);
            assert.match(indexes[0].indexdef, /btree \(user_id\)/);
            const audit =
              await tx`select prosecdef, proconfig from pg_proc where oid='public.set_profile_audit_timestamps()'::regprocedure`;
            assert.equal(audit[0].prosecdef, false);
            assert.ok(audit[0].proconfig.includes("search_path=pg_catalog"));
          },
        );

        for (const user of users)
          await tx`insert into auth.users(id) values (${user})`;
        await t.test(
          "Auth fixture creation does not automatically create product profiles",
          async () => {
            assert.equal(
              Number((await tx`select count(*) from public.profiles`)[0].count),
              0,
            );
          },
        );

        for (const [index, user] of users.slice(0, 2).entries()) {
          await role("authenticated", user);
          await t.test(
            `User ${index === 0 ? "A" : "B"} can create minimal own profile/settings and multiple contacts`,
            async () => {
              const profile = (await insert("profiles", { id: user }))[0];
              assert.equal(profile.display_name, null);
              const settings = (
                await insert("profile_settings", { user_id: user })
              )[0];
              assert.equal(settings.locale, null);
              for (let i = 0; i < 2; i++)
                await insert("emergency_contacts", {
                  user_id: user,
                  name: "Test contact",
                  relationship: "friend",
                  phone_e164: "+819012345678",
                });
            },
          );
        }

        for (const [index, user] of users.slice(0, 2).entries()) {
          const other = users[index === 0 ? 1 : 0];
          await role("authenticated", user);
          for (const table of tables) {
            const owner = table.name === "profiles" ? "id" : "user_id";
            const field =
              table.name === "profiles"
                ? "display_name"
                : table.name === "profile_settings"
                  ? "locale"
                  : "name";
            await t.test(
              `User ${index === 0 ? "A" : "B"}: ${table.name} own read/update, other read/update denied`,
              async () => {
                const own = await tx.unsafe(
                  `select * from public.${ident(table.name)} where ${ident(owner)}=$1`,
                  [user],
                );
                assert.equal(
                  own.length,
                  table.name === "emergency_contacts" ? 2 : 1,
                );
                assert.equal(
                  (
                    await tx.unsafe(
                      `select * from public.${ident(table.name)} where ${ident(owner)}=$1`,
                      [other],
                    )
                  ).length,
                  0,
                );
                const changed = await tx.unsafe(
                  `update public.${ident(table.name)} set ${ident(field)}=$1 where ${ident(owner)}=$2 returning *`,
                  [field === "locale" ? "zh-Hant-TW" : "Updated", user],
                );
                assert.equal(changed.length, own.length);
                assert.equal(
                  (
                    await tx.unsafe(
                      `update public.${ident(table.name)} set ${ident(field)}=$1 where ${ident(owner)}=$2 returning *`,
                      ["Forbidden", other],
                    )
                  ).length,
                  0,
                );
                await rejected(
                  `update public.${ident(table.name)} set ${ident(owner)}=$1 where ${ident(owner)}=$2`,
                  [users[2], user],
                  "42501",
                );
                const values =
                  table.name === "emergency_contacts"
                    ? {
                        user_id: users[2],
                        name: "Wrong owner",
                        relationship: "friend",
                        phone_e164: "+819012345678",
                      }
                    : { [owner]: users[2] };
                await assert.rejects(
                  tx.savepoint(async () => insert(table.name, values)),
                  (e) => e.code === "42501",
                );
                if (table.name === "emergency_contacts") {
                  assert.equal(
                    (
                      await tx.unsafe(
                        `delete from public.emergency_contacts where user_id=$1 returning id`,
                        [other],
                      )
                    ).length,
                    0,
                  );
                } else {
                  await rejected(
                    `delete from public.${ident(table.name)} where ${ident(owner)}=$1`,
                    [user],
                    "42501",
                  );
                  await rejected(
                    `insert into public.${ident(table.name)} (${ident(owner)}) values ($1) on conflict (${ident(owner)}) do update set ${ident(field)}='Forbidden'`,
                    [other],
                    "42501",
                  );
                }
              },
            );
          }
        }

        await role("anon");
        for (const table of tables)
          await t.test(
            `Anon cannot SELECT/INSERT/UPDATE/DELETE ${table.name}`,
            async () => {
              const owner = table.name === "profiles" ? "id" : "user_id";
              for (const statement of [
                `select * from public.${ident(table.name)}`,
                `insert into public.${ident(table.name)} (${ident(owner)}) values ('${users[0]}')`,
                `update public.${ident(table.name)} set ${ident(owner)}=${ident(owner)}`,
                `delete from public.${ident(table.name)}`,
              ])
                await rejected(statement, [], "42501");
            },
          );

        await role("authenticated");
        await t.test(
          "Authenticated role without a subject sees no private rows",
          async () => {
            for (const table of tables)
              assert.equal(
                (await tx.unsafe(`select * from public.${ident(table.name)}`))
                  .length,
                0,
              );
          },
        );

        await role("authenticated", users[0]);
        await t.test(
          "Database audit triggers ignore client timestamp spoofing",
          async () => {
            for (const table of tables) {
              const owner = table.name === "profiles" ? "id" : "user_id";
              const before = await tx.unsafe(
                `select * from public.${ident(table.name)} where ${ident(owner)}=$1 order by created_at`,
                [users[0]],
              );
              const changed = await tx.unsafe(
                `update public.${ident(table.name)} set created_at='1900-01-01', updated_at='1900-01-01' where ${ident(owner)}=$1 returning *`,
                [users[0]],
              );
              for (const row of changed) {
                const original = before.find(
                  (x) => (x.id ?? x.user_id) === (row.id ?? row.user_id),
                );
                assert.equal(
                  row.created_at.valueOf(),
                  original.created_at.valueOf(),
                );
                assert.ok(
                  row.updated_at.valueOf() >= original.updated_at.valueOf(),
                );
                assert.ok(row.updated_at.getUTCFullYear() >= 2026);
              }
            }
          },
        );

        // Invalid values must fail the live SQL checks AND the Drizzle expressions.
        const invalid = {
          profiles: {
            display_name: ["", "   ", "x".repeat(101)],
            full_name: ["x".repeat(201)],
            birth_date: ["infinity"],
            gender_code: ["x".repeat(65)],
            residence_country_code: ["jp", "JPN"],
            residence_city: ["x".repeat(201)],
            avatar_path: ["x".repeat(1025)],
          },
          profile_settings: {
            locale: ["zh_CN", "x".repeat(256)],
            region_code: ["jP"],
            timezone: ["Asia Tokyo", "x".repeat(101)],
            currency_code: ["jpy", "JP"],
            distance_unit: ["yards"],
            temperature_unit: ["kelvin"],
            time_format: ["13h"],
          },
          emergency_contacts: {
            name: ["", "x".repeat(201)],
            relationship: ["", "x".repeat(101)],
            phone_e164: ["819012345678", "+0123", "+1", "+1234567890123456"],
            country_code: ["JPX"],
            email: ["invalid", "a b@example.test", "x".repeat(255)],
            note: ["x".repeat(2001)],
          },
        };
        for (const table of tables)
          await t.test(
            `${table.name}: live SQL and ORM check expressions reject boundary-invalid values`,
            async () => {
              const owner = table.name === "profiles" ? "id" : "user_id";
              for (const [column, values] of Object.entries(
                invalid[table.name],
              ))
                for (const value of values) {
                  await rejected(
                    `update public.${ident(table.name)} set ${ident(column)}=$1::text::${table.columns.find((c) => c.name === column).getSQLType()} where ${ident(owner)}=$2`,
                    [value, users[0]],
                    "23514",
                  );
                  const columns = table.columns
                    .map((c) =>
                      c.name === column
                        ? `$1::text::${c.getSQLType()} as ${ident(c.name)}`
                        : `null::${c.getSQLType()} as ${ident(c.name)}`,
                    )
                    .join(",");
                  const expressions = table.checks
                    .map(
                      (c, i) =>
                        `(${dialect.sqlToQuery(c.value).sql}) as check_${i}`,
                    )
                    .join(",");
                  const evaluated = (
                    await tx.unsafe(
                      `select ${expressions} from (select ${columns}) as ${ident(table.name)}`,
                      [value],
                    )
                  )[0];
                  assert.ok(
                    Object.values(evaluated).includes(false),
                    `${table.name}.${column} also rejected by ORM check`,
                  );
                }
            },
          );

        await t.test(
          "Optional representations and display overrides remain extensible and independent",
          async () => {
            await tx`update public.profiles set gender_code='self-described', residence_country_code='JP', birth_date='2000-02-29' where id=${users[0]}`;
            for (const locale of [
              "zh-Hant-TW",
              "en-US-u-ca-japanese",
              "x-travel",
              "i-klingon",
            ]) {
              await tx`update public.profile_settings set locale=${locale}, region_code='JP', timezone='Etc/GMT+9', currency_code='USD', distance_unit='mi', temperature_unit='fahrenheit', time_format='12h' where user_id=${users[0]}`;
            }
            await tx`update public.profile_settings set timezone='Asia/Tokyo', distance_unit='km', temperature_unit='celsius', time_format='24h' where user_id=${users[0]}`;
          },
        );

        await t.test(
          "User A can delete own contacts without affecting B",
          async () => {
            assert.equal(
              (
                await tx`delete from public.emergency_contacts where user_id=${users[0]} returning id`
              ).length,
              2,
            );
            await insert("emergency_contacts", {
              user_id: users[0],
              name: "Cascade fixture",
              relationship: "friend",
              phone_e164: "+819012345678",
            });
          },
        );
        await role("postgres");
        await t.test(
          "PK uniqueness, required contact fields and nonexistent-auth FKs are enforced",
          async () => {
            await rejected(
              "insert into public.profiles (id) values ($1)",
              [users[0]],
              "23505",
            );
            await rejected(
              "insert into public.profile_settings (user_id) values ($1)",
              [users[0]],
              "23505",
            );
            const missing = randomUUID();
            await rejected(
              "insert into public.profiles (id) values ($1)",
              [missing],
              "23503",
            );
            await rejected(
              "insert into public.profile_settings (user_id) values ($1)",
              [missing],
              "23503",
            );
            await rejected(
              "insert into public.emergency_contacts (user_id,name,relationship,phone_e164) values ($1,'Fixture','friend','+819012345678')",
              [missing],
              "23503",
            );
            for (const field of [
              "user_id",
              "name",
              "relationship",
              "phone_e164",
            ]) {
              await rejected(
                `update public.emergency_contacts set ${ident(field)}=null where user_id=$1`,
                [users[0]],
                "23502",
              );
            }
          },
        );
        await t.test(
          "Auth deletion cascades all three domains without orphaning or touching another owner",
          async () => {
            await tx`delete from auth.users where id=${users[0]}`;
            for (const table of tables) {
              const owner = table.name === "profiles" ? "id" : "user_id";
              assert.equal(
                (
                  await tx.unsafe(
                    `select * from public.${ident(table.name)} where ${ident(owner)}=$1`,
                    [users[0]],
                  )
                ).length,
                0,
              );
              assert.equal(
                (
                  await tx.unsafe(
                    `select * from public.${ident(table.name)} where ${ident(owner)}=$1`,
                    [users[1]],
                  )
                ).length,
                table.name === "emergency_contacts" ? 2 : 1,
              );
            }
          },
        );
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    await t.test(
      "Real Drizzle transaction inserts/reads typed own rows under RLS and rolls back",
      async () => {
        const orm = drizzle(db, { schema });
        const user = randomUUID();
        try {
          await orm.transaction(async (ot) => {
            await ot.execute(sql`insert into auth.users(id) values (${user})`);
            await ot.execute(sql`set local role authenticated`);
            await ot.execute(
              sql`select set_config('request.jwt.claim.sub', ${user}, true)`,
            );
            await ot
              .insert(schema.profiles)
              .values({ id: user, birthDate: "2000-02-29" });
            await ot.insert(schema.profileSettings).values({ userId: user });
            await ot.insert(schema.emergencyContacts).values({
              userId: user,
              name: "ORM fixture",
              relationship: "friend",
              phoneE164: "+819012345678",
            });
            const rows = await ot.select().from(schema.profiles);
            assert.equal(rows.length, 1);
            assert.equal(rows[0].id, user);
            assert.equal(rows[0].birthDate, "2000-02-29");
            assert.ok(rows[0].createdAt instanceof Date);
            assert.equal(
              (await ot.select().from(schema.profileSettings)).length,
              1,
            );
            assert.equal(
              (await ot.select().from(schema.emergencyContacts)).length,
              1,
            );
            throw rollback;
          });
        } catch (error) {
          if (error !== rollback) throw error;
        }
      },
    );
    await t.test(
      "All synthetic users and product rows rolled back",
      async () => {
        assert.equal(
          Number((await db`select count(*) from auth.users`)[0].count),
          initialUsers,
        );
        for (const table of tables)
          assert.equal(
            Number(
              (
                await db.unsafe(
                  `select count(*) from public.${ident(table.name)}`,
                )
              )[0].count,
            ),
            0,
          );
      },
    );
  } finally {
    await db.end({ timeout: 5 });
  }
});
