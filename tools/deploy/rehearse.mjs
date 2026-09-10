import { spawn } from "node:child_process";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { buildLocalRelease } from "./artifact.mjs";
import { localDeploymentEnvironment } from "./local-environment.mjs";
import { activateRelease, readActiveRelease } from "./release-state.mjs";
import { runSmoke } from "./smoke.mjs";

const port = Number.parseInt(process.env.TASK_025_PORT ?? "3132", 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("TASK_025_PORT must be a valid unprivileged port.");

const release = await buildLocalRelease({ port });
const stateRoot = path.resolve(".artifacts", "task-025");
const previous = await readActiveRelease(stateRoot);
await activateRelease(
  stateRoot,
  release.manifest.commitSha,
  previous?.commitSha ?? null,
);

const environment = {
  ...localDeploymentEnvironment({ port }),
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
};
const server = spawn(
  process.execPath,
  [path.join(release.target, "server.js")],
  {
    cwd: release.target,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput = `${serverOutput}${chunk}`.slice(-4_000);
});
server.stderr.on("data", (chunk) => {
  serverOutput = `${serverOutput}${chunk}`.slice(-4_000);
});

async function waitUntilReady() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const result = await fetch(`http://127.0.0.1:${port}/api/health/live`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (result.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Local server failed to start. ${serverOutput}`);
}

try {
  await waitUntilReady();
  const checks = await runSmoke(`http://127.0.0.1:${port}`);
  const evidence = {
    task: "TASK-025-A",
    status: "pass",
    scope: "local standalone deployment rehearsal",
    commitSha: release.manifest.commitSha,
    appEnvironment: "development",
    targetId: "local",
    externalDeployment: "not-run",
    productionDeployment: "not-authorized",
    artifactAudit: {
      ok: release.verification.ok,
      fileCount: release.verification.fileCount,
    },
    checks,
    previousRelease: previous?.commitSha ?? null,
    rollbackControl: previous
      ? "previous release remains available"
      : "no prior local artifact; rollback state logic covered by tests",
  };
  await writeFile(
    path.join(stateRoot, "rehearsal.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  server.kill();
}
