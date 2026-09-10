import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const [engine, goodEmail, missingEmail, playwright, evidence] =
  process.argv.slice(2);
assert.ok(
  playwright && evidence,
  "Explicit installed runtime and evidence paths required",
);
const { chromium } = require(playwright);
mkdirSync(evidence, { recursive: true });
const base = "http://127.0.0.1:3000";
const password = "Diagnostic8-" + randomUUID();
const browser = await chromium.launch(
  engine === "edge" ? { channel: "msedge" } : {},
);
let phase = "start";
const results = [];
const check = (condition, label) => {
  assert.ok(condition, label);
  results.push(label);
};
const post = async (page, operation, input) =>
  page.evaluate(
    async ({ operation, input }) => {
      const r = await fetch("/auth/" + operation, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const v = await r.json();
      return { ok: r.ok && v.ok, state: v.data?.state, code: v.code };
    },
    { operation, input },
  );
const session = async (page) =>
  page.evaluate(
    async () =>
      (await (await fetch("/auth/session", { cache: "no-store" })).json()).data
        ?.status,
  );
async function mailLink(email, subject, previous) {
  for (let i = 0; i < 50; i++) {
    const data = await (
      await fetch("http://127.0.0.1:54324/api/v1/messages")
    ).json();
    const item = data.messages?.find(
      (m) => m.To?.some((t) => t.Address === email) && subject.test(m.Subject),
    );
    if (item) {
      const message = await (
        await fetch("http://127.0.0.1:54324/api/v1/message/" + item.ID)
      ).json();
      const links = [
        ...(message.HTML ?? "")
          .replaceAll("&amp;", "&")
          .matchAll(/href=["']([^"']+)["']/g),
      ].map((m) => new URL(m[1]));
      const link = links.find((u) => u.pathname === "/auth/v1/verify");
      assert.equal(link?.origin, "http://127.0.0.1:54321");
      if (link.href !== previous) return link.href;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("mail unavailable");
}
async function register(page, email) {
  await page.goto(base + "/register");
  await page
    .getByRole("textbox", { name: "邮箱地址", exact: true })
    .fill(email);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByLabel("确认密码", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "创建账户", exact: true }).click();
  await page
    .getByRole("heading", { name: "请检查邮箱", exact: true })
    .waitFor();
}
try {
  phase = "same-context signup new tab";
  const context = await browser.newContext();
  const page = await context.newPage();
  await register(page, goodEmail);
  await page
    .getByRole("button", { name: "我已确认邮箱，继续", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "尚未建立登录会话" })
    .waitFor();
  check(
    (await session(page)) === "unauthenticated",
    "confirmation recheck gives actionable no-session feedback",
  );
  await page.route("**/auth/session", (route) => route.abort());
  await page
    .getByRole("button", { name: "我已确认邮箱，继续", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "暂时无法连接认证服务" })
    .waitFor();
  check(
    true,
    "confirmation recheck reports network failure without claiming success",
  );
  await page.unroute("**/auth/session");
  const cookies = await context.cookies(base);
  check(
    cookies.some((c) => c.name.includes("code-verifier")),
    "signup stores PKCE verifier (value not recorded)",
  );
  const link = await mailLink(goodEmail, /Confirm/i);
  check(
    (
      await post(page, "recovery", {
        email: goodEmail,
        returnTo: "/reset-password",
      })
    ).ok,
    "later recovery initialization succeeds",
  );
  const tab = await context.newPage();
  const recoveryCookies = await context.cookies(base + "/auth/callback");
  await tab.goto(link);
  check(
    new URL(tab.url()).pathname !== "/auth-link-error",
    "registration callback survives a later recovery flow",
  );
  await tab
    .getByRole("heading", { name: "账户创建成功 ✓", exact: true })
    .waitFor();
  check(
    (await session(tab)) === "authenticated",
    "same-context NEW TAB signup establishes session and success UI",
  );
  await page
    .getByRole("button", { name: "我已确认邮箱，继续", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "账户创建成功 ✓", exact: true })
    .waitFor();
  check(
    true,
    "original registration tab rechecks shared session and shows verified success",
  );
  const pendingRecovery = await context.newPage();
  phase = "already-pending recovery after signup";
  const remainingCookies = await context.cookies(base + "/auth/callback");
  for (const label of ["legacy-verifier", "recovery-intent"]) {
    const matches = (c) =>
      label === "legacy-verifier"
        ? c.name.endsWith("-code-verifier") &&
          !c.name.includes("-flow-") &&
          !c.name.includes("-flows-")
        : c.name === "ta-auth-return-to";
    const prior = recoveryCookies.find(matches);
    check(
      !!prior &&
        remainingCookies.some(
          (c) => c.name === prior.name && c.value === prior.value,
        ),
      "registration callback retains pending " + label,
    );
  }
  const previousRecovery = await mailLink(goodEmail, /Reset/i);
  await pendingRecovery.goto(previousRecovery);
  const pendingLocation = new URL(pendingRecovery.url());
  // Local Auth revokes pending one-time links on confirmation. This is not a
  // verifier regression: assert the exact expired outcome, then use fresh mail.
  await pendingRecovery
    .getByRole("heading", { name: "重设链接未完成", exact: true })
    .waitFor();
  check(
    pendingLocation.pathname === "/auth-link-error" &&
      pendingLocation.searchParams.get("reason") === "expired",
    "pre-confirmation recovery mail revoked by Local Auth shows expired guidance",
  );
  check((await post(tab, "signout", {})).ok, "signout only diagnostic session");
  phase = "same-context recovery new tab";
  await page.goto(base + "/forgot-password");
  await page
    .getByRole("textbox", { name: "邮箱地址", exact: true })
    .fill(goodEmail);
  await page.getByRole("button", { name: "发送重设链接", exact: true }).click();
  await page
    .getByRole("heading", { name: "邮件已发送 ✓", exact: true })
    .waitFor();
  const recovery = await mailLink(goodEmail, /Reset/i, previousRecovery);
  const reset = await context.newPage();
  await reset.goto(recovery);
  await reset
    .getByRole("heading", { name: "设置新密码", exact: true })
    .waitFor();
  check(
    (await session(reset)) === "authenticated",
    "same-context NEW TAB recovery establishes reset session",
  );
  await reset
    .getByLabel("新密码", { exact: true })
    .fill("Updated9-" + password);
  await reset
    .getByLabel("确认新密码", { exact: true })
    .fill("Updated9-" + password);
  await reset.getByRole("button", { name: "更新密码", exact: true }).click();
  await reset
    .getByRole("heading", { name: "密码已更新 ✓", exact: true })
    .waitFor();
  check(true, "diagnostic account reset completes actual password update");
  await post(reset, "signout", {});
  check(
    !(await post(reset, "signin", { email: goodEmail, password })).ok,
    "old diagnostic password rejected",
  );
  check(
    (
      await post(reset, "signin", {
        email: goodEmail,
        password: "Updated9-" + password,
      })
    ).ok,
    "new diagnostic password accepted",
  );
  await context.close();
  phase = "missing-context signup";
  const original = await browser.newContext();
  const originalPage = await original.newPage();
  await register(originalPage, missingEmail);
  const missingLink = await mailLink(missingEmail, /Confirm/i);
  const detached = await browser.newContext();
  const detachedPage = await detached.newPage();
  await detachedPage.goto(missingLink);
  await detachedPage
    .getByRole("heading", { name: "自动登录未完成", exact: true })
    .waitFor();
  check(
    new URL(detachedPage.url()).pathname === "/auth-link-error",
    "missing-context signup shows actionable UI instead of JSON",
  );
  check(
    !new URL(detachedPage.url()).searchParams.has("code") &&
      !new URL(detachedPage.url()).hash,
    "callback credentials and provider fragment not retained on error page",
  );
  check(
    (await session(detachedPage)) === "unauthenticated",
    "failed callback does not create session",
  );
  check(
    await detachedPage
      .getByText(
        "邮箱确认与自动登录是两个步骤。当前未能自动登录，并不代表账户注册失败。",
        { exact: true },
      )
      .isVisible(),
    "confirmed email and automatic login are clearly distinguished without claiming success",
  );
  await detachedPage.goto(missingLink);
  await detachedPage
    .getByRole("alert")
    .filter({ hasText: "链接已失效或已使用" })
    .waitFor();
  check(
    new URL(detachedPage.url()).searchParams.get("reason") === "expired",
    "consumed mail shows safe expired-link guidance",
  );
  await originalPage
    .getByRole("button", { name: "我已确认邮箱，继续", exact: true })
    .click();
  await originalPage
    .getByRole("alert")
    .filter({ hasText: "尚未建立登录会话" })
    .waitFor();
  check(true, "confirmed-email without session is not treated as signed in");
  check(
    (await post(originalPage, "signin", { email: missingEmail, password })).ok,
    "email is confirmed despite missing callback session",
  );
  await post(originalPage, "signout", {});
  phase = "missing-context recovery";
  check(
    (
      await post(originalPage, "recovery", {
        email: missingEmail,
        returnTo: "/reset-password",
      })
    ).ok,
    "request diagnostic recovery",
  );
  const missingRecovery = await mailLink(missingEmail, /Reset/i);
  await detachedPage.goto(missingRecovery);
  await detachedPage
    .getByRole("heading", { name: "自动登录未完成", exact: true })
    .waitFor();
  check(
    new URL(detachedPage.url()).pathname === "/auth-link-error",
    "missing-context recovery shows safe retry controls",
  );
  check(
    (await session(detachedPage)) === "unauthenticated",
    "failed recovery does not authorize password update",
  );
  check(
    !(
      await post(detachedPage, "password", {
        password: "MustNotChange7-" + password,
      })
    ).ok,
    "unauthenticated password update blocked",
  );
  phase = "real recovery retry from error UI";
  await detachedPage
    .getByRole("link", { name: "重新获取重设链接", exact: true })
    .click();
  await detachedPage
    .getByRole("textbox", { name: "邮箱地址", exact: true })
    .fill(missingEmail);
  await new Promise((r) => setTimeout(r, 1500));
  await detachedPage
    .getByRole("button", { name: "发送重设链接", exact: true })
    .click();
  await detachedPage
    .getByRole("heading", { name: "邮件已发送 ✓", exact: true })
    .waitFor();
  const retryLink = await mailLink(missingEmail, /Reset/i, missingRecovery);
  const retryTab = await detached.newPage();
  await retryTab.goto(retryLink);
  await retryTab
    .getByRole("heading", { name: "设置新密码", exact: true })
    .waitFor();
  check(
    (await session(retryTab)) === "authenticated",
    "retry from error UI establishes real recovery session with new mail",
  );
  await retryTab
    .getByLabel("新密码", { exact: true })
    .fill("Retried8-" + password);
  await retryTab
    .getByLabel("确认新密码", { exact: true })
    .fill("Retried8-" + password);
  await retryTab.getByRole("button", { name: "更新密码", exact: true }).click();
  await retryTab
    .getByRole("heading", { name: "密码已更新 ✓", exact: true })
    .waitFor();
  check(true, "recovery retry completes password update");
  await original.close();
  await detached.close();
  phase = "read-only HTTP and geometry regression";
  const anonymous = await browser.newContext();
  const surface = await anonymous.newPage();
  for (const accept of ["application/json", "*/*"]) {
    const response = await anonymous.request.get(
      base +
        "/auth/callback?code=invalid&error_description=private-provider-detail",
      { headers: { Accept: accept }, maxRedirects: 0 },
    );
    check(
      response.status() === 401 &&
        (await response.json()).code === "callback_failed",
      "non-HTML callback keeps historical 401 JSON contract",
    );
    check(
      /no-store/.test(response.headers()["cache-control"]),
      "API failure remains no-store",
    );
  }
  const html = await anonymous.request.get(
    base +
      "/auth/callback?error=access_denied&error_code=otp_expired&error_description=private-provider-detail&returnTo=https://evil.test",
    { headers: { Accept: "text/html" }, maxRedirects: 0 },
  );
  check(
    html.status() === 303 &&
      html.headers().location.startsWith("/auth-link-error?"),
    "document failure safely redirects to visual route",
  );
  check(
    !/private-provider-detail|evil|error_description/.test(
      html.headers().location,
    ),
    "untrusted callback detail and returnTo not echoed",
  );
  check(
    html.headers()["referrer-policy"] === "no-referrer" &&
      /no-store/.test(html.headers()["cache-control"]),
    "document failure preserves privacy headers",
  );
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await surface.setViewportSize({ width, height });
    for (const [flow, heading] of [
      ["recovery", "重设链接未完成"],
      ["signup", "自动登录未完成"],
    ]) {
      await surface.goto(
        base +
          "/auth-link-error?reason=failed&flow=" +
          flow +
          "&returnTo=https://evil.test",
      );
      await surface
        .getByRole("heading", { name: heading, exact: true })
        .waitFor();
      const geometry = await surface.evaluate(() => {
        const card = document.querySelector(
          'section[aria-labelledby="auth-link-heading"]',
        )?.parentElement?.parentElement;
        const rect = card?.getBoundingClientRect();
        const links = [
          ...document.querySelectorAll(
            'section[aria-labelledby="auth-link-heading"] a',
          ),
        ];
        return {
          horizontal: document.documentElement.scrollWidth > innerWidth + 1,
          vertical: document.documentElement.scrollHeight > innerHeight + 1,
          targets: links.every((a) => a.getBoundingClientRect().height >= 44),
          contained:
            !!rect &&
            links.every(
              (a) => a.getBoundingClientRect().bottom <= rect.bottom + 1,
            ),
          safeLinks: links.every(
            (a) =>
              a.origin === location.origin && !a.href.includes("evil.test"),
          ),
        };
      });
      check(
        !geometry.horizontal &&
          (width < 768 || !geometry.vertical) &&
          geometry.targets &&
          geometry.contained &&
          geometry.safeLinks,
        flow +
          " error page safe geometry and 44px actions " +
          width +
          "x" +
          height,
      );
      await surface.screenshot({
        path: join(evidence, flow + "-error-" + width + "x" + height + ".png"),
        fullPage: true,
      });
    }
  }
  await surface
    .getByRole("link", { name: "邮箱密码登录", exact: true })
    .click();
  await surface.getByRole("tab", { name: "邮箱登录", exact: true }).waitFor();
  check(
    (await surface
      .getByRole("tab", { name: "邮箱登录", exact: true })
      .getAttribute("aria-selected")) === "true",
    "error CTA opens email/password directly",
  );
  await anonymous.close();
  const summary = {
    engine,
    version: browser.version(),
    checks: results.length,
    results,
  };
  writeFileSync(
    join(evidence, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
} catch {
  console.log(
    JSON.stringify({ engine, phase, status: "FAIL", passed: results }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
