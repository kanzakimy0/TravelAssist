import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { NextRequest } from "next/server";
import {
  parseDeleteAccountRequest,
  AccountDeletionError,
  ACCOUNT_DELETION_MAX_BYTES,
} from "../src/features/account-deletion/contract.ts";
import { deleteCurrentAccount } from "../src/features/account-deletion/client.ts";
import { handleAccountDeletion } from "../src/server/account-deletion/http.ts";
import { deleteVerifiedAuthUser } from "../src/server/account-deletion/admin.ts";
import { getDb, closeDb } from "../src/db/index.ts";
import {
  validDeletion,
  invalidDeletions,
} from "./task-052-account-deletion-fixtures.mjs";
const owner = "11111111-1111-4111-8111-111111111111";
const key = "sb_" + "secret_" + "x".repeat(32);
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "AUTH_SITE_URL",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
];
const prior = Object.fromEntries(names.map((n) => [n, process.env[n]]));
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  AUTH_SITE_URL: "http://127.0.0.1:3000",
  SUPABASE_SECRET_KEY: key,
  DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:54322/fixture",
});
after(async () => {
  await closeDb();
  for (const n of names)
    if (prior[n] === undefined) delete process.env[n];
    else process.env[n] = prior[n];
});
const rejected = (e) =>
  e instanceof AccountDeletionError && e.code === "INVALID_REQUEST";
test("exact current-user confirmation and detached canonical request", () => {
  const x = validDeletion();
  assert.deepEqual(parseDeleteAccountRequest(x), x);
  assert.notEqual(parseDeleteAccountRequest(x), x);
});
for (const [name, value] of invalidDeletions())
  test("reject " + name, () =>
    assert.throws(() => parseDeleteAccountRequest(value), rejected),
  );
test("descriptor/accessor/prototype/symbol input never invokes code", () => {
  let invoked = 0;
  const x = validDeletion();
  Object.defineProperty(x, "confirmation", {
    enumerable: true,
    get() {
      invoked++;
      return "DELETE_ACCOUNT";
    },
  });
  assert.throws(() => parseDeleteAccountRequest(x), rejected);
  assert.equal(invoked, 0);
  for (const value of [
    Object.assign(Object.create(null), validDeletion()),
    { ...validDeletion(), [Symbol("target")]: owner },
    Object.defineProperty(validDeletion(), "hidden", { value: owner }),
  ])
    assert.throws(() => parseDeleteAccountRequest(value), rejected);
});
function request(body = validDeletion(), headers = {}) {
  return new NextRequest("http://127.0.0.1:3000/api/account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fixture",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function upstream(
  t,
  { blocked = false, adminStatus = 200, throwAdmin = false } = {},
) {
  const calls = [];
  t.mock.method(getDb(), "execute", async () => [{ blocked }]);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const u = new URL(typeof url === "string" ? url : (url.url ?? String(url)));
    calls.push({
      path: u.pathname,
      method: options?.method,
      body: options?.body,
    });
    if (u.pathname === "/auth/v1/user")
      return Response.json({ id: owner, email: "synthetic@example.test" });
    assert.equal(u.pathname, "/auth/v1/admin/users/" + owner);
    assert.equal(options.method, "DELETE");
    assert.deepEqual(JSON.parse(options.body), { should_soft_delete: false });
    if (throwAdmin) throw Error("provider secret details");
    return Response.json(
      adminStatus === 200
        ? {}
        : { code: "unexpected_failure", msg: "provider secret details" },
      { status: adminStatus },
    );
  });
  return calls;
}
test("verified Auth first, exact current owner hard delete, private 204", async (t) => {
  const calls = upstream(t);
  const response = await handleAccountDeletion(request());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].path, "/auth/v1/user");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Authorization, Cookie");
});
test("owner injection fails before admin", async (t) => {
  const calls = upstream(t);
  const r = await handleAccountDeletion(
    request({ ...validDeletion(), ownerUserId: owner }),
  );
  assert.equal(r.status, 400);
  assert.equal(calls.length, 1);
});
test("bounded streamed body before privileged execution", async (t) => {
  const calls = upstream(t);
  const r = await handleAccountDeletion(
    request({ padding: "x".repeat(ACCOUNT_DELETION_MAX_BYTES) }),
  );
  assert.equal(r.status, 413);
  assert.equal(calls.length, 1);
});
test("no query arguments; malformed explicit Bearer never falls back to Cookie", async (t) => {
  const calls = upstream(t);
  const q = request();
  const withQuery = new NextRequest(q.url + "?userId=other", q);
  assert.equal((await handleAccountDeletion(withQuery)).status, 400);
  assert.equal(
    (
      await handleAccountDeletion(
        request(validDeletion(), {
          Authorization: "Basic invalid",
          Cookie: "sb-local-auth-token=present",
        }),
      )
    ).status,
    401,
  );
  assert.equal(calls.length, 1);
});
for (const secret of [
  undefined,
  "",
  "legacy.jwt",
  "sb_publishable_fixture",
  "sb_secret_x\n",
  "sb_secret_bad space",
]) {
  test(
    "missing/malformed execution credential fails closed: " +
      String(secret === undefined ? "missing" : secret.length),
    async (t) => {
      const calls = upstream(t);
      if (secret === undefined) delete process.env.SUPABASE_SECRET_KEY;
      else process.env.SUPABASE_SECRET_KEY = secret;
      try {
        const r = await handleAccountDeletion(request());
        assert.equal(r.status, 503);
        assert.deepEqual(await r.json(), {
          ok: false,
          error: { code: "ACCOUNT_DELETION_UNAVAILABLE" },
        });
        assert.equal(calls.length, 1);
      } finally {
        process.env.SUPABASE_SECRET_KEY = key;
      }
    },
  );
}
test("owned Storage blocks without admin operation or object disclosure", async (t) => {
  const calls = upstream(t, { blocked: true });
  const r = await handleAccountDeletion(request());
  assert.equal(r.status, 409);
  assert.deepEqual(await r.json(), {
    ok: false,
    error: { code: "ACCOUNT_DELETION_BLOCKED" },
  });
  assert.equal(calls.length, 1);
});
for (const options of [{ adminStatus: 500 }, { throwAdmin: true }])
  test("admin failure never leaks upstream details", async (t) => {
    upstream(t, options);
    const r = await handleAccountDeletion(request());
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), {
      ok: false,
      error: { code: "ACCOUNT_DELETION_UNAVAILABLE" },
    });
  });
test("admin operation rejects malformed owner before any network", async (t) => {
  const calls = upstream(t);
  await assert.rejects(
    () => deleteVerifiedAuthUser(owner + "\n"),
    (e) => e.code === "ACCOUNT_DELETION_UNAVAILABLE",
  );
  assert.equal(calls.length, 0);
});
test("browser client sends only frozen body once, same-origin no-store", async (t) => {
  let count = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    count++;
    assert.equal(url, "/api/account");
    assert.equal(options.method, "DELETE");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(options.body), validDeletion());
    return new Response(null, { status: 204 });
  });
  assert.deepEqual(await deleteCurrentAccount(), { ok: true });
  assert.equal(count, 1);
});
for (const [label, response] of [
  ["raw provider", () => Response.json({ message: "secret" }, { status: 500 })],
  [
    "unknown code",
    () =>
      Response.json({ ok: false, error: { code: "secret" } }, { status: 409 }),
  ],
  [
    "wrong status",
    () =>
      Response.json(
        { ok: false, error: { code: "AUTH_REQUIRED" } },
        { status: 200 },
      ),
  ],
  [
    "network",
    () => {
      throw Error("secret");
    },
  ],
  ["invalid json", () => new Response("<secret>", { status: 503 })],
])
  test("client sanitizes " + label + " without retry", async (t) => {
    let count = 0;
    t.mock.method(globalThis, "fetch", () => {
      count++;
      return response();
    });
    assert.deepEqual(await deleteCurrentAccount(), {
      ok: false,
      code: "ACCOUNT_DELETION_UNAVAILABLE",
    });
    assert.equal(count, 1);
  });
test("valid blocked error is preserved for safe UI copy", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    Response.json(
      { ok: false, error: { code: "ACCOUNT_DELETION_BLOCKED" } },
      { status: 409 },
    ),
  );
  assert.deepEqual(await deleteCurrentAccount(), {
    ok: false,
    code: "ACCOUNT_DELETION_BLOCKED",
  });
});
test("browser import graph cannot bring in Account Admin or DB/private Auth", async () => {
  const result = await build({
    entryPoints: [
      "src/features/account-deletion/client.ts",
      "src/features/account-deletion/finish.ts",
    ],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    outdir: "ignored",
    metafile: true,
    minify: true,
    legalComments: "none",
  });
  for (const p of Object.keys(result.metafile.inputs))
    assert.doesNotMatch(
      p,
      /src\/(server|db)\/|src\/lib\/auth\/(server-user|core|http)\.ts/,
    );
  for (const out of result.outputFiles)
    assert.doesNotMatch(
      out.text,
      /SUPABASE_SECRET_KEY|deleteVerifiedAuthUser|requireNoOwnedStorage/,
    );
});
test("narrow runtime has one Admin operation and no manual cascade/delete chain", () => {
  const text = (p) => readFileSync(p, "utf8");
  const admin = text("src/server/account-deletion/admin.ts");
  assert.match(admin, /import "server-only"/);
  assert.equal((admin.match(/admin\.auth\.admin\./g) || []).length, 1);
  assert.match(admin, /deleteUser\(verifiedOwner, false\)/);
  assert.doesNotMatch(admin, /\.from\(|\.rpc\(|console\.|NEXT_PUBLIC_.*SECRET/);
  const storage = text("src/server/account-deletion/storage.ts");
  assert.doesNotMatch(storage, /\bDELETE\b|\.remove\(|console\./);
  assert.match(storage, /owner_id = \$\{verifiedOwner\}/);
  const http = text("src/server/account-deletion/http.ts");
  assert.match(http, /deleteVerifiedAuthUser\(owner\)/);
});
