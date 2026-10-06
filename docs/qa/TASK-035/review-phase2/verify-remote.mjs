// Read-only review of downloaded artifacts; does not execute repository test targets.
// node verify-remote.mjs <reviewed-checkout> <evidence-output>
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(process.argv[2]),
  out = path.resolve(process.argv[3]);
const remote = path.join(root, ".artifacts/review-task035/remote");
const hash = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const { context, verifyArtifacts, verifyReceiptShape, verifyEvents } =
  await load("tools/qa/task-035-receipt.mjs");
const { checkInventory } = await load("tools/qa/task-035-inventory.mjs");
const { currentBinding } = await load(
  "tools/transport/task-086-final-closeout.mjs",
);
const { hash: bindingHash } = await load("tools/transport/task-086-model.mjs");
const binding = context(),
  inventory = checkInventory();
const results = {
  reviewedHeadSha: binding.checkoutSha,
  observedAt: new Date().toISOString(),
  runs: [],
};
for (const [runId, checkoutSha, event] of [
  ["37467190704", "a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c", "push"],
  ["37467203410", "f15d9bfa8062605c6f13829ef70f2981d955da2b", "pull_request"],
]) {
  const directory = path.join(remote, runId);
  const entries = fs.readdirSync(directory, { recursive: true });
  const run = {
    runId,
    attempt: "1",
    checkoutSha,
    event,
    receipts: [],
    failures: [],
    missingLanes: [],
    tests: 0,
    passed: 0,
    failed: 0,
    directFiles: 0,
  };
  for (const f of entries.filter((f) => path.basename(f) === "receipt.json")) {
    const file = path.join(directory, f),
      r = read(file),
      base = path.dirname(file);
    for (const [key, value] of Object.entries({
      checkoutSha,
      event,
      runId,
      runAttempt: "1",
      inputDigest: binding.inputDigest,
      inventoryHash: binding.inventoryHash,
    }))
      assert.equal(r[key], value, `${f}:${key}`);
    assert.equal(r.trackedWorktreeClean, true);
    assert.equal(r.protectedWorktreeClean, true);
    if (event === "pull_request") {
      assert.equal(r.prHeadSha, binding.checkoutSha);
      assert.equal(r.baseSha, "4888b4d507ee75d4f6b9914eb1a8d5661813f64b");
    }
    verifyArtifacts(base, r);
    const summary = {
      lane: r.lane,
      status: r.status,
      receiptSha256: hash(fs.readFileSync(file)),
      receiptPath: f.replaceAll("\\", "/"),
      logSha256: r.logSha256,
      eventsSha256: r.eventsSha256,
      runtime: r.runtime,
      recordedCounts: r.counts,
      countStatus: r.countStatus,
      validationError: r.validationError,
      executions: r.executions.map(
        ({ argv, exitCode, signal, timeout, error }) => ({
          argv,
          exitCode,
          signal,
          timeout,
          error,
        }),
      ),
    };
    if (r.eventsSha256) {
      const text = fs.readFileSync(path.join(base, "events.jsonl"), "utf8");
      const events = text.trim().split("\n").map(JSON.parse),
        final = events.filter((e) => !e.file),
        perFile = events.filter((e) => e.file);
      assert.equal(final.length, 1);
      assert.deepEqual(
        perFile.map((e) => path.posix.relative(r.cwd, e.file)).sort(),
        r.files.map((e) => e.path).sort(),
      );
      assert.deepEqual(
        r.files,
        inventory.entries
          .filter((e) => inventory.lanes[r.lane].includes(e.path))
          .map(({ path, sha256 }) => ({ path, sha256 })),
      );
      for (const key of [
        "tests",
        "passed",
        "failed",
        "cancelled",
        "skipped",
        "todo",
        "suites",
      ]) {
        const actual = final[0].counts[key];
        assert.ok(Number.isInteger(actual) && actual >= 0, `${f}:${key}`);
        // Node counts a successful top-level assertion-only file as one final test,
        // while its file summary has zero tests. Preserve this observed distinction.
        const fileCount = perFile.reduce((n, e) => n + e.counts[key], 0);
        const scriptCount = ["tests", "passed"].includes(key)
          ? perFile.filter((e) => e.success && e.counts.tests === 0).length
          : 0;
        assert.equal(fileCount + scriptCount, actual, `${f}:sum-${key}`);
      }
      assert.equal(
        final[0].counts.tests,
        final[0].counts.passed +
          final[0].counts.failed +
          final[0].counts.cancelled +
          final[0].counts.skipped +
          final[0].counts.todo,
      );
      summary.independentlyParsedCounts = final[0].counts;
      summary.selectedFiles = r.files.length;
      summary.assertionOnlyFiles = perFile
        .filter((e) => e.success && e.counts.tests === 0)
        .map((e) => path.posix.relative(r.cwd, e.file));
      for (const key of ["tests", "passed", "failed"])
        run[key] += final[0].counts[key];
      run.directFiles += r.files.length;
      if (r.status === "PASS") {
        verifyReceiptShape(r);
        assert.deepEqual(
          verifyEvents(
            text,
            r.files.map((e) => e.path),
            r.cwd,
          ),
          r.counts,
        );
      } else {
        assert.equal(r.status, "FAIL");
        assert.ok(r.executions.some((e) => e.exitCode !== 0));
        assert.equal(r.countStatus, "UNVERIFIED");
      }
      const lines = fs
        .readFileSync(path.join(base, "execution.log"), "utf8")
        .split(/\r?\n/);
      for (let i = 0; i < lines.length; i++)
        if (/^not ok /.test(lines[i]))
          run.failures.push({
            lane: r.lane,
            logPath: f
              .replace(/receipt\.json$/, "execution.log")
              .replaceAll("\\", "/"),
            line: i + 1,
            excerpt: lines.slice(i, i + 34).join("\n"),
          });
    } else if (r.status === "PASS") verifyReceiptShape(r);
    run.receipts.push(summary);
  }
  const expected = [
    ...Object.keys(inventory.lanes),
    "ordinary",
    "graph-first",
    "graph-second",
    "extraction",
    "resume",
    "quality",
  ];
  run.missingLanes = expected.filter(
    (l) => !run.receipts.some((r) => r.lane === l),
  );
  run.partialLogs = entries
    .filter(
      (f) =>
        path.basename(f) === "execution.log" &&
        !fs.existsSync(path.join(directory, path.dirname(f), "receipt.json")),
    )
    .map((f) => ({
      path: f.replaceAll("\\", "/"),
      sha256: hash(fs.readFileSync(path.join(directory, f))),
      bytes: fs.statSync(path.join(directory, f)).size,
    }));
  run.jobs = read(path.join(out, `jobs-${runId}.json`)).jobs.map(
    ({ id, name, conclusion, steps }) => ({
      id,
      name,
      conclusion,
      failedSteps: steps
        .filter((s) => s.conclusion === "failure")
        .map((s) => s.name),
    }),
  );
  results.runs.push(run);
}
const baseSha = "4888b4d507ee75d4f6b9914eb1a8d5661813f64b";
const original = currentBinding(),
  changed = structuredClone(original.files),
  substitutions = [];
for (const file of ["package.json", ".github/workflows/quality-gate.yml"]) {
  const baseline = hash(
    execFileSync("git", ["show", `${baseSha}:${file}`], { cwd: root }),
  );
  substitutions.push({ file, current: original.files[file], baseline });
  changed[file] = baseline;
}
const frozen = read(
  path.join(
    root,
    "docs/qa/TASK-086/certification-engine-repair/recertification-summary.json",
  ),
).inputSha256;
assert.notEqual(original.inputSha256, frozen);
assert.equal(bindingHash(changed), frozen);
results.bindingDiagnosis = {
  method:
    "Only in-memory hash-map comparison. No file substitution or target execution.",
  current: original.inputSha256,
  frozen,
  counterfactual: bindingHash(changed),
  substitutions,
  staleManifestBindings: original.staleManifestBindings,
};
const bd = path.join(remote, "37422119153");
const finalPath = path.join(
  bd,
  `task086-final-exact-head-${baseSha}/closeout-publication-final-receipt.json`,
);
const final = read(finalPath);
const proofPath = path.join(
  bd,
  `task086-proof-${baseSha}/task086-lanes/deterministic-recovery-proof.json`,
);
const proof = read(proofPath);
assert.equal(final.actualCheckoutSha, baseSha);
assert.equal(final.runId, "37422119153");
assert.equal(final.runAttempt, "1");
assert.equal(
  hash(fs.readFileSync(proofPath)),
  final.deterministicRecoveryProofSha256,
);
assert.equal(proof.binding.checkoutSha, baseSha);
assert.equal(proof.binding.runId, "37422119153");
assert.equal(proof.binding.runAttempt, "1");
for (const p of [
  "fullDeterministicRebuild",
  "resumeChecksumSkip",
  "exceptionProofInputPreserved",
  "publishedArtifactComparison",
  "resumeCorruptionInvalidation",
])
  assert.equal(proof[p], "PASS");
let checkedInputs = 0;
for (const [file, h] of Object.entries(proof.binding.bound)) {
  let b = fs.readFileSync(path.join(root, file));
  if (hash(b) !== h)
    b = execFileSync("git", ["show", `${baseSha}:${file}`], {
      cwd: root,
      maxBuffer: 128 * 1024 * 1024,
    });
  assert.equal(hash(b), h, file);
  checkedInputs++;
}
const lanes = [];
for (const lane of [
  "assets",
  "regression-0",
  "regression-1",
  "regression-2",
  "regression-3",
  "rebuild",
]) {
  const base =
    lane === "rebuild"
      ? path.join(bd, `task086-proof-${baseSha}/ci`)
      : path.join(bd, `task086-regression-${lane}-${baseSha}`);
  const r = read(path.join(base, `${lane}.json`)),
    log = fs.readFileSync(path.join(base, `${lane}.log`));
  assert.equal(r.checkoutSha, baseSha);
  assert.equal(r.status, "PASS");
  assert.equal(r.logSha256, hash(log));
  assert.deepEqual(r.files, final.regressionInventory.lanes[lane]);
  const match = [...log.toString().matchAll(/^(?:#|ℹ) tests (\d+)\r?$/gm)].at(
    -1,
  );
  assert.ok(match, `${lane}: final summary`);
  lanes.push({
    lane,
    files: r.files.length,
    tests: Number(match[1]),
    logSha256: hash(log),
  });
}
results.baseline = {
  runId: "37422119153",
  sha: baseSha,
  status: "VERIFIED_HISTORICAL_ARTIFACTS_NOT_RERUN",
  checkedInputs,
  finalSha256: hash(fs.readFileSync(finalPath)),
  proofSha256: hash(fs.readFileSync(proofPath)),
  lanes,
  tests: lanes.reduce((n, l) => n + l.tests, 0),
  files: final.regressionInventory.fileCount,
  jobs: read(path.join(out, "jobs-37422119153.json")).jobs.map(
    ({ id, name, conclusion }) => ({ id, name, conclusion }),
  ),
  limitation:
    "Large graph output archives not re-downloaded; final proof and 516 input bindings, six lane logs and remote job outcomes checked. Baseline Python version not recorded.",
};
fs.writeFileSync(
  path.join(out, "remote-verification.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    runs: results.runs.map(
      ({
        runId,
        checkoutSha,
        tests,
        passed,
        failed,
        directFiles,
        missingLanes,
      }) => ({
        runId,
        checkoutSha,
        tests,
        passed,
        failed,
        directFiles,
        missingLanes,
      }),
    ),
    baseline: results.baseline.tests,
    binding: results.bindingDiagnosis,
  }),
);
