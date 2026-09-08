import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./register-planner-ts.mjs";

const { validPassword, safeReturnTo, validPhone } =
  await import("../src/lib/auth/policy.ts");
const { createAuthCore } = await import("../src/lib/auth/core.ts");
const { authFailure } = await import("../src/lib/auth/errors.ts");
const { publicSupabaseConfig } = await import("../src/lib/supabase/config.ts");
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) =>
  readFileSync(new URL("../" + name, import.meta.url), "utf8");
const fakeCallback = "https://app.example.test/auth/callback";

test("TASK-018 password and E164 input policy is reusable without React", () => {
  for (const value of ["abcdefgh", "12345678", "abc123", null, 12345678, {}])
    assert.equal(validPassword(value), false);
  for (const value of ["abcdefg1", "1234567a", "Password8!"])
    assert.equal(validPassword(value), true);
  assert.equal(validPhone("+12025550180"), true);
  assert.equal(validPhone("12025550180"), false);
  assert.doesNotMatch(
    read("src/lib/auth/policy.ts"),
    /from ["'](?:react|next|@supabase)/,
  );
});

test("TASK-018 returnTo preserves in-app intent and rejects layered open redirects", () => {
  for (const value of [
    "/",
    "/planner?intent=save&trip=demo",
    "/personal-center",
    "/a#tab",
    "/%E6%97%85%E8%A1%8C",
  ])
    assert.equal(safeReturnTo(value), value);
  for (const value of [
    null,
    "",
    {},
    "https://evil.test",
    "http://evil.test",
    "//evil.test",
    "\\\\evil.test",
    "/\\evil.test",
    "/%5cevil.test",
    "/%2fevil.test",
    "/%252fevil.test",
    "/%255Cevil.test",
    "/%0d%0aLocation:evil",
    "/%2509/evil",
    "/a/..//evil.test",
    " /planner",
    "javascript:alert(1)",
    "/%ZZ",
    "/%2525252525252525252f/evil",
    "/" + "a".repeat(2048),
  ])
    assert.equal(safeReturnTo(value), "/", String(value));
});

test("TASK-018 core enforces password boundary before SDK and keeps normalized results token-free", async () => {
  let calls = 0;
  const client = {
    auth: {
      signUp: async () => {
        calls++;
        return {
          data: {
            session: { access_token: "unit-sensitive" },
            user: { id: "user-a", identities: ["unit-sensitive"] },
          },
          error: null,
        };
      },
      getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }),
      updateUser: async () => {
        calls++;
        return { error: null };
      },
    },
  };
  const core = createAuthCore(client, fakeCallback);
  assert.equal(
    (await core.signUp({ email: "a@example.test", password: "short1" })).code,
    "weak_password",
  );
  assert.equal(
    (await core.updatePassword({ password: "short1" })).code,
    "weak_password",
  );
  assert.equal(calls, 0);
  const result = await core.signUp({
    email: "a@example.test",
    password: "password8",
  });
  assert.equal(result.data.userId, "user-a");
  assert.doesNotMatch(
    JSON.stringify(result),
    /unit-sensitive|token|identities/,
  );
});

test("TASK-018 opposite OTP creation policies, exact verification types and local-only signout", async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithOtp: async (input) => {
        calls.push(input);
        return { error: null };
      },
      verifyOtp: async (input) => {
        calls.push(input);
        return { data: { user: { id: "a" }, session: {} }, error: null };
      },
      signOut: async (input) => {
        calls.push(input);
        return { error: null };
      },
    },
  };
  const core = createAuthCore(client, fakeCallback);
  await core.requestPhoneOtp({ phone: "+12025550180" });
  await core.requestEmailOtp({ email: "a@example.test" });
  await core.verifyPhoneOtp({ phone: "+12025550180", token: "180180" });
  await core.verifyEmailOtp({ email: "a@example.test", token: "123456" });
  await core.signOut();
  assert.equal(calls[0].options.shouldCreateUser, true);
  assert.equal(calls[1].options.shouldCreateUser, false);
  assert.equal(calls[2].type, "sms");
  assert.equal(calls[3].type, "email");
  assert.deepEqual(calls[4], { scope: "local" });
  for (const code of ["otp_disabled", "signup_disabled"]) {
    const denied = createAuthCore(
      { auth: { signInWithOtp: async () => ({ error: { code } }) } },
      fakeCallback,
    );
    assert.equal(
      (await denied.requestEmailOtp({ email: "missing@example.test" })).code,
      "email_not_registered",
    );
  }
});

test("TASK-018 OAuth Google/Apple and PKCE callback use only explicit provider contract", async () => {
  const calls = [];
  const core = createAuthCore(
    {
      auth: {
        signInWithOAuth: async (value) => {
          calls.push(value);
          return {
            data: { url: "https://auth.example.test/authorize" },
            error: null,
          };
        },
        exchangeCodeForSession: async (code) => {
          calls.push(code);
          return { data: { user: { id: "a" }, session: {} }, error: null };
        },
        resetPasswordForEmail: async (email, options) => {
          calls.push({ email, options });
          return { error: null };
        },
      },
    },
    fakeCallback,
  );
  for (const provider of ["google", "apple"]) {
    const result = await core.startOAuth({
      provider,
      returnTo: "/planner?intent=save",
    });
    assert.equal(result.data.returnTo, "/planner?intent=save");
  }
  assert.deepEqual(
    calls.slice(0, 2).map((v) => v.options),
    Array(2).fill({ redirectTo: fakeCallback, skipBrowserRedirect: true }),
  );
  assert.equal(
    (await core.startOAuth({ provider: "unapproved" })).code,
    "invalid_input",
  );
  assert.equal(
    (await core.completeCallback("", "/planner")).code,
    "callback_failed",
  );
  assert.equal(
    (await core.completeCallback("synthetic-code", "//evil.test")).data
      .returnTo,
    "/",
  );
  await core.requestRecovery({ email: "a@example.test" });
  assert.equal(calls.at(-1).options.redirectTo, fakeCallback);
});

test("TASK-018 errors never serialize provider detail and distinguish server failure", () => {
  const result = authFailure({ status: 429, message: "unit-private" });
  assert.equal(result.code, "rate_limited");
  assert.doesNotMatch(JSON.stringify(result), /unit-private/);
  assert.equal(authFailure({ code: "bad_jwt" }).code, "unauthenticated");
  assert.equal(authFailure(new Error("unit-private")).code, "auth_unavailable");
  assert.equal(
    authFailure({ status: 500 }, "invalid_credentials").code,
    "auth_unavailable",
  );
});

test("TASK-018 public config is lazy, denies private-key-shaped input, and never echoes it", () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.throws(publicSupabaseConfig, /configuration/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_unit_private";
    assert.throws(
      publicSupabaseConfig,
      (e) => !e.message.includes("unit_private"),
    );
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_unit_test";
    assert.equal(publicSupabaseConfig().url, "https://auth.example.test");
  } finally {
    for (const [name, value] of [
      ["NEXT_PUBLIC_SUPABASE_URL", previous.url],
      ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", previous.key],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("TASK-018 guarded helpers are server-only and trust getUser, never getSession", () => {
  for (const file of [
    "src/lib/auth/server-user.ts",
    "src/lib/supabase/server.ts",
    "src/lib/auth/current-user.ts",
  ])
    assert.match(read(file), /import "server-only"/);
  assert.match(read("src/lib/auth/server-user.ts"), /auth\.getUser\(/);
  assert.doesNotMatch(
    read("src/lib/auth/server-user.ts"),
    /auth\.getSession\(/,
  );
  assert.match(
    read("src/lib/supabase/request.ts"),
    /Object\.entries\(cacheHeaders\)/,
  );
  assert.match(read("src/proxy.ts"), /auth\.getClaims\(/);
  const child = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { AuthSessionMissingError } from '@supabase/supabase-js';
    import { getCurrentAuthUser, requireAuthUser } from './src/lib/auth/server-user.ts';
    const client = (error, user = null) => ({auth:{getUser:async()=>({data:{user},error})}});
    assert.deepEqual(await getCurrentAuthUser(client(new AuthSessionMissingError())), {ok:true,data:null});
    assert.equal((await requireAuthUser(client(null))).code, 'unauthenticated');
    assert.equal((await requireAuthUser(client(null,{id:'verified-id',secret:'hidden'}))).data.userId,'verified-id');
    assert.equal((await getCurrentAuthUser(client({status:503}))).code,'auth_unavailable');
    assert.equal((await getCurrentAuthUser(client({code:'bad_jwt'}))).data,null);
  `,
    ],
    { cwd: root, encoding: "utf8", windowsHide: true, timeout: 20000 },
  );
  assert.equal(child.status, 0, child.stderr);
  const denied = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      "await import('./src/lib/auth/server-user.ts')",
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /server-only|Client Component/);
});

test("TASK-018 SSR dependency is locked and core has no business persistence or admin authority", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.match(pkg.dependencies["@supabase/ssr"], /^\d+\.\d+\.\d+$/);
  assert.equal(
    lock.packages["node_modules/@supabase/ssr"].version,
    pkg.dependencies["@supabase/ssr"],
  );
  assert.doesNotMatch(
    read("src/lib/auth/core.ts"),
    /\.from\(|auth\.admin|linkIdentity|unlinkIdentity|SUPABASE_SECRET_KEY|DATABASE_URL/,
  );
});
