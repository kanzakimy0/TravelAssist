// Review-only synthetic probes. Imports the fixed checkout; never edits its source/tests/data.
// Usage: node probes.mjs <reviewed-checkout> <output-directory>
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const checkout = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const load = (p) => import(pathToFileURL(path.join(checkout, p)).href);
const { execute, testEnvironment } = await load(
  "tools/qa/task-035-process.mjs",
);
const {
  verifyEvents,
  verifyReceiptShape,
  aggregate,
  context,
  aggregateDirectory,
} = await load("tools/qa/task-035-receipt.mjs");
const { hash, checkInventory } = await load("tools/qa/task-035-inventory.mjs");
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: checkout,
  encoding: "utf8",
}).trim();
assert.equal(sha, "a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(checkout, ".artifacts/review-task035"), {
  recursive: true,
});
const scratch = fs.mkdtempSync(
  path.join(checkout, ".artifacts/review-task035/probe-"),
);
const results = {
  reviewedHeadSha: sha,
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  scratch,
  checks: [],
};
const add = (id, value) => {
  results.checks.push({ id, ...value });
  console.log(JSON.stringify({ id, ...value }));
};
let seq = 0;
const run = (command, args, cwd = scratch, timeoutMs = 10000) =>
  execute({
    command,
    args,
    cwd,
    timeoutMs,
    env: testEnvironment(),
    logPath: path.join(scratch, `process-${seq++}.log`),
  });
const attempt = (fn) => {
  try {
    return { accepted: true, result: fn() };
  } catch (e) {
    return { accepted: false, error: e.message };
  }
};

const withSpaces = path.join(scratch, "working directory with spaces");
fs.mkdirSync(withSpaces);
const npmDirect = await run("npm", ["--version"], withSpaces);
const npmControl = await run(
  process.env.ComSpec || "cmd.exe",
  ["/d", "/s", "/c", "npm --version"],
  withSpaces,
);
add("windows-npm", {
  actualCommand: ["npm", "--version"],
  direct: npmDirect,
  control: npmControl,
  controlLog: fs.readFileSync(path.join(scratch, "process-1.log"), "utf8"),
});
const argument = "value with spaces & literal";
const nodeSpaces = await run(
  process.execPath,
  ["-e", "console.log(JSON.stringify(process.argv[1]))", argument],
  withSpaces,
);
add("node-spaces", {
  execution: nodeSpaces,
  output: fs.readFileSync(path.join(scratch, "process-2.log"), "utf8"),
});

const files = ["tests/synthetic-one.mjs", "tests/synthetic-two.mjs"];
const counts = (n) => ({
  tests: n,
  passed: n,
  failed: 0,
  cancelled: 0,
  skipped: 0,
  todo: 0,
  suites: 0,
  topLevel: n,
});
const summary = (file, n) => ({
  type: "test:summary",
  ...(file ? { file: path.resolve(checkout, file) } : {}),
  success: true,
  counts: counts(n),
});
const serialize = (events) => events.map((e) => JSON.stringify(e)).join("\n");
const validEvents = [
  summary(files[0], 1),
  summary(files[1], 1),
  summary(null, 2),
];
add(
  "valid-count-control",
  attempt(() => verifyEvents(serialize(validEvents), files, checkout)),
);
add(
  "inconsistent-final-count",
  attempt(() =>
    verifyEvents(
      serialize([...validEvents.slice(0, 2), summary(null, 999)]),
      files,
      checkout,
    ),
  ),
);
const missingPassed = structuredClone(validEvents);
delete missingPassed[2].counts.passed;
add(
  "missing-pass-count",
  attempt(() => verifyEvents(serialize(missingPassed), files, checkout)),
);
const negativePassed = structuredClone(validEvents);
negativePassed[2].counts.passed = -7;
add(
  "negative-pass-count",
  attempt(() => verifyEvents(serialize(negativePassed), files, checkout)),
);

const childFile = path.join(scratch, "child.mjs");
const pidFile = path.join(scratch, "pids.json");
fs.writeFileSync(
  childFile,
  `import fs from 'node:fs';import {spawn} from 'node:child_process';const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});fs.writeFileSync(process.argv[2],JSON.stringify({parent:process.pid,child:child.pid}));setInterval(()=>{},1000);`,
);
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const timed = await run(process.execPath, [childFile, pidFile], scratch, 1000);
const pids = JSON.parse(fs.readFileSync(pidFile, "utf8"));
add("timeout-process-tree", {
  execution: timed,
  pids,
  aliveAfter: Object.fromEntries(
    Object.entries(pids).map(([key, pid]) => [key, alive(pid)]),
  ),
});
const cancellationFile = path.join(scratch, "cancel.mjs");
fs.writeFileSync(
  cancellationFile,
  `import fs from 'node:fs';import {execute,testEnvironment} from ${JSON.stringify(pathToFileURL(path.join(checkout, "tools/qa/task-035-process.mjs")).href)};const timer=setTimeout(()=>process.emit('SIGTERM'),1200);const result=await execute({command:process.execPath,args:${JSON.stringify([childFile, pidFile])},cwd:${JSON.stringify(scratch)},env:testEnvironment(),timeoutMs:10000,logPath:${JSON.stringify(path.join(scratch, "cancel-child.log"))}});clearTimeout(timer);console.log(JSON.stringify(result));`,
);
const cancelled = await run(process.execPath, [cancellationFile]);
const cancelPids = JSON.parse(fs.readFileSync(pidFile, "utf8"));
add("simulated-parent-cancellation", {
  method: "process.emit(SIGTERM), not a Windows console/CI cancellation",
  wrapper: cancelled,
  childResult: fs.readFileSync(
    path.join(scratch, `process-${seq - 1}.log`),
    "utf8",
  ),
  pids: cancelPids,
  aliveAfter: Object.fromEntries(
    Object.entries(cancelPids).map(([key, pid]) => [key, alive(pid)]),
  ),
});
const overflow = await run(process.execPath, [
  "-e",
  "const b=Buffer.alloc(1024*1024,'x');for(let i=0;i<66;i++)process.stdout.write(b);setInterval(()=>{},1000)",
]);
add("log-overflow", {
  execution: overflow,
  retainedBytes: fs.statSync(path.join(scratch, `process-${seq - 1}.log`)).size,
});

// Exercise the actual aggregator with internally inconsistent counts. All records below
// are explicitly SYNTHETIC, not evidence of executing the repository's business tests.
const binding = context();
const inventory = checkInventory();
const aggregateScratch = path.join(scratch, "synthetic-aggregate");
const lanes = [
  ...Object.keys(inventory.lanes),
  "ordinary",
  "graph-first",
  "graph-second",
  "extraction",
  "resume",
  "quality",
];
for (const lane of lanes) {
  const dir = path.join(aggregateScratch, lane);
  fs.mkdirSync(dir, { recursive: true });
  const direct =
    lane === "ordinary"
      ? inventory.entries
      : inventory.entries.filter((e) =>
          inventory.lanes[lane]?.includes(e.path),
        );
  const commands =
    lane === "quality"
      ? [
          ...[
            "deploy:validate:local",
            "lint",
            "typecheck",
            "format:check:deploy",
            "deploy:build:local",
            "deploy:verify-artifact",
          ].map((s) => ["npm", "run", s]),
          ["git", "diff", "--check"],
        ]
      : [["node", "synthetic-review-command"]];
  const r = {
    ...binding,
    lane,
    status: "PASS",
    cwd: checkout,
    files: direct.map(({ path, sha256 }) => ({ path, sha256 })),
    commands,
    executions: commands.map((argv) => ({ argv, exitCode: 0 })),
    countStatus: direct.length ? "VERIFIED" : "NOT_APPLICABLE_COMMAND_GATE",
    logSha256: hash("SYNTHETIC ONLY"),
    counts: null,
  };
  fs.writeFileSync(path.join(dir, "execution.log"), "SYNTHETIC ONLY");
  if (direct.length) {
    const data = serialize([
      ...direct.map((e) => summary(e.path, 1)),
      summary(null, 999),
    ]);
    fs.writeFileSync(path.join(dir, "events.jsonl"), data);
    r.eventsSha256 = hash(data);
    r.counts = verifyEvents(
      data,
      direct.map((e) => e.path),
      checkout,
    );
  }
  if (["graph-first", "graph-second", "extraction", "resume"].includes(lane)) {
    const data = JSON.stringify({
      status: "PASS",
      binding: {
        checkoutSha: binding.checkoutSha,
        runId: binding.runId,
        runAttempt: binding.runAttempt,
      },
    });
    fs.writeFileSync(path.join(dir, "native-proof.json"), data);
    r.nativeReceiptSha256 = hash(data);
  }
  fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(r));
}
add(
  "synthetic-aggregate-inconsistent-count",
  attempt(() => {
    const r = aggregateDirectory(aggregateScratch);
    return {
      status: r.status,
      required: r.required,
      counts: r.receipts.map(({ lane, counts }) => ({
        lane,
        tests: counts?.tests,
      })),
    };
  }),
);
const aggregateFile = path.join(aggregateScratch, "assets", "receipt.json");
const original = fs.readFileSync(aggregateFile, "utf8");
for (const [key, value] of [
  ["runAttempt", "wrong"],
  ["checkoutSha", "b".repeat(40)],
  ["logSha256", "0".repeat(64)],
]) {
  fs.writeFileSync(
    aggregateFile,
    JSON.stringify({ ...JSON.parse(original), [key]: value }),
  );
  add(
    `aggregate-negative-${key}`,
    attempt(() => aggregateDirectory(aggregateScratch)),
  );
}
fs.writeFileSync(aggregateFile, original);
fs.writeFileSync(
  path.join(out, "probes-results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
const logs = fs
  .readdirSync(scratch)
  .filter((f) => f.endsWith(".log"))
  .map((f) => {
    const b = fs.readFileSync(path.join(scratch, f));
    return {
      path: f,
      size: b.length,
      sha256: createHash("sha256").update(b).digest("hex"),
    };
  });
fs.writeFileSync(
  path.join(out, "probe-log-hashes.json"),
  JSON.stringify(logs, null, 2) + "\n",
);
