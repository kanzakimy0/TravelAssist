import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { regressionInventory } from "../tools/qa/task-086-regression-lanes.mjs";
import {
  assertLaneBinding,
  verifyCompletedLanes,
} from "../tools/transport/task-086-validation-lanes.mjs";
test("publication recovery lanes cover every regression file exactly once", () => {
  const inventory = regressionInventory();
  assert.deepEqual(
    Object.values(inventory.lanes).flat().sort(),
    inventory.files,
  );
  assert.equal(
    new Set(Object.values(inventory.lanes).flat()).size,
    inventory.fileCount,
  );
  assert.deepEqual(inventory.lanes.rebuild, [
    "tests/task-086-b-rebuild.test.mjs",
  ]);
  assert.ok(
    inventory.lanes.assets.includes("tests/task-013-1-asset-variants.test.mjs"),
  );
});
test("publication lane proof rejects failed, foreign HEAD and changed input receipts", () => {
  const binding = {
    checkoutSha: "a".repeat(40),
    inputCodeSha256: "b".repeat(64),
    nodeVersion: process.version,
    platform: process.platform,
  };
  assert.doesNotThrow(() =>
    assertLaneBinding({ status: "PASS", binding }, binding),
  );
  for (const field of [
    "checkoutSha",
    "inputCodeSha256",
    "nodeVersion",
    "platform",
  ])
    assert.throws(
      () =>
        assertLaneBinding(
          { status: "PASS", binding: { ...binding, [field]: "foreign" } },
          binding,
        ),
      /differs/,
    );
  assert.throws(
    () => assertLaneBinding({ status: "TIMEOUT", binding }, binding),
    /did not complete/,
  );
});
test("publication rebuild cannot claim PASS without every current-head lane receipt", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-missing-lanes-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.throws(() => verifyCompletedLanes(dir), /ENOENT/);
});
