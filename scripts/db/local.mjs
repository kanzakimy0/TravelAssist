import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const typePath = resolve(root, "src/types/database.generated.ts");
const cli = resolve(root, "node_modules/supabase/dist/supabase.js");

export function redact(text) {
  return String(text)
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]")
    .replace(/sb_(?:secret|publishable)_[\w-]+/g, "[REDACTED_KEY]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[REDACTED_JWT]");
}

export function assertLocalEndpoint(endpoint) {
  if (/^unix:\/\/\/[^/]/.test(endpoint)) return;
  if (/^npipe:\/\/\/\/\.\/pipe\/[\w./-]+$/.test(endpoint)) return;
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    /* reject below */
  }
  if (
    parsed?.protocol === "tcp:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)
  )
    return;
  throw new Error(
    "DB tooling only permits a local Docker socket/loopback daemon, not a remote Docker context.",
  );
}

function localDocker() {
  if (process.env.DOCKER_HOST) assertLocalEndpoint(process.env.DOCKER_HOST);
  const result = spawnSync("docker", ["context", "inspect"], {
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Local Supabase requires an installed, running Docker-compatible runtime. Docker context is unavailable.",
    );
  }
  const contexts = JSON.parse(result.stdout);
  if (!contexts[0]?.Endpoints?.docker?.Host)
    throw new Error("Docker local endpoint is unavailable.");
  assertLocalEndpoint(contexts[0].Endpoints.docker.Host);
}

export function commandArgs(command, extras = []) {
  if (command === "migration-new") {
    if (
      extras.length !== 1 ||
      !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(extras[0])
    ) {
      throw new Error(
        "Use db:migration:new -- verb_description (lowercase snake_case). No flags/paths accepted.",
      );
    }
    return ["migration", "new", extras[0]];
  }
  if (extras.length)
    throw new Error(
      "DB scripts do not accept extra flags or remote connection arguments.",
    );
  const commands = {
    start: ["start"],
    stop: ["stop"], // Preserve local data volumes; no --no-backup.
    status: ["status", "--output", "json"],
    reset: ["db", "reset", "--local", "--yes"],
    lint: [
      "db",
      "lint",
      "--local",
      "--schema",
      "public",
      "--fail-on",
      "warning",
    ],
    test: ["test", "db", "--local", "supabase/tests/database"],
    types: [
      "gen",
      "types",
      "--local",
      "--lang",
      "typescript",
      "--schema",
      "public",
    ],
    "types-check": [
      "gen",
      "types",
      "--local",
      "--lang",
      "typescript",
      "--schema",
      "public",
    ],
  };
  if (!commands[command]) throw new Error("Unknown local DB command.");
  return commands[command];
}

export function publicStatus(raw) {
  const status = JSON.parse(raw);
  // Never log the CLI credential object (including JWT/S3 signing secrets).
  const safe = {};
  for (const key of ["API_URL", "REST_URL", "STUDIO_URL", "MAILPIT_URL"]) {
    const value = status[key];
    if (typeof value !== "string") continue;
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Local status contains an unexpected service URL.");
    safe[key] = value;
  }
  return JSON.stringify({ state: "running", services: safe }, null, 2);
}

function runCli(args, capture = false) {
  // CLI operations are explicitly local, and never read Next's .env.local.
  const env = {
    ...process.env,
    SUPABASE_TELEMETRY_DISABLED: "1",
    DO_NOT_TRACK: "1",
  };
  for (const key of Object.keys(env)) {
    if (
      /^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|DATABASE_URL$|PG)/.test(key) &&
      key !== "SUPABASE_TELEMETRY_DISABLED"
    )
      delete env[key];
  }
  const result = spawnSync(process.execPath, [cli, ...args, "--agent", "no"], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 15 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
  // Successful start prints connection credentials in a human-readable table.
  // Suppress that table entirely; db:status offers a small endpoint-only view.
  const credentialOutput = args[0] === "start" || args[0] === "status";
  if (result.stderr && !credentialOutput)
    process.stderr.write(redact(result.stderr));
  if (!capture && result.stdout && !credentialOutput)
    process.stdout.write(redact(result.stdout));
  if (result.error || result.status !== 0)
    throw new Error(
      `Local Supabase command failed (exit ${result.status ?? "unavailable"}).`,
    );
  return result.stdout;
}

export async function formattedTypes(raw) {
  if (
    !/^export type Json\s*=/.test(raw.trimStart()) ||
    !raw.includes("export type Database")
  ) {
    throw new Error(
      "CLI did not return TypeScript database types; existing output was not overwritten.",
    );
  }
  const config = await resolveConfig(typePath);
  return format(
    `// Generated by Supabase CLI from the local public schema. Do not edit.\n${raw}`,
    { ...config, parser: "typescript" },
  );
}

async function generateTypes(check = false) {
  const content = await formattedTypes(runCli(commandArgs("types"), true));
  if (check) {
    const current = existsSync(typePath)
      ? readFileSync(typePath, "utf8").replace(/\r\n/g, "\n")
      : "";
    if (current !== content)
      throw new Error(
        "Generated database types are stale/missing. Run db:types and commit the CLI output.",
      );
    process.stdout.write("Local database generated types match.\n");
    return;
  }
  // Only publish a complete, successful CLI result; failed generation leaves the file intact.
  const temporary = `${typePath}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, typePath);
  process.stdout.write(
    "Generated src/types/database.generated.ts from Local Supabase.\n",
  );
}

export async function main(command, extras = []) {
  const args = commandArgs(command, extras);
  if (command !== "migration-new") localDocker();
  if (command === "types" || command === "types-check")
    return generateTypes(command === "types-check");
  const output = runCli(args);
  if (command === "start")
    process.stdout.write(
      "Local Supabase started. Credentials are not logged.\n",
    );
  if (command === "status") process.stdout.write(`${publicStatus(output)}\n`);
  if (command === "reset") await generateTypes();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv[2], process.argv.slice(3)).catch((error) => {
    process.stderr.write(`${redact(error.message)}\n`);
    process.exitCode = 1;
  });
}
