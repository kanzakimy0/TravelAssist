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
  isAssertionScript,
} from "../tools/qa/task-035-inventory.mjs";
import { selection } from "../tools/qa/task-035-baseline.mjs";
import {
  verifyEvents,
  aggregate,
  expectedHead,
  verifyArtifacts,
  verifyReceiptShape,
  verifyReceiptCounts,
  aggregateDirectory,
  context,
} from "../tools/qa/task-035-receipt.mjs";
import {
  execute,
  testEnvironment,
  resolveCommand,
} from "../tools/qa/task-035-process.mjs";
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
  const snapshot = (base) => {
    const directory = path.join(base, ".artifacts");
    return fs.existsSync(directory) ? fs.readdirSync(directory).sort() : null;
  };
  const before = snapshot(root);
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import './tools/qa/task-086-regression-lanes.mjs'",
    ],
    { cwd: root },
  );
  assert.deepEqual(snapshot(root), before);
  // A disposable checkout-shaped mirror proves both absent and existing states.
  fs.mkdirSync(path.join(dir, "tools/qa"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tests"));
  fs.copyFileSync(
    path.join(root, "tools/qa/task-086-regression-lanes.mjs"),
    path.join(dir, "tools/qa/task-086-regression-lanes.mjs"),
  );
  fs.writeFileSync(
    path.join(dir, "tests/never.test.mjs"),
    "throw Error('selector imported target')",
  );
  for (const exists of [false, true]) {
    if (exists) {
      fs.mkdirSync(path.join(dir, ".artifacts"));
      fs.writeFileSync(path.join(dir, ".artifacts/sentinel"), "unchanged");
    }
    const initial = snapshot(dir);
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {regressionInventory} from './tools/qa/task-086-regression-lanes.mjs'; regressionInventory();",
      ],
      { cwd: dir },
    );
    assert.deepEqual(snapshot(dir), initial);
    if (exists)
      assert.equal(
        fs.readFileSync(path.join(dir, ".artifacts/sentinel"), "utf8"),
        "unchanged",
      );
  }
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

async function eventFixture(dir, files, cwd = dir) {
  const events = path.join(dir, "fixture-events.jsonl");
  const result = await execute({
    command: process.execPath,
    args: [
      "--test",
      "--test-reporter=" +
        pathToFileURL(path.join(root, "tools/qa/task-035-reporter.mjs")).href,
      "--test-reporter-destination=" + events,
      ...files,
    ],
    cwd,
    env: testEnvironment(),
    timeoutMs: 30000,
    logPath: path.join(dir, "fixture.log"),
  });
  return { result, text: fs.readFileSync(events, "utf8") };
}

test("reviewed real assertion script and suite/nested models compose without counting TAP", async (t) => {
  const dir = scratch(t);
  const suite = path.join(dir, "suite.mjs");
  fs.writeFileSync(
    suite,
    "import{describe,it,test}from'node:test';describe('suite',()=>{it('one',()=>{});describe('inner',()=>{it('two',()=>{});});});test('parent',async t=>{console.log('# tests 9999');await t.test('child',()=>{});});",
  );
  const files = ["tests/task-086-rights-binding.test.mjs", suite];
  const { result, text } = await eventFixture(dir, files, root);
  assert.equal(result.exitCode, 0);
  assert.equal(result.error, null);
  const counts = verifyEvents(text, files, root);
  assert.deepEqual(
    [counts.tests, counts.passed, counts.suites, counts.topLevel],
    [5, 5, 2, 3],
  );
  const linux = "/synthetic/checkout";
  const portable = encodeEvents(
    text
      .trim()
      .split("\n")
      .map(JSON.parse)
      .map((event) =>
        event.file
          ? {
              ...event,
              file:
                linux +
                "/" +
                (event.file.endsWith("task-086-rights-binding.test.mjs")
                  ? files[0]
                  : "suite.mjs"),
            }
          : event,
      ),
  );
  assert.equal(verifyEvents(portable, [files[0], "suite.mjs"], linux).tests, 5);
});

test("unreviewed zero-registration files and failing top-level assertions fail closed", async (t) => {
  for (const [name, source] of [
    ["empty", "import {after} from 'node:test';after(()=>{});"],
    [
      "throw",
      "import {after} from 'node:test';import assert from 'node:assert/strict';after(()=>{});assert.equal(1,2);",
    ],
    [
      "unknown-assert",
      "import {after} from 'node:test';import assert from 'node:assert/strict';after(()=>{});assert.equal(1,1);",
    ],
  ]) {
    const dir = scratch(t),
      file = path.join(dir, name + ".mjs");
    fs.writeFileSync(file, source);
    const { result, text } = await eventFixture(dir, [file]);
    if (name === "throw") assert.notEqual(result.exitCode, 0);
    else assert.equal(result.exitCode, 0);
    assert.throws(
      () => verifyEvents(text, [file], dir),
      /ZERO_TESTS|TEST_FAILURE|SUCCESS_COUNT_MISMATCH|EXECUTED_FILE_SET_MISMATCH/,
    );
  }
});

const passingCounts = () => ({
  tests: 1,
  passed: 1,
  failed: 0,
  cancelled: 0,
  skipped: 0,
  todo: 0,
  topLevel: 1,
  suites: 0,
});
const encodeEvents = (events) =>
  events.map((event) => JSON.stringify(event)).join("\n") + "\n";

test("every count is required/nonnegative/integer and final/file/receipt invariants hold", () => {
  const file = path.join(root, "synthetic-registered.mjs");
  const original = [
    { type: "test:summary", file, success: true, counts: passingCounts() },
    { type: "test:summary", success: true, counts: passingCounts() },
  ];
  const valid = encodeEvents(original);
  const counts = verifyEvents(valid, [file], root);
  const receipt = { files: [{ path: file }], cwd: root, counts };
  verifyReceiptCounts(valid, receipt);
  for (const key of Object.keys(passingCounts())) {
    for (const bad of [
      undefined,
      -1,
      0.5,
      "1",
      null,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      for (const index of [0, 1]) {
        const events = structuredClone(original);
        events[index].counts[key] = bad;
        assert.throws(
          () => verifyEvents(encodeEvents(events), [file], root),
          /INVALID_COUNT/,
        );
      }
    }
  }
  for (const change of [
    (events) => {
      events[0].counts.passed = 2;
    },
    (events) => {
      events[0].counts.failed = 1;
      events[0].counts.passed = 0;
    },
    (events) => {
      events[0].counts.cancelled = 1;
      events[0].counts.passed = 0;
    },
    (events) => {
      events[0].success = false;
    },
    (events) => {
      events[1].counts.tests = 999;
      events[1].counts.passed = 999;
    },
    (events) => {
      events[1].counts.suites = 1;
    },
  ]) {
    const events = structuredClone(original);
    change(events);
    assert.throws(
      () => verifyEvents(encodeEvents(events), [file], root),
      /COUNT.*MISMATCH/,
    );
  }
  assert.throws(
    () =>
      verifyReceiptCounts(valid, {
        ...receipt,
        counts: { ...counts, tests: 999, passed: 999 },
      }),
    /COUNT_MISMATCH/,
  );
});

test("full aggregateDirectory rejects hash-consistent malicious summaries and receipt counts", (t) => {
  const directory = scratch(t),
    current = context(),
    selected = checkInventory();
  const lanes = [
    ...Object.keys(selected.lanes),
    "ordinary",
    "graph-first",
    "graph-second",
    "extraction",
    "resume",
    "quality",
  ];
  for (const lane of lanes) {
    const dir = path.join(directory, lane);
    fs.mkdirSync(dir);
    const r = {
      ...current,
      trackedWorktreeClean: true,
      lane,
      status: "PASS",
      commands: [["node", "synthetic"]],
      executions: [{ argv: ["node", "synthetic"], exitCode: 0 }],
      logSha256: hash("synthetic fixture only"),
      cwd: root,
    };
    fs.writeFileSync(path.join(dir, "execution.log"), "synthetic fixture only");
    if (lane === "ordinary" || selected.lanes[lane]) {
      r.files = selected.entries
        .filter(
          (e) => lane === "ordinary" || selected.lanes[lane].includes(e.path),
        )
        .map(({ path, sha256 }) => ({ path, sha256 }));
      const events = r.files.map(({ path: file }) => ({
        type: "test:summary",
        file: path.join(root, file),
        success: true,
        counts: isAssertionScript(file)
          ? Object.fromEntries(
              Object.keys(passingCounts()).map((key) => [key, 0]),
            )
          : passingCounts(),
      }));
      events.push({
        type: "test:summary",
        success: true,
        counts: {
          ...passingCounts(),
          tests: r.files.length,
          passed: r.files.length,
          topLevel: r.files.length,
        },
      });
      const text = encodeEvents(events);
      r.counts = verifyEvents(
        text,
        r.files.map((e) => e.path),
        root,
      );
      r.countStatus = "VERIFIED";
      r.eventsSha256 = hash(text);
      fs.writeFileSync(path.join(dir, "events.jsonl"), text);
    } else if (lane === "quality") {
      r.commands = [
        ...[
          "deploy:validate:local",
          "lint",
          "typecheck",
          "format:check:deploy",
          "deploy:build:local",
          "deploy:verify-artifact",
        ].map((script) => ["npm", "run", script]),
        ["git", "diff", "--check"],
      ];
      r.executions = r.commands.map((argv) => ({ argv, exitCode: 0 }));
    } else {
      const native = JSON.stringify({ status: "PASS", binding: current });
      r.nativeReceiptSha256 = hash(native);
      fs.writeFileSync(path.join(dir, "native-proof.json"), native);
    }
    fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(r));
  }
  assert.equal(aggregateDirectory(directory).status, "PASS");
  const receiptFile = path.join(directory, "assets/receipt.json"),
    eventFile = path.join(directory, "assets/events.jsonl");
  const original = JSON.parse(fs.readFileSync(receiptFile)),
    text = fs.readFileSync(eventFile, "utf8");
  for (const mutation of ["missing", "negative", "final999", "receipt999"]) {
    const r = structuredClone(original),
      events = text.trim().split("\n").map(JSON.parse);
    if (mutation === "missing") delete events[0].counts.passed;
    if (mutation === "negative") events[0].counts.passed = -7;
    if (mutation === "final999") {
      events.at(-1).counts.tests = 999;
      events.at(-1).counts.passed = 999;
      r.counts.tests = 999;
      r.counts.passed = 999;
    }
    if (mutation === "receipt999") {
      r.counts.tests = 999;
      r.counts.passed = 999;
    }
    const changed = encodeEvents(events);
    r.eventsSha256 = hash(changed);
    fs.writeFileSync(eventFile, changed);
    fs.writeFileSync(receiptFile, JSON.stringify(r));
    assert.throws(
      () => aggregateDirectory(directory),
      /INVALID_COUNT|FINAL_COUNT_MISMATCH|COUNT_MISMATCH/,
    );
  }
});

test("Windows npm CLI resolution keeps argv literal; POSIX retains direct spawn", async (t) => {
  const dir = scratch(t),
    spaced = path.join(dir, "cwd with spaces & literal");
  fs.mkdirSync(spaced);
  const cli = path.join(spaced, "node_modules/npm/bin/npm-cli.js");
  fs.mkdirSync(path.dirname(cli), { recursive: true });
  fs.writeFileSync(
    cli,
    "process.stdout.write(JSON.stringify(process.argv.slice(2)))",
  );
  const args = [
    "two words",
    "& echo injected",
    "%PATH%",
    "$(echo injected)",
    'a"b',
    "|",
    "^",
    "trailing\\",
  ];
  const launch = resolveCommand("npm", args, {
    platform: "win32",
    execPath: path.join(spaced, "node.exe"),
    env: { PATH: "" },
  });
  assert.deepEqual(launch.args, [fs.realpathSync(cli), ...args]);
  assert.equal(launch.npmCliSha256, hash(fs.readFileSync(cli)));
  const log = path.join(dir, "shim.log");
  const result = await execute({
    command: process.execPath,
    args: launch.args,
    cwd: spaced,
    env: testEnvironment(),
    timeoutMs: 10000,
    logPath: log,
  });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(log)), args);
  assert.deepEqual(resolveCommand("npm", args, { platform: "linux" }), {
    command: "npm",
    args,
    npmCliSha256: null,
  });
  assert.throws(
    () =>
      resolveCommand("npm", [], {
        platform: "win32",
        execPath: path.join(dir, "absent/node.exe"),
        env: { PATH: "" },
      }),
    /NPM_CLI_NOT_FOUND/,
  );
});

test("real npm run succeeds and propagates nonzero/timeout in a spaced cwd", async (t) => {
  const dir = scratch(t),
    cwd = path.join(dir, "npm project with spaces");
  fs.mkdirSync(cwd);
  fs.writeFileSync(
    path.join(cwd, "package.json"),
    JSON.stringify({
      private: true,
      scripts: {
        ok: "node ok.cjs",
        fail: 'node -e "process.exit(7)"',
        wait: 'node -e "setInterval(()=>{},1000)"',
      },
    }),
  );
  fs.writeFileSync(
    path.join(cwd, "ok.cjs"),
    "require('node:fs').writeFileSync('argv.json', JSON.stringify(process.argv.slice(2)))",
  );
  const run = (name, args = [], timeoutMs = 15000) =>
    execute({
      command: "npm",
      args: ["run", name, "--", ...args],
      cwd,
      env: testEnvironment(),
      timeoutMs,
      logPath: path.join(dir, name + ".log"),
    });
  const args = ["two words", "literal&value"];
  const ok = await run("ok", args);
  assert.equal(ok.exitCode, 0);
  assert.equal(ok.error, null);
  assert.deepEqual(ok.argv, ["npm", "run", "ok", "--", ...args]);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(cwd, "argv.json"))),
    args,
  );
  if (process.platform === "win32") {
    assert.equal(ok.spawnArgv[0], process.execPath);
    assert.match(ok.spawnArgv[1], /npm-cli\.js$/);
    assert.match(ok.npmCliSha256, /^[a-f0-9]{64}$/);
  }
  const failed = await run("fail");
  assert.equal(failed.exitCode, 7);
  assert.equal(failed.error, null);
  assert.equal(failed.timeout, false);
  const timed = await run("wait", [], 1000);
  assert.equal(timed.timeout, true);
  assert.notEqual(timed.exitCode, 0);
});
