// Explicit opt-in: resets only the dedicated repository Local project.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import {
  manifest,
  read,
  sha256,
  assertHistory,
} from "./task-054-migration-helpers.mjs";
await mkdir(".artifacts/task054", { recursive: true });
async function run(label, args) {
  const output = [];
  const started = new Date().toISOString();
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (s) => output.push(s));
    child.stderr.on("data", (s) => output.push(s));
    child.on("error", reject);
    child.on("exit", resolve);
  });
  await writeFile(
    ".artifacts/task054/" + label + ".log",
    Buffer.concat(output),
  );
  assert.equal(
    code,
    0,
    label + " failed; see local redacted log (never claim replay PASS)",
  );
  console.log(label + " PASS");
  return { label, started, finished: new Date().toISOString(), exitCode: code };
}
assertHistory();
const commands = [];
commands.push(await run("replay-start", ["tools/db/local.mjs", "start"]));
commands.push(
  await run("replay-initial-status", ["tools/db/local.mjs", "status"]),
);
const local = preferenceLocalRuntime();
try {
  assert.equal(
    Number((await local.db`select count(*) from auth.users`)[0].count),
    0,
    "Refuse to reset a Local project containing users",
  );
  for (const table of manifest.tables)
    assert.equal(
      Number(
        (await local.db`select count(*) from ${local.db("public." + table)}`)[0]
          .count,
      ),
      0,
      "Refuse to erase pre-existing B data",
    );
} finally {
  await local.db.end({ timeout: 5 });
}
const replays = [];
for (const pass of [1, 2]) {
  commands.push(
    await run("replay-" + pass + "-reset", ["tools/db/local.mjs", "reset"]),
  );
  commands.push(
    await run("replay-" + pass + "-types", ["tools/db/local.mjs", "types"]),
  );
  const generatedTypesSha256 = sha256(read("src/types/database.generated.ts"));
  assert.equal(
    generatedTypesSha256,
    manifest.generatedTypes.sha256,
    "No schema change: generated types must equal accepted baseline",
  );
  commands.push(
    await run("replay-" + pass + "-static", [
      "--import",
      "./tests/register-route-ts.mjs",
      "--test",
      "tests/task-054-personal-center-migration.test.mjs",
    ]),
  );
  commands.push(
    await run("replay-" + pass + "-runtime", [
      "--conditions=react-server",
      "--import",
      "./tests/register-route-ts.mjs",
      "--test",
      "tests/task-054-personal-center-migration.runtime.mjs",
    ]),
  );
  const catalog = await readFile(".artifacts/task054/catalog.json", "utf8");
  await writeFile(
    ".artifacts/task054/replay-" + pass + "-catalog.json",
    catalog,
  );
  replays.push({
    pass,
    generatedTypesSha256,
    catalogSha256: sha256(catalog),
    runtime: JSON.parse(
      await readFile(".artifacts/task054/runtime.json", "utf8"),
    ),
  });
}
assert.equal(
  replays[0].catalogSha256,
  replays[1].catalogSha256,
  "Both resets yield byte-identical schema catalog definitions",
);
assert.equal(replays[0].generatedTypesSha256, replays[1].generatedTypesSha256);
await writeFile(
  ".artifacts/task054/replays.json",
  JSON.stringify(
    { status: "PASS", baseline: manifest.baseline, commands, replays },
    null,
    2,
  ) + "\n",
);
console.log(
  "Two fresh Local replays, type generation, catalog determinism and behavior PASS. Finish regressions with npm run db:stop.",
);
