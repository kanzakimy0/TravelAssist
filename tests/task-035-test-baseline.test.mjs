import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const qualityGate = readFileSync(".github/workflows/quality-gate.yml", "utf8");
const baseline = readFileSync("docs/qa/test-baseline.md", "utf8");

test("repository test entry uses the existing Node harness and TypeScript resolver", () => {
  assert.equal(
    packageJson.scripts.test,
    'node --import ./tests/register-planner-ts.mjs --test "tests/*.test.mjs"',
  );
  assert.equal(packageJson.devDependencies.playwright, undefined);
  assert.equal(packageJson.devDependencies.vitest, undefined);
  assert.equal(packageJson.devDependencies.jest, undefined);
  assert.equal(packageJson.scripts.typecheck, "next typegen && tsc --noEmit");
  assert.equal(
    packageJson.scripts["qa:browser:smoke"],
    "node tools/qa/task-035-browser-smoke.mjs",
  );
});

test("quality gate invokes the canonical repository test entry", () => {
  assert.match(qualityGate, /- name: Run repository tests\s+run: npm test/);
  assert.doesNotMatch(
    qualityGate,
    /run: node --test ["']tests\/\*\.test\.mjs["']/,
  );
});

test("baseline documents every required execution class and non-pass state", () => {
  for (const heading of [
    "Unit and model",
    "Contract",
    "Integration",
    "Local DB / Auth runtime",
    "Browser / E2E",
    "Live provider / external",
    "Deferred taxonomy",
    "Flaky-test policy",
  ]) {
    assert.match(baseline, new RegExp(heading.replace("/", "\\/"), "i"));
  }
  assert.match(baseline, /DEFERRED_ENVIRONMENT/);
  assert.match(baseline, /QUARANTINED_FLAKY/);
  assert.match(baseline, /never (?:silently )?skip/i);
});
