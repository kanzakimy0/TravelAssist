import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import {
  root,
  discover,
  validatePartition,
  checkInventory,
  hash,
} from "../tools/qa/task-035-inventory.mjs";
import { selection } from "../tools/qa/task-035-baseline.mjs";
import {
  verifyEvents,
  aggregate,
  expectedHead,
  verifyArtifacts,
  verifyReceiptShape,
} from "../tools/qa/task-035-receipt.mjs";
import { execute, testEnvironment } from "../tools/qa/task-035-process.mjs";
import { classifyCiRevision } from "../tools/qa/ci-revision.mjs";

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task035-synthetic-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test("read-only selector is deterministic and imports no targets", (t) => {
  const a = checkInventory(),
    b = checkInventory();
  assert.deepEqual(a, b);
  const dir = scratch(t);
  fs.writeFileSync(
    path.join(dir, "z.test.mjs"),
    "throw Error('must never import')",
  );
  assert.deepEqual(discover(dir), ["z.test.mjs"]);
  fs.writeFileSync(path.join(dir, "a.test.mjs"), "throw Error('new target')");
  assert.deepEqual(discover(dir), ["a.test.mjs", "z.test.mjs"]);
  const before = fs.readdirSync(path.join(root, ".artifacts"));
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import './tools/qa/task-086-regression-lanes.mjs'",
    ],
    { cwd: root },
  );
  assert.deepEqual(fs.readdirSync(path.join(root, ".artifacts")), before);
  assert.deepEqual(
    selection(a, "ordinary"),
    Object.values(a.lanes).flat().sort(),
  );
  assert.equal(a.lanes.rebuild[0], "tests/task-086-b-rebuild.test.mjs");
  assert.throws(() => selection(a, "quick"), /UNKNOWN/);
  assert.throws(() => selection({ lanes: { x: [] } }, "x"), /EMPTY/);
  assert.throws(() => validatePartition([], {}), /EMPTY/);
  assert.throws(
    () => validatePartition(["a"], { x: ["a"], y: ["a"] }),
    /DUPLICATE/,
  );
  assert.throws(() => validatePartition(["a", "b"], { x: ["a"] }), /OMITTED/);
});
test("real runner events prove nested tests without counting child TAP", async (t) => {
  const dir = scratch(t);
  const source = path.join(dir, "nested.mjs"),
    events = path.join(dir, "events.jsonl");
  fs.writeFileSync(
    source,
    "import test from 'node:test';test('parent',async t=>{console.log('# tests 9999');await t.test('child',()=>{});});",
  );
  const result = await execute({
    command: process.execPath,
    args: [
      "--test",
      "--test-reporter=" +
        pathToFileURL(path.join(root, "tools/qa/task-035-reporter.mjs")).href,
      "--test-reporter-destination=" + events,
      source,
    ],
    cwd: dir,
    env: testEnvironment(),
    timeoutMs: 10000,
    logPath: path.join(dir, "log"),
  });
  assert.equal(result.exitCode, 0);
  const counts = verifyEvents(fs.readFileSync(events, "utf8"), [source], dir);
  assert.equal(counts.tests, 2);
  assert.equal(counts.passed, 2);
  assert.throws(
    () => verifyEvents(fs.readFileSync(events, "utf8"), ["missing.mjs"], dir),
    /FILE_SET/,
  );
});
test("process failure, timeout, signal and spawn errors stay failures", async (t) => {
  const dir = scratch(t);
  let i = 0;
  const run = (args, command = process.execPath, timeoutMs = 10000) =>
    execute({
      command,
      args,
      cwd: dir,
      env: testEnvironment(),
      timeoutMs,
      logPath: path.join(dir, String(i++)),
    });
  assert.equal((await run(["-e", "process.exit(7)"])).exitCode, 7);
  const timed = await run(
    ["-e", "setInterval(()=>{},1000)"],
    process.execPath,
    150,
  );
  assert.equal(timed.timeout, true);
  assert.notEqual(timed.exitCode, 0);
  const signalled = await run(["-e", "process.kill(process.pid,'SIGTERM')"]);
  assert.ok(signalled.signal || signalled.exitCode !== 0);
  assert.equal(
    (await run([], path.join(dir, "missing-executable"))).error,
    "ENOENT",
  );
});
test("zero tests, skipped tests, absent/malformed summaries cannot pass", async (t) => {
  const dir = scratch(t);
  for (const [name, code] of [
    ["zero", ""],
    ["skip", "import test from 'node:test';test.skip('required',()=>{})"],
  ]) {
    const file = path.join(dir, name + ".mjs"),
      events = path.join(dir, name + ".jsonl");
    fs.writeFileSync(file, code);
    await execute({
      command: process.execPath,
      args: [
        "--test",
        "--test-reporter=" +
          pathToFileURL(path.join(root, "tools/qa/task-035-reporter.mjs")).href,
        "--test-reporter-destination=" + events,
        file,
      ],
      cwd: dir,
      env: testEnvironment(),
      timeoutMs: 10000,
      logPath: path.join(dir, name + ".log"),
    });
    assert.throws(
      () => verifyEvents(fs.readFileSync(events, "utf8"), [file], dir),
      /ZERO_TESTS|UNEXPECTED_SKIPPED|FILE_SET/,
    );
  }
  assert.throws(() => verifyEvents("", ["a"], dir), /SUMMARY/);
  assert.throws(() => verifyEvents("{}", ["a"], dir), /SUMMARY/);
});
test("aggregation rejects missing, duplicate, failed and cross-bound receipts", () => {
  const binding = {
    checkoutSha: "a".repeat(40),
    runId: "123",
    runAttempt: "2",
    inputDigest: hash("config"),
    inventoryHash: hash("inventory"),
    trackedWorktreeClean: true,
  };
  const receipts = ["a", "b"].map((lane) => ({
    ...binding,
    lane,
    status: "PASS",
  }));
  assert.equal(aggregate(receipts, ["a", "b"], binding).status, "PASS");
  assert.throws(
    () => aggregate(receipts.slice(1), ["a", "b"], binding),
    /MISSING/,
  );
  assert.throws(
    () => aggregate([...receipts, receipts[0]], ["a", "b"], binding),
    /DUPLICATE/,
  );
  for (const key of [
    "checkoutSha",
    "runId",
    "runAttempt",
    "inputDigest",
    "inventoryHash",
  ])
    assert.throws(
      () =>
        aggregate(
          [{ ...receipts[0], [key]: "wrong" }, receipts[1]],
          ["a", "b"],
          binding,
        ),
      /BINDING/,
    );
  assert.throws(
    () =>
      aggregate(
        [{ ...receipts[0], status: "FAIL" }, receipts[1]],
        ["a", "b"],
        binding,
      ),
    /FAILED/,
  );
});
test("expectedHead is checked and production credentials are excluded", () => {
  expectedHead("", "a".repeat(40));
  assert.throws(() => expectedHead("short", "a".repeat(40)), /INVALID/);
  assert.throws(() => expectedHead("b".repeat(40), "a".repeat(40)), /MISMATCH/);
  assert.throws(
    () =>
      classifyCiRevision({
        checkoutSha: "a".repeat(40),
        eventSha: "a".repeat(40),
        expectedHead: "bad",
      }),
    /EXPECTED_HEAD_INVALID/,
  );
  assert.deepEqual(
    testEnvironment({
      PATH: "tools",
      DATABASE_URL: "production",
      MAPBOX_TOKEN: "secret",
      TASK086_PUBLISH_VALIDATION: "1",
      NODE_OPTIONS: "inject",
    }),
    { PATH: "tools" },
  );
});
test("artifact validation rejects missing logs and altered log/event bytes", (t) => {
  const dir = scratch(t),
    record = { logSha256: hash("log"), eventsSha256: hash("events") };
  assert.throws(() => verifyArtifacts(dir, record), /ENOENT/);
  fs.writeFileSync(path.join(dir, "execution.log"), "wrong");
  assert.throws(() => verifyArtifacts(dir, record), /LOG_HASH/);
  fs.writeFileSync(path.join(dir, "execution.log"), "log");
  fs.writeFileSync(path.join(dir, "events.jsonl"), "wrong");
  assert.throws(() => verifyArtifacts(dir, record), /EVENT_HASH/);
  fs.writeFileSync(path.join(dir, "events.jsonl"), "events");
  verifyArtifacts(dir, record);
});
test("a forged PASS without execution, event or native proof is rejected", () => {
  const r = {
    schemaVersion: 1,
    protectedWorktreeClean: true,
    lane: "assets",
    status: "PASS",
    commands: [["node", "test"]],
    executions: [{ exitCode: 0, argv: ["node", "test"] }],
  };
  assert.throws(() => verifyReceiptShape(r), /MISSING_TEST_EVIDENCE/);
  assert.throws(
    () => verifyReceiptShape({ ...r, lane: "graph-first" }),
    /MISSING_NATIVE_PROOF/,
  );
  assert.throws(
    () => verifyReceiptShape({ ...r, executions: [{ exitCode: 7 }] }),
    /NONZERO/,
  );
  assert.throws(
    () => verifyReceiptShape({ ...r, executions: [] }),
    /INCOMPLETE/,
  );
});
test("event conditions preserve every TASK086 dependency and reachable ordinary receipts", () => {
  const workflow = yaml.load(
    fs.readFileSync(
      path.join(root, ".github/workflows/quality-gate.yml"),
      "utf8",
    ),
  );
  const jobs = workflow.jobs;
  const applies = (job, github, inputs = {}) =>
    Function(
      "github",
      "inputs",
      "always",
      "return " + job.if.replace(/^\$\{\{\s*|\s*\}\}$/g, ""),
    )(github, inputs, () => true);
  for (const github of [
    { ref: "refs/heads/develop", head_ref: "", event_name: "push" },
    {
      ref: "refs/pull/272/merge",
      head_ref: "feature/b-transport-node-mobility-backbone",
      event_name: "pull_request",
    },
  ]) {
    assert.equal(applies(jobs.verify, github), false);
    for (const id of [
      "regression",
      "graph",
      "extraction",
      "resume",
      "proof",
      "quality",
      "closeout-quality-gate",
    ])
      assert.equal(applies(jobs[id], github), true, id);
  }
  assert.deepEqual(jobs.proof.needs, ["graph", "extraction", "resume"]);
  assert.deepEqual(jobs["closeout-quality-gate"].needs, [
    "regression",
    "graph",
    "extraction",
    "resume",
    "proof",
    "quality",
  ]);
  assert.deepEqual(jobs.regression.strategy.matrix.lane, [
    "assets",
    "regression-0",
    "regression-1",
    "regression-2",
    "regression-3",
  ]);
  const ordinary = {
    ref: "refs/pull/1/merge",
    head_ref: "ordinary-feature",
    event_name: "pull_request",
  };
  assert.equal(applies(jobs.verify, ordinary), true);
  const upload = jobs.verify.steps.find((s) =>
    s.uses?.startsWith("actions/upload-artifact"),
  );
  assert.equal(upload.if, "always()");
  const aggregateStep = jobs["closeout-quality-gate"].steps.find((s) =>
    s.name?.includes("Fail closed"),
  );
  assert.match(aggregateStep.run, /all\(v\['result'\]=='success'/);
  for (const proof of [
    "fullDeterministicRebuild",
    "resumeChecksumSkip",
    "exceptionProofInputPreserved",
    "publishedArtifactComparison",
    "resumeCorruptionInvalidation",
  ])
    assert.ok(aggregateStep.run.includes(proof));
  assert.ok(
    jobs["closeout-quality-gate"].steps.some((s) =>
      s.run?.includes("task-035-receipt.mjs"),
    ),
  );
});
