import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const digest = (x) => createHash("sha256").update(x).digest("hex");
export function regressionInventory() {
  const files = fs
    .readdirSync(path.join(root, "tests"))
    .filter((x) => x.endsWith(".test.mjs"))
    .sort()
    .map((x) => "tests/" + x);
  const lanes = {
    assets: [],
    "regression-0": [],
    "regression-1": [],
    "regression-2": [],
    "regression-3": [],
    rebuild: [],
  };
  let index = 0;
  for (const file of files) {
    if (file === "tests/task-086-b-rebuild.test.mjs") lanes.rebuild.push(file);
    else if (/^tests\/task-013/.test(file)) lanes.assets.push(file);
    else lanes["regression-" + (index++ % 4)].push(file);
  }
  const assigned = Object.values(lanes).flat();
  assert.equal(
    new Set(assigned).size,
    files.length,
    "Test duplicated across lanes",
  );
  assert.deepEqual(
    [...assigned].sort(),
    files,
    "Test disappeared from regression inventory",
  );
  return {
    schemaVersion: 1,
    files,
    fileCount: files.length,
    fileHashes: Object.fromEntries(
      files.map((file) => [
        file,
        digest(fs.readFileSync(path.join(root, file))),
      ]),
    ),
    lanes,
    policy:
      "All tests/*.test.mjs files exactly once, same assertions. Asset subprocess tests serial, concurrency1, original30s limits. Heavy rebuild test consumes complete current exact-HEAD lane proof, or executes original serial verifier without lane receipts.",
  };
}
export function runRegressionLane(lane) {
  const inventory = regressionInventory();
  assert.ok(inventory.lanes[lane]?.length, "Unknown or empty regression lane");
  const startedAt = new Date().toISOString();
  const directory = path.join(root, ".artifacts/ci");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "regression-inventory.json"),
    JSON.stringify(inventory, null, 2) + "\n",
  );
  const args = [
    "--import",
    "./tests/register-route-ts.mjs",
    "--test",
    "--test-concurrency=1",
    ...inventory.lanes[lane],
  ];
  const timeoutMs = lane === "rebuild" ? 15 * 60000 : 25 * 60000;
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 32 * 1024 * 1024,
  });
  const log = (result.stdout ?? "") + (result.stderr ?? "");
  fs.writeFileSync(path.join(directory, lane + ".log"), log);
  const checkoutSha = execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "rev-parse", "HEAD"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (process.env.GITHUB_SHA) assert.equal(checkoutSha, process.env.GITHUB_SHA);
  const record = {
    lane,
    checkoutSha,
    expectedHead: process.env.GITHUB_SHA ?? checkoutSha,
    inventorySha256: digest(JSON.stringify(inventory)),
    files: inventory.lanes[lane],
    startedAt,
    endedAt: new Date().toISOString(),
    timeoutMs,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.code ?? null,
    status:
      result.status === 0
        ? "PASS"
        : result.error?.code === "ETIMEDOUT"
          ? "TIMEOUT"
          : "FAIL",
    logSha256: digest(log),
    command: [process.execPath, ...args],
  };
  fs.writeFileSync(
    path.join(directory, lane + ".json"),
    JSON.stringify(record, null, 2) + "\n",
  );
  process.stdout.write(log);
  console.log(JSON.stringify(record));
  return record;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] === "--inventory")
    console.log(JSON.stringify(regressionInventory(), null, 2));
  else
    process.exitCode =
      runRegressionLane(process.argv[2]).status === "PASS" ? 0 : 1;
}
