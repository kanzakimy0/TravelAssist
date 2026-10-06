import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";

// Allow execution metadata and local tool discovery; do not forward arbitrary credentials.
export function testEnvironment(source = process.env) {
  const allowed =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|SYSTEMDRIVE|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|LANG|LC_ALL|TZ|CI|PYTHON|PYTHONUTF8|TASK086_PYTHON|TASK086_VERIFY_PUBLISHED|TASK086_VERIFIED_LANES_DIR|TASK086_REBUILD_RECEIPT|GITHUB_SHA|GITHUB_REF|GITHUB_REF_NAME|GITHUB_HEAD_REF|GITHUB_BASE_REF|GITHUB_EVENT_NAME|GITHUB_EVENT_PATH|GITHUB_RUN_ID|GITHUB_RUN_ATTEMPT|GITHUB_JOB|GITHUB_WORKSPACE|GITHUB_SERVER_URL|GITHUB_REPOSITORY|EXPECTED_HEAD)$/i;
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => allowed.test(key)),
  );
}
export async function execute({ command, args, cwd, env, timeoutMs, logPath }) {
  const startedAt = new Date().toISOString();
  const fd = fs.openSync(logPath, "wx");
  let timeout = false,
    cancellation = null,
    error = null,
    bytes = 0;
  const child = spawn(command, args, {
    cwd,
    env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const kill = () => {
    if (!child.pid) return;
    if (process.platform === "win32")
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already exited */
      }
    }
  };
  const onTerm = () => {
    cancellation = "SIGTERM";
    kill();
  };
  const onInt = () => {
    cancellation = "SIGINT";
    kill();
  };
  process.once("SIGTERM", onTerm);
  process.once("SIGINT", onInt);
  const timer = setTimeout(() => {
    timeout = true;
    kill();
  }, timeoutMs);
  const collect = (chunk) => {
    bytes += chunk.length;
    if (bytes > 64 * 1024 * 1024) {
      error = "LOG_LIMIT";
      kill();
      return;
    }
    fs.writeSync(fd, chunk);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const result = await new Promise((resolve) => {
    child.on("error", (e) => {
      error = e.code;
    });
    child.on("close", (exitCode, signal) =>
      resolve({ exitCode, signal: cancellation ?? signal }),
    );
  });
  clearTimeout(timer);
  process.removeListener("SIGTERM", onTerm);
  process.removeListener("SIGINT", onInt);
  fs.closeSync(fd);
  return {
    ...result,
    timeout,
    error,
    timeoutMs,
    startedAt,
    endedAt: new Date().toISOString(),
    argv: [command, ...args],
    cwd,
  };
}
