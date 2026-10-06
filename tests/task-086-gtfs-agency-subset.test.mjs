import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("exact retained multi-agency feed subset preserves source identity and rejects unrelated agencies or changed sections", () => {
  const r = spawnSync(
    process.env.TASK086_PYTHON ??
      (process.platform === "win32" ? "python" : "python3"),
    ["-X", "utf8", "tests/fixtures/task-086-gtfs-agency-subset/guard-cases.py"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cases = JSON.parse(r.stdout);
  assert.equal(cases.length, 11);
  assert(
    cases.every((c) => c.pass),
    JSON.stringify(cases),
  );
});
