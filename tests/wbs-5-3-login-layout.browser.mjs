// Production-page presentation QA; anonymous context and intercepted mail UI states only.
// Never registers, signs in, resets DB, reads user cookies or sends OTP mail.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const base = process.env.WBS_BASE_URL ?? "http://127.0.0.1:3000";
assert.equal(base, "http://127.0.0.1:3000");
const evidence = process.env.WBS_EVIDENCE_DIR;
assert.ok(evidence, "Explicit evidence directory required");
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.WBS_BROWSER === "edge"
    ? { channel: "msedge", headless: true }
    : { headless: true },
);
const page = await browser.newPage();
let errors = 0;
let blockedAuthWrites = 0;
page.on("pageerror", () => errors++);
// Fail closed if a UI regression attempts any unmocked Auth mutation.
// Specific presentation mocks below take precedence over this catch-all.
await page.route("**/auth/**", (route) => {
  if (route.request().method() === "POST") {
    blockedAuthWrites++;
    return route.abort();
  }
  return route.continue();
});
const results = [];
const button = (name) => page.getByRole("button", { name, exact: true });
async function measure(label, baseline, action = button("登录")) {
  const photo = await page
    .getByRole("complementary", { name: "日本旅行摄影" })
    .boundingBox();
  const card = await page.locator("#auth-content").boundingBox();
  const cta = await action.boundingBox();
  // Mobile intentionally scrolls to focused feedback. Compare document coordinates,
  // not viewport offsets, so accessible scrolling is not mistaken for layout shift.
  const scrollY = await page.evaluate(() => window.scrollY);
  for (const rect of [photo, card, cta]) rect.y += scrollY;
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const controls = [
      ...document.querySelectorAll("#auth-content :is(input,button,a,select)"),
    ].filter((el) => el.getBoundingClientRect().width > 0);
    const small = controls.filter((el) => {
      const r = (
        el.type === "checkbox" ? el.closest("label") : el
      ).getBoundingClientRect();
      return r.height < 43.5 || r.width < 43.5;
    }).length;
    const inputSmall = controls.filter(
      (el) =>
        el.tagName === "INPUT" &&
        el.type !== "checkbox" &&
        parseFloat(getComputedStyle(el).fontSize) < 16,
    ).length;
    const feedback = [
      ...document.querySelectorAll("#auth-content p[role]"),
    ].filter((el) => el.textContent.trim());
    const overflowingFeedback = feedback.some(
      (el) =>
        el.getBoundingClientRect().height >
        el.parentElement.getBoundingClientRect().height + 1,
    );
    const fields = document.querySelector("fieldset");
    const overlaps = [...(fields?.children ?? [])].some(
      (el, i, all) =>
        i &&
        all[i - 1].getBoundingClientRect().bottom >
          el.getBoundingClientRect().top + 1,
    );
    return {
      width: innerWidth,
      height: innerHeight,
      horizontal: root.scrollWidth > root.clientWidth + 1,
      vertical: root.scrollHeight > root.clientHeight + 1,
      small,
      inputSmall,
      overflowingFeedback,
      overlaps,
    };
  });
  assert.equal(layout.horizontal, false, label + " horizontal scroll");
  assert.equal(layout.small, 0, label + " 44px target");
  assert.equal(layout.inputSmall, 0, label + " 16px input");
  assert.equal(
    layout.overflowingFeedback,
    false,
    label + " feedback fits reserved slot",
  );
  assert.equal(layout.overlaps, false, label + " fields overlap");
  if (layout.width >= 768 && layout.height >= 660)
    assert.equal(layout.vertical, false, label + " desktop vertical scroll");
  if (baseline) {
    for (const [name, current] of Object.entries({ photo, card, cta })) {
      for (const key of ["y", "height"])
        assert.ok(
          Math.abs(current[key] - baseline[name][key]) < 1,
          `${label} ${name} ${key} moved`,
        );
      for (const key of ["x", "width"])
        if (name !== "cta")
          assert.ok(
            Math.abs(current[key] - baseline[name][key]) < 1,
            `${label} ${name} ${key} moved`,
          );
    }
  }
  results.push({ label, ...layout, photo, card, cta });
  return { photo, card, cta };
}
function sameCanvas(label, current, baseline, fixedDesktop) {
  for (const name of ["photo", "card"])
    for (const key of ["x", "y", "width", "height"]) {
      // Mobile forms flow naturally; only the card's content height may differ.
      if (name === "card" && key === "height" && !fixedDesktop) continue;
      assert.ok(
        Math.abs(current[name][key] - baseline[name][key]) < 1,
        `${label}: ${name} ${key} changed across Auth routes`,
      );
    }
}
try {
  for (const [width, height] of [
    [1920, 1080],
    [1600, 900],
    [1440, 900],
    [1440, 760],
    [1280, 720],
    [1024, 768],
    [1024, 660],
    [768, 1024],
    [390, 844],
    [320, 740],
    [640, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/login", { waitUntil: "networkidle" });
    const label = `${width}x${height}`;
    const baseline = await measure(label + " phone");
    assert.equal(
      await page
        .locator('input:not([type="checkbox"])')
        .evaluateAll((inputs) => inputs.every((input) => input.value === "")),
      true,
    );
    await page.screenshot({
      path: path.join(evidence, `${label}-empty-phone.png`),
      fullPage: true,
    });
    await button("登录").click();
    await page.getByRole("alert").filter({ hasText: "勾选" }).waitFor();
    await measure(label + " phone-empty", baseline);
    await page.getByRole("tab", { name: "邮箱登录" }).click();
    await measure(label + " password", baseline);
    assert.equal(
      await page
        .locator('input:not([type="checkbox"])')
        .evaluateAll((inputs) => inputs.every((input) => input.value === "")),
      true,
    );
    await page.screenshot({
      path: path.join(evidence, `${label}-empty-password.png`),
      fullPage: true,
    });
    await button("登录").click();
    await page.getByRole("alert").filter({ hasText: "邮箱" }).waitFor();
    await measure(label + " password-empty", baseline);
    await button("使用验证码登录").click();
    await measure(label + " otp", baseline);
    await button("登录").click();
    await page.getByRole("alert").filter({ hasText: "邮箱" }).waitFor();
    await measure(label + " otp-empty", baseline);
    await page.route("**/auth/email-otp", (route) =>
      route.fulfill({
        status: 400,
        json: { ok: false, code: "email_not_registered" },
      }),
    );
    await page
      .getByLabel("邮箱地址", { exact: true })
      .fill("layout-only@example.test");
    await button("获取验证码").click();
    await page.getByRole("alert").filter({ hasText: "尚未绑定" }).waitFor();
    await measure(
      label + " unknown-email-ui",
      baseline,
      button("使用其他邮箱"),
    );
    await button("使用其他邮箱").click();
    await page.unroute("**/auth/email-otp");
    await page.route("**/auth/email-otp", (route) =>
      route.fulfill({
        json: { ok: true, data: { state: "otp_sent", returnTo: "/" } },
      }),
    );
    await page
      .getByLabel("邮箱地址", { exact: true })
      .fill("layout-only@example.test");
    await button("获取验证码").click();
    await page
      .getByRole("status")
      .filter({ hasText: "验证码已发送" })
      .waitFor();
    await measure(label + " sent-ui", baseline);
    await page.unroute("**/auth/email-otp");
    await page.screenshot({
      path: path.join(evidence, `${label}-feedback.png`),
      fullPage: true,
      mask: [page.locator("input")],
    });
    await button("使用密码登录").click();
    await page.getByLabel("邮箱地址", { exact: true }).fill("");
    await page.getByRole("link", { name: "忘记密码？", exact: true }).click();
    await page
      .getByRole("heading", { name: "找回密码", exact: true })
      .waitFor();
    const fixedDesktop = width >= 768 && height >= 660;
    const recovery = await measure(
      label + " forgot",
      null,
      button("发送重设链接"),
    );
    sameCanvas(label + " forgot", recovery, baseline, fixedDesktop);
    await page.screenshot({
      path: path.join(evidence, `${label}-forgot.png`),
      fullPage: true,
    });
    await button("发送重设链接").click();
    await page.getByRole("alert").filter({ hasText: "邮箱" }).waitFor();
    await measure(label + " forgot-empty", recovery, button("发送重设链接"));
    await page.route("**/auth/recovery", (route) =>
      route.fulfill({
        json: {
          ok: true,
          data: { state: "recovery_sent", returnTo: "/reset-password" },
        },
      }),
    );
    await page
      .getByLabel("邮箱地址", { exact: true })
      .fill("layout-only@example.test");
    await button("发送重设链接").click();
    await page
      .getByRole("heading", { name: "邮件已发送 ✓", exact: true })
      .waitFor();
    const sent = await measure(
      label + " recovery-sent-ui",
      null,
      page.getByRole("button", { name: /秒后重新发送/ }),
    );
    sameCanvas(label + " recovery-sent-ui", sent, baseline, fixedDesktop);
    await page.unroute("**/auth/recovery");
    await page.getByRole("link", { name: "← 返回登录", exact: true }).click();
    await page
      .getByRole("heading", { name: "欢迎回来", exact: true })
      .waitFor();
    sameCanvas(
      label + " return-login",
      await measure(label + " return-login"),
      baseline,
      fixedDesktop,
    );
    await page.getByRole("link", { name: "创建账户", exact: true }).click();
    await page
      .getByRole("heading", { name: "创建账户", exact: true })
      .waitFor();
    const register = await measure(
      label + " register",
      null,
      button("创建账户"),
    );
    sameCanvas(label + " register", register, baseline, fixedDesktop);
    await button("创建账户").click();
    await page.getByRole("alert").filter({ hasText: "勾选" }).waitFor();
    await measure(label + " register-empty", register, button("创建账户"));
    await page.goto(base + "/reset-password", { waitUntil: "networkidle" });
    const reset = await measure(
      label + " reset-no-session",
      null,
      page.getByRole("link", { name: "重新获取重设链接", exact: true }),
    );
    sameCanvas(label + " reset-no-session", reset, baseline, fixedDesktop);
    console.log(
      "PASS " +
        label +
        ": 15 states, stable login controls and shared Auth canvas",
    );
  }
  assert.equal(errors, 0, "No browser runtime errors");
  assert.equal(blockedAuthWrites, 0, "No unmocked Auth writes attempted");
  await writeFile(
    path.join(evidence, "summary.json"),
    JSON.stringify(
      {
        version: browser.version(),
        status: "PASS",
        authRequestsInterceptedForPresentationOnly: true,
        accountDataTouched: false,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
