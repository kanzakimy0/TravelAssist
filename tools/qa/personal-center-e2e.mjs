import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { localEnv, assertLocalEndpoint } from "../db/local.mjs";
import { emptyLocal, runNode, testTotals } from "./personal-center-tests.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const browser = process.env.WBS_BROWSER ?? "edge";
assert.ok(
  ["edge", "chromium", "firefox", "webkit"].includes(browser),
  "Unsupported browser",
);
assert.equal(
  process.argv.length,
  2,
  "Use WBS_BROWSER to select a canonical browser",
);
assert.ok(
  process.env.CODEX_PLAYWRIGHT_PATH,
  "Existing Playwright runtime is required; no silent skip/download",
);
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const directory = resolve(
  root,
  ".artifacts/task059/e2e-" + browser + "-" + stamp,
);
await mkdir(directory, { recursive: true });
const report = {
  task: "TASK-059-B",
  browser,
  status: "FAIL",
  started: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }).trim(),
  checks: [],
};
let local,
  started = false;
let env = localEnv(process.env);
const context = JSON.parse(
  execFileSync("docker", ["context", "inspect"], {
    env,
    encoding: "utf8",
    windowsHide: true,
  }),
);
env.DOCKER_HOST = assertLocalEndpoint(
  env.DOCKER_HOST && !env.DOCKER_CONTEXT
    ? env.DOCKER_HOST
    : context[0].Endpoints.docker.Host,
);
delete env.DOCKER_CONTEXT;
const running = execFileSync(
  "docker",
  [
    "ps",
    "--filter",
    "label=com.supabase.cli.project=travelassist",
    "--format",
    "{{.Names}}",
  ],
  { env, encoding: "utf8", windowsHide: true },
).trim();
assert.equal(
  running,
  "",
  "Refuse an already-running Local project; preserve other developer runtime",
);
await readFile(resolve(root, ".next/BUILD_ID"));
async function command(label, args, required = true) {
  const result = await runNode(args, { env, cwd: root });
  const { output, ...entry } = result;
  await writeFile(resolve(directory, label + ".log"), output);
  report.checks.push({ label, args, ...entry });
  if (required)
    assert.equal(
      result.exitCode,
      0,
      label + " failed; private raw logs remain ignored",
    );
  return result;
}
try {
  started = true;
  await command("db-start", ["tools/db/local.mjs", "start"]);
  const { preferenceLocalRuntime } =
    await import("../../tests/task-045-local-helpers.mjs");
  local = preferenceLocalRuntime();
  report.before = await emptyLocal(local);
  env = {
    ...local.env,
    CODEX_PLAYWRIGHT_PATH: process.env.CODEX_PLAYWRIGHT_PATH,
    WBS_BROWSER: browser,
    TASK059_EVIDENCE_DIR: directory,
  };
  const source = await readFile(
    resolve(root, "tests/task-059-personal-center-e2e.runtime.mjs"),
  );
  report.journeySourceSha256 = createHash("sha256")
    .update(source)
    .digest("hex");
  const result = await command(
    "journeys",
    [
      "--import",
      "./tests/register-route-ts.mjs",
      "--test",
      "--test-reporter=tap",
      "tests/task-059-personal-center-e2e.runtime.mjs",
    ],
    false,
  );
  report.journeys = JSON.parse(
    await readFile(resolve(directory, "journeys.json"), "utf8"),
  );
  const output = result.output.toString("utf8").replaceAll("\r\n", "\n");
  report.counts = Object.fromEntries(
    ["tests", "pass", "fail", "cancelled", "skipped", "todo"].map((k) => [
      k,
      Number(
        [...output.matchAll(new RegExp("^# " + k + " (\\d+)$", "gm"))].at(
          -1,
        )?.[1] ?? NaN,
      ),
    ]),
  );
  assert.equal(
    result.exitCode,
    0,
    "Mandatory browser journeys failed; see sanitized journey results",
  );
  testTotals(output);
  assert.deepEqual(
    report.journeys.journeys.map((x) => x.id),
    ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"],
  );
  assert.ok(
    report.journeys.journeys.every((x) => x.status === "PASS"),
    "All eight mandatory journeys must pass",
  );
  report.status = "PASS";
} catch (error) {
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  try {
    if (local) report.after = await emptyLocal(local);
  } catch {
    report.status = "FAIL";
    report.cleanupFailure = true;
    process.exitCode = 1;
  } finally {
    await local?.db.end({ timeout: 5 });
    if (started) {
      try {
        await command("db-final-status", ["tools/db/local.mjs", "status"]);
      } catch {
        report.status = "FAIL";
        process.exitCode = 1;
      }
      try {
        await command("db-stop", ["tools/db/local.mjs", "stop"]);
        report.localStopped = true;
      } catch {
        report.status = "FAIL";
        report.localStopped = false;
        process.exitCode = 1;
      }
    }
    report.finished = new Date().toISOString();
    await writeFile(
      resolve(directory, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    await writeFile(
      resolve(root, ".artifacts/task059/e2e-" + browser + "-latest.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          status: report.status,
          browser,
          counts: report.counts,
          journeys: report.journeys?.journeys.map(({ id, status }) => ({
            id,
            status,
          })),
          cleanup: !!report.after,
          localStopped: report.localStopped,
          report: directory,
        },
        null,
        2,
      ),
    );
  }
}
