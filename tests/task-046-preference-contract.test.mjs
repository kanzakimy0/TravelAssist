import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";
import { build } from "esbuild";
import * as publicApi from "../src/shared/contracts/preferences/index.ts";
import * as core from "../src/shared/contracts/preferences/core.ts";
import * as oldCore from "../src/features/preferences/domain/preference-v1.ts";
import * as resource from "../src/shared/contracts/preferences/persistence-resource.ts";
import * as oldResource from "../src/features/preferences/persistence/preference-resource.ts";
import { readCurrentLongTermPreference } from "../src/lib/preferences/client.ts";
import { finalizePreferenceReadResponse } from "../src/server/preferences/public-read.ts";
import { consumePreference } from "./fixtures/task-046-a-consumer.ts";
import {
  validPayloads,
  invalidPayloads,
  expectedDetails,
} from "./task-042-preference-fixtures.mjs";
const {
  toLongTermPreferenceReadV1: project,
  parseLongTermPreferenceReadV1: parse,
} = publicApi;
const time = "2026-09-11T13:00:00.123456+09:00";
const data = (
  preference = { schemaVersion: "1.0", values: {} },
  revision = 1,
  updatedAt = time,
) => ({ preference, revision, updatedAt });
const invalid = (e) => e.code === "INVALID_PREFERENCE_RESPONSE";
const unsupported = (e) => e.code === "UNSUPPORTED_PREFERENCE_VERSION";
const text = (p) => readFileSync(p, "utf8").replaceAll("\r\n", "\n");
test("single canonical implementation and compatibility references, mechanical extraction", () => {
  assert.deepEqual(Object.keys(oldCore), Object.keys(core));
  for (const key of Object.keys(core)) assert.equal(oldCore[key], core[key]);
  for (const key of Object.keys(resource))
    assert.equal(oldResource[key], resource[key]);
  const baseline = execFileSync(
    "git",
    [
      "show",
      "6750a50d9fc49e561e60d25e7ebfc90c76c60a60:src/features/preferences/domain/preference-v1.ts",
    ],
    { encoding: "utf8" },
  ).replaceAll("\r\n", "\n");
  assert.equal(
    text("src/shared/contracts/preferences/core.ts"),
    baseline.replace(
      "TASK-042-B: B-internal long-term facts, not the WBS 5.14 public contract.",
      "TASK-042-B canonical semantics, promoted by TASK-046-B. Public reads use index.ts.",
    ),
  );
  const prior = execFileSync(
    "git",
    [
      "show",
      "6750a50d9fc49e561e60d25e7ebfc90c76c60a60:src/features/preferences/persistence/preference-resource.ts",
    ],
    { encoding: "utf8" },
  ).replaceAll("\r\n", "\n");
  assert.equal(
    text("src/shared/contracts/preferences/persistence-resource.ts"),
    prior.replace('"../domain/preference-v1"', '"./core"'),
  );
});
for (const [i, payload] of validPayloads.entries())
  test("public projection preserves independent 5.11 valid vector " + i, () => {
    const input = data(payload),
      before = JSON.stringify(input),
      actual = project(input);
    assert.deepEqual(actual.preference, payload);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(parse(JSON.parse(JSON.stringify(actual))), actual);
    assert.notEqual(actual.preference, payload);
    assert.ok(Object.isFrozen(actual.preference.values));
    assert.deepEqual(consumePreference(actual), actual);
  });
for (const [i, payload] of invalidPayloads.entries())
  test("public projection rejects independent 5.11 invalid vector " + i, () =>
    assert.throws(
      () => project(data(payload)),
      (e) => e instanceof publicApi.PreferenceReadValidationError,
    ),
  );
test("missing and persisted reset-empty are distinct and exact", () => {
  assert.equal(project(data(undefined, 0, null)).sourceRevision, 0);
  assert.equal(project(data()).sourceRevision, 1);
  assert.throws(() => project(data(undefined, 0, time)), invalid);
  assert.throws(
    () =>
      project(
        data(
          { schemaVersion: "1.0", values: { "mobility.noBus": false } },
          0,
          null,
        ),
      ),
    invalid,
  );
  assert.throws(() => project(data(undefined, 1, null)), invalid);
  for (const fixture of [
    publicApi.syntheticMissingPreferenceReadV1,
    publicApi.syntheticResetPreferenceReadV1,
    publicApi.syntheticExplicitPreferenceReadV1,
  ])
    assert.deepEqual(parse(fixture), fixture);
});
test("all interests/details with absent parent remain detached and deeply frozen", () => {
  const input = data({
    schemaVersion: "1.0",
    values: {
      "interests.details": structuredClone(expectedDetails),
      "interests.preferences": {},
    },
  });
  const result = project(input);
  assert.deepEqual(result.preference, input.preference);
  const details = result.preference.values["interests.details"];
  assert.ok(
    Object.isFrozen(result) &&
      Object.isFrozen(result.preference) &&
      Object.isFrozen(details),
  );
  for (const k of core.interestCodes) {
    assert.ok(Object.isFrozen(details[k]));
    assert.notEqual(
      details[k],
      input.preference.values["interests.details"][k],
    );
  }
  assert.throws(() => details.photography.push("landscape"), TypeError);
  input.preference.values["interests.details"].photography.length = 0;
  assert.ok(details.photography.length > 0);
});
test("strengths derive from registry without exposing field parsers or UI tiers", () => {
  assert.equal(Object.keys(publicApi.preferenceStrengths).length, 23);
  for (const key of core.preferenceKeys)
    assert.equal(
      publicApi.preferenceStrengths[key],
      core.preferenceFields[key].strength,
    );
  assert.deepEqual(
    Object.entries(publicApi.preferenceStrengths)
      .filter(([, v]) => v === "hard_when_true")
      .map(([k]) => k),
    ["mobility.noPublicTransit", "mobility.noBus", "mobility.noFerry"],
  );
  const input = data({
    schemaVersion: "1.0",
    values: {
      "mobility.noPublicTransit": true,
      "mobility.noBus": false,
      "style.planning": 3,
      "dining.localCuisine": "neutral",
      "interests.preferences": { food: "dislike" },
      "interests.details": { food: [] },
    },
  });
  assert.deepEqual(project(input).preference, input.preference);
});
for (const rev of [
  -1,
  1.2,
  NaN,
  Infinity,
  2147483648,
  Number.MAX_SAFE_INTEGER + 1,
  "1",
  null,
])
  test("reject invalid source revision " + String(rev), () =>
    assert.throws(() => project(data(undefined, rev)), invalid),
  );
for (const instant of [
  "2026-09-11",
  "September 11 2026",
  "2026-02-29T00:00:00Z",
  "2026-04-31T00:00:00Z",
  "2026-09-11T24:00:00Z",
  "2026-09-11T00:00:60Z",
  "2026-09-11T00:00:00",
  "2026-09-11T00:00:00+24:00",
  "2026-09-11T00:00:00+09:60",
  "0000-01-01T00:00:00Z",
  "",
])
  test("reject malformed instant " + instant, () =>
    assert.throws(() => project(data(undefined, 1, instant)), invalid),
  );
for (const instant of [
  time,
  "2024-02-29T23:59:59Z",
  "2026-09-11T01:02:03.123456Z",
  "2026-09-11T01:02:03.1-05:30",
])
  test("preserve valid ISO instant " + instant, () =>
    assert.equal(
      project(data(undefined, 2147483647, instant)).sourceUpdatedAt,
      instant,
    ),
  );
test("exact envelope, descriptors and unsupported versions fail safely", () => {
  const source = project(data());
  for (const extra of ["owner", "token", "snapshotRef", "values"]) {
    assert.throws(() => parse({ ...source, [extra]: "x" }), invalid);
    assert.throws(() => project({ ...data(), [extra]: "x" }), invalid);
  }
  for (const key of Object.keys(source)) {
    const v = { ...source };
    delete v[key];
    assert.throws(() => parse(v), invalid);
  }
  assert.throws(() => parse({ ...source, scope: "trip" }), invalid);
  assert.throws(
    () => parse({ ...source, contractVersion: "1.1" }),
    unsupported,
  );
  assert.throws(
    () => project(data({ schemaVersion: "2.0", values: {} })),
    unsupported,
  );
  let invoked = false;
  const getter = { ...source };
  Object.defineProperty(getter, "scope", {
    enumerable: true,
    get() {
      invoked = true;
      return "long_term";
    },
  });
  assert.throws(() => parse(getter), invalid);
  assert.equal(invoked, false);
  assert.throws(
    () => parse(Object.assign(Object.create(null), source)),
    invalid,
  );
  assert.throws(() => parse({ ...source, [Symbol("x")]: 1 }), invalid);
});
const response = (body, status = 200) => Response.json(body, { status });
const success = () => response({ ok: true, data: data() });
for (const [name, transport, code] of [
  [
    "401",
    () => response({ ok: false, error: { code: "AUTH_REQUIRED" } }, 401),
    "AUTH_REQUIRED",
  ],
  [
    "auth unavailable",
    () => response({ ok: false, error: { code: "AUTH_UNAVAILABLE" } }, 503),
    "AUTH_UNAVAILABLE",
  ],
  [
    "db unavailable",
    () =>
      response({ ok: false, error: { code: "PREFERENCE_UNAVAILABLE" } }, 503),
    "PREFERENCE_UNAVAILABLE",
  ],
  [
    "network",
    () => {
      throw new Error("secret");
    },
    "PREFERENCE_UNAVAILABLE",
  ],
  [
    "unknown HTTP",
    () => response({ secret: "x" }, 500),
    "PREFERENCE_UNAVAILABLE",
  ],
  ["broken JSON", () => new Response("broken"), "INVALID_PREFERENCE_RESPONSE"],
  [
    "wrong envelope",
    () => response({ ok: true, data: data(), owner: "secret" }),
    "INVALID_PREFERENCE_RESPONSE",
  ],
  [
    "wrong schema",
    () =>
      response({ ok: true, data: data({ schemaVersion: "2.0", values: {} }) }),
    "UNSUPPORTED_PREFERENCE_VERSION",
  ],
  [
    "invalid value",
    () =>
      response({
        ok: true,
        data: data({
          schemaVersion: "1.0",
          values: { "mobility.preset": "x" },
        }),
      }),
    "INVALID_PREFERENCE_RESPONSE",
  ],
])
  test("GET reader failure remains failure: " + name, async (t) => {
    t.mock.method(globalThis, "fetch", transport);
    assert.deepEqual(await readCurrentLongTermPreference(), {
      ok: false,
      code,
    });
  });
test("GET only, same-origin/no-store, no owner or cross-account cache", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", (url, options) => {
    calls++;
    assert.equal(url, "/api/preferences");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.body, undefined);
    assert.equal(options.headers, undefined);
    return response({
      ok: true,
      data: data({
        schemaVersion: "1.0",
        values: { "mobility.noBus": calls === 1 },
      }),
    });
  });
  const a = await readCurrentLongTermPreference(),
    b = await readCurrentLongTermPreference();
  assert.equal(calls, 2);
  assert.equal(a.data.preference.values["mobility.noBus"], true);
  assert.equal(b.data.preference.values["mobility.noBus"], false);
});
test("cancellation before fetch, during fetch and during body decoding remains cancellation", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const mock = t.mock.method(globalThis, "fetch", success);
  assert.deepEqual(
    await readCurrentLongTermPreference({ signal: controller.signal }),
    { ok: false, code: "REQUEST_CANCELLED" },
  );
  assert.equal(mock.mock.callCount(), 0);
  for (const phase of ["fetch", "json"]) {
    const c = new AbortController();
    mock.mock.mockImplementation(() => {
      if (phase === "fetch") {
        c.abort();
        throw new DOMException("Aborted", "AbortError");
      }
      return {
        ok: true,
        status: 200,
        json: async () => {
          c.abort();
          return { ok: true, data: data() };
        },
      };
    });
    assert.deepEqual(
      await readCurrentLongTermPreference({ signal: c.signal }),
      { ok: false, code: "REQUEST_CANCELLED" },
    );
  }
});
test("server finalizer forwards refresh/deletion cookies and private headers on success or failure", () => {
  for (const status of [200, 401, 503]) {
    const upstream = new Response(null, {
      status,
      headers: {
        Vary: "Cookie, Authorization",
        Pragma: "no-cache",
        Expires: "0",
        "Referrer-Policy": "no-referrer",
      },
    });
    const cookies = [
      "sb-test-auth-token.0=refreshed; Path=/; HttpOnly; Secure; SameSite=Lax",
      "sb-test-auth-token.1=; Path=/; Max-Age=0",
    ];
    for (const cookie of cookies) upstream.headers.append("Set-Cookie", cookie);
    const outer = new Response("consumer", {
      status,
      headers: {
        "Set-Cookie": "consumer=1; Path=/",
        "Cache-Control": "public, max-age=600",
        Vary: "Accept-Language",
      },
    });
    assert.equal(finalizePreferenceReadResponse(upstream, outer), outer);
    assert.deepEqual(outer.headers.getSetCookie(), [
      "consumer=1; Path=/",
      ...cookies,
    ]);
    assert.equal(outer.headers.get("cache-control"), "private, no-store");
    assert.match(outer.headers.get("vary"), /Accept-Language/);
    assert.match(outer.headers.get("vary"), /Authorization/);
    assert.equal(outer.headers.get("pragma"), "no-cache");
    assert.equal(outer.headers.get("expires"), "0");
  }
});
test("public runtime exports are explicit and read-only", () => {
  assert.deepEqual(
    Object.keys(publicApi).sort(),
    [
      "PREFERENCE_READ_CONTRACT_VERSION",
      "PreferenceReadValidationError",
      "interestCodes",
      "interestDetails",
      "parseLongTermPreferenceReadV1",
      "preferenceKeys",
      "preferenceStrengths",
      "syntheticExplicitPreferenceReadV1",
      "syntheticMissingPreferenceReadV1",
      "syntheticResetPreferenceReadV1",
      "toLongTermPreferenceReadV1",
      "walkingToleranceValues",
    ].sort(),
  );
  assert.doesNotMatch(
    text("src/shared/contracts/preferences/index.ts"),
    /export\s+\*/,
  );
});
test("complete transitive graph stays pure and A-like consumer bundles for browser", async () => {
  const seen = new Set();
  function visit(file) {
    file = path.resolve(file);
    if (seen.has(file)) return;
    seen.add(file);
    const source = text(file),
      ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    assert.doesNotMatch(
      source,
      /process\.env|localStorage|sessionStorage|require\s*\(/,
    );
    function node(n) {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
        const spec = n.moduleSpecifier;
        if (spec) {
          const s = spec.text;
          assert.ok(s.startsWith("."), "No external dependency: " + s);
          let target = path.resolve(path.dirname(file), s);
          if (!target.endsWith(".ts")) {
            try {
              readFileSync(target + ".ts");
              target += ".ts";
            } catch {
              target += "/index.ts";
            }
          }
          assert.ok(!/[/\\](features|server|db)[/\\]/.test(target), target);
          visit(target);
        }
      }
      if (
        ts.isCallExpression(n) &&
        n.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        assert.fail("No hidden dynamic dependencies");
      ts.forEachChild(n, node);
    }
    node(ast);
  }
  visit("tests/fixtures/task-046-a-consumer.ts");
  const built = await build({
    entryPoints: ["tests/fixtures/task-046-a-consumer.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "Task046Consumer",
    write: false,
    metafile: true,
  });
  for (const file of Object.keys(built.metafile.inputs))
    assert.doesNotMatch(file, /node_modules|src\/(features|server|db)\//);
  assert.ok(
    built.outputFiles[0].text.includes("readCurrentLongTermPreference"),
  );
});
test("type system rejects 23→43 assignment and nested mutation without modifying A", () => {
  const program = ts.createProgram(
    [
      "tests/fixtures/task-046-type-boundary.ts",
      "tests/fixtures/task-046-a-consumer.ts",
    ],
    {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    }),
  );
});
