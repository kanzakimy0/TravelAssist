// Explicit Local-only UI acceptance. No reset; exact task-owned fixture cleanup.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { localRuntime, startApp } from "./task-018-local-helpers.mjs";
const local = localRuntime();
const counts = async () =>
  (
    await local.db.unsafe(
      "select (select count(*) from auth.users)::int as users, (select count(*) from public.profiles)::int as profiles, (select count(*) from public.profile_settings)::int as settings, (select count(*) from public.emergency_contacts)::int as contacts",
    )
  )[0];
if (process.argv.includes("--counts")) {
  try {
    console.log(JSON.stringify(await counts()));
  } finally {
    await local.db.end();
  }
} else {
  let app;
  let empty = false;
  const email = `wbs53-${randomUUID()}@example.test`;
  const unknown = `wbs53-unregistered-${randomUUID()}@example.test`;
  try {
    const before = await counts();
    assert.ok(
      Object.values(before).every((n) => n === 0),
      "Refuse a nonempty/valuable Local stack",
    );
    empty = true;
    app = await startApp(local);
    console.log(
      "PASS: zero-data Local preflight; task-owned production Next ready",
    );
    const node = process.env.WBS_WINDOWS_NODE;
    const playwright = process.env.CODEX_PLAYWRIGHT_PATH;
    assert.ok(
      node && playwright,
      "Explicit existing Windows runtime paths required",
    );
    const script = fileURLToPath(
      new URL("./wbs-5-3-auth-user-flow.browser.mjs", import.meta.url),
    );
    const windowsScript =
      "\\\\wsl.localhost\\TravelAssist-Ubuntu" + script.replaceAll("/", "\\");
    const code = await new Promise((resolve, reject) => {
      const child = spawn(
        node,
        [
          windowsScript,
          "--playwright",
          playwright,
          "--base",
          app.origin,
          "--email",
          email,
          "--unknown",
          unknown,
          "--evidence",
          "F:\\TravelAssist-wbs53-evidence\\browser",
          "--engine",
          process.env.WBS_BROWSER ?? "chromium",
        ],
        { stdio: ["ignore", "inherit", "inherit"] },
      );
      child.on("error", reject);
      child.on("exit", resolve);
    });
    assert.equal(
      code,
      0,
      "Browser UI acceptance failed; inspect redacted phase evidence",
    );
    assert.equal(
      Number(
        (
          await local.db`select count(*) from auth.users where email = ${unknown}`
        )[0].count,
      ),
      0,
      "Email OTP never registered unknown address",
    );
    for (const table of ["profiles", "profile_settings", "emergency_contacts"])
      assert.equal(
        Number(
          (await local.db.unsafe("select count(*) from public." + table))[0]
            .count,
        ),
        0,
        "No automatic product profile initialization",
      );
    console.log(
      "PASS: real UI flows, unknown-email count zero, no business initialization",
    );
  } finally {
    if (app) await app.stop();
    if (empty) {
      const owned =
        await local.db`select id from auth.users where email = ${email} or email = ${unknown} or phone = '12025550181'`;
      for (const { id } of owned) {
        const result = await local.admin.auth.admin.deleteUser(id);
        assert.equal(result.error, null, "Task fixture cleanup failed");
      }
      console.log("Final Local counts: " + JSON.stringify(await counts()));
    }
    await local.db.end();
  }
}
