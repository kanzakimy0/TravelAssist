import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allTables,
  tables,
  manifest,
  generatedContract,
  assertGeneratedAgreement,
  assertHistory,
} from "./task-054-migration-helpers.mjs";
test("TASK-062 combined SQL mirrors and generated contracts retain A and B without weakening B audit", () => {
  const expected = [
    ...manifest.tables,
    "trips",
    "trip_plans",
    "trip_days",
    "itinerary_items",
  ].sort();
  assert.deepEqual(allTables.map((t) => t.name).sort(), expected);
  assert.deepEqual(
    tables.map((t) => t.name).sort(),
    [...manifest.tables].sort(),
  );
  const generated = generatedContract();
  assert.deepEqual(Object.keys(generated.tables).sort(), expected);
  assertGeneratedAgreement(generated, allTables);
  assertHistory();
});
