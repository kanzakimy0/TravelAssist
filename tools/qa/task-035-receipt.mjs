import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import {
  root,
  qa,
  hash,
  fileHash,
  readJson,
  checkInventory,
  inventoryPath,
  modelPath,
  isAssertionScript,
} from "./task-035-inventory.mjs";
import { classifyCiRevision } from "./ci-revision.mjs";
import { resolveCommand } from "./task-035-process.mjs";

export function expectedHead(expected, actual) {
  assert.ok(
    !expected || /^[a-f0-9]{40}$/.test(expected),
    "EXPECTED_HEAD_INVALID",
  );
  assert.ok(!expected || expected === actual, "EXPECTED_HEAD_MISMATCH");
}
const countKeys = [
  "tests",
  "passed",
  "failed",
  "cancelled",
  "skipped",
  "todo",
  "topLevel",
  "suites",
];
export function verifyCounts(counts) {
  for (const key of countKeys)
    assert.ok(
      Number.isSafeInteger(counts?.[key]) && counts[key] >= 0,
      `INVALID_COUNT:${key}`,
    );
  assert.equal(
    counts.tests,
    counts.passed +
      counts.failed +
      counts.cancelled +
      counts.skipped +
      counts.todo,
    "COUNT_TOTAL_MISMATCH",
  );
  assert.ok(
    counts.topLevel <= counts.tests + counts.suites,
    "COUNT_TOP_LEVEL_MISMATCH",
  );
}
export function verifyEvents(text, files, cwd) {
  assert.ok(files.length, "EMPTY_SELECTION");
  const events = text.trim().split("\n").filter(Boolean).map(JSON.parse);
  const summaries = events.filter((e) => e.type === "test:summary");
  const final = summaries.filter((e) => !e.file);
  assert.equal(final.length, 1, "MISSING_OR_DUPLICATE_FINAL_SUMMARY");
  const perFile = summaries.filter((e) => e.file);
  const paths = /^[a-z]:[\\/]|^\\\\/i.test(cwd) ? path.win32 : path.posix;
  const selected = files.map((f) => paths.resolve(cwd, f)).sort();
  assert.equal(
    new Set(selected).size,
    selected.length,
    "DUPLICATE_SELECTED_FILE",
  );
  assert.deepEqual(
    perFile.map((e) => paths.resolve(e.file)).sort(),
    selected,
    "EXECUTED_FILE_SET_MISMATCH",
  );
  for (const summary of [...perFile, ...final]) {
    verifyCounts(summary.counts);
    assert.equal(
      summary.success,
      summary.counts.failed === 0 && summary.counts.cancelled === 0,
      "SUCCESS_COUNT_MISMATCH",
    );
    assert.equal(summary.success, true, "TEST_FAILURE");
    for (const key of ["skipped", "todo", "cancelled", "failed"])
      assert.equal(summary.counts[key], 0, `UNEXPECTED_${key.toUpperCase()}`);
  }
  // Node v24 excludes suite containers from tests and includes nested tests once.
  // A reviewed zero-registration script contributes one synthetic file test only
  // to the final summary. Never infer that execution model from zero counts alone.
  const expected = Object.fromEntries(countKeys.map((key) => [key, 0]));
  for (const summary of perFile) {
    const file = paths
      .relative(cwd, paths.resolve(summary.file))
      .replaceAll("\\", "/");
    if (isAssertionScript(file)) {
      for (const key of countKeys)
        assert.equal(summary.counts[key], 0, "ASSERTION_SCRIPT_MODEL_DRIFT");
      expected.tests++;
      expected.passed++;
      expected.topLevel++;
    } else {
      assert.ok(summary.counts.tests > 0, "ZERO_TESTS");
      assert.ok(summary.counts.topLevel > 0, "MISSING_TOP_LEVEL_TEST");
      for (const key of countKeys) expected[key] += summary.counts[key];
    }
  }
  for (const key of countKeys)
    assert.equal(
      final[0].counts[key],
      expected[key],
      `FINAL_COUNT_MISMATCH:${key}`,
    );
  return {
    ...expected,
    definition:
      "Node v24 registered counts exclude suite containers and include nested tests once; each hash-reviewed top-level assertion script contributes one final file test. Child TAP/stdout is not added.",
  };
}
export function verifyReceiptCounts(text, receipt) {
  verifyCounts(receipt.counts);
  const counts = verifyEvents(
    text,
    receipt.files.map((e) => e.path),
    receipt.cwd,
  );
  assert.deepEqual(receipt.counts, counts, "COUNT_MISMATCH");
  return counts;
}
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
export function context(env = process.env) {
  const checkoutSha = git("rev-parse", "HEAD");
  expectedHead(env.EXPECTED_HEAD, checkoutSha);
  const event = env.GITHUB_EVENT_PATH ? readJson(env.GITHUB_EVENT_PATH) : {};
  const revision = classifyCiRevision({
    eventName: env.GITHUB_EVENT_NAME ?? "local",
    event,
    eventSha: env.GITHUB_SHA ?? checkoutSha,
    checkoutSha,
    checkoutParents: git("show", "-s", "--format=%P", "HEAD").split(" "),
    ref: env.GITHUB_REF,
  });
  if (env.GITHUB_SHA)
    assert.equal(env.GITHUB_SHA, checkoutSha, "EVENT_CHECKOUT_MISMATCH");
  const inputs = [
    "package-lock.json",
    "package.json",
    ".nvmrc",
    "tests/register-route-ts.mjs",
    "tests/register-planner-ts.mjs",
    ".github/workflows/quality-gate.yml",
    ".github/workflows/release-rehearsal.yml",
    `${qa}/execution-policy.json`,
    `${qa}/test-inventory.json`,
    modelPath,
    inventoryPath,
    ...fs
      .readdirSync(path.join(root, "tools/qa"))
      .filter((x) => x.startsWith("task-035-") && x.endsWith(".mjs"))
      .map((x) => `tools/qa/${x}`),
    "tools/qa/task-086-regression-lanes.mjs",
    "tools/qa/ci-revision.mjs",
  ];
  const hashes = Object.fromEntries(inputs.sort().map((p) => [p, fileHash(p)]));
  const protectedStatus = git(
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    "src",
    "data",
    "assets",
    "public",
    "supabase",
    "tools/transport",
    "package-lock.json",
    ".nvmrc",
  );
  assert.equal(protectedStatus, "", "PROTECTED_INPUT_OR_OUTPUT_CHANGED");
  return {
    schemaVersion: 1,
    mode: env.TASK035_MODE ?? "CANDIDATE",
    event: revision.eventName,
    revisionKind:
      revision.eventName === "pull_request" && !revision.directBranchHeadTest
        ? "PR_MERGE_RESULT"
        : "BRANCH_EXACT_HEAD",
    checkoutSha,
    prHeadSha: event.pull_request?.head?.sha ?? null,
    baseSha: revision.baseSha,
    eventSha: revision.eventSha,
    expectedHead: env.EXPECTED_HEAD || null,
    trackedWorktreeClean:
      git("status", "--porcelain", "--untracked-files=no") === "",
    inputHashes: hashes,
    protectedWorktreeClean: true,
    inputDigest: hash(JSON.stringify(hashes)),
    inventoryHash: fileHash(inventoryPath),
    runId: env.GITHUB_RUN_ID ?? "local",
    runAttempt: env.GITHUB_RUN_ATTEMPT ?? "1",
    job: env.GITHUB_JOB ?? "local",
    workflowUrl: env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : null,
  };
}
export function versions() {
  const python =
    process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
  const p = spawnSync(python, ["--version"], { encoding: "utf8" });
  const launch = resolveCommand("npm", ["--version"]);
  const npm = spawnSync(launch.command, launch.args, { encoding: "utf8" });
  assert.equal(p.status, 0, "PYTHON_UNAVAILABLE");
  assert.equal(npm.status, 0, "NPM_UNAVAILABLE");
  return {
    node: process.version,
    npm: npm.stdout.trim(),
    python: (p.stdout + p.stderr).trim(),
    pythonCommand: python,
    os: process.platform,
    arch: process.arch,
  };
}
export function aggregate(records, required, binding) {
  assert.equal(
    new Set(records.map((r) => r.lane)).size,
    records.length,
    "DUPLICATE_RECEIPT",
  );
  assert.deepEqual(
    records.map((r) => r.lane).sort(),
    [...required].sort(),
    "MISSING_OR_EXTRA_RECEIPT",
  );
  for (const r of records) {
    assert.equal(r.status, "PASS", `FAILED_RECEIPT:${r.lane}`);
    for (const key of [
      "checkoutSha",
      "runId",
      "runAttempt",
      "inputDigest",
      "inventoryHash",
    ])
      assert.equal(r[key], binding[key], `RECEIPT_BINDING:${key}`);
    assert.equal(r.trackedWorktreeClean, true, "DIRTY_HOSTED_INPUT");
  }
  return {
    ...binding,
    status: "PASS",
    required,
    receipts: records.map((r) => ({
      lane: r.lane,
      counts: r.counts,
      logSha256: r.logSha256,
    })),
  };
}
export function verifyArtifacts(directory, receipt) {
  assert.equal(
    hash(fs.readFileSync(path.join(directory, "execution.log"))),
    receipt.logSha256,
    "LOG_HASH_MISMATCH",
  );
  if (receipt.eventsSha256)
    assert.equal(
      hash(fs.readFileSync(path.join(directory, "events.jsonl"))),
      receipt.eventsSha256,
      "EVENT_HASH_MISMATCH",
    );
  if (receipt.nativeReceiptSha256) {
    const bytes = fs.readFileSync(path.join(directory, "native-proof.json"));
    assert.equal(
      hash(bytes),
      receipt.nativeReceiptSha256,
      "NATIVE_PROOF_HASH_MISMATCH",
    );
    const native = JSON.parse(bytes);
    assert.equal(native.status, "PASS", "NATIVE_PROOF_FAILED");
    for (const key of ["checkoutSha", "runId", "runAttempt"])
      assert.equal(
        native.binding[key],
        receipt[key],
        "NATIVE_BINDING_MISMATCH",
      );
  }
}
export function verifyReceiptShape(receipt) {
  assert.equal(receipt.schemaVersion, 1, "RECEIPT_SCHEMA");
  assert.equal(receipt.protectedWorktreeClean, true, "PROTECTED_INPUT_DIRTY");
  assert.ok(receipt.commands?.length, "MISSING_COMMANDS");
  assert.equal(
    receipt.executions?.length,
    receipt.commands.length,
    "INCOMPLETE_COMMANDS",
  );
  for (const [index, execution] of receipt.executions.entries()) {
    assert.equal(execution.exitCode, 0, "RECEIPT_NONZERO_EXIT");
    assert.ok(
      !execution.signal && !execution.timeout && !execution.error,
      "RECEIPT_PROCESS_FAILURE",
    );
    assert.deepEqual(
      execution.argv,
      receipt.commands[index],
      "COMMAND_MISMATCH",
    );
  }
  if (
    [
      "assets",
      "regression-0",
      "regression-1",
      "regression-2",
      "regression-3",
      "rebuild",
      "ordinary",
    ].includes(receipt.lane)
  ) {
    assert.ok(
      receipt.eventsSha256 && receipt.files?.length,
      "MISSING_TEST_EVIDENCE",
    );
    assert.equal(receipt.countStatus, "VERIFIED", "UNVERIFIED_COUNTS");
    verifyCounts(receipt.counts);
  } else if (
    ["graph-first", "graph-second", "extraction", "resume"].includes(
      receipt.lane,
    )
  )
    assert.ok(receipt.nativeReceiptSha256, "MISSING_NATIVE_PROOF");
  else if (receipt.lane === "quality")
    assert.deepEqual(
      receipt.commands,
      [
        ...[
          "deploy:validate:local",
          "lint",
          "typecheck",
          "format:check:deploy",
          "deploy:build:local",
          "deploy:verify-artifact",
        ].map((s) => ["npm", "run", s]),
        ["git", "diff", "--check"],
      ],
      "MISSING_QUALITY_GATE",
    );
  else assert.fail("UNKNOWN_RECEIPT_LANE");
}
export function aggregateDirectory(directory) {
  const current = context();
  const selected = checkInventory();
  const required = [
    ...Object.keys(selected.lanes),
    "ordinary",
    "graph-first",
    "graph-second",
    "extraction",
    "resume",
    "quality",
  ];
  const files = fs
    .readdirSync(directory, { recursive: true })
    .filter((f) => f.endsWith("receipt.json"));
  const records = files.map((f) => {
    const base = path.dirname(path.join(directory, f));
    const r = readJson(path.join(directory, f));
    verifyReceiptShape(r);
    verifyArtifacts(base, r);
    if (r.eventsSha256) {
      const events = fs.readFileSync(path.join(base, "events.jsonl"));
      assert.equal(hash(events), r.eventsSha256, "EVENT_HASH_MISMATCH");
      // Cross-host absolute paths use the recorded cwd to normalize the same file set.
      verifyReceiptCounts(events.toString(), r);
      assert.deepEqual(
        r.files,
        selected.entries
          .filter(
            (e) =>
              r.lane === "ordinary" || selected.lanes[r.lane]?.includes(e.path),
          )
          .map(({ path, sha256 }) => ({ path, sha256 })),
        "SELECTED_HASH_MISMATCH",
      );
    }
    return r;
  });
  return aggregate(records, required, current);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = aggregateDirectory(process.argv[2]);
  fs.writeFileSync(
    ".artifacts/ci/task-035-final-receipt.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: result.status,
      checkoutSha: result.checkoutSha,
      lanes: result.required,
    }),
  );
}
