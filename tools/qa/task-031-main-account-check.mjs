import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE,
);
const base = "http://localhost:3134";
const out = "docs/qa/TASK-031";
const screens = ".cache/qa/task031/interaction";
await mkdir(out, { recursive: true });
await mkdir(screens, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [],
  errors = [],
  failures = [];
const pages = [
  ["home", "/"],
  ["start", "/start"],
  ["planner", "/planner"],
  ["detail", "/planner?view=detail&day=1"],
];
async function context(viewport) {
  const c = await browser.newContext({ viewport, reducedMotion: "reduce" });
  await c.route("https://avatar.example.invalid/verified.webp", (r) =>
    r.fulfill({
      path: "public/media/personal-center/avatar-yuki.webp",
      contentType: "image/webp",
    }),
  );
  await c.addInitScript(() => {
    window.addEventListener("pageshow", (e) => {
      window.__persisted = e.persisted;
    });
  });
  return c;
}
function captureErrors(page, key) {
  page.on("pageerror", (e) =>
    errors.push({ key, type: "page", message: e.message }),
  );
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push({ key, type: "console", message: m.text() });
  });
}
const menu = (p) => p.getByRole("button", { name: /个人中心菜单/ });
async function account(p, name) {
  if (name === "home")
    return p
      .getByRole("main")
      .getByRole("link", { name: "验收账户 · 个人中心", exact: true });
  if (name === "start")
    return p.getByRole("link", { name: "验收账户 · 个人中心", exact: true });
  await menu(p).click();
  return p.getByRole("link", { name: "进入个人中心", exact: true });
}
async function guest(p, name) {
  if (name === "planner" || name === "detail") {
    assert.match(await menu(p).getAttribute("aria-label"), /登录或/);
    await menu(p).click();
    await p.getByRole("link", { name: "登录", exact: true }).waitFor();
  } else await p.getByRole("link", { name: "登录", exact: true }).waitFor();
  assert.equal(await p.getByText("验收账户", { exact: true }).count(), 0);
  assert.equal(
    await p.getByText("伪造 Cookie 身份", { exact: false }).count(),
    0,
  );
}
async function target(p) {
  const r = await p.boundingBox();
  assert.ok(r.width >= 44 && r.height >= 44, JSON.stringify(r));
  return r;
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 568],
  ]) {
    for (const [name, path] of pages) {
      const key = `${width}-${name}`,
        c = await context({ width, height }),
        p = await c.newPage();
      captureErrors(p, key);
      await p.goto(base + path, { waitUntil: "networkidle" });
      if (name === "detail") {
        const confirm = p.getByRole("button", {
          name: "保存到浏览器并进入详情",
          exact: true,
        });
        if (await confirm.isVisible()) await confirm.click();
        await p.locator("dialog[open]").waitFor({ state: "hidden" });
      }
      assert.equal(p.url(), base + path);
      const trigger =
        name === "planner" || name === "detail"
          ? menu(p)
          : p.getByRole("link", { name: "登录", exact: true });
      // Start keyboard traversal at the document skip link; Detail may focus restored content.
      await p.locator('a[href^="#"]').first().focus();
      for (
        let i = 0;
        i < 30 &&
        !(await trigger.evaluate((e) => e === document.activeElement));
        i++
      )
        await p.keyboard.press("Tab");
      assert.ok(
        await trigger.evaluate((e) => e === document.activeElement),
        key + " Tab reach",
      );
      const focus = await trigger.evaluate((e) => ({
        visible: e.matches(":focus-visible"),
        outline: getComputedStyle(e).outlineWidth,
      }));
      assert.ok(focus.visible);
      assert.notEqual(focus.outline, "0px");
      const rect = await target(trigger);
      if (name === "planner" || name === "detail") {
        await p.keyboard.press("Enter");
        await p.getByRole("link", { name: "登录", exact: true }).waitFor();
        assert.ok(
          await p
            .getByRole("link", { name: "登录", exact: true })
            .evaluate((e) => e === document.activeElement),
        );
        await p.keyboard.press("Escape");
        assert.ok(await trigger.evaluate((e) => e === document.activeElement));
        await p.keyboard.press("Enter");
      }
      const login = p.getByRole("link", { name: "登录", exact: true });
      const href = await login.getAttribute("href");
      assert.equal(new URL(href, base).searchParams.get("returnTo"), path);
      await target(login);
      await p.screenshot({ path: `${screens}/${key}-guest-entry.png` });
      await login.click();
      await p.getByRole("tab", { name: "邮箱登录" }).click();
      await p
        .getByLabel("邮箱地址", { exact: true })
        .fill("visual@example.invalid");
      await p.getByLabel("密码", { exact: true }).fill("LocalFixture031!");
      await p.getByRole("button", { name: "登录", exact: true }).click();
      await p.waitForURL(base + path);
      await p.waitForLoadState("networkidle");
      const signed =
        name === "planner" || name === "detail"
          ? menu(p)
          : name === "home"
            ? p
                .getByRole("main")
                .getByRole("link", { name: "验收账户 · 个人中心", exact: true })
            : p.getByRole("link", { name: "验收账户 · 个人中心", exact: true });
      await signed.waitFor();
      assert.match(await signed.getAttribute("aria-label"), /验收账户/);
      await target(signed);
      const avatar = signed.locator("[data-account-avatar] img");
      assert.equal(await avatar.getAttribute("alt"), "");
      assert.equal(
        await avatar.getAttribute("src"),
        "https://avatar.example.invalid/verified.webp",
      );
      await p.screenshot({ path: `${screens}/${key}-verified.png` });
      await avatar.evaluate((e) =>
        e.dispatchEvent(new Event("error", { bubbles: true })),
      );
      await signed
        .locator("[data-account-avatar]")
        .getByText("旅", { exact: true })
        .waitFor();
      await (await account(p, name)).click();
      await p.waitForURL(base + "/personal-center");
      await p.locator("#personal-content").waitFor();
      await p.getByRole("button", { name: /打开账户菜单/ }).click();
      await p.getByRole("button", { name: "退出登录", exact: true }).click();
      await p.waitForURL(base + "/");
      await p.getByRole("link", { name: "登录", exact: true }).waitFor();
      await p.goBack({ waitUntil: "networkidle" });
      assert.equal(p.url(), base + path);
      await guest(p, name);
      const history = {
        back: p.url(),
        persisted: await p.evaluate(() => window.__persisted ?? null),
      };
      if (name === "planner" || name === "detail")
        await p.keyboard.press("Escape");
      await p.goForward({ waitUntil: "networkidle" });
      assert.equal(p.url(), base + "/");
      await p.getByRole("link", { name: "登录", exact: true }).waitFor();
      rows.push({
        key,
        path,
        loginHref: href,
        focus,
        target: rect,
        signInReturn: "pass",
        sharedAvatar: "pass",
        brokenAvatar: "neutral",
        personalCenter: "pass",
        logout: "Guest",
        history: { ...history, forward: p.url() },
        overflow: await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      });
      await c.close();
    }
    for (const state of ["invalid", "expired", "neutral"]) {
      const c = await context({ width, height });
      await c.addCookies([
        {
          name: "sb-127-auth-token",
          url: base,
          value:
            "base64-" +
            Buffer.from(
              JSON.stringify({
                access_token:
                  state === "neutral"
                    ? "task024-visual-fixture"
                    : "unverified-token",
                refresh_token: "expired-fixture",
                expires_at: state === "expired" ? 1 : 4102444800,
                expires_in: 3600,
                token_type: "bearer",
                user: {
                  id: "00000000-0000-4000-8000-000000000024",
                  user_metadata: {
                    full_name: "伪造 Cookie 身份",
                    avatar_url: "https://evil.invalid/a.png",
                  },
                },
              }),
            ).toString("base64url"),
        },
      ]);
      const p = await c.newPage();
      captureErrors(p, `${width}-${state}`);
      for (const [name, path] of pages) {
        await p.goto(base + path, { waitUntil: "networkidle" });
        if (name === "detail") {
          const confirm = p.getByRole("button", {
            name: "保存到浏览器并进入详情",
            exact: true,
          });
          if (await confirm.isVisible()) await confirm.click();
          await p.locator("dialog[open]").waitFor({ state: "hidden" });
        }
        assert.equal(p.url(), base + path);
        assert.equal(
          await p.getByText("伪造 Cookie 身份", { exact: false }).count(),
          0,
        );
        assert.equal(await p.locator('img[src*="evil.invalid"]').count(), 0);
        if (state === "neutral") {
          const entry =
            name === "home"
              ? p
                  .getByRole("main")
                  .getByRole("link", { name: "进入个人中心", exact: true })
              : name === "start"
                ? p.getByRole("link", {
                    name: "个人中心 · 个人中心",
                    exact: true,
                  })
                : menu(p);
          await entry
            .locator("[data-account-avatar]")
            .getByText("旅", { exact: true })
            .waitFor();
        } else await guest(p, name);
        rows.push({
          key: `${width}-${state}-${name}`,
          verifiedClaimsOnly: true,
          state: state === "neutral" ? "verified-neutral" : "Guest",
          overflow: await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        });
      }
      await c.close();
    }
  }
  assert.ok(rows.every((r) => !r.overflow));
  assert.deepEqual(errors, []);
} catch (e) {
  failures.push(e.stack);
  throw e;
} finally {
  await browser.close();
  await writeFile(
    `${out}/account-browser-report.json`,
    JSON.stringify(
      {
        base,
        fixture:
          "Existing loopback visual fixture with TASK_031_AUTH_FIXTURE=1; no live provider acceptance",
        rows,
        errors,
        failures,
      },
      null,
      2,
    ),
  );
  console.log(
    `${rows.length} completed checks, ${errors.length} errors, ${failures.length} failures`,
  );
}
