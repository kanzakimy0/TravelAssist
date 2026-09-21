// Run the actual production build with synthetic server canaries, not host secrets.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, scanBundle, saveReport, summary } from "./scan.mjs";
import { fingerprint, validateAllowlist } from "./rules.mjs";

try {
  if (
    [".env", ".env.local", ".env.production", ".env.production.local"].some(
      (p) => existsSync(resolve(ROOT, p)),
    )
  )
    throw new Error("PRIVATE_ENV_PRESENT_USE_CLEAN_WORKTREE");
  const safeNames =
    /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|LANG|LC_ALL|NUMBER_OF_PROCESSORS)$/i;
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => safeNames.test(key)),
  );
  const canaries = Array.from(
    { length: 5 },
    () => "SECURITY_CANARY_" + randomBytes(24).toString("hex"),
  );
  Object.assign(env, {
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    SUPABASE_SECRET_KEY: canaries[0],
    SUPABASE_SERVICE_ROLE_KEY: canaries[1],
    DATABASE_URL:
      "postgres://fixture:" + canaries[2] + "@127.0.0.1:1/unavailable",
    OAUTH_CLIENT_SECRET: canaries[3],
    MAPBOX_SECRET_TOKEN: canaries[4],
  });
  const result = spawnSync(
    process.execPath,
    [resolve(ROOT, "node_modules/next/dist/bin/next"), "build"],
    {
      cwd: ROOT,
      env,
      encoding: "utf8",
      windowsHide: true,
      timeout: 300000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  // Even compiler failures may contain source literals. Never echo captured logs.
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.status !== 0) {
    console.error(
      JSON.stringify({
        status: "BUILD_FAILED",
        exitCode: result.status,
        outputFingerprint: fingerprint(output),
      }),
    );
    process.exitCode = 1;
  } else {
    const entries = validateAllowlist(
      JSON.parse(
        readFileSync(resolve(ROOT, "tools/security/allowlist.json"), "utf8"),
      ),
    );
    const report = scanBundle(ROOT, entries, canaries);
    report.syntheticServerCanaries = canaries.length;
    report.productionBuild = "PASS";
    saveReport(ROOT, report);
    console.log(
      JSON.stringify(
        {
          ...summary(report),
          productionBuild: "PASS",
          syntheticServerCanaries: canaries.length,
        },
        null,
        2,
      ),
    );
    process.exitCode = report.status === "PASS" ? 0 : 1;
  }
} catch (error) {
  console.error(
    JSON.stringify({
      status: "INCOMPLETE",
      fingerprint: fingerprint(String(error?.message ?? "unknown")),
    }),
  );
  process.exitCode = 2;
}
