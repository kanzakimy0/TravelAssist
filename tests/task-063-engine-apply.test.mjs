import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  prepareApply,
  applyResult,
  replayApply,
} from "../src/server/engine/apply-result.ts";
import { createEngineApplyService } from "../src/server/engine/apply.ts";
import { applyScenario } from "./task-063-fixtures.mjs";
import { digest } from "../src/server/engine/json.ts";

test("TASK-063 canonical payload hash ignores object key ordering, not payload changes", () => {
  const { change } = applyScenario(randomUUID());
  const reversed = Object.fromEntries(Object.entries(change).reverse());
  assert.equal(
    prepareApply(change).result.payloadHash,
    prepareApply(reversed).result.payloadHash,
  );
  assert.notEqual(digest(change), digest({ ...change, reason: "different" }));
});
for (const injection of [
  "snapshot",
  "ownerUserId",
  "role",
  "confirmed",
  "grant",
  "access",
  "context",
])
  test(
    "TASK-063 rejects caller authority / grant injection: " + injection,
    () => {
      const { change } = applyScenario(randomUUID());
      const p = prepareApply({ ...change, [injection]: true });
      assert.equal(p.change, null);
      assert.equal(p.result.outcome, "blocked");
    },
  );
test("TASK-063 rejects empty operations, invalid DB UUIDs and non-JSON input", () => {
  const { change } = applyScenario(randomUUID());
  for (const input of [
    { ...change, operations: [] },
    { ...change, target: { ...change.target, tripId: "fake" } },
    { ...change, reason: () => {} },
    null,
  ]) {
    const p = prepareApply(input);
    assert.equal(p.change, null);
    assert.equal(p.result.issues[0].code, "INPUT_INVALID");
  }
  const cyclic = {};
  cyclic.self = cyclic;
  assert.equal(prepareApply(cyclic).change, null);
});
test("TASK-063 detach prevents request mutation after canonical parse", () => {
  const { change } = applyScenario(randomUUID());
  const p = prepareApply(change);
  change.operations[0].schedule.start = "bad";
  assert.notEqual(p.change.operations[0].schedule.start, "bad");
});
test("TASK-063 replay preserves original result/reference without mutating stored result", () => {
  const { change } = applyScenario(randomUUID());
  const stored = applyResult(change);
  stored.resultingVersion = { tripRevision: 7, planRevision: 6 };
  stored.transaction.status = "committed";
  const result = replayApply(stored, applyResult(change));
  assert.equal(result.replay.duplicate, true);
  assert.equal(result.replay.originalChangeSetId, change.changeSetId);
  assert.deepEqual(result.resultingVersion, stored.resultingVersion);
  assert.equal(stored.replay.duplicate, false);
  result.issues.push({ code: "test" });
  assert.equal(stored.issues.length, 0);
});
test("TASK-063 same-key different canonical payload fails without leaking original result", () => {
  const { change } = applyScenario(randomUUID());
  const stored = applyResult(change);
  const conflict = replayApply(
    stored,
    applyResult({ ...change, reason: "different" }),
  );
  assert.equal(conflict.issues[0].code, "IDEMPOTENCY_KEY_REUSED");
  assert.equal(conflict.resultingVersion, null);
});
test("TASK-063 auth absence, auth transport failure and actor mismatch never open DB/context", async () => {
  const actor = randomUUID(),
    { change } = applyScenario(actor);
  const never = () => {
    throw Error("DB/context must not execute");
  };
  for (const getUser of [
    async () => ({ data: { user: null }, error: null }),
    async () => {
      throw Error("secret");
    },
    async () => ({ data: { user: { id: randomUUID() } }, error: null }),
  ]) {
    const service = createEngineApplyService(
      { auth: { getUser } },
      never,
      never,
    );
    for (const method of ["apply", "reconcile"]) {
      const result = await service[method](change);
      assert.equal(result.issues[0].code, "PERMISSION_DENIED");
      assert.equal(result.transaction.status, "not_started");
      assert.doesNotMatch(JSON.stringify(result), /secret/);
    }
  }
});
test("TASK-063 unknown operation and future contract remain unsupported", () => {
  const { change } = applyScenario(randomUUID());
  for (const value of [
    { ...change, engineContractVersion: "future" },
    { ...change, operations: [{ op: "FUTURE" }] },
  ])
    assert.equal(prepareApply(value).result.outcome, "unsupported");
});
