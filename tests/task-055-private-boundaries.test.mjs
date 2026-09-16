import assert from "node:assert/strict";
import { after, test } from "node:test";
import { NextRequest } from "next/server";
import { handlePreference } from "../src/server/preferences/http.ts";
import { handleCompanion } from "../src/server/companions/http.ts";
import { handleProfile } from "../src/server/profile/http.ts";
import { handleTripLibrary } from "../src/server/trip-library/http.ts";
import { handleAccountDeletion } from "../src/server/account-deletion/http.ts";
import { readPrivateJson } from "../src/server/private-http.ts";

const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "AUTH_SITE_URL",
  "DATABASE_URL",
  "SUPABASE_SECRET_KEY",
];
const previous = Object.fromEntries(
  names.map((name) => [name, process.env[name]]),
);
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_task055_fixture",
  AUTH_SITE_URL: "http://127.0.0.1:3000",
});
// Any accidental DB/admin access must fail; these tests authorize no I/O.
delete process.env.DATABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
after(() => {
  for (const name of names)
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
});

function request(path, method = "GET", body) {
  return new NextRequest("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Authorization: "Bearer task055-fixture",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function failure(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { ok: false, error: { code } });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Authorization, Cookie");
}

const privateApis = [
  [
    "Preference",
    () => handlePreference(request("/api/preferences", "PATCH", {}), "patch"),
  ],
  [
    "Companion",
    () => handleCompanion(request("/api/companions", "POST", {}), false),
  ],
  [
    "Profile",
    () => handleProfile(request("/api/profile", "PATCH", {}), "profile"),
  ],
  [
    "Trip Library",
    () => handleTripLibrary(request("/api/trip-library", "POST", {}), "create"),
  ],
  [
    "Account deletion",
    () => handleAccountDeletion(request("/api/account", "DELETE", {})),
  ],
];
for (const [domain, invoke] of privateApis)
  test(`TASK-055 ${domain}: Auth outage is private AUTH_UNAVAILABLE before product I/O`, async (t) => {
    const calls = [];
    t.mock.method(globalThis, "fetch", async (input) => {
      const url = new URL(
        typeof input === "string" ? input : (input.url ?? String(input)),
      );
      calls.push(url.pathname);
      assert.equal(url.origin, "http://127.0.0.1:54321");
      assert.equal(
        url.pathname,
        "/auth/v1/user",
        "No REST, RPC or Admin call after failed verification",
      );
      return Response.json(
        { code: "unexpected_failure", msg: "private upstream diagnostic" },
        { status: 503 },
      );
    });
    await failure(await invoke(), 503, "AUTH_UNAVAILABLE");
    assert.deepEqual(calls, ["/auth/v1/user"]);
  });

const owner = "11111111-1111-4111-8111-111111111111";
for (const [name, reply, status, code] of [
  [
    "different verified owner",
    () => Response.json({ id: "22222222-2222-4222-8222-222222222222" }),
    401,
    "AUTH_REQUIRED",
  ],
  [
    "Auth rejects the second verification",
    () =>
      Response.json(
        { code: "user_not_found", msg: "private upstream diagnostic" },
        { status: 401 },
      ),
    503,
    "AUTH_UNAVAILABLE",
  ],
  [
    "Auth becomes unavailable",
    () =>
      Response.json(
        { code: "unexpected_failure", msg: "private upstream diagnostic" },
        { status: 503 },
      ),
    503,
    "AUTH_UNAVAILABLE",
  ],
])
  test(`TASK-055 Profile second live verification: ${name} prevents writes`, async (t) => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async (input) => {
      const url = new URL(
        typeof input === "string" ? input : (input.url ?? String(input)),
      );
      assert.equal(
        url.pathname,
        "/auth/v1/user",
        "Product I/O cannot precede second identity check",
      );
      calls++;
      return calls === 1
        ? Response.json({ id: owner, email: "fixture@example.test" })
        : reply();
    });
    await failure(
      await handleProfile(
        request("/api/profile", "PATCH", {
          schemaVersion: "1.0",
          profile: { displayName: "Must not persist" },
        }),
        "profile",
      ),
      status,
      code,
    );
    assert.equal(calls, 2);
  });

test("TASK-055 streamed Unicode decodes across byte splits at the exact cap and releases its reader", async () => {
  const value = { name: "旅🌸" };
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const make = () => {
    let offset = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (offset === bytes.length) controller.close();
        else controller.enqueue(bytes.slice(offset, ++offset));
      },
    });
    return new Request("http://localhost/test", {
      method: "POST",
      body: stream,
      duplex: "half",
      headers: {
        "content-type": "Application/JSON; charset=utf-8",
        "content-length": "1",
      },
    });
  };
  const error = (code) => Object.assign(new Error(code), { code });
  const exact = make();
  assert.deepEqual(await readPrivateJson(exact, error, bytes.length), value);
  assert.equal(exact.body.locked, false);
  const oversized = make();
  await assert.rejects(
    () => readPrivateJson(oversized, error, bytes.length - 1),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
  assert.equal(oversized.body.locked, false);
});
