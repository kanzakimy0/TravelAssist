import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, BASE, writeJson } from "../assets/asset-utils.mjs";
const prettier = resolve(ROOT, "node_modules/prettier/bin/prettier.cjs");
const full = spawnSync(
  process.execPath,
  [prettier, "--check", "**/*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}"],
  { cwd: ROOT, encoding: "utf8" },
);
const combined = full.stdout + full.stderr;
const warnings = [
  ...combined.matchAll(/\[warn\] (.+\.(?:md|mjs|json|ts|tsx|css))\r?\n/g),
].map((m) => m[1]);
const exceptions = warnings.map((path) => {
  const baseline = execFileSync("git", ["show", `${BASE}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const current = readFileSync(resolve(ROOT, path), "utf8");
  const check = spawnSync(
    process.execPath,
    [prettier, "--check", "--stdin-filepath", path],
    { cwd: ROOT, input: baseline, encoding: "utf8" },
  );
  return {
    path,
    unchangedFromBase:
      baseline.replaceAll("\r\n", "\n") === current.replaceAll("\r\n", "\n"),
    baselinePrettierExit: check.status,
  };
});
if (
  exceptions.some((e) => !e.unchangedFromBase || e.baselinePrettierExit !== 1)
)
  throw Error("Format exception is not an unchanged failing baseline");
const tests = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec", "tests/*.test.mjs"],
  { cwd: ROOT, encoding: "utf8" },
);
if (tests.status !== 0) throw Error(tests.stdout + tests.stderr);
writeJson("assets/design/asset-library/previews/validation-report.json", {
  task: "TASK-013-A",
  base: BASE,
  formatCheckExit: full.status,
  baselineFormatExceptions: exceptions,
  allNodeTestsExit: tests.status,
  testSummary: tests.stdout
    .split(/\r?\n/)
    .filter((line) => /ℹ (tests|pass|fail|skipped|cancelled|todo)/.test(line)),
  note: "npm ci/lint/typecheck/build/assets commands are separately recorded in Result. CI is intentionally skipped to prevent the existing automatic merge workflow; it is not counted as passed.",
});
console.log({
  format: full.status,
  unchangedBaselineExceptions: exceptions.length,
  tests: tests.stdout.match(/ℹ tests \d+/)?.[0],
});
