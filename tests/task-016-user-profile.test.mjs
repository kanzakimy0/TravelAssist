import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync, execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { localEnv } from "../tools/db/local.mjs";
import { checkClientBundle } from "./task-016-client-bundle.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(resolve(root, file), "utf8");
const migration = read(
  "supabase/migrations/20260908083000_create_user_profile_schema.sql",
);

function mappingProbe(server = true) {
  return spawnSync(
    process.execPath,
    [
      ...(server ? ["--conditions=react-server"] : []),
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      `import { profiles, profileSettings, emergencyContacts } from './src/db/schema/index.ts';
     const schema = { profiles, profileSettings, emergencyContacts };
     import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
     const dialect = new PgDialect();
     console.log(JSON.stringify(Object.values(schema).map(table => {
       const c = getTableConfig(table);
       return { name: c.name, rls: c.enableRLS,
         columns: c.columns.map(x => ({ name: x.name, required: x.notNull, primary: x.primary, type: x.getSQLType() })),
         checks: c.checks.map(x => ({ name: x.name, expression: dialect.sqlToQuery(x.value).sql })),
         policies: c.policies.map(x => ({ name: x.name, for: x.for, using: x.using && dialect.sqlToQuery(x.using).sql, withCheck: x.withCheck && dialect.sqlToQuery(x.withCheck).sql })),
         foreignKeys: c.foreignKeys.map(x => ({ name: x.getName(), onDelete: x.onDelete })) };
     })));`,
    ],
    {
      cwd: root,
      env: localEnv(process.env),
      encoding: "utf8",
      timeout: 20_000,
    },
  );
}

test("TASK-016 maps only three private product tables and preserves progressive onboarding", () => {
  const result = mappingProbe();
  assert.equal(result.status, 0, result.stderr);
  const tables = JSON.parse(result.stdout);
  assert.deepEqual(tables.map((t) => t.name).sort(), [
    "emergency_contacts",
    "profile_settings",
    "profiles",
  ]);
  for (const t of tables) {
    assert.equal(t.rls, true, t.name);
    assert.equal(t.foreignKeys.length, 1);
    assert.equal(t.foreignKeys[0].onDelete, "cascade");
    for (const column of t.columns) {
      assert.doesNotMatch(
        column.name,
        /password|token|session|oauth|secret|verified|provider|email_confirmed|phone_confirmed/i,
      );
      if (t.name !== "emergency_contacts") {
        assert.equal(
          column.required,
          ["id", "user_id", "created_at", "updated_at"].includes(column.name),
          column.name,
        );
        assert.ok(!["email", "phone"].includes(column.name));
      }
    }
    assert.deepEqual(
      t.policies.map((p) => p.for).sort(),
      t.name === "emergency_contacts"
        ? ["delete", "insert", "select", "update"]
        : ["insert", "select", "update"],
    );
    for (const p of t.policies) {
      for (const expression of [p.using, p.withCheck].filter(Boolean)) {
        assert.match(expression, /auth\.uid\(\)/);
        assert.doesNotMatch(expression, /\btrue\b/i);
      }
    }
    for (const c of t.checks) {
      assert.ok(migration.includes(`constraint ${c.name} check`), c.name);
      assert.ok(c.expression.length > 0);
    }
  }
  const phone = tables
    .find((t) => t.name === "emergency_contacts")
    .checks.find((c) => c.name === "emergency_contacts_phone_check");
  assert.match(phone.expression, /\^\[\+\]\[1-9\]\[0-9\]\{1,14\}\$/);
});

test("TASK-016 migration is additive, private, single-history and has no auth signup side effects", () => {
  assert.deepEqual(
    [...migration.matchAll(/create table public\.(\w+)/gi)]
      .map((m) => m[1])
      .sort(),
    ["emergency_contacts", "profile_settings", "profiles"],
  );
  assert.doesNotMatch(
    migration,
    /create table auth\.|on auth\.users for|security definer|using\s*\(\s*true|with check\s*\(\s*true|drop table|truncate\s|delete from/i,
  );
  assert.match(
    migration,
    /revoke all on public\.profiles, public\.profile_settings, public\.emergency_contacts from public, anon, authenticated/,
  );
  assert.match(migration, /create index emergency_contacts_user_id_idx/);
  assert.equal((migration.match(/enable row level security/g) ?? []).length, 3);
  assert.equal((migration.match(/create policy /g) ?? []).length, 10);
  assert.match(migration, /NEW\.created_at := OLD\.created_at/);
  const files = readdirSync(resolve(root, "supabase/migrations"));
  assert.ok(files.includes("20260908083000_create_user_profile_schema.sql"));
});

test("Drizzle schema entry rejects non-server imports and existing UI remains disconnected", () => {
  const result = mappingProbe(false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /server-only|Client Component/);
  const files = execFileSync(
    "git",
    ["ls-files", "src/app", "src/features", "src/shared"],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/);
  for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
    assert.doesNotMatch(
      read(file),
      /DATABASE_URL|SUPABASE_SECRET_KEY|from ["'][^"']*\/db\/schema/,
      file,
    );
  }
});

test("browser leakage detector fails closed on private markers and absent build output", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "task016-bundle-"));
  try {
    assert.throws(() => checkClientBundle(directory), /Build browser JS/);
    const chunk = resolve(directory, "test.js");
    writeFileSync(chunk, "console.log('public view')");
    assert.equal(checkClientBundle(directory), 1);
    for (const marker of [
      "DATABASE_URL",
      "SUPABASE_SECRET_KEY",
      "drizzle-orm",
      "set_profile_audit_timestamps",
    ]) {
      writeFileSync(chunk, marker);
      assert.throws(() => checkClientBundle(directory), /Server-only marker/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
