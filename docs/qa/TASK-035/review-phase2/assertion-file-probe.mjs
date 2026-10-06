// Focused runner compatibility check; runs this unchanged, offline/mock test only.
// node assertion-file-probe.mjs <reviewed-checkout> <evidence-output>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = path.resolve(process.argv[2]),
  out = path.resolve(process.argv[3]);
const { execute, testEnvironment } = await import(
  pathToFileURL(path.join(root, "tools/qa/task-035-process.mjs")).href
);
const { verifyEvents } = await import(
  pathToFileURL(path.join(root, "tools/qa/task-035-receipt.mjs")).href
);
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
assert.equal(sha, "a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c");
const file = "tests/task-086-rights-binding.test.mjs";
fs.mkdirSync(path.join(root, ".artifacts/review-task035"), { recursive: true });
fs.mkdirSync(out, { recursive: true });
const scratch = fs.mkdtempSync(
  path.join(root, ".artifacts/review-task035/assertion-file-"),
);
const events = path.join(scratch, "events.jsonl"),
  log = path.join(scratch, "execution.log");
const execution = await execute({
  command: process.execPath,
  args: [
    "--import",
    "./tests/register-route-ts.mjs",
    "--test",
    "--test-concurrency=1",
    "--test-reporter=tap",
    "--test-reporter-destination=stdout",
    "--test-reporter=./tools/qa/task-035-reporter.mjs",
    "--test-reporter-destination=" + events,
    file,
  ],
  cwd: root,
  env: testEnvironment(),
  timeoutMs: 10000,
  logPath: log,
});
const result = {
  reviewedHeadSha: sha,
  file,
  execution,
  events: fs.readFileSync(events, "utf8").trim().split("\n").map(JSON.parse),
};
try {
  result.validation = {
    accepted: true,
    counts: verifyEvents(fs.readFileSync(events, "utf8"), [file], root),
  };
} catch (e) {
  result.validation = { accepted: false, error: e.message };
}
const hash = (p) =>
  createHash("sha256").update(fs.readFileSync(p)).digest("hex");
result.logSha256 = hash(log);
result.eventsSha256 = hash(events);
fs.copyFileSync(log, path.join(out, "assertion-file.log"));
fs.copyFileSync(events, path.join(out, "assertion-file-events.jsonl"));
fs.writeFileSync(
  path.join(out, "assertion-file-result.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
