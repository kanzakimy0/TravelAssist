import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
const baseline = "4888b4d507ee75d4f6b9914eb1a8d5661813f64b";
const changed = [
  ...new Set([
    ...git("diff", "--name-only", baseline).split("\n"),
    ...git("ls-files", "--others", "--exclude-standard").split("\n"),
  ]),
]
  .filter(Boolean)
  .sort();
const allowed =
  /^(?:docs\/(?:qa\/TASK-035\/(?:phase-1|phase-2)\/|qa\/test-baseline\.md$|tasks\/(?:TASK|RESULT-TASK|CODEX-TASK|AMENDMENT-TASK)-035[^/]*\.md$|project\/WBS-TravelAssist\.md$)|tools\/qa\/task-035-[^/]+\.mjs$|tests\/task-035-[^/]+\.mjs$|tools\/qa\/(?:ci-revision|task-086-regression-lanes)\.mjs$|tests\/pr-governance\.test\.mjs$|package\.json$|\.github\/workflows\/(?:quality-gate|release-rehearsal)\.yml$)/;
assert.deepEqual(
  changed.filter((p) => !allowed.test(p)),
  [],
  "OUT_OF_SCOPE_CHANGE",
);
assert.equal(
  git(
    "diff",
    "dbf8875250bb22ec8f9d647c84bf7e438aee12d7",
    "--",
    "docs/qa/TASK-035/phase-1",
    "docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase1-audit-only.md",
    "docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase1-audit-only.md",
  ),
  "",
  "PHASE1_CHANGED",
);
assert.equal(
  git(
    "diff",
    "f157f23ba1b93def006c2703ea8f42dcd9266c01",
    "--",
    "docs/tasks/TASK-035-a-test-baseline-freeze.md",
    "docs/tasks/RESULT-TASK-035-a-test-baseline-freeze.md",
    "tools/qa/task-035-browser-smoke.mjs",
  ),
  "",
  "HISTORICAL_SOURCE_CHANGED",
);
const before = JSON.parse(git("show", baseline + ":package.json")),
  after = JSON.parse(fs.readFileSync("package.json"));
const allowedScripts = [
  "test",
  "qa:browser:smoke",
  "test:baseline:inventory",
  "test:baseline:lane",
];
for (const name of allowedScripts) {
  delete before.scripts[name];
  delete after.scripts[name];
}
assert.deepEqual(after, before, "DEPENDENCY_OR_EXISTING_SCRIPT_CHANGED");
const normalizeWbs = (s) =>
  s
    .replace(/\r\n/g, "\n")
    .replace(/^## TASK-035-A[^\n]*\n[\s\S]*?(?=^## |$(?![\s\S]))/gm, "")
    .replace(/^\| (?:9\.1\s|TASK-035-A\s).*\n/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
assert.equal(
  normalizeWbs(fs.readFileSync("docs/project/WBS-TravelAssist.md", "utf8")),
  normalizeWbs(git("show", baseline + ":docs/project/WBS-TravelAssist.md")),
  "UNRELATED_WBS_CHANGED",
);
const result = {
  schemaVersion: 1,
  status: "PASS",
  baseline,
  scope:
    "Working tree compared with exact develop; Git merges include its accepted data unchanged",
  changedFiles: changed,
  phase1Immutable: true,
  originalTaskResultBrowserImmutable: true,
  dependenciesAndExistingScriptsPreserved: true,
  otherWbsUnchanged: true,
  protectedChanges: [],
  fileHashes: Object.fromEntries(
    changed
      .filter((p) => p !== "docs/qa/TASK-035/phase-2/scope-validation.json")
      .map((p) => [
        p,
        createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
      ]),
  ),
};
fs.writeFileSync(
  "docs/qa/TASK-035/phase-2/scope-validation.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({ status: result.status, changedFiles: changed.length }),
);
