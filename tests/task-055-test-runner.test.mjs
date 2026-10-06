import assert from "node:assert/strict";
import { test } from "node:test";
import { runNode, testTotals } from "../tools/qa/personal-center-tests.mjs";

for (const [label, code, expectedExit] of [
  ["pass", 'test("fixture", () => {});', 0],
  [
    "child assertion failure",
    'test("fixture", () => { throw Error("controlled failure"); });',
    1,
  ],
  [
    "mandatory skip",
    'test("fixture", { skip: "controlled missing runtime" }, () => {});',
    0,
  ],
]) {
  test("TASK-055 aggregate validates real child TAP: " + label, async () => {
    const result = await runNode([
      "--test-reporter=tap",
      "--input-type=module",
      "--eval",
      'import { test } from "node:test";' + code,
    ]);
    assert.equal(result.exitCode, expectedExit);
    if (label === "pass")
      assert.equal(testTotals(result.output.toString()).tests, 1);
    else assert.throws(() => testTotals(result.output.toString()));
  });
}

test("TASK-055 aggregate rejects a successful child that ran zero tests", async () => {
  const result = await runNode(["--eval", "console.log('no tests executed')"]);
  assert.equal(result.exitCode, 0);
  assert.throws(() => testTotals(result.output.toString()));
});
