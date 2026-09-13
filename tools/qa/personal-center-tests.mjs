import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const inventoryPath = new URL(
  "../../docs/qa/TASK-055/test-inventory.json",
  import.meta.url,
);
const digest = (data) => createHash("sha256").update(data).digest("hex");

export function testTotals(output) {
  const value = (key) =>
    [...output.matchAll(new RegExp("^# " + key + " (\\d+)$", "gm"))].at(
      -1,
    )?.[1];
  const counts = Object.fromEntries(
    ["tests", "pass", "fail", "cancelled", "skipped", "todo"].map((key) => [
      key,
      Number(value(key) ?? NaN),
    ]),
  );
  assert.ok(
    Object.values(counts).every(Number.isFinite),
    "Missing Node TAP totals; mandatory suite cannot silently disappear",
  );
  assert.ok(
    counts.tests > 0 && counts.pass === counts.tests,
    "Every mandatory test must pass",
  );
  for (const key of ["fail", "cancelled", "skipped", "todo"])
    assert.equal(counts[key], 0, "Mandatory suite has " + key);
  return counts;
}

export async function runNode(args, { env = process.env, cwd = root } = {}) {
  // A nested Node test must be a fresh TAP process, not inherit the parent binary reporter.
  env = { ...env };
  delete env.NODE_TEST_CONTEXT;
  const chunks = [];
  const started = new Date().toISOString();
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.once("error", reject);
    child.once("close", (exitCode, signal) =>
      resolveResult({ exitCode, signal }),
    );
  });
  const output = Buffer.concat(chunks);
  return {
    ...result,
    started,
    finished: new Date().toISOString(),
    output,
    logSha256: digest(output),
  };
}

async function freePorts() {
  for (const port of [3000, 3001])
    await new Promise((ok, fail) => {
      const server = createServer();
      server.once("error", () =>
        fail(new Error("Required task server port " + port + " is occupied")),
      );
      server.listen(port, "127.0.0.1", () => server.close(ok));
    });
}

export async function emptyLocal(local) {
  const { ownerColumns } =
    await import("../../tests/task-052-local-helpers.mjs");
  const tables = [
    "auth.users",
    ...Object.keys(ownerColumns).map((name) => "public." + name),
    "storage.objects",
    "storage.buckets",
  ];
  const counts = {};
  for (const name of tables) {
    counts[name] = Number(
      (await local.db`select count(*) from ${local.db(name)}`)[0].count,
    );
    assert.equal(
      counts[name],
      0,
      "Refuse occupied Local project / retained fixtures: " + name,
    );
  }
  await freePorts();
  return counts;
}

export async function main(argv = process.argv.slice(2)) {
  assert.ok(
    argv.length === 0 || (argv.length === 1 && argv[0] === "--local"),
    "Use test:personal-center or test:personal-center:local without extra arguments",
  );
  const mode = argv.length ? "local" : "non-local";
  const inventoryBytes = await readFile(inventoryPath);
  const inventory = JSON.parse(inventoryBytes);
  const suites = inventory.suites.filter(
    (suite) => suite.execution.mode === mode,
  );
  assert.ok(suites.length > 0);
  assert.equal(
    new Set(suites.map((suite) => suite.file)).size,
    suites.length,
    "A suite runs only once per aggregate",
  );
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const directory = resolve(root, ".artifacts/task055/" + mode + "-" + stamp);
  await mkdir(directory, { recursive: true });
  const report = {
    task: "TASK-055-B",
    mode,
    status: "FAIL",
    inventorySha256: digest(inventoryBytes),
    started: new Date().toISOString(),
    suites: [],
    checks: [],
  };
  let local,
    cleanupAuthorized = false;
  let env = process.env;
  async function command(label, args, tests = false) {
    const result = await runNode(args, { env });
    await writeFile(resolve(directory, label + ".log"), result.output);
    const { output, ...metadata } = result;
    const entry = { label, args, ...metadata };
    report.checks.push(entry);
    assert.equal(
      result.exitCode,
      0,
      label + " failed; raw diagnostic stays in ignored local log",
    );
    if (tests)
      entry.counts = testTotals(
        output.toString("utf8").replaceAll("\r\n", "\n"),
      );
    console.log(
      label +
        " PASS" +
        (entry.counts ? " (" + entry.counts.tests + " tests, zero skips)" : ""),
    );
    return entry;
  }
  try {
    if (mode === "local") {
      const { localEnv } = await import("../db/local.mjs");
      env = localEnv(process.env);
      env.CODEX_PLAYWRIGHT_PATH = process.env.CODEX_PLAYWRIGHT_PATH ?? "";
      assert.ok(
        env.CODEX_PLAYWRIGHT_PATH,
        "Explicit installed Playwright required; no browser skip fallback",
      );
      await readFile(resolve(root, ".next/BUILD_ID"));
      await freePorts();
      await command("db-start", ["tools/db/local.mjs", "start"]);
      const { preferenceLocalRuntime } =
        await import("../../tests/task-045-local-helpers.mjs");
      local = preferenceLocalRuntime();
      env = { ...local.env, CODEX_PLAYWRIGHT_PATH: env.CODEX_PLAYWRIGHT_PATH };
      report.before = await emptyLocal(local);
      cleanupAuthorized = true;
      const before = await readFile(
        resolve(root, "src/types/database.generated.ts"),
      );
      await command("db-types", ["tools/db/local.mjs", "types"]);
      const after = await readFile(
        resolve(root, "src/types/database.generated.ts"),
      );
      assert.equal(
        digest(after),
        digest(before),
        "Local type generation drift",
      );
      report.generatedTypesSha256 = digest(after);
    }
    for (const suite of suites) {
      const args = [...suite.execution.nodeArgs];
      const isTest = args.includes("--test");
      if (isTest) args.splice(args.indexOf("--test"), 0, "--test-reporter=tap");
      const label = suite.file.replace(/^tests\//, "").replace(/\.mjs$/, "");
      const entry = await command(label, args, isTest);
      report.suites.push({ file: suite.file, counts: entry.counts ?? null });
      if (local) entry.cleanup = await emptyLocal(local);
    }
    report.status = "PASS";
  } finally {
    try {
      if (local && cleanupAuthorized) report.after = await emptyLocal(local);
    } catch (error) {
      report.status = "FAIL";
      throw error;
    } finally {
      if (local) await local.db.end({ timeout: 5 });
      if (cleanupAuthorized) {
        try {
          await command("db-final-status", ["tools/db/local.mjs", "status"]);
          await command("db-stop", ["tools/db/local.mjs", "stop"]);
        } catch (error) {
          report.status = "FAIL";
          throw error;
        } finally {
          report.finished = new Date().toISOString();
          await writeFile(
            resolve(directory, "report.json"),
            JSON.stringify(report, null, 2) + "\n",
          );
          await writeFile(
            resolve(root, ".artifacts/task055/" + mode + "-latest.json"),
            JSON.stringify(report, null, 2) + "\n",
          );
        }
      } else {
        report.finished = new Date().toISOString();
        await writeFile(
          resolve(directory, "report.json"),
          JSON.stringify(report, null, 2) + "\n",
        );
        await writeFile(
          resolve(root, ".artifacts/task055/" + mode + "-latest.json"),
          JSON.stringify(report, null, 2) + "\n",
        );
      }
    }
  }
  console.log(mode + " aggregate PASS; report: " + directory + "/report.json");
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
