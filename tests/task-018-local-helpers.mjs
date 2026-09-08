// TASK-018 explicit Local-only acceptance helpers. Never emit raw CLI/SDK secrets.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { localEnv, assertLocalEndpoint } from "../tools/db/local.mjs";

export const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

export function localRuntime() {
  try {
    const env = localEnv(process.env);
    env.DOCKER_HOST = assertLocalEndpoint(
      env.DOCKER_HOST ?? "unix:///var/run/docker.sock",
    );
    delete env.DOCKER_CONTEXT;
    const label = execFileSync(
      "docker",
      [
        "inspect",
        "--format",
        '{{ index .Config.Labels "com.supabase.cli.project" }}',
        "supabase_db_travelassist",
      ],
      { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    assert.equal(label, "travelassist");
    const packagePath = require.resolve("supabase/package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
    const raw = execFileSync(
      process.execPath,
      [
        resolve(dirname(packagePath), pkg.bin.supabase),
        "status",
        "--output",
        "json",
      ],
      {
        cwd: root,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
      },
    );
    const status = JSON.parse(raw);
    for (const [key, port] of [
      ["API_URL", "54321"],
      ["DB_URL", "54322"],
      ["INBUCKET_URL", "54324"],
    ]) {
      const parsed = new URL(status[key]);
      assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname));
      assert.equal(parsed.port, port);
      assert.equal(parsed.search, "");
    }
    assert.ok(status.PUBLISHABLE_KEY?.startsWith("sb_publishable_"));
    assert.ok(status.SECRET_KEY?.startsWith("sb_secret_"));
    const db = postgres(status.DB_URL, {
      prepare: false,
      max: 1,
      onnotice: () => {},
      connect_timeout: 10,
    });
    const admin = createClient(status.API_URL, status.SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return {
      db,
      admin,
      api: status.API_URL,
      mail: status.INBUCKET_URL,
      key: status.PUBLISHABLE_KEY,
      env,
    };
  } catch {
    throw new Error(
      "TASK-018 Local-only preflight failed; raw output withheld.",
    );
  }
}

export async function startApp(local, configured = true) {
  const port = configured ? 3000 : 3001;
  const origin = "http://127.0.0.1:" + port;
  const env = {
    ...local.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  if (configured)
    Object.assign(env, {
      NEXT_PUBLIC_SUPABASE_URL: local.api,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.key,
      AUTH_SITE_URL: origin,
    });
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  // Drain framework logs, never publish request/SDK details.
  let ready = false;
  child.stdout.on("data", (chunk) => {
    if (/Ready in/.test(chunk.toString())) ready = true;
  });
  child.stderr.on("data", () => {});
  let ended = false;
  child.on("exit", () => {
    ended = true;
  });
  child.on("error", () => {
    ended = true;
  });
  const stop = async () => {
    if (!ended) {
      child.kill("SIGTERM");
      for (let i = 0; i < 40 && !ended; i++) await delay(100);
      assert.ok(ended, "Task-owned Next server must exit cleanly");
    }
  };
  for (let i = 0; i < 100 && !ended; i++) {
    try {
      if (!ready) {
        await delay(100);
        continue;
      }
      const response = await fetch(origin + "/auth/session");
      if ([200, 503].includes(response.status)) return { origin, stop };
    } catch {}
    await delay(100);
  }
  await stop();
  throw new Error("Task-owned Next production server did not become ready.");
}

export class CookieJar {
  values = new Map();
  constructor(other) {
    if (other) this.values = new Map(other.values);
  }
  getAll() {
    return [...this.values].map(([name, value]) => ({ name, value }));
  }
  setAll(cookies) {
    for (const { name, value, options } of cookies) {
      if (options?.maxAge === 0 || !value) this.values.delete(name);
      else this.values.set(name, value);
    }
  }
  header() {
    return this.getAll()
      .map(({ name, value }) => name + "=" + encodeURIComponent(value))
      .join("; ");
  }
  absorb(headers) {
    for (const cookie of headers.getSetCookie()) {
      const first = cookie.split(";")[0];
      const index = first.indexOf("=");
      const name = first.slice(0, index);
      if (/max-age=0(?:;|$)/i.test(cookie)) this.values.delete(name);
      else this.values.set(name, decodeURIComponent(first.slice(index + 1)));
    }
  }
  authEntries() {
    return this.getAll()
      .filter(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
  }
  session() {
    const value = this.authEntries()
      .map(({ value }) => value)
      .join("");
    assert.ok(value.startsWith("base64-"), "SDK session cookie is present");
    return JSON.parse(
      Buffer.from(value.slice(7), "base64url").toString("utf8"),
    );
  }
  replaceSession(payload) {
    const entries = this.authEntries();
    assert.ok(entries.length > 0);
    const name = entries[0].name.replace(/\.\d+$/, "");
    for (const entry of entries) this.values.delete(entry.name);
    const value =
      "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64url");
    for (let offset = 0; offset < value.length; offset += 3000)
      this.values.set(
        name + "." + offset / 3000,
        value.slice(offset, offset + 3000),
      );
  }
}

export async function authRequest(app, jar, operation, input, headers = {}) {
  const response = await fetch(app.origin + "/auth/" + operation, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      cookie: jar.header(),
      ...(input === undefined
        ? {}
        : { origin: app.origin, "content-type": "application/json" }),
      ...headers,
    },
    body: input === undefined ? undefined : JSON.stringify(input),
    redirect: "manual",
  });
  jar.absorb(response.headers);
  const body = await response.json();
  assert.doesNotMatch(
    JSON.stringify(body),
    /access_token|refresh_token|provider_token|sb_secret_/,
  );
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  return { response, body };
}

export async function latestMail(local, email, subjectPattern) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const listing = await (await fetch(local.mail + "/api/v1/messages")).json();
    const entry = listing.messages?.find(
      (message) =>
        message.To?.some((to) => to.Address === email) &&
        subjectPattern.test(message.Subject),
    );
    if (entry)
      return await (
        await fetch(local.mail + "/api/v1/message/" + entry.ID)
      ).json();
    await delay(100);
  }
  throw new Error("Expected task-owned Local capture email was not received.");
}

export async function followMail(local, app, jar, email, subjectPattern) {
  const message = await latestMail(local, email, subjectPattern);
  const html = (message.HTML ?? "").replaceAll("&amp;", "&");
  const matches = [...html.matchAll(/href=["']([^"']+)["']/g)];
  const url = matches
    .map((m) => new URL(m[1]))
    .find((v) => v.pathname === "/auth/v1/verify");
  assert.ok(
    url && url.origin === local.api,
    "Verification stays on exact Local Auth origin",
  );
  const verified = await fetch(url, { redirect: "manual" });
  assert.equal(verified.status, 303);
  const location = new URL(verified.headers.get("location"));
  assert.ok(
    location.origin === app.origin && location.pathname === "/auth/callback",
    "PKCE returns to canonical callback",
  );
  const response = await fetch(location, {
    headers: { cookie: jar.header() },
    redirect: "manual",
  });
  jar.absorb(response.headers);
  return response;
}
