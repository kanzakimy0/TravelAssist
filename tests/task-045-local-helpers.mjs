// Explicit localhost-only QA, with redacted failures and no silent skip.
import { execFileSync } from "node:child_process";
import { localRuntime } from "./task-018-local-helpers.mjs";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
export function preferenceLocalRuntime() {
  const previous = process.env.DOCKER_HOST,
    context = process.env.DOCKER_CONTEXT;
  try {
    const env = localEnv(process.env);
    const endpoint =
      !env.DOCKER_HOST || env.DOCKER_CONTEXT
        ? JSON.parse(
            execFileSync("docker", ["context", "inspect"], {
              env,
              encoding: "utf8",
              windowsHide: true,
              stdio: ["ignore", "pipe", "pipe"],
              timeout: 10000,
            }),
          )[0].Endpoints.docker.Host
        : env.DOCKER_HOST;
    process.env.DOCKER_HOST = assertLocalEndpoint(endpoint);
    delete process.env.DOCKER_CONTEXT;
    return localRuntime();
  } catch {
    throw new Error(
      "TASK-045 real Local Supabase unavailable; acceptance BLOCKED (credentials withheld)",
    );
  } finally {
    if (previous === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = previous;
    if (context !== undefined) process.env.DOCKER_CONTEXT = context;
  }
}
