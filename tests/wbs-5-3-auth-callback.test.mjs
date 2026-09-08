import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import "./register-planner-ts.mjs";
const { callbackFailureLocation, wantsCallbackPage } =
  await import("../src/lib/auth/callback-navigation.ts");
const { authSessionStatus } =
  await import("../src/features/auth/auth-client.ts");
const { authDestination } =
  await import("../src/features/auth/auth-ui-model.ts");
const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("WBS-5.3 callback failure navigation is bounded, strips provider details and preserves safe intent", () => {
  const path = callbackFailureLocation(
    "/register?confirmed=1&returnTo=%2Fplanner%3Fintent%3Dsave",
    "otp_expired",
  );
  const url = new URL(path, "https://app.test");
  assert.equal(url.pathname, "/auth-link-error");
  assert.equal(url.searchParams.get("reason"), "expired");
  assert.equal(url.searchParams.get("flow"), "signup");
  assert.equal(url.searchParams.get("returnTo"), "/planner?intent=save");
  assert.ok(path.endsWith("#"), "clear inherited provider fragments");
  for (const intent of [
    "//evil.test",
    "https://evil.test",
    "/%255cevil.test",
    "/register?returnTo=https%3A%2F%2Fevil.test",
    null,
  ]) {
    const result = new URL(
      callbackFailureLocation(intent, "private-provider-message"),
      "https://app.test",
    );
    assert.equal(result.origin, "https://app.test");
    assert.equal(result.searchParams.get("returnTo"), "/");
    assert.equal(result.searchParams.get("reason"), "failed");
    assert.doesNotMatch(result.href, /private-provider-message|evil/);
  }
  assert.equal(
    new URL(
      callbackFailureLocation("/reset-password", "x"),
      "https://app.test",
    ).searchParams.get("flow"),
    "recovery",
  );
  assert.equal(authDestination("/auth-link-error?reason=failed"), "/");
});

test("WBS-5.3 browser HTML errors do not replace the existing JSON callback contract", () => {
  for (const value of [
    null,
    "*/*",
    "application/json",
    "text/html;q=0",
    "text/html;q=0.00",
    "application/not-text/html",
  ])
    assert.equal(wantsCallbackPage(value), false);
  for (const value of [
    "text/html",
    "text/html,application/xhtml+xml,*/*;q=0.8",
    "Text/HTML; charset=utf-8",
    "text/html;q=0.9",
  ])
    assert.equal(wantsCallbackPage(value), true);
  const http = read("src/lib/auth/http.ts");
  assert.match(http, /wantsCallbackPage\(request.headers.get\("accept"\)\)/);
  assert.match(http, /: resultResponse\(result\)/);
  assert.match(http, /await core.completeCallback/);
  assert.match(http, /PRIVATE_AUTH_HEADERS/);
  assert.doesNotMatch(
    read("src/lib/auth/callback-navigation.ts"),
    /getUser|exchangeCodeForSession|createClient|token_hash/,
  );
});

test("WBS-5.3 confirmation check uses bounded server session status and fails closed", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    for (const status of ["authenticated", "unauthenticated"]) {
      globalThis.fetch = async (path, options) => {
        calls++;
        assert.equal(path, "/auth/session");
        assert.equal(options.cache, "no-store");
        assert.equal(options.credentials, "same-origin");
        return Response.json({
          ok: true,
          data: { status, userId: "not-for-ui", access_token: "not-for-ui" },
        });
      };
      assert.deepEqual(await authSessionStatus(), {
        ok: true,
        data: { status },
      });
    }
    for (const response of [
      Response.json(
        { ok: true, data: { status: "authenticated" } },
        { status: 503 },
      ),
      Response.json({ ok: false, data: { status: "authenticated" } }),
      Response.json({ ok: "true", data: { status: "authenticated" } }),
      Response.json({ ok: true, data: { status: "other" } }),
      new Response("bad response"),
    ]) {
      globalThis.fetch = async () => response;
      assert.deepEqual(await authSessionStatus(), {
        ok: false,
        code: "auth_unavailable",
      });
    }
    globalThis.fetch = async () => {
      throw new Error("private network detail");
    };
    assert.deepEqual(await authSessionStatus(), {
      ok: false,
      code: "auth_unavailable",
    });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("WBS-5.3 confirmation no-op is replaced by pending/error feedback without a fake auth authority", () => {
  const form = read("src/features/auth/components/auth-form.tsx");
  assert.match(form, /onClick=\{checkConfirmation\}/);
  assert.match(form, /await authSessionStatus\(\)/);
  assert.match(form, /result.data.status !== "authenticated"/);
  assert.match(form, /尚未建立登录会话/);
  assert.match(form, /正在确认/);
  assert.match(
    form,
    /window.location.replace\(confirmationDestination\(returnTo\)\)/,
  );
  assert.doesNotMatch(
    form,
    /document.cookie|localStorage|createClient|exchangeCodeForSession/,
  );
  assert.match(
    read("src/features/auth/auth-page.tsx"),
    /await currentAuthUser\(\)/,
  );
  const page = read("src/features/auth/auth-link-error.tsx");
  assert.match(page, /role="alert"/);
  assert.match(page, /authDestination\(query.returnTo\)/);
  assert.match(page, /channel=email/);
  assert.doesNotMatch(
    page,
    /query\.code|error_description|dangerouslySetInnerHTML|账户创建成功/,
  );
});
