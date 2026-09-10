// Real Local mail regression on a nonempty workstation: exact NEW fixtures only.
// Does not start/stop the existing app, reset DB, or use old shared phone fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { localRuntime } from "./task-018-local-helpers.mjs";

const local = localRuntime();
const emails = [0, 1].map(() => `wbs53-callback-${randomUUID()}@example.test`);
const counts = async () =>
  (
    await local.db`select (select count(*) from auth.users)::int users, (select count(*) from public.profiles)::int profiles, (select count(*) from public.profile_settings)::int settings, (select count(*) from public.emergency_contacts)::int contacts`
  )[0];
let ownedFixtures = false;
let baseline;
try {
  const node = process.env.WBS_WINDOWS_NODE;
  const playwright = process.env.CODEX_PLAYWRIGHT_PATH;
  const evidence = process.env.WBS_EVIDENCE_DIR;
  assert.ok(
    node && playwright && evidence,
    "Explicit existing runtime and evidence paths required",
  );
  const before =
    await local.db`select id from auth.users where email in ${local.db(emails)}`;
  assert.equal(before.length, 0, "Generated fixtures must not exist");
  baseline = await counts();
  ownedFixtures = true;
  const script = fileURLToPath(
    new URL("./wbs-5-3-auth-callback.browser.mjs", import.meta.url),
  );
  const windowsScript =
    "\\\\wsl.localhost\\TravelAssist-Ubuntu" + script.replaceAll("/", "\\");
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      node,
      [
        windowsScript,
        process.env.WBS_BROWSER ?? "chromium",
        ...emails,
        playwright,
        evidence,
      ],
      { stdio: ["ignore", "inherit", "pipe"] },
    );
    // Browser diagnostics deliberately omit raw credential-bearing URLs/errors.
    child.stderr.on("data", () => {});
    child.on("error", reject);
    child.on("exit", resolve);
  });
  assert.equal(exitCode, 0, "Inspect redacted browser phase/results");
} catch {
  console.log(
    "Local callback regression failed; raw credential-bearing errors withheld.",
  );
  process.exitCode = 1;
} finally {
  if (ownedFixtures) {
    const owned =
      await local.db`select id from auth.users where email in ${local.db(emails)}`;
    for (const { id } of owned) {
      const result = await local.admin.auth.admin.deleteUser(id);
      assert.equal(
        result.error,
        null,
        "Exact newly-created fixture cleanup failed",
      );
    }
    const after = await counts();
    assert.deepEqual(
      after,
      baseline,
      "Existing Auth/business counts must be preserved",
    );
    console.log(
      JSON.stringify({
        temporaryAccountsRemoved: owned.length,
        baselineCountsPreserved: true,
      }),
    );
  }
  await local.db.end();
}
