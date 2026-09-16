import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { localEnv } from "../tools/db/local.mjs";
const root = new URL("../", import.meta.url);
test("TASK-019 server-only projection fixture suite", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "./tests/register-planner-ts.mjs",
      "--test",
      "tests/task-019-projection.cases.mjs",
    ],
    { cwd: root, env: localEnv(process.env), encoding: "utf8", timeout: 30000 },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /(?:tests 16|# tests 16)/);
});
test("TASK-019 server boundary rejects browser imports", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      "import './src/server/trips/repository.ts'",
    ],
    { cwd: root, encoding: "utf8", timeout: 30000 },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Server Component/);
});
test("TASK-019 SQL is additive and RLS-enabled with stable guards", () => {
  const first = readFileSync(
    new URL(
      "supabase/migrations/20260908150000_create_trip_plan_schema.sql",
      root,
    ),
    "utf8",
  );
  const second = readFileSync(
    new URL(
      "supabase/migrations/20260908150100_add_trip_plan_rls_revision.sql",
      root,
    ),
    "utf8",
  );
  for (const table of ["trips", "trip_plans", "trip_days", "itinerary_items"]) {
    assert.match(first, new RegExp(`create table public.${table} \\(`));
    assert.match(
      second,
      new RegExp(`alter table public.${table} enable row level security`),
    );
  }
  assert.doesNotMatch(
    first + second,
    /create table public\.(trip_drafts|travel_preferences|bookings|routes|places|trip_members)/,
  );
  assert.match(
    first,
    /foreign key\(id,active_plan_id\) references public.trip_plans\(trip_id,id\)/,
  );
  assert.match(second, /TRIP_STALE_REVISION/);
  assert.match(second, /TRIP_IMMUTABLE_PARENT/);
  assert.match(
    second,
    /revoke all on function public.touch_trip_tree_ancestors\(\) from public,anon,authenticated/,
  );
});
