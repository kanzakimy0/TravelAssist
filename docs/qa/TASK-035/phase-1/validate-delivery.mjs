// Validate only Phase 1 documents, fixed Git metadata and audit JSON.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const start = "4fbbe4a12626b41ddcad15cc9ebf9440698192fc";
const develop = "4888b4d507ee75d4f6b9914eb1a8d5661813f64b";
const legacy = "f157f23ba1b93def006c2703ea8f42dcd9266c01";
const qa = "docs/qa/TASK-035/phase-1/";
const task = "docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase1-audit-only.md";
const result = "docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase1-audit-only.md";
const wbs = "docs/project/WBS-TravelAssist.md";
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const inventoryBytes = read(qa + "test-inventory.json");
const coverageBytes = read(qa + "ci-coverage-map.json");
const inventory = JSON.parse(inventoryBytes);
const coverage = JSON.parse(coverageBytes);
const validation = JSON.parse(read(qa + "audit-validation.json"));
assert.equal(
  hash(inventoryBytes),
  validation.auditValidation.generatedInventorySha256,
);
assert.equal(
  hash(coverageBytes),
  validation.auditValidation.generatedCoverageSha256,
);
const expectedTop = git("ls-tree", "-r", "--name-only", develop, "tests")
  .trim()
  .split("\n")
  .filter((p) => /^tests\/[^/]+\.test\.mjs$/.test(p))
  .sort();
assert.deepEqual(coverage.selector.files, expectedTop);
assert.deepEqual(
  Object.values(coverage.selector.lanes).flat().sort(),
  expectedTop,
);
assert.equal(
  new Set(inventory.entries.map((x) => x.path)).size,
  inventory.entries.length,
);
assert.equal(inventory.entries.length, inventory.summary.candidateFiles);
assert.ok(
  inventory.entries.every(
    (x) => x.executionStatus === "NOT_EXECUTED" && x.executedCases === null,
  ),
);
assert.equal(validation.businessTestsExecution.status, "NOT_EXECUTED");
assert.equal(git("rev-parse", "origin/develop").trim(), develop);
assert.equal(git("rev-parse", "origin/pr-272-audit-head").trim(), legacy);
assert.equal(
  git("rev-parse", "origin/codex/a-test-baseline-freeze").trim(),
  legacy,
);
assert.equal(
  git("branch", "--show-current").trim(),
  "docs/b-wbs-9-1-phase1-audit-20261006",
);
const oldWbs = git("show", start + ":" + wbs).replaceAll("\r\n", "\n");
const currentWbs = read(wbs).replaceAll("\r\n", "\n");
const oldRow = oldWbs.split("\n").find((x) => /^\| 9\.1\s+\|/.test(x));
const currentRow = currentWbs.split("\n").find((x) => /^\| 9\.1\s+\|/.test(x));
assert.ok(
  currentRow.includes("| A      |") &&
    currentRow.includes("进行中") &&
    !currentRow.includes("已完成"),
);
const withoutSection = currentWbs.replace(
  /\n## TASK-035-A \/ WBS 9\.1 Phase 1 审计追踪（2026-10-06）\n[\s\S]*?(?=\n## )/,
  "",
);
assert.equal(
  withoutSection.replace(currentRow, oldRow),
  oldWbs,
  "WBS changes extend beyond 9.1 tracking",
);
const changed = git("diff", "--name-only", start)
  .trim()
  .split("\n")
  .filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard")
  .trim()
  .split("\n")
  .filter(Boolean);
const paths = [
  ...new Set([...changed, ...untracked, qa + "scope-validation.json"]),
].sort();
const allowed = (p) => p.startsWith(qa) || [task, result, wbs].includes(p);
const forbidden = paths.filter((p) => !allowed(p));
assert.deepEqual(forbidden, [], "Out-of-scope changed/untracked path");
const required = [
  "README.md",
  "test-inventory.json",
  "ci-coverage-map.json",
  "legacy-pr-reuse-review.md",
  "audit-validation.json",
  "next-phase-recommendation.md",
  "inventory-audit.mjs",
  "source-observations.json",
  "validate-delivery.mjs",
]
  .map((x) => qa + x)
  .concat(task, result, wbs);
assert.ok(required.every((p) => existsSync(resolve(root, p))));
const localLinks = [];
for (const p of required.filter((x) => x.endsWith(".md"))) {
  for (const m of read(p).matchAll(/\]\(([^)]+)\)/g)) {
    if (
      /^(?:https?:|#)/.test(m[1]) ||
      (!m[1].startsWith(".") && m[1].includes(":"))
    )
      continue;
    const target = resolve(dirname(resolve(root, p)), m[1].split("#")[0]);
    assert.ok(
      existsSync(target),
      "Missing document link in " + p + ": " + m[1],
    );
    localLinks.push({
      from: p,
      target: target.slice(root.length + 1).replaceAll("\\", "/"),
    });
  }
}
git("diff", "--check");
const receipt = {
  schemaVersion: "1.0.0",
  status: "PASS",
  validationScope:
    "audit deliverable content/path checks only; not business/CI execution",
  taskPublicationSha: start,
  auditedDevelopSha: develop,
  legacyPrHeadSha: legacy,
  generatorSha256: hash(read(qa + "inventory-audit.mjs")),
  deliveryValidatorSha256: hash(read(qa + "validate-delivery.mjs")),
  inventoryHashMatches: true,
  coverageHashMatches: true,
  independentGitTopLevelSelectionMatches: true,
  allCandidatesUniqueAndNotExecuted: true,
  changedOrNewPaths: paths,
  protectedChangedPaths: forbidden,
  protectedFileChangeCount: 0,
  wbsOnly91SectionAndRowChanged: true,
  canonicalOwnerAUnchanged: true,
  originalRemoteTrackingHeadUnchanged: true,
  requiredFilesExist: true,
  localDocumentLinksValidated: localLinks.length,
  diffWhitespaceCheck: "PASS",
  publicationCommit: null,
  publicationNote:
    "Final SHA and live remote comparison go in external #265/#272 receipt after normal push; this file is not a self-referential commit attestation.",
};
writeFileSync(
  resolve(here, "scope-validation.json"),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));
