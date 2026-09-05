import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import {
  assertLocalEndpoint,
  commandArgs,
  formattedTypes,
  redact,
  root,
} from "../scripts/db/local.mjs";

const read = (path) => readFileSync(resolve(root, path), "utf8");

function evaluate(path, env = {}, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env },
    require: (id) => {
      if (id === "server-only") return {};
      if (!(id in imports)) throw new Error(`Unexpected dependency ${id}`);
      return imports[id];
    },
  });
  return module.exports;
}

test("DB import is inert, missing DATABASE_URL fails only on use", () => {
  let calls = 0;
  const db = evaluate(
    "src/db/index.ts",
    {},
    {
      postgres: () => {
        calls++;
      },
      "drizzle-orm/postgres-js": { drizzle() {} },
      "./schema": {},
    },
  );
  assert.equal(calls, 0);
  assert.throws(() => db.getDb(), /DATABASE_URL is required/);
  assert.equal(calls, 0);
});

test("server DB factory is lazy/reused, disables prepare, and can close", async () => {
  let calls = 0,
    closed = 0,
    options;
  const query = { transaction() {} };
  const db = evaluate(
    "src/db/index.ts",
    { DATABASE_URL: "unit-test-value-never-connected" },
    {
      postgres: (_url, opts) => {
        calls++;
        options = opts;
        return {
          end: async () => {
            closed++;
          },
        };
      },
      "drizzle-orm/postgres-js": { drizzle: () => query },
      "./schema": {},
    },
  );
  assert.equal(calls, 0);
  assert.equal(db.getDb(), query);
  assert.equal(db.getDb(), query);
  assert.equal(calls, 1);
  assert.equal(options.prepare, false);
  assert.equal(options.max, 5);
  await db.closeDb();
  assert.equal(closed, 1);
  db.getDb();
  assert.equal(calls, 2);
});

test("public env is lazy and refuses privileged or legacy keys", () => {
  const env = {};
  const config = evaluate("src/lib/supabase/public-env.ts", env);
  assert.throws(() => config.getSupabasePublicEnv(), /required/);
  env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_UNIT_TEST_NOT_A_KEY";
  assert.throws(() => config.getSupabasePublicEnv(), /publishable key/);
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_UNIT_TEST_NOT_A_KEY";
  assert.equal(config.getSupabasePublicEnv().url, env.NEXT_PUBLIC_SUPABASE_URL);
});

test("admin reads secrets only on use and disables session persistence", () => {
  let calls = 0,
    options;
  const env = {};
  const factory = evaluate("src/lib/supabase/admin.ts", env, {
    "@supabase/supabase-js": {
      createClient: (_url, _key, opts) => {
        calls++;
        options = opts;
        return {};
      },
    },
  });
  assert.equal(calls, 0);
  assert.throws(() => factory.createSupabaseAdminClient(), /required/);
  env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  env.SUPABASE_SECRET_KEY = "sb_secret_UNIT_TEST_NOT_A_KEY";
  factory.createSupabaseAdminClient();
  assert.equal(calls, 1);
  assert.equal(options.auth.persistSession, false);
  assert.equal(options.auth.autoRefreshToken, false);
  assert.equal(options.auth.detectSessionInUrl, false);
});

test("server clients are request-scoped with explicit cookie/header write boundary", async () => {
  const captured = [];
  const factory = evaluate(
    "src/lib/supabase/server.ts",
    {},
    {
      "@supabase/ssr": {
        createServerClient: (_url, _key, options) => {
          captured.push(options);
          return options;
        },
      },
      "next/headers": { cookies: async () => ({ getAll: () => [] }) },
      "./public-env": {
        getSupabasePublicEnv: () => ({ url: "local", key: "public" }),
      },
    },
  );
  await factory.createSupabaseServerClient();
  await factory.createSupabaseServerClient();
  assert.notEqual(captured[0], captured[1]);
  assert.throws(() => captured[0].cookies.setAll([], {}), /explicit response/);
  const writes = [];
  const adapter = {
    getAll: () => [],
    setAll: (cookies, headers) => writes.push({ cookies, headers }),
  };
  const client = await factory.createSupabaseServerClient(adapter);
  client.cookies.setAll([], { "Cache-Control": "private, no-store" });
  assert.equal(writes[0].headers["Cache-Control"], "private, no-store");
});

test("DB and privileged Supabase entrypoints are server-only, not actions", () => {
  for (const path of [
    "src/db/index.ts",
    "src/lib/supabase/server.ts",
    "src/lib/supabase/admin.ts",
  ]) {
    assert.match(read(path), /^import "server-only"/);
    assert.doesNotMatch(read(path), /["']use server["']/);
  }
  for (const path of [
    "src/lib/supabase/browser.ts",
    "src/lib/supabase/public-env.ts",
  ]) {
    assert.doesNotMatch(
      read(path),
      /DATABASE_URL|SUPABASE_SECRET_KEY|from ["'].*(?:\/db|admin)/,
    );
  }
});

test("local commands reject remote flags, arbitrary paths, and unknown operations", () => {
  for (const command of [
    "start",
    "stop",
    "reset",
    "lint",
    "types",
    "test",
    "status",
  ]) {
    assert.throws(() => commandArgs(command, ["--linked"]), /extra flags/);
  }
  assert.throws(() => commandArgs("push"), /Unknown/);
  assert.throws(
    () => commandArgs("migration-new", ["../../escape"]),
    /snake_case/,
  );
  assert.deepEqual(commandArgs("migration-new", ["enable_postgis"]), [
    "migration",
    "new",
    "enable_postgis",
  ]);
  for (const command of ["reset", "lint", "test", "types", "types-check"]) {
    assert.ok(commandArgs(command).includes("--local"));
  }
  assert.ok(!commandArgs("stop").includes("--no-backup"));
});

test("Docker endpoint guard rejects cloud/SSH and accepts local sockets only", () => {
  for (const endpoint of [
    "unix:///var/run/docker.sock",
    "npipe:////./pipe/docker_engine",
    "tcp://127.0.0.1:2375",
  ])
    assert.doesNotThrow(() => assertLocalEndpoint(endpoint));
  for (const endpoint of [
    "ssh://remote",
    "tcp://prod.example:2375",
    "tcp://127.0.0.1.evil:2375",
    "invalid",
  ])
    assert.throws(() => assertLocalEndpoint(endpoint), /local Docker/);
});

test("CLI logging redacts connection strings and keys", () => {
  const text = redact(
    "postgresql://user:sample@localhost/db sb_secret_NOT_REAL sb_publishable_NOT_REAL eyJfake.payload.signature",
  );
  assert.doesNotMatch(text, /sample|NOT_REAL|eyJfake/);
});

test("failed type generation cannot become a hand-written generated file", async () => {
  await assert.rejects(
    formattedTypes("Error: unavailable database"),
    /did not return/,
  );
});

test("SQL extension is the only migration, with no business tables or ORM history", () => {
  const migrations = readdirSync(resolve(root, "supabase/migrations"));
  assert.equal(migrations.length, 1);
  assert.match(migrations[0], /^\d{14}_enable_postgis\.sql$/);
  const sql = read(`supabase/migrations/${migrations[0]}`);
  assert.match(
    sql,
    /create extension if not exists postgis with schema extensions/i,
  );
  assert.doesNotMatch(sql, /create\s+table/i);
  assert.equal(existsSync(resolve(root, "drizzle")), false);
  assert.doesNotMatch(read("drizzle.config.ts"), /dbCredentials\s*:/);
});

test("CI is ephemeral and has no production credentials or remote runner", () => {
  const workflow = read(".github/workflows/database.yml");
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(
    workflow,
    /pull_request_target|secrets\.|--linked|--db-url|supabase link|supabase db push/,
  );
  assert.match(workflow, /npm run db:reset/);
  assert.match(
    workflow,
    /git ls-files --error-unmatch src\/types\/database.generated.ts/,
  );
});
