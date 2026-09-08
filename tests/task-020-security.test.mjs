import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  scanText,
  fingerprint,
  validateAllowlist,
  applyAllowlist,
  safePath,
} from "../tools/security/rules.mjs";
import {
  inspectBuffer,
  scanHistory,
  scanTracked,
  scanBundle,
  MAX_TEXT_BYTES,
  ROOT,
  inspect,
  newReport,
} from "../tools/security/scan.mjs";
import {
  analyzeModule,
  inspectGraph,
  scanBoundary,
} from "../tools/security/boundary.mjs";

const fake = (prefix, size = 36) =>
  prefix + "SyntheticFixture9".repeat(8).slice(0, size);
const has = (text, category, path = "sample.txt", options = {}) =>
  scanText(text, path, options).some((x) => x.category === category);
for (const [category, prefix] of [
  ["github-token", "ghp_"],
  ["github-token", "github_pat_"],
  ["supabase-secret", "sb_secret_"],
  ["mapbox-secret", "sk."],
  ["mapbox-public", "pk."],
  ["supabase-public", "sb_publishable_"],
  ["gcp-key", "AIza"],
  ["google-oauth-secret", "GOCSPX-"],
  ["payment-key", "sk_live_"],
])
  test(category + " pattern is redacted", () => {
    const input = fake(prefix),
      r = scanText(input, "sample.txt");
    assert.ok(
      r.some((x) => x.category === category),
      "Expected category detected",
    );
    assert.ok(!JSON.stringify(r).includes(input), "Raw input never serialized");
  });
test("fake private key is detected without key block disclosure", () => {
  const label = ["PRIVATE", "KEY"].join(" ");
  const input = [
    "-----BEGIN " + label + "-----",
    fake("", 100),
    "-----END " + label + "-----",
  ].join("\n");
  const r = scanText(input, "key.txt");
  assert.ok(r.some((x) => x.category === "private-key"));
  assert.ok(!JSON.stringify(r).includes(input));
});
test("AWS and Azure patterns", () => {
  assert.ok(has("AKIA" + "Z".repeat(16), "aws-access-id"));
  assert.ok(has("AccountKey=" + "z".repeat(50) + "==", "azure-key"));
  assert.ok(has("https://example.test/?sig=" + "z".repeat(35), "azure-sas"));
});
test("Supabase legacy JWT role is classified, never decoded into report", () => {
  const encode = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  for (const role of ["service_role", "anon", "authenticated"]) {
    const jwt =
      encode({ alg: "HS256" }) +
      "." +
      encode({ role }) +
      "." +
      fake("signature");
    const r = scanText(jwt, "jwt.txt");
    assert.ok(
      r.some(
        (x) =>
          x.category ===
          (role === "service_role"
            ? "jwt-service-role"
            : role === "anon"
              ? "jwt-public"
              : "jwt-token"),
      ),
    );
    assert.ok(!JSON.stringify(r).includes(jwt));
  }
});
test("URL credentials / generic assignments / bearer", () => {
  assert.ok(
    has("postgres://local:" + fake("") + "@example.test/db", "url-credentials"),
  );
  assert.ok(has('password="' + fake("") + '"', "generic-credential"));
  assert.ok(has("Authorization: Bearer " + fake(""), "bearer-value"));
});
test("unquoted config and camelCase literals scan; JS property copies do not", () => {
  const value = fake("");
  assert.ok(has("secret: " + value, "generic-credential", "config.yml"));
  assert.ok(
    has('clientSecret: "' + value + '"', "generic-credential", "app.ts"),
  );
  assert.ok(
    has(
      'password: "' + ["process", value].join(".") + '"',
      "generic-credential",
      "app.js",
    ),
  );
  assert.ok(!has("password=r.password,", "generic-credential", "chunk.js"));
});
test("empty env examples, comments and explicit placeholders do not consume following lines", () => {
  const text =
    "DATABASE_URL=\n# comment\nSUPABASE_SECRET_KEY=\nNEXT_PUBLIC_MAPBOX_TOKEN=\nAPI_KEY=YOUR_API_KEY\n";
  assert.ok(scanText(text, ".env.example").length === 0);
  assert.ok(has("NAME=literal-value", "env-template-value", ".env.example"));
  assert.ok(has("", "env-file", ".env.production"));
});
test("public server-secret alias denied even if empty", () => {
  assert.ok(
    has("NEXT_PUBLIC_" + "DATABASE_URL=", "public-env-secret", ".env.example"),
  );
});
test("allowlist exact category/path/fingerprint/scope, not public implies secret", () => {
  const value = fake("pk."),
    hit = scanText(value, "public.txt").find(
      (x) => x.category === "mapbox-public",
    );
  const entries = validateAllowlist(
    {
      version: 1,
      entries: [
        {
          path: "public.txt",
          category: "mapbox-public",
          fingerprint: fingerprint(value),
          scope: "tracked",
          reason: "Synthetic public boundary fixture only",
          expires: "2026-12-09",
        },
      ],
    },
    "2026-09-09",
  );
  assert.ok(applyAllowlist([hit], entries, "tracked")[0].allowed);
  for (const item of [
    { ...hit, path: "other.txt" },
    { ...hit, category: "mapbox-secret" },
    { ...hit, fingerprint: fingerprint("other") },
  ])
    assert.ok(!applyAllowlist([item], entries, "tracked")[0].allowed);
  assert.ok(!applyAllowlist([hit], entries, "history")[0].allowed);
});
test("allowlist reason, expiry, wildcard and duplicate validation", () => {
  const entry = {
    path: "fixture.txt",
    category: "github-token",
    fingerprint: fingerprint("fixture"),
    scope: "tracked",
    reason: "Reviewed synthetic fixture for scanner test",
    expires: "2026-12-09",
  };
  for (const change of [
    { reason: "" },
    { expires: "2026-01-01" },
    { expires: "2026-02-30" },
    { path: "**" },
    { category: "*" },
    { path: "../outside" },
    { fingerprint: "short" },
    { scope: "*" },
  ])
    assert.throws(
      () =>
        validateAllowlist(
          { version: 1, entries: [{ ...entry, ...change }] },
          "2026-09-09",
        ),
      { name: "Error" },
    );
  assert.throws(
    () =>
      validateAllowlist({ version: 1, entries: [entry, entry] }, "2026-09-09"),
    { name: "Error" },
  );
});
test("binary, oversize, UTF16 and UTF8 safety", () => {
  assert.ok(inspectBuffer(Buffer.from([0, 1, 2])).skip === "binary");
  assert.ok(
    inspectBuffer(Buffer.alloc(MAX_TEXT_BYTES + 1)).skip === "oversize",
  );
  const input = fake("sb_secret_");
  const utf16 = Buffer.concat([
    Buffer.from([255, 254]),
    Buffer.from(input, "utf16le"),
  ]);
  assert.ok(has(inspectBuffer(utf16).text, "supabase-secret"));
  assert.ok(inspectBuffer(Buffer.from([255, 253, 251])).skip !== undefined);
});
test("unsafe filename and invalid CLI args never echo secret", () => {
  const value = fake("ghp_");
  assert.ok(!safePath(value).includes(value));
  const result = spawnSync(
    process.execPath,
    ["tools/security/scan.mjs", value],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.ok(result.status === 2);
  assert.ok(!(result.stdout + result.stderr).includes(value));
});
test("private env filenames cannot hide behind binary skip", () => {
  const report = newReport("tracked");
  inspect(report, ".env.local", Buffer.from([0, 1, 2]));
  assert.ok(report.skipped.length === 1);
  assert.ok(report.findings.some((x) => x.category === "env-file"));
});
test("bundle rejects env names and injected canary, permits empty public references", () => {
  assert.ok(
    has("DATABASE_URL", "client-secret-marker", "chunk.js", {
      scope: "bundle",
    }),
  );
  const value = fake("canary_");
  assert.ok(
    has(value, "client-canary", "chunk.js", {
      scope: "bundle",
      canaries: [value],
    }),
  );
  assert.ok(
    scanText("process.env.NEXT_PUBLIC_MAPBOX_TOKEN", "chunk.js", {
      scope: "bundle",
    }).length === 0,
  );
});
test("AST follows static/dynamic/re-export imports but skips type-only edges", () => {
  const m = analyzeModule(
    '"use client"; import type {X} from "./types"; export type {Y} from "./types2"; import {type Z} from "./types3"; import("./lazy"); export {x} from "./barrel"; const y=require("./required");',
    "entry.ts",
  );
  assert.ok(m.client && m.imports.length === 3);
});
test("transitive server-only and DB packages rejected", () => {
  const modules = new Map([
    [
      "src/client.ts",
      analyzeModule('"use client"; import "./shared";', "a.ts"),
    ],
    ["src/shared.ts", analyzeModule('export * from "./secret";', "b.ts")],
    [
      "src/secret.ts",
      analyzeModule(
        'import "server-only"; import "postgres"; const x=process.env.DATABASE_URL;',
        "c.ts",
      ),
    ],
  ]);
  const r = inspectGraph(modules, (_, s) =>
    s === "./shared"
      ? "src/shared.ts"
      : s === "./secret"
        ? "src/secret.ts"
        : null,
  );
  assert.ok(r.findings.some((x) => x.category === "server-module-in-client"));
  assert.ok(r.findings.some((x) => x.category === "private-env-in-client"));
});
test("dynamic env aliases and dynamic module references fail closed in clients", () => {
  const modules = new Map([
    [
      "src/client.ts",
      analyzeModule(
        '"use client"; const env=process.env; import(variable);',
        "c.ts",
      ),
    ],
  ]);
  const r = inspectGraph(modules, () => null);
  assert.ok(r.findings.some((x) => x.category === "private-env-in-client"));
  assert.ok(r.findings.some((x) => x.category === "unresolved-client-import"));
});
test("server actions require guarded boundary and do not traverse as client code", () => {
  const modules = new Map([
    [
      "src/client.ts",
      analyzeModule('"use client"; import "./action";', "c.ts"),
    ],
    [
      "src/action.ts",
      analyzeModule(
        '"use server"; import "server-only"; const x=process.env.DATABASE_URL;',
        "a.ts",
      ),
    ],
  ]);
  assert.ok(
    inspectGraph(modules, (_, s) => (s === "./action" ? "src/action.ts" : null))
      .findings.length === 0,
  );
});
test("high-risk logs are findings without logging their arguments", () => {
  const m = analyzeModule(
    'console.error("Request failed", error); console.log(process.env);',
    "server.ts",
  );
  assert.ok(m.risks.includes("sensitive-log-surface"));
});
test("current source graph and ignore protection", () =>
  assert.ok(scanBoundary().status === "PASS"));

test("history includes deleted secrets and commit text; reports stay redacted", async () => {
  const dir = mkdtempSync(join(tmpdir(), "travelassist-security-test-"));
  const run = (args) =>
    execFileSync("git", args, {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  const value = fake("ghp_");
  try {
    run(["init", "-q"]);
    run(["config", "user.email", "fixture@example.test"]);
    run(["config", "user.name", "Security Fixture"]);
    writeFileSync(join(dir, "old.txt"), value);
    writeFileSync(join(dir, "binary.bin"), Buffer.from([0, 1, 2]));
    run(["add", "."]);
    run(["commit", "-qm", "synthetic history case " + value]);
    rmSync(join(dir, "old.txt"));
    run(["add", "-u"]);
    run(["commit", "-qm", "delete fixture"]);
    const r = await scanHistory(dir);
    assert.ok(r.counts.commits === 2);
    assert.ok(
      r.findings.some(
        (x) => x.category === "github-token" && x.commit !== "not-associated",
      ),
    );
    assert.ok(r.skipped.some((x) => x.reason === "binary"));
    assert.ok(!JSON.stringify(r).includes(value));
    assert.ok(r.findings.some((x) => x.path === "<commit-message>"));
    assert.ok(scanTracked(dir).findings.length === 0);
    assert.deepEqual(
      scanTracked(dir),
      scanTracked(dir),
      "Same inputs produce identical reports",
    );
    assert.ok(scanBundle(dir).status === "INCOMPLETE");
    mkdirSync(join(dir, ".next/static"), { recursive: true });
    writeFileSync(join(dir, ".next/static/test.js"), "DATABASE_URL");
    assert.ok(scanBundle(dir).status === "FINDINGS");
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 50,
    });
  }
});
