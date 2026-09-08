import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  commands,
  commandArgs,
  localEnv,
  assertLocalEndpoint,
  publicStatus,
  writeGeneratedTypes,
} from "../tools/db/local.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const pkg = JSON.parse(read("package.json"));

test("stable foundation dependencies and original framework versions are locked", () => {
  const lock = JSON.parse(read("package-lock.json"));
  for (const [group, names] of [
    [
      "dependencies",
      ["drizzle-orm", "postgres", "@supabase/supabase-js", "server-only"],
    ],
    ["devDependencies", ["drizzle-kit", "supabase"]],
  ])
    for (const name of names) {
      assert.match(pkg[group][name], /^\d+\.\d+\.\d+$/);
      assert.equal(
        lock.packages[`node_modules/${name}`].version,
        pkg[group][name],
      );
    }
  assert.equal(pkg.dependencies.next, "16.3.4");
  assert.equal(pkg.dependencies.react, "19.2.8");
  assert.equal(pkg.devDependencies.typescript, "6.0.3");
  assert.equal(pkg.dependencies["@supabase/ssr"], undefined);
});

test("CLI bootstrap and sole SQL history preserve the foundation's historical empty-schema boundary", () => {
  const config = read("supabase/config.toml");
  assert.match(config, /project_id = "travelassist"/);
  assert.match(config, /schema_paths = \[\]/);
  assert.match(config, /\[experimental.pgdelta\]\s+enabled = false/);
  assert.equal(existsSync(resolve(root, "drizzle")), false);
  assert.doesNotMatch(
    read("drizzle.config.ts"),
    /dbCredentials|process\.env|dotenv/,
  );
  // TASK-015's no-business-schema scope describes its merged delivery, not a
  // permanent prohibition on subsequently authorized domain migrations.
  const foundation = "24dff4e3b74dfe01c369d2c149d37eba86ad6472";
  const historical = (path) =>
    execFileSync("git", ["show", `${foundation}:${path}`], {
      cwd: root,
      encoding: "utf8",
    });
  const schema = historical("src/db/schema/index.ts");
  assert.match(schema, /export \{\}/);
  assert.doesNotMatch(schema, /pgTable|pgSchema|createTable/);
  const seed = read("supabase/seed.sql")
    .replace(/--[^\n]*/g, "")
    .trim();
  assert.equal(seed, "");
  const migrations = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", foundation, "supabase/migrations"],
    {
      cwd: root,
      encoding: "utf8",
    },
  )
    .trim()
    .split(/\r?\n/)
    .filter((file) => file.endsWith(".sql"));
  assert.equal(
    migrations.length,
    0,
    "Unverified PostGIS SQL must not masquerade as accepted migration",
  );
  for (const file of readdirSync(resolve(root, "supabase/migrations"))) {
    if (file.endsWith(".sql")) assert.match(file, /^\d{14}_[a-z0-9_]+\.sql$/);
  }
});

test("five new environment keys are empty; private settings have no public aliases", () => {
  const env = read(".env.example");
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "DATABASE_URL",
  ]) {
    assert.match(env, new RegExp(`^${name}=\\s*$`, "m"));
  }
  assert.doesNotMatch(
    env,
    /NEXT_PUBLIC_.*(?:SECRET|DATABASE)|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9]+/,
  );
  const ignored = execFileSync(
    "git",
    [
      "check-ignore",
      "--no-index",
      ".env.local",
      "supabase/signing_keys.json",
      "supabase/.temp/project-ref",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.match(ignored, /signing_keys/);
  assert.match(ignored, /project-ref/);
});

test("DB boundary is server-only and no existing page imports it", () => {
  const db = read("src/db/index.ts");
  assert.match(db, /import "server-only"/);
  assert.match(db, /prepare: false/);
  assert.doesNotMatch(db, /use client|migrate\(|create table/i);
  const files = execFileSync("git", ["ls-files", "src/app", "src/features"], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/);
  for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
    assert.doesNotMatch(
      read(file),
      /from ["'][^"']*(?:\/db(?:\/|["'])|lib\/supabase)/,
      file,
    );
  }
});

function isolated(code, server = true) {
  return spawnSync(
    process.execPath,
    [
      ...(server ? ["--conditions=react-server"] : []),
      "--experimental-strip-types",
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      code,
    ],
    {
      cwd: root,
      env: localEnv(process.env),
      encoding: "utf8",
      timeout: 15_000,
      windowsHide: true,
    },
  );
}

test("real DB module imports without URL; getDb reports missing/invalid settings safely", () => {
  const result = isolated(`
    import assert from 'node:assert/strict';
    import { getDb, closeDb } from './src/db/index.ts';
    assert.throws(() => getDb(), /DATABASE_URL is required/);
    process.env.DATABASE_URL = 'not-a-url-unit-test-private';
    assert.throws(() => getDb(), e => !e.message.includes('unit-test-private'));
    await closeDb();
  `);
  assert.equal(result.status, 0, result.stderr);
});

test("lazy connection reuses a client and can close/reopen without making a query", () => {
  const result = isolated(`
    import assert from 'node:assert/strict';
    import { getDb, closeDb } from './src/db/index.ts';
    process.env.DATABASE_URL = 'postgresql://localhost:1/foundation_test';
    const first = getDb();
    assert.equal(first, getDb());
    assert.equal(first.$client.options.prepare, false);
    await closeDb();
    assert.notEqual(getDb(), first);
    await closeDb();
  `);
  assert.equal(result.status, 0, result.stderr);
});

test("non-server import is rejected by server-only marker", () => {
  const result = isolated("await import('./src/db/index.ts');", false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Client Component|server-only/);
});

test("DB commands only accept known local operations and reject remote/extra flags", () => {
  for (const name of Object.keys(commands)) {
    assert.deepEqual(commandArgs([name]), commands[name]);
    assert.equal(pkg.scripts[`db:${name}`], `node tools/db/local.mjs ${name}`);
  }
  for (const args of [
    [],
    ["push"],
    ["__proto__"],
    ["reset", "--linked"],
    ["types", "--db-url", "remote"],
  ])
    assert.throws(() => commandArgs(args));
  assert.doesNotMatch(
    JSON.stringify(pkg.scripts),
    /drizzle-kit (?:push|migrate)|supabase (?:link|db push)/,
  );
});

test("CLI child environment omits all cloud secrets and unrelated overrides", () => {
  const env = localEnv({
    PATH: "tools",
    DATABASE_URL: "unit-private",
    SUPABASE_ACCESS_TOKEN: "unit-private",
    SUPABASE_SECRET_KEY: "unit-private",
    PGHOST: "remote",
    OPENAI_API_KEY: "unit-private",
    SUPABASE_PROJECT_ID: "remote",
  });
  assert.equal(env.PATH, "tools");
  assert.equal(env.DO_NOT_TRACK, "1");
  assert.doesNotMatch(JSON.stringify(env), /unit-private|remote/);
  assert.equal(
    localEnv({ docker_host: "unix:///var/run/docker.sock" }).DOCKER_HOST,
    "unix:///var/run/docker.sock",
  );
});

test("patched Drizzle config loader handles the real TypeScript configuration", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { transformSync } = require("@esbuild-kit/core-utils");
  const result = transformSync(
    read("drizzle.config.ts"),
    resolve(root, "drizzle.config.ts"),
    { format: "cjs" },
  );
  assert.match(result.code, /postgresql/);
  assert.match(result.code, /src\/db\/schema/);
});

test("only local Docker socket or local Windows named pipe is accepted", () => {
  for (const value of [
    "unix:///var/run/docker.sock",
    "npipe:////./pipe/dockerDesktopLinuxEngine",
  ])
    assert.equal(assertLocalEndpoint(value), value);
  for (const value of [
    "ssh://host",
    "tcp://localhost:2375",
    "npipe:////server/pipe/docker_engine",
    "unix:////server/docker.sock",
    "",
  ])
    assert.throws(() => assertLocalEndpoint(value));
});

test("status allows endpoint-only output, redacts secrets and fails closed on malformed responses", () => {
  const output = publicStatus(
    JSON.stringify({
      API_URL: "http://127.0.0.1:54321",
      JWT_SECRET: "unit-private",
      SECRET_KEY: "unit-private",
      DB_URL: "unit-private",
    }),
  );
  assert.equal(output.API_URL, "http://127.0.0.1:54321/");
  assert.doesNotMatch(JSON.stringify(output), /unit-private|SECRET|DB_URL/);
  for (const raw of [
    "unit-private",
    JSON.stringify({ API_URL: "unit-private" }),
    JSON.stringify({ API_URL: "http://user:unit-private@localhost" }),
    "{}",
    JSON.stringify({ API_URL: "https://remote.example" }),
  ]) {
    assert.throws(
      () => publicStatus(raw),
      (error) => !error.message.includes("unit-private"),
    );
  }
});

test("generated types are formatted, atomic, deterministic and never fabricated after failure", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "travelassist-db-types-test-"));
  const target = resolve(dir, "database.generated.ts");
  try {
    await writeFile(target, "existing output");
    await assert.rejects(writeGeneratedTypes("CLI failed", target));
    assert.equal(await readFile(target, "utf8"), "existing output");
    await assert.rejects(
      writeGeneratedTypes("export type Database = {public: {BROKEN", target),
    );
    assert.equal(await readFile(target, "utf8"), "existing output");
    const fixture =
      "export type Database = { public: { Tables: Record<string, never> } };";
    await writeGeneratedTypes(fixture, target);
    const first = await readFile(target, "utf8");
    const before = (await stat(target)).mtimeMs;
    await writeGeneratedTypes(fixture, target);
    assert.equal((await stat(target)).mtimeMs, before);
    assert.match(first, /DO NOT EDIT/);
    assert.equal(existsSync(target + ".tmp"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
