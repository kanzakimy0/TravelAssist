import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertHistory,
  assertGeneratedAgreement,
  generatedContract,
  manifest,
  read,
  tables,
} from "./task-054-migration-helpers.mjs";
import { ownerColumns } from "./task-052-local-helpers.mjs";

test("TASK-054 accepted migration inventory is immutable and has one formal history", () => {
  assertHistory();
});

test("TASK-054 audited SQL objects cover all Personal Center mirrors and cascade inventory", () => {
  const history = manifest.migrations.map((file) => read(file.path)).join("\n");
  for (const [kind, pattern] of [
    ["tables", /create table public\.(\w+)/g],
    ["functions", /create function public\.(\w+)/g],
    ["triggers", /create trigger (\w+)/g],
    ["policies", /create policy (\w+)/g],
  ])
    assert.deepEqual(
      [...history.matchAll(pattern)].map((m) => m[1]).sort(),
      manifest[kind],
    );
  assert.deepEqual(
    tables.map((t) => t.name),
    manifest.tables,
  );
  assert.deepEqual(Object.keys(ownerColumns).sort(), manifest.tables);
});

test("TASK-054 generated Row/Insert/Update agree with every Drizzle column and default", () => {
  assertGeneratedAgreement();
  const functions = Object.keys(generatedContract().functions).sort();
  assert.deepEqual(
    functions,
    [
      ...manifest.functions.filter((name) => /^(is_|mutate_)/.test(name)),
      "is_engine_preimage_v1",
    ].sort(),
  );
});

test("TASK-054 drift checks reject missing columns, wrong nullability, defaults and scalar types", () => {
  for (const mutate of [
    (c) => {
      delete c.tables.profiles.Row.id;
    },
    (c) => {
      c.tables.profiles.Row.display_name.type = "string";
    },
    (c) => {
      c.tables.companions.Insert.id.optional = false;
    },
    (c) => {
      c.tables.travel_preferences.Row.revision.type = "string";
    },
  ]) {
    const contract = generatedContract();
    mutate(contract);
    assert.throws(
      () => assertGeneratedAgreement(contract),
      assert.AssertionError,
    );
  }
});
