// Local-only fixture connection; CLI secrets stay in memory and are never printed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
export function localConnection(configureService = false) {
  const env = localEnv(process.env);
  let endpoint = env.DOCKER_HOST;
  try {
    if (!endpoint || env.DOCKER_CONTEXT) {
      endpoint = JSON.parse(
        execFileSync("docker", ["context", "inspect"], {
          env,
          encoding: "utf8",
        }),
      )[0].Endpoints.docker.Host;
    }
    env.DOCKER_HOST = assertLocalEndpoint(endpoint);
    delete env.DOCKER_CONTEXT;
    const label = execFileSync(
      "docker",
      [
        "inspect",
        "--format",
        '{{ index .Config.Labels "com.supabase.cli.project" }}',
        "supabase_db_travelassist",
      ],
      { env, encoding: "utf8" },
    ).trim();
    assert.equal(label, "travelassist");
    const pkgPath = require.resolve("supabase/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const raw = execFileSync(
      process.execPath,
      [
        resolve(dirname(pkgPath), pkg.bin.supabase),
        "status",
        "--output",
        "json",
      ],
      {
        cwd: root,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      },
    );
    const status = JSON.parse(raw);
    const url = new URL(status.DB_URL);
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
    assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
    assert.equal(url.port, "54322");
    assert.equal(url.pathname, "/postgres");
    assert.equal(url.search, "");
    if (configureService) {
      const api = new URL(status.API_URL);
      assert.ok(["127.0.0.1", "localhost"].includes(api.hostname));
      assert.equal(api.port, "54321");
      assert.equal(api.protocol, "http:");
      const key = status.PUBLISHABLE_KEY;
      assert.ok(key && status.SERVICE_ROLE_KEY);
      // Local-only fixture environment, never written to disk or returned to a browser.
      process.env.DATABASE_URL = url.href;
      process.env.SUPABASE_URL = api.href;
      process.env.NEXT_PUBLIC_SUPABASE_URL = api.href;
      process.env.AUTH_SITE_URL = "http://127.0.0.1";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
      return {
        admin: createClient(api.href, status.SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
        session: () =>
          createClient(api.href, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          }),
      };
    }
    // Never print/store the CLI JSON or connection URL.
    return postgres(url.href, {
      prepare: false,
      max: 1,
      onnotice: () => {},
      connect_timeout: 10,
    });
  } catch {
    throw new Error(
      "Local TASK-017 database preflight failed; raw credential-bearing output withheld.",
    );
  }
}
