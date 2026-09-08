import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import "./register-planner-ts.mjs";
const model = await import("../src/features/auth/auth-ui-model.ts");
const { authRequest } = await import("../src/features/auth/auth-client.ts");
const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
const form = read("src/features/auth/components/auth-form.tsx");

test("WBS-5.3 visual routes remain separate from technical Auth endpoints", () => {
  for (const path of ["login", "register", "forgot-password", "reset-password"])
    assert.match(read(`src/app/(auth)/${path}/page.tsx`), /AuthPage/);
  assert.match(read("src/app/(auth)/layout.tsx"), /AuthShell/);
  assert.doesNotMatch(
    read("src/features/auth/auth-shell.tsx"),
    /PersonalSidebar/,
  );
  assert.match(read("src/app/auth/[operation]/route.ts"), /handleAuthPost/);
  assert.match(read("src/app/auth/callback/route.ts"), /handleAuthCallback/);
});
test("WBS-5.3 only phone/email tabs and in-card password/OTP mode", () => {
  assert.deepEqual(model.loginChannels, ["phone", "email"]);
  assert.match(form, /useState<"password" \| "otp">\("password"\)/);
  assert.match(form, /使用验证码登录/);
  assert.match(form, /使用密码登录/);
  assert.match(form, /emailMode === "password" &&/);
  assert.match(form, /ArrowLeft/);
  assert.match(form, /aria-selected/);
});
test("WBS-5.3 canonical returnTo plus auth-loop prevention", () => {
  for (const path of [
    "/",
    "/planner?intent=save&trip=demo",
    "/personal-center/account?section=profile",
  ])
    assert.equal(model.authDestination(path), path);
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/%255cevil.test",
    "/%252fevil.test",
    "/%0aevil",
    "/\\evil.test",
    "/login",
    "/%256cogin",
    "/register?returnTo=/login",
    "/auth/session",
  ])
    assert.equal(model.authDestination(path), "/");
  assert.equal(
    new URL(
      model.authHref("/login", "/planner?a=1"),
      "https://test.invalid",
    ).searchParams.get("returnTo"),
    "/planner?a=1",
  );
  assert.match(read("src/features/auth/auth-ui-model.ts"), /safeReturnTo/);
});
test("WBS-5.3 password and confirmation follow core policy without extra strength rules", () => {
  assert.equal(model.passwordIssue("abcdefg1", "abcdefg1"), "");
  assert.notEqual(model.passwordIssue("abcdefg1", "abcdefg2"), "");
  for (const value of ["abcdefgh", "12345678", "short1"])
    assert.notEqual(model.passwordIssue(value, value), "");
  assert.match(read("src/features/auth/auth-ui-model.ts"), /validPassword/);
});
test("WBS-5.3 phone agreement and minimal confirmation-aware registration", () => {
  assert.match(form, /phoneMode && !agreement/);
  assert.match(form, /未注册手机号验证成功后将自动创建 TravelAssist 账户/);
  assert.match(form, /phoneMode\s*\? "verify-phone-otp"/);
  assert.match(form, /verification_required|setStage\("confirmation"\)/);
  assert.match(
    read("src/features/auth/auth-page.tsx"),
    /signedIn && query.confirmed === "1"/,
  );
  assert.doesNotMatch(
    form,
    /createClient|localStorage|document\.cookie|\.from\(/,
  );
});
test("WBS-5.3 unregistered email CTA is not a verification or implicit signup claim", () => {
  assert.match(form, /result.code === "email_not_registered"/);
  assert.match(form, /使用其他邮箱/);
  assert.match(form, /prefilledEmail/);
  assert.doesNotMatch(form, /邮箱已验证|已经验证的邮箱/);
  assert.equal(
    model.authErrorText.email_not_registered,
    "此邮箱尚未绑定 TravelAssist 账户",
  );
});
test("WBS-5.3 reset requires trusted session and private PC stays server-verified", () => {
  assert.match(
    read("src/features/auth/auth-page.tsx"),
    /kind === "reset" && !signedIn/,
  );
  for (const path of ["layout", "template"])
    assert.match(
      read(`src/app/(account)/personal-center/${path}.tsx`),
      /await verifyPersonalAccess/,
    );
  assert.match(
    read("src/features/auth/personal-access.tsx"),
    /await currentAuthUser/,
  );
  assert.match(read("src/proxy.ts"), /headers.set\(\s*"x-travelassist-path"/);
  assert.match(form, /returnTo: "\/reset-password"/);
});
test("WBS-5.3 signout preserves error and dirty-state confirmation", () => {
  const menu = read(
    "src/features/personal-center/components/avatar-popover.tsx",
  );
  assert.match(menu, /authRequest\("signout"\)/);
  assert.match(menu, /if \(!result.ok\)/);
  assert.match(menu, /isDirty && !discard/);
  assert.match(menu, /仅退出当前会话/);
  assert.doesNotMatch(menu, /全部设备退出/);
});
test("WBS-5.3 legal names, no fictional legal links, accessible status and secret-safe forms", () => {
  assert.match(form, /《服务条款》和《隐私政策》/);
  assert.match(form, /WBS 10.6/);
  assert.doesNotMatch(form, /href="\/(terms|privacy)"/);
  assert.match(form, /method="post"/);
  assert.match(form, /aria-invalid/);
  assert.match(form, /aria-describedby/);
  assert.match(form, /role="alert"/);
  assert.match(form, /role="status"/);
  assert.match(form, /autoComplete="one-time-code"/);
  assert.doesNotMatch(form, /console\.|access_token|refresh_token|123456/);
});
test("WBS-5.3 adapters use bounded existing HTTP operations, ignore unexpected credentials", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({
      ok: true,
      data: {
        state: "signed_in",
        returnTo: "/planner?intent=save",
        access_token: "unit-only-unexpected",
      },
    });
  };
  try {
    for (const op of [
      "phone-otp",
      "verify-phone-otp",
      "email-otp",
      "verify-email-otp",
      "signin",
      "signout",
      "recovery",
      "password",
      "oauth",
    ]) {
      const result = await authRequest(op, {});
      assert.equal(result.ok, true);
      assert.doesNotMatch(
        JSON.stringify(result),
        /access_token|unit-only-unexpected/,
      );
    }
    assert.ok(
      calls.every(
        ({ options }) =>
          options.method === "POST" &&
          options.credentials === "same-origin" &&
          options.headers["Content-Type"] === "application/json",
      ),
    );
    globalThis.fetch = async () =>
      Response.json(
        { ok: false, code: "email_not_registered" },
        { status: 400 },
      );
    assert.deepEqual(await authRequest("email-otp", {}), {
      ok: false,
      code: "email_not_registered",
    });
    globalThis.fetch = async () => {
      throw new Error("not shown to UI");
    };
    assert.deepEqual(await authRequest("signin", {}), {
      ok: false,
      code: "auth_unavailable",
    });
  } finally {
    globalThis.fetch = original;
  }
});
