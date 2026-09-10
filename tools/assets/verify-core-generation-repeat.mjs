import assert from "node:assert/strict";
import { statSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import { ROOT, sha256, write } from "./asset-utils.mjs";
import { artifacts, GENERATED } from "./core-generation-common.mjs";

const { output } = await artifacts();
const snapshot = () =>
  [...output.keys()].map((path) => {
    const abs = resolve(ROOT, path);
    return {
      path,
      sha256: sha256(readFileSync(abs)),
      mtimeMs: statSync(abs).mtimeMs,
    };
  });
const before = snapshot();
const build = execFileSync(
  process.execPath,
  ["tools/assets/build-core-generation-manifest.mjs"],
  { cwd: ROOT, encoding: "utf8" },
);
const validation = execFileSync(
  process.execPath,
  ["tools/assets/validate-core-generation-manifest.mjs"],
  { cwd: ROOT, encoding: "utf8" },
);
const after = snapshot();
assert.deepEqual(
  after,
  before,
  "Second run must preserve both bytes and modification times",
);
assert.equal(JSON.parse(build.trim().split("\n")[0]).changed_files, 0);
write(
  GENERATED + "core-generation-repeat-verification.json",
  await format(
    JSON.stringify({
      schemaVersion: 1,
      commands: ["assets:core-manifest", "assets:core-validate"],
      exit_codes: [0, 0],
      files_compared: before.length,
      changed_hashes: 0,
      changed_mtimes: 0,
      changed_files: 0,
      result: "PASS",
      validation: JSON.parse(validation.trim()),
      outputs: before.map(({ path, sha256 }) => ({ path, sha256 })),
    }),
    { filepath: "report.json" },
  ),
);
console.log(
  "PASS: second manifest + validate preserved all " +
    before.length +
    " outputs and mtimes.",
);
