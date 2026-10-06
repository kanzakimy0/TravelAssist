import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import {
  parseRollbackRequest,
  parseRollbackResult,
  serializeRollbackResult,
  parseRuntimeResult,
  serializeRollbackRequest,
  serializeRuntimeResult,
} from "../src/shared/contracts/engine/runtime.ts";
import {
  rollbackRequestFixture,
  rollbackResultFixture,
  runtimeResultFixture,
} from "../src/shared/contracts/engine/runtime-fixtures.ts";
import {
  capturePreimage,
  inverseOperations,
  parsePreimage,
} from "../src/server/engine/preimage.ts";
import { preview } from "../src/server/engine/index.ts";
import { summarizeRecompute } from "../src/server/engine/runtime.ts";
import { applyScenario } from "./task-063-fixtures.mjs";
import { reversibleReorder } from "./task-064-fixtures.mjs";
import { route } from "./fixtures/engine-feasibility.mjs";
test("TASK-064 additive contracts round-trip with deterministic key order", () => {
  for (const [f, parser, serialize] of [
    [rollbackRequestFixture, parseRollbackRequest, serializeRollbackRequest],
    [runtimeResultFixture, parseRuntimeResult, serializeRuntimeResult],
    [rollbackResultFixture, parseRollbackResult, serializeRollbackResult],
  ]) {
    assert.deepEqual(parser(f), { ok: true, value: f });
    assert.equal(
      serialize(f),
      serialize(Object.fromEntries(Object.entries(f).reverse())),
    );
    assert.deepEqual(JSON.parse(serialize(f)), f);
  }
});
for (const field of [
  "snapshot",
  "ownerId",
  "role",
  "inverse",
  "before",
  "after",
  "confirmed",
  "grant",
  "providerFacts",
  "token",
])
  test("TASK-064 rollback rejects caller " + field, () =>
    assert.equal(
      parseRollbackRequest({ ...rollbackRequestFixture, [field]: true }).ok,
      false,
    ),
  );
test("TASK-064 strict identities versions bounds and non-JSON accessors", () => {
  for (const bad of [
    { ...rollbackRequestFixture, rollbackContractVersion: "future" },
    { ...rollbackRequestFixture, reason: "x".repeat(1001) },
    { ...rollbackRequestFixture, idempotencyKey: "a b" },
    { ...rollbackRequestFixture, originalReceiptId: "bad" },
    null,
    [],
  ])
    assert.equal(parseRollbackRequest(bad).ok, false);
  const getter = { ...rollbackRequestFixture };
  Object.defineProperty(getter, "reason", {
    get() {
      throw Error("must not invoke");
    },
    enumerable: true,
  });
  assert.equal(parseRollbackRequest(getter).ok, false);
});
test("TASK-064 runtime rejects unknown fields future values unbounded unsafe summaries", () => {
  for (const bad of [
    { ...runtimeResultFixture, rawProvider: {} },
    { ...runtimeResultFixture, runtimeContractVersion: "future" },
    { ...runtimeResultFixture, eventType: "future" },
    { ...runtimeResultFixture, fingerprint: "bad" },
    { ...runtimeResultFixture, eventId: randomUUID() },
    { ...runtimeResultFixture, issueCodes: ["secret text"] },
    { ...runtimeResultFixture, issueCodes: ["Z", "A"] },
    {
      ...runtimeResultFixture,
      issueCodes: Array.from({ length: 33 }, (_, i) => "CODE_" + i).sort(),
    },
    { ...runtimeResultFixture, processingState: "terminal_failure" },
  ])
    assert.equal(parseRuntimeResult(bad).ok, false);
  for (const bad of [
    { ...rollbackResultFixture, rollbackContractVersion: "future" },
    { ...rollbackResultFixture, snapshot: {} },
    {
      ...rollbackResultFixture,
      resultingVersion: { tripRevision: 2, planRevision: 2 },
    },
    { ...rollbackResultFixture, applyReceiptId: null },
    { ...rollbackResultFixture, transaction: { status: "not_started" } },
  ])
    assert.equal(parseRollbackResult(bad).ok, false);
});
test("TASK-064 minimal time history restores only its target on current snapshot", () => {
  const s = applyScenario(randomUUID());
  const candidate = preview(s.snapshot, s.change, s.context);
  assert.equal(candidate.outcome, "accepted");
  const history = capturePreimage(
    s.snapshot,
    candidate.preview.after,
    s.change,
  );
  assert.deepEqual(Object.keys(history.entries[0]).sort(), [
    "appliedSchedule",
    "beforeSchedule",
    "itemId",
    "op",
  ]);
  const current = structuredClone(candidate.preview.after);
  current.trip.title = "New unrelated title";
  current.trip.revision++;
  const ops = inverseOperations(current, s.change.target.planId, history);
  assert.deepEqual(
    ops[0].schedule,
    s.snapshot.plans[0].days[0].items[0].schedule,
  );
  assert.equal(current.trip.title, "New unrelated title");
  current.plans[0].days[0].items[0].schedule = null;
  assert.equal(
    inverseOperations(current, s.change.target.planId, history),
    null,
  );
});
test("TASK-064 multi-operation net preimage and compensating reorder validate in both directions", () => {
  const s = reversibleReorder(randomUUID());
  const forward = preview(s.snapshot, s.change, s.context);
  assert.equal(forward.outcome, "accepted", JSON.stringify(forward.issues));
  const history = capturePreimage(s.snapshot, forward.preview.after, s.change);
  assert.equal(history.entries.length, 3);
  const inverse = {
    ...s.change,
    operations: inverseOperations(
      forward.preview.after,
      s.change.target.planId,
      history,
    ),
  };
  const back = preview(forward.preview.after, inverse, s.context);
  assert.equal(back.outcome, "accepted", JSON.stringify(back.issues));
  assert.deepEqual(back.preview.after, s.snapshot);
  const drift = structuredClone(forward.preview.after);
  drift.plans[0].days[0].items.reverse();
  assert.equal(inverseOperations(drift, s.change.target.planId, history), null);
});
test("TASK-064 preimage parser rejects snapshots duplicate targets invalid schedules and nonpermutations", () => {
  const s = applyScenario(randomUUID()),
    forward = preview(s.snapshot, s.change, s.context),
    history = capturePreimage(s.snapshot, forward.preview.after, s.change);
  for (const h of [
    { ...history, snapshot: s.snapshot },
    { ...history, version: "future" },
    { ...history, entries: [] },
    { ...history, entries: [...history.entries, ...history.entries] },
    { ...history, entries: [{ ...history.entries[0], token: "secret" }] },
    {
      ...history,
      entries: [
        { ...history.entries[0], beforeSchedule: { start: "invalid" } },
      ],
    },
    {
      version: "4.23-preimage-1",
      entries: [
        {
          op: "REORDER_ITEMS",
          dayId: randomUUID(),
          beforeOrder: [randomUUID()],
          appliedOrder: [],
        },
      ],
    },
  ])
    assert.equal(parsePreimage(h).ok, false);
});
test("TASK-064 repeated target operations retain net before/final only", () => {
  const s = applyScenario(randomUUID());
  s.change.operations.unshift({
    ...structuredClone(s.change.operations[0]),
    operationId: "intermediate",
    schedule: structuredClone(s.snapshot.plans[0].days[0].items[0].schedule),
  });
  const forward = preview(s.snapshot, s.change, s.context);
  assert.equal(forward.outcome, "accepted");
  assert.equal(
    capturePreimage(s.snapshot, forward.preview.after, s.change).entries.length,
    1,
  );
});
test("TASK-064 read-only recompute is deterministic and fingerprint changes with authoritative revision", () => {
  const s = applyScenario(randomUUID());
  s.change.operations = [];
  const original = structuredClone(s.snapshot);
  const a = summarizeRecompute(s.snapshot, s.change, s.context),
    b = summarizeRecompute(s.snapshot, s.change, s.context);
  assert.deepEqual(a, b);
  assert.deepEqual(s.snapshot, original);
  s.snapshot.trip.revision++;
  s.change.baseVersion.tripRevision++;
  assert.notEqual(
    summarizeRecompute(s.snapshot, s.change, s.context).fingerprint,
    a.fingerprint,
  );
});
for (const mode of ["valid", "missing", "stale", "invalid"])
  test(
    "TASK-064 7.5 route contract " + mode + " never invokes a Provider",
    () => {
      const s = reversibleReorder(randomUUID());
      s.change.operations = [];
      const [a, b] = s.snapshot.plans[0].days[0].items;
      const binding = route(s, a, b);
      if (mode === "missing") s.context.routes = [];
      if (mode === "stale") binding.fact.expiresAt = "2027-03-31T01:00:00Z";
      if (mode === "invalid") binding.response.contractVersion = "future";
      const result = summarizeRecompute(s.snapshot, s.change, s.context);
      assert.equal(
        result.recomputeStatus,
        mode === "valid" ? "accepted" : "blocked",
      );
      assert.equal("snapshot" in result, false);
      assert.equal("context" in result, false);
    },
  );
test("TASK-064 shared writer and server-only boundary retain additive migration history", () => {
  const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
  for (const p of ["apply-transaction", "preimage", "rollback", "runtime"])
    assert.match(
      read("src/server/engine/" + p + ".ts"),
      /import "server-only"/,
    );
  assert.doesNotMatch(
    read("src/server/engine/rollback.ts"),
    /replaceTripTree|\.update\(.*(?:trips|audits)|delete\(/,
  );
  assert.doesNotMatch(
    read("src/server/engine/runtime.ts"),
    /replaceTripTree|fetch\(|server\/routing|\.apply\(/,
  );
  assert.match(
    read("src/server/engine/apply-transaction.ts"),
    /capturePreimage/,
  );
  assert.equal(
    readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter(
      (x) => x === "20260917100000_engine_runtime_compensation.sql",
    ).length,
    1,
  );
});
