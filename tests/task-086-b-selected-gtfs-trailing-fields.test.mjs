import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("selected GTFS source-bound trailing fields: 35 offline contract checks", () => {
  const result = spawnSync(
    process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3"),
    ["-X", "utf8", "tests/python/task_086_selected_gtfs_trailing_fields.py"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /Ran 35 tests/);
  assert.match(result.stderr, /\nOK\s*$/);
});
