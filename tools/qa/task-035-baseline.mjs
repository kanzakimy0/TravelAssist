import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  root,
  qa,
  hash,
  readJson,
  checkInventory,
} from "./task-035-inventory.mjs";
import { context, verifyEvents, versions } from "./task-035-receipt.mjs";
import { execute, testEnvironment } from "./task-035-process.mjs";

const graphJobs = {
  "graph-first": ["first", 2400000],
  "graph-second": ["second", 2400000],
  extraction: ["extract", 1200000],
  resume: ["resume", 2400000],
};
export function selection(inventory, lane) {
  const files =
    lane === "ordinary"
      ? inventory.entries.map((e) => e.path)
      : inventory.lanes[lane];
  assert.ok(files?.length, "UNKNOWN_OR_EMPTY_LANE");
  return files;
}
export async function run(lane = "ordinary", job = false) {
  const inventory = checkInventory();
  assert.ok(!job || lane === "quality" || graphJobs[lane], "UNKNOWN_JOB");
  const files = job ? [] : selection(inventory, lane);
  const binding = context();
  const runtime = versions();
  const directory = path.join(
    root,
    ".artifacts/task-035",
    binding.mode.toLowerCase(),
    binding.runId,
    binding.runAttempt,
    lane,
    randomUUID(),
  );
  fs.mkdirSync(directory, { recursive: true });
  const eventsFile = path.join(directory, "events.jsonl");
  const logPath = path.join(directory, "execution.log");
  const env = testEnvironment();
  // Publishing is never an execution mode of the baseline infrastructure.
  assert.ok(
    process.env.TASK086_PUBLISH_VALIDATION !== "1",
    "PUBLISH_FORBIDDEN",
  );
  let commands, timeoutMs;
  if (job && lane === "quality") {
    commands = [
      "deploy:validate:local",
      "lint",
      "typecheck",
      "format:check:deploy",
      "deploy:build:local",
      "deploy:verify-artifact",
    ].map((script) => ["npm", "run", script]);
    commands.push(["git", "diff", "--check"]);
    timeoutMs = 24 * 60000;
  } else if (job) {
    commands = [
      [
        process.execPath,
        "tools/transport/task-086-validation.mjs",
        graphJobs[lane][0],
        ".artifacts/task086-lanes",
      ],
    ];
    timeoutMs = graphJobs[lane][1];
  } else if (lane === "ordinary") {
    commands = [
      [
        process.execPath,
        "--import",
        "./tests/register-route-ts.mjs",
        "--test",
        "--test-concurrency=1",
        "--test-reporter=tap",
        "--test-reporter-destination=stdout",
        "--test-reporter=./tools/qa/task-035-reporter.mjs",
        "--test-reporter-destination=" + eventsFile,
        ...files,
      ],
    ];
    timeoutMs = 30 * 60000;
  } else {
    env.TASK035_EVENTS_FILE = eventsFile;
    env.TASK035_LANE_OUTPUT = path.join(directory, "legacy");
    commands = [
      [process.execPath, "tools/qa/task-086-regression-lanes.mjs", lane],
    ];
    timeoutMs = (lane === "rebuild" ? 15 : 25) * 60000 + 30000;
  }
  const executions = [];
  let nativeReceiptSha256 = null;
  let counts = null,
    validationError = null;
  const started = Date.now();
  for (const [command, ...args] of commands) {
    const result = await execute({
      command,
      args,
      cwd: root,
      env,
      timeoutMs: Math.max(1, timeoutMs - (Date.now() - started)),
      logPath:
        commands.length === 1
          ? logPath
          : path.join(directory, `step-${executions.length}.log`),
    });
    executions.push(result);
    if (
      result.exitCode !== 0 ||
      result.signal ||
      result.timeout ||
      result.error
    )
      break;
  }
  if (commands.length > 1)
    fs.writeFileSync(
      logPath,
      executions
        .map((_, i) => fs.readFileSync(path.join(directory, `step-${i}.log`)))
        .reduce((a, b) => Buffer.concat([a, b]), Buffer.alloc(0)),
      { flag: "wx" },
    );
  try {
    assert.equal(executions.length, commands.length, "INCOMPLETE_COMMANDS");
    for (const e of executions) {
      assert.equal(e.exitCode, 0, "NONZERO_EXIT");
      assert.ok(!e.signal && !e.timeout && !e.error, "PROCESS_FAILURE");
    }
    if (!job)
      counts = verifyEvents(fs.readFileSync(eventsFile, "utf8"), files, root);
    if (job && graphJobs[lane]) {
      const file = path.join(
        root,
        ".artifacts/task086-lanes",
        graphJobs[lane][0] + ".receipt.json",
      );
      const bytes = fs.readFileSync(file),
        native = JSON.parse(bytes);
      assert.equal(native.status, "PASS", "NATIVE_PROOF_FAILED");
      for (const key of ["checkoutSha", "runId", "runAttempt"])
        assert.equal(
          native.binding[key] ?? (key === "runId" ? "local" : "1"),
          binding[key],
          "NATIVE_BINDING_MISMATCH",
        );
      fs.writeFileSync(path.join(directory, "native-proof.json"), bytes);
      nativeReceiptSha256 = hash(bytes);
    }
    if (!job && lane !== "ordinary") {
      const legacy = readJson(path.join(directory, "legacy", lane + ".json"));
      assert.equal(legacy.status, "PASS", "LEGACY_LANE_FAILURE");
      assert.deepEqual(legacy.files, files, "LEGACY_SELECTION_MISMATCH");
      assert.equal(
        hash(fs.readFileSync(path.join(directory, "legacy", lane + ".log"))),
        legacy.logSha256,
        "LEGACY_LOG_HASH_MISMATCH",
      );
    }
    assert.deepEqual(
      context().inputHashes,
      binding.inputHashes,
      "INPUT_MUTATED_DURING_RUN",
    );
    if (binding.trackedWorktreeClean)
      assert.equal(
        context().trackedWorktreeClean,
        true,
        "TRACKED_OUTPUT_MUTATION",
      );
  } catch (error) {
    validationError = error.message;
  }
  const receipt = {
    ...binding,
    lane,
    status: validationError ? "FAIL" : "PASS",
    runtime,
    cwd: root,
    executions,
    commands,
    files: files.map((p) => ({
      path: p,
      sha256: inventory.entries.find((e) => e.path === p).sha256,
    })),
    counts,
    countStatus: job
      ? "NOT_APPLICABLE_COMMAND_GATE"
      : counts
        ? "VERIFIED"
        : "UNVERIFIED",
    validationError,
    nativeReceiptSha256,
    startedAt: executions[0].startedAt,
    endedAt: new Date().toISOString(),
    log: "execution.log",
    logSha256: hash(fs.readFileSync(logPath)),
    eventsSha256: fs.existsSync(eventsFile)
      ? hash(fs.readFileSync(eventsFile))
      : null,
    notExecuted: readJson(path.join(root, qa, "execution-policy.json"))
      .optionalSummary,
  };
  fs.writeFileSync(
    path.join(directory, "receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  // Preserve TASK-086 artifact interfaces. Each hosted job has its own checkout.
  if (!job && lane !== "ordinary")
    for (const name of fs.readdirSync(path.join(directory, "legacy"))) {
      fs.mkdirSync(path.join(root, ".artifacts/ci"), { recursive: true });
      fs.copyFileSync(
        path.join(directory, "legacy", name),
        path.join(root, ".artifacts/ci", name),
      );
    }
  console.log(
    JSON.stringify({
      status: receipt.status,
      lane,
      counts,
      validationError,
      receipt: path.relative(root, path.join(directory, "receipt.json")),
    }),
  );
  return receipt;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const laneIndex = process.argv.indexOf("--lane"),
    jobIndex = process.argv.indexOf("--job");
  assert.ok(!(laneIndex >= 0 && jobIndex >= 0), "CHOOSE_LANE_OR_JOB");
  if (laneIndex >= 0 || jobIndex >= 0)
    assert.ok(
      process.argv[(laneIndex >= 0 ? laneIndex : jobIndex) + 1],
      "MISSING_LANE_OR_JOB",
    );
  const lane =
    laneIndex >= 0
      ? process.argv[laneIndex + 1]
      : jobIndex >= 0
        ? process.argv[jobIndex + 1]
        : "ordinary";
  process.exitCode = (await run(lane, jobIndex >= 0)).status === "PASS" ? 0 : 1;
}
