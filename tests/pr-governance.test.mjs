import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const workflowDirectory = ".github/workflows";
const workflows = readdirSync(workflowDirectory)
  .filter((file) => /\.ya?ml$/.test(file))
  .map((file) => ({
    file,
    source: readFileSync(`${workflowDirectory}/${file}`, "utf8"),
  }));

function auditWorkflows(entries) {
  const failures = [];
  for (const { file, source } of entries) {
    if (
      /\bgh\s+pr\s+merge\b|enablePullRequestAutoMerge|\/pulls\/[^\s"']+\/merge\b/i.test(
        source,
      )
    ) {
      failures.push(`${file}: automatic merge path`);
    }

    if (
      !/feature\/\*\*/.test(source) ||
      !/\bgh\s+pr\s+create\b|create-pull-request@/i.test(source)
    ) {
      continue;
    }

    const ghCreateCalls = [
      ...source.matchAll(/\bgh\s+pr\s+create\b((?:[^\n]*\\\r?\n)*[^\n]*)/g),
    ];
    for (const call of ghCreateCalls) {
      if (!/--draft\b/.test(call[1])) {
        failures.push(`${file}: feature PR creation is not Draft`);
      }
    }

    if (
      /create-pull-request@/i.test(source) &&
      !/\bdraft:\s*true\b/.test(source)
    ) {
      failures.push(`${file}: create-pull-request is not Draft`);
    }
  }
  return failures;
}

test("every workflow forbids automatic merge and feature PRs are Draft", () => {
  assert.ok(workflows.some(({ file }) => file === "auto-create-pr.yml"));
  assert.deepEqual(auditWorkflows(workflows), []);
  assert.ok(!workflows.some(({ file }) => file === "auto-merge.yml"));
});

test("governance audit rejects the former direct and non-Draft merge patterns", () => {
  assert.deepEqual(
    auditWorkflows([
      {
        file: "unsafe-feature.yml",
        source:
          "on:\n  push:\n    branches:\n      - feature/**\nrun: |\n  gh pr create \\\n    --base develop\n  gh pr merge 123 --merge\n",
      },
    ]),
    [
      "unsafe-feature.yml: automatic merge path",
      "unsafe-feature.yml: feature PR creation is not Draft",
    ],
  );
  assert.deepEqual(
    auditWorkflows([
      {
        file: "unsafe-global.yml",
        source:
          "run: |\n  gh pr list --json isDraft --jq '.[] | select(.isDraft == false)' | gh pr merge --merge\n",
      },
    ]),
    ["unsafe-global.yml: automatic merge path"],
  );
});

test("Quality gate retains PR and develop triggers and its verification steps", () => {
  const quality = workflows.find(
    ({ file }) => file === "quality-gate.yml",
  )?.source;
  assert.ok(quality);
  assert.match(quality, /pull_request:/);
  assert.match(quality, /push:\s*\n\s*branches: \[develop\]/);
  assert.match(quality, /permissions:\s*\n\s*contents: read/);
  for (const command of [
    "npm ci",
    "npm run deploy:validate:local",
    "npm run lint",
    "npm run typecheck",
    "npm run format:check:deploy",
    "npm run deploy:build:local",
    "npm run deploy:verify-artifact",
    "git diff --check",
  ]) {
    assert.ok(
      quality.includes(command),
      `Missing Quality gate step: ${command}`,
    );
  }
});
