// Real Windows Chromium/Edge against task-owned production Next + Supabase Local.
// No traces/HAR/videos/storageState; screenshots always mask inputs; never print request secrets.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const arg = (key) => process.argv[process.argv.indexOf("--" + key) + 1];
const require = createRequire(import.meta.url);
const { chromium } = require(arg("playwright"));
const base = arg("base");
assert.equal(base, "http://127.0.0.1:3000");
const email = arg("email"),
  unknown = arg("unknown"),
  engine = arg("engine");
const evidence = path.join(arg("evidence"), engine);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  engine === "edge"
    ? { channel: "msedge", headless: true }
    : { headless: true },
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const password = "Wbs53-" + randomUUID(),
  newPassword = "New53-" + randomUUID();
let phase = "opening",
  blocking = 0;
const missingAssets = [],
  results = [];
page.on("pageerror", () => blocking++);
page.on("console", (msg) => {
  if (
    /hydration|hydrating|Minified React error|cannot update a component|did not match/i.test(
      msg.text(),
    )
  )
    blocking++;
});
page.on("response", (response) => {
  const url = new URL(response.url());
  if (
    response.status() === 404 &&
    /\.(png|webp|jpg|svg|css|js)$/.test(url.pathname)
  )
    missingAssets.push(url.pathname);
});
const check = (condition, message) => {
  if (!condition) throw new Error("SAFE: " + message);
};
const step = (name) => {
  phase = name;
  console.log("RUN " + name);
};
const heading = (text) =>
  page.getByRole("heading", { name: text, exact: true });
const field = (text) => page.getByLabel(text, { exact: true });
const button = (text) => page.getByRole("button", { name: text, exact: true });
const go = async (url) => {
  await page.goto(base + url, { waitUntil: "domcontentloaded" });
  if (
    /^\/(?:login|register|forgot-password|reset-password|personal-center)(?:[/?]|$)/.test(
      url,
    )
  )
    await page.waitForLoadState("networkidle");
  else await page.locator("main").first().waitFor();
};
const snapshot = async (name) =>
  page.screenshot({
    path: path.join(evidence, name + ".png"),
    fullPage: true,
    mask: [page.locator("input")],
  });
const publicSession = async () => {
  // Exercise the browser's own same-origin cookie path, not a separate API socket.
  const result = await page.evaluate(async () => {
    const response = await fetch("/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const result = await response.json();
    return { ok: response.ok && result.ok, data: result.data };
  });
  check(result.ok, "public session response succeeds");
  return result.data;
};
const countUsers = () =>
  JSON.parse(
    execFileSync(
      "wsl.exe",
      [
        "-d",
        "TravelAssist-Ubuntu",
        "--exec",
        "/home/oydl/.local/share/travelassist-db-acceptance/runtime/node-v24.18.0-linux-x64/bin/node",
        "/home/oydl/TravelAssist-wbs53-b/tests/wbs-5-3-auth-user-flow.runtime.mjs",
        "--counts",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  ).users;
async function captured(subject) {
  for (let i = 0; i < 60; i++) {
    const data = await (
      await fetch("http://127.0.0.1:54324/api/v1/messages")
    ).json();
    const item = data.messages?.find(
      (m) => m.To?.some((t) => t.Address === email) && subject.test(m.Subject),
    );
    if (item)
      return await (
        await fetch("http://127.0.0.1:54324/api/v1/message/" + item.ID)
      ).json();
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("SAFE: Local capture mail absent");
}
async function confirmMail(subject) {
  const mail = await captured(subject);
  const links = [
    ...(mail.HTML ?? "")
      .replaceAll("&amp;", "&")
      .matchAll(/href=["']([^"']+)["']/g),
  ].map((m) => new URL(m[1]));
  const url = links.find((u) => u.pathname === "/auth/v1/verify");
  check(url?.origin === "http://127.0.0.1:54321", "Local-only verify link");
  await page.goto(url.href);
  await page.waitForLoadState("networkidle");
}
async function emailLogin(secret, target = "/personal-center/account") {
  await go("/login?returnTo=" + encodeURIComponent(target));
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  await field("邮箱地址").fill(email);
  await field("密码").fill(secret);
  await button("登录").click();
}
async function logout() {
  await page.getByRole("button", { name: /^打开账户菜单/ }).click();
  await button("退出登录").click();
  await page.waitForURL(base + "/");
  check(
    (await publicSession()).status === "unauthenticated",
    "real signout clears public session",
  );
}
async function geometry(label) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const controls = [
      ...document.querySelectorAll(
        "#auth-content button, #auth-content a, #auth-content select, #auth-content input",
      ),
    ].filter((el) => el.getBoundingClientRect().width > 0);
    const small = controls.filter((el) => {
      const box = (
        el.type === "checkbox" ? el.closest("label") : el
      ).getBoundingClientRect();
      return box.height < 43.5 || box.width < 43.5;
    }).length;
    const smallFonts = [
      ...document.querySelectorAll("#auth-content input"),
    ].filter(
      (el) =>
        el.type !== "checkbox" &&
        parseFloat(getComputedStyle(el).fontSize) < 16,
    ).length;
    return {
      width: innerWidth,
      height: innerHeight,
      overflow: doc.scrollWidth > doc.clientWidth + 1,
      small,
      smallFonts,
      duplicateIds:
        [...document.querySelectorAll("[id]")].length -
        new Set([...document.querySelectorAll("[id]")].map((el) => el.id)).size,
    };
  });
  check(!result.overflow, label + " horizontal overflow");
  check(!result.small, label + " touch target below 44");
  check(!result.smallFonts, label + " input below 16px");
  check(!result.duplicateIds, label + " duplicate IDs");
  results.push({ label, ...result });
}
async function mobileState(name) {
  await page.setViewportSize({ width: 320, height: 740 });
  await geometry("320x740/" + name);
  await snapshot("320-740-" + name);
  await page.setViewportSize({ width: 1440, height: 900 });
}
try {
  step("responsive and accessible anonymous modes");
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ]) {
      await go(route);
      await geometry(`${width}x${height}${route}`);
      await snapshot(`${width}-${height}-${route.slice(1)}`);
      if (route === "/login") {
        check(
          (await page.getByRole("tab").count()) === 2,
          "exactly two top tabs",
        );
        await page.getByRole("tab", { name: "手机登录" }).focus();
        await page.keyboard.press("ArrowRight");
        check(
          (await page
            .getByRole("tab", { name: "邮箱登录" })
            .getAttribute("aria-selected")) === "true",
          "keyboard tab selection",
        );
        await geometry(`${width}x${height}/login-password`);
        await page.keyboard.press("Tab");
        check(
          await field("邮箱地址").evaluate(
            (el) => document.activeElement === el,
          ),
          "Tab reaches email",
        );
        await page.keyboard.press("Shift+Tab");
        check(
          await page
            .getByRole("tab", { name: "邮箱登录" })
            .evaluate(
              (el) =>
                document.activeElement === el &&
                parseFloat(getComputedStyle(el).outlineWidth) >= 2,
            ),
          "Shift+Tab and visible keyboard focus",
        );
        await snapshot(`${width}-${height}-email-password`);
        await button("使用验证码登录").click();
        check(
          (await page.getByRole("link", { name: "忘记密码？" }).count()) === 0,
          "forgot hidden in OTP mode",
        );
        await geometry(`${width}x${height}/login-otp`);
        await snapshot(`${width}-${height}-email-otp`);
        await button("使用密码登录").click();
        check((await field("密码").count()) === 1, "restore password mode");
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  step("anonymous personal routes and invalid reset");
  for (const route of [
    "/personal-center",
    "/personal-center/trips",
    "/personal-center/preferences",
    "/personal-center/companions",
    "/personal-center/account",
  ]) {
    await go(route);
    check(new URL(page.url()).pathname === "/login", "PC is protected");
    check(
      new URL(page.url()).searchParams.get("returnTo") === route,
      "PC intent preserved",
    );
  }
  await go("/reset-password");
  check(
    (await heading("重设链接不可用").count()) === 1,
    "no-session reset denied",
  );
  step("real registration agreement and confirmation pending");
  await go("/register");
  await field("邮箱地址").fill(email);
  await field("密码").fill(password);
  await field("确认密码").fill(password);
  await button("创建账户").click();
  await page.getByRole("alert").filter({ hasText: "勾选" }).waitFor();
  await page.getByRole("checkbox").check();
  await button("创建账户").click();
  await heading("请检查邮箱").waitFor();
  check(
    (await publicSession()).status === "unauthenticated",
    "pending confirmation is not signed in",
  );
  await snapshot("confirmation-pending");
  await mobileState("confirmation-pending");
  step("real confirmation callback and success");
  await confirmMail(/Confirm/i);
  await heading("账户创建成功 ✓").waitFor();
  check(
    (await publicSession()).status === "authenticated",
    "confirmed real session",
  );
  await snapshot("registration-success");
  await mobileState("registration-success");
  await go("/personal-center/account");
  await logout();
  step("wrong password inline and password visibility");
  await emailLogin("Incorrect-" + randomUUID());
  await page.getByRole("alert").filter({ hasText: "邮箱或密码" }).waitFor();
  await button("显示密码").click();
  check(
    (await field("密码").getAttribute("type")) === "text",
    "visibility toggle",
  );
  await button("隐藏密码").click();
  await snapshot("wrong-password-error");
  await mobileState("wrong-password-error");
  step("real password sign in and returnTo");
  await field("密码").fill(password);
  await field("密码").press("Enter");
  await page.waitForURL(base + "/personal-center/account");
  for (const route of [
    "/personal-center",
    "/personal-center/trips",
    "/personal-center/preferences",
    "/personal-center/companions",
    "/personal-center/account",
  ]) {
    await go(route);
    check(new URL(page.url()).pathname === route, "signed-in PC navigation");
  }
  step("navigation guard and menu focus");
  const edit = page.getByRole("button", { name: /编辑/ }).first();
  check((await edit.count()) === 1, "account edit action exists");
  {
    await edit.click();
    const text = page
      .locator("input:not([type=checkbox]):not([type=file])")
      .first();
    check((await text.count()) === 1, "account editable field exists");
    {
      await text.fill("验收临时修改");
      await page
        .getByRole("link", { name: "我的旅行", exact: true })
        .first()
        .click();
      await page.getByRole("dialog").waitFor();
      await button("继续编辑").click();
      check(
        (await page.getByRole("dialog").count()) === 0 ||
          !(await page.getByRole("dialog").isVisible()),
        "navigation guard cancel",
      );
    }
    await page.getByRole("button", { name: /^打开账户菜单/ }).click();
    await button("退出登录").click();
    await page
      .getByRole("group", { name: "确认放弃未保存修改并退出" })
      .waitFor();
    await button("继续编辑").click();
    check(
      (await publicSession()).status === "authenticated",
      "cancel dirty signout preserves session",
    );
    await page.keyboard.press("Escape");
    await button("取消").click();
    await page.getByRole("button", { name: "编辑资料", exact: true }).waitFor();
  }
  await page.getByRole("button", { name: /^打开账户菜单/ }).click();
  await page.keyboard.press("Escape");
  check(
    await page
      .getByRole("button", { name: /^打开账户菜单/ })
      .evaluate((el) => document.activeElement === el),
    "menu focus return",
  );
  await logout();
  step("unregistered email OTP never creates user");
  const beforeUnknown = countUsers();
  await go("/login");
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  await button("使用验证码登录").click();
  await field("邮箱地址").fill(unknown);
  await button("获取验证码").click();
  await page.getByRole("alert").filter({ hasText: "此邮箱尚未绑定" }).waitFor();
  check(countUsers() === beforeUnknown, "unregistered email count unchanged");
  await snapshot("unregistered-email");
  await mobileState("unregistered-email");
  await page
    .getByRole("link", { name: "创建账户", exact: true })
    .first()
    .click();
  check((await field("邮箱地址").inputValue()) === unknown, "prefill email");
  check(
    !(await page.locator("body").innerText()).includes("邮箱已验证"),
    "no false verification claim",
  );
  step("registered email real Local OTP");
  await go("/login?returnTo=%2Fpersonal-center");
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  await button("使用验证码登录").click();
  await field("邮箱地址").fill(email);
  await button("获取验证码").click();
  await page.getByRole("status").filter({ hasText: "验证码已发送" }).waitFor();
  const otpMail = await captured(/^TravelAssist Local sign-in code$/);
  const code = (otpMail.Text ?? otpMail.HTML).match(/\b\d{6}\b/)?.[0];
  check(!!code, "captured OTP exists");
  await field("验证码").fill(code);
  await button("登录").click();
  await page.waitForURL(base + "/personal-center");
  await logout();
  step("phone agreement and new-user real deterministic OTP");
  await go("/login?returnTo=%2Fpersonal-center");
  await field("国家/地区码").selectOption("+1");
  await field("手机号").fill("2025550181");
  await button("获取验证码").click();
  await page.getByRole("alert").filter({ hasText: "勾选" }).waitFor();
  await page.getByRole("checkbox").check();
  await button("获取验证码").click();
  await page.getByRole("status").filter({ hasText: "验证码已发送" }).waitFor();
  await field("验证码").fill("181181");
  await button("登录").click();
  await page.waitForURL(base + "/personal-center");
  const phoneId = (await publicSession()).userId;
  await logout();
  step("existing phone preserves Auth ID");
  await new Promise((r) => setTimeout(r, 5100));
  await go("/login?returnTo=%2Fpersonal-center");
  await field("国家/地区码").selectOption("+1");
  await field("手机号").fill("2025550181");
  await page.getByRole("checkbox").check();
  await button("获取验证码").click();
  await page.getByRole("status").filter({ hasText: "验证码已发送" }).waitFor();
  await field("验证码").fill("181181");
  await button("登录").click();
  await page.waitForURL(base + "/personal-center");
  check((await publicSession()).userId === phoneId, "same phone identity");
  await logout();
  step("forgot password captured mail and reset callback");
  await go("/forgot-password");
  await field("邮箱地址").fill(email);
  await button("发送重设链接").click();
  await heading("邮件已发送 ✓").waitFor();
  await snapshot("recovery-sent");
  await mobileState("recovery-sent");
  await confirmMail(/Reset/i);
  await heading("设置新密码").waitFor();
  await mobileState("valid-reset-form");
  await field("新密码").fill("weak");
  await field("确认新密码").fill("weak");
  await button("更新密码").click();
  await page.getByRole("alert").filter({ hasText: "至少 8" }).waitFor();
  await field("新密码").fill(newPassword);
  await field("确认新密码").fill(newPassword);
  await button("更新密码").click();
  await heading("密码已更新 ✓").waitFor();
  await snapshot("password-updated");
  await mobileState("password-updated");
  await button("返回登录").click();
  await page.waitForURL(base + "/login");
  step("old password rejected new password works Planner intent");
  await emailLogin(password);
  await page.getByRole("alert").filter({ hasText: "邮箱或密码" }).waitFor();
  await emailLogin(newPassword, "/planner?intent=save");
  await page.waitForURL(base + "/planner?intent=save");
  await go("/login?returnTo=%2Fpersonal-center");
  await page.waitForURL(base + "/personal-center");
  await logout();
  step("hostile returnTo cannot escape");
  await emailLogin(newPassword, "https://evil.example");
  await page.waitForURL(base + "/");
  await go("/personal-center");
  await logout();
  step("real OAuth initiation with unavailable external providers");
  await go("/login");
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  for (const provider of ["Google", "Apple"]) {
    const response = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/auth/oauth" &&
        r.request().method() === "POST",
    );
    await button(`使用 ${provider} 登录`).click();
    const data = await (await response).json();
    check(
      data.ok && data.data.state === "oauth_redirect",
      "real OAuth initiation",
    );
    const url = new URL(data.data.url);
    check(
      url.searchParams.get("code_challenge_method") === "s256",
      "PKCE S256 initiation",
    );
    await page.getByRole("alert").filter({ hasText: "暂未配置" }).waitFor();
  }
  step("public routes and mobile keyboard-sized viewport");
  for (const route of ["/", "/start", "/planner"]) {
    step("public route " + route);
    await go(route);
    check(new URL(page.url()).pathname === route, "public route unaffected");
  }
  await page.setViewportSize({ width: 390, height: 440 });
  await go("/login");
  await field("手机号").focus();
  await button("登录").scrollIntoViewIfNeeded();
  check(
    await button("登录").isVisible(),
    "CTA reachable in keyboard-sized viewport",
  );
  await geometry("390x440 keyboard-sized viewport");
  await context.close();
  check(blocking === 0, "no blocking React/hydration errors");
  check(missingAssets.length === 0, "no missing Auth assets");
  await writeFile(
    path.join(evidence, "summary.json"),
    JSON.stringify(
      {
        status: "PASS",
        engine,
        browserVersion: browser.version(),
        responsive: results,
        realLocalAuth: "PASS",
        blockingReactErrors: blocking,
        missingAssets,
        externalGoogle: "Deferred",
        externalApple: "Deferred",
        realSms: "Deferred",
        physicalMobileKeyboard: "Deferred; resized viewport/scroll verified",
        credentialsInEvidence: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: real UI flows and " +
      results.length +
      " layout checks; credentials withheld",
  );
} catch (error) {
  console.error(
    error.stack
      ?.split("\n")
      .filter(
        (line) => line.trim().startsWith("at ") && line.includes("wbs-5-3-"),
      )
      .join("\n"),
  );
  await snapshot("failure-redacted").catch(() => {});
  console.error(
    "FAIL at " +
      phase +
      ": " +
      (error.message?.startsWith("SAFE:")
        ? error.message
        : error.name + " (details withheld to protect input secrets)"),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
