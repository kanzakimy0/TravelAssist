import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const baseline = process.env.TASK_024_BASELINE === "true";
const base = process.env.TASK_024_URL || "http://localhost:3124";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = baseline ? ".cache/qa/baseline" : "docs/qa/TASK-024";
await mkdir(out, { recursive: true });
const screenshots = baseline ? out : ".cache/qa/task024-screenshots";
await mkdir(screenshots, { recursive: true });
const baselineRows = baseline
  ? []
  : JSON.parse(await readFile(".cache/qa/baseline/report.json", "utf8")).rows;
const browser = await chromium.launch({
  headless: true,
  channel: process.env.CHROME_CHANNEL || "msedge",
});
const rows = [];
const errors = [];
const geometry = () =>
  Object.fromEntries(
    [
      "[data-map-workspace]",
      "[data-map-surface]",
      "[data-right-panel]",
      "[data-bottom-panel]",
      "#planner-workspace",
      "#planner-workspace > aside",
      "#planner-workspace > div:nth-of-type(2)",
      "[data-detail-collapsed-bar]",
    ].map((s) => {
      const e = document.querySelector(s);
      if (!e) return [s, null];
      const r = e.getBoundingClientRect();
      return [s, { x: r.x, y: r.y, width: r.width, height: r.height }];
    }),
  );
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 568],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    // Test fixture accepted only by tools/qa/task-024-visual-auth-fixture.mjs.
    // Does not claim live authentication or store any real user session.
    await context.addCookies([
      {
        name: "sb-127-auth-token",
        value:
          "base64-" +
          Buffer.from(
            JSON.stringify({
              access_token: "task024-visual-fixture",
              refresh_token: "fixture",
              expires_at: 4102444800,
              expires_in: 3600,
              token_type: "bearer",
              user: { id: "00000000-0000-4000-8000-000000000024" },
            }),
          ).toString("base64url"),
        url: base,
      },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", (e) => errors.push({ width, error: e.message }));
    page.on("console", (m) => {
      if (m.type() === "error" && !/favicon|404 \(Not Found\)/.test(m.text()))
        errors.push({ width, error: m.text() });
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && /\.(js|css|png|webp|jpg)(\?|$)/.test(r.url()))
        errors.push({
          width,
          status: r.status(),
          resource: new URL(r.url()).pathname,
        });
    });
    for (const [name, route] of [
      ["home", "/"],
      ["start", "/start"],
      ["planner", "/planner"],
      ["detail", "/planner?view=detail&day=1"],
      ["personal", "/personal-center"],
    ]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      if (name === "start")
        await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
      if (name === "personal") {
        await page
          .getByRole("heading", { name: "我的首页", exact: true })
          .waitFor();
        await page
          .getByText("正在整理旅行状态…", { exact: true })
          .waitFor({ state: "hidden" });
      }
      if (name === "planner" || name === "detail")
        await page
          .locator(
            `[data-workspace-mode="${name === "detail" ? "detail" : "planner"}"]`,
          )
          .waitFor();
      if (name === "detail") {
        await page
          .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
          .click();
        await page
          .getByRole("button", { name: "关闭保存方案并进入详情", exact: true })
          .waitFor({ state: "hidden" });
      }
      const measured = await page.evaluate(geometry);
      const row = { width, height, name, route, geometry: measured };
      if (!baseline) {
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${width} ${name} overflow`,
        );
        assert.equal(
          await page.locator("[data-main-shell]").count(),
          name === "personal" ? 0 : 1,
        );
        assert.equal(
          await page.locator("[data-main-header]").count(),
          name === "personal" ? 0 : 1,
        );
        assert.equal(
          await page.getByRole("main").count(),
          1,
          `${name} one main`,
        );
        if (name === "planner" || name === "detail")
          assert.deepEqual(
            measured,
            baselineRows.find((r) => r.width === width && r.name === name)
              .geometry,
            `${width} ${name} geometry unchanged`,
          );
        row.geometryMatchesBaseline =
          name === "planner" || name === "detail" ? true : undefined;
        row.brand = await page
          .locator('a[href="/"] img')
          .first()
          .getAttribute("src");
        assert.match(row.brand, /travelassist-logo-torii/);
        row.tokens = await page.evaluate(() => {
          const s = getComputedStyle(document.documentElement);
          return Object.fromEntries(
            [
              "--color-bg-canvas",
              "--color-bg-elevated",
              "--color-text-primary",
              "--color-text-secondary",
              "--color-accent-primary",
              "--color-bg-muted",
              "--color-border-subtle",
              "--color-focus-ring",
              "--elevation-card",
              "--elevation-popover",
              "--font-body",
              "--radius-md",
            ].map((k) => [k, s.getPropertyValue(k).trim()]),
          );
        });
        const logo = page
          .getByRole("link", { name: "TravelAssist 首页", exact: true })
          .filter({ visible: true })
          .first();
        const skip = page
          .locator(
            'a[href="#home-content"], a[href="#start-content"], a[href="#planner-workspace"], a[href="#personal-content"]',
          )
          .first();
        await skip.focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page
            .getByRole("main")
            .evaluate((el) => el === document.activeElement),
          true,
          "skip link focuses main",
        );
        await logo.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        assert.equal(
          await logo.evaluate((el) => getComputedStyle(el).outlineStyle),
          "solid",
        );
        await page.screenshot({
          path: path.join(screenshots, `${width}-${name}-focus.jpg`),
          quality: 80,
        });
        await logo.blur();
      }
      await page.screenshot({
        path: path.join(screenshots, `${width}-${name}.jpg`),
        quality: 82,
      });
      if (!baseline) {
        const logo = page
          .getByRole("link", { name: "TravelAssist 首页", exact: true })
          .filter({ visible: true })
          .first();
        assert.ok(
          await logo.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          }),
          "logo is unobstructed",
        );
        await logo.hover();
        row.hover = await logo.evaluate((el) => ({
          background: getComputedStyle(el).backgroundColor,
        }));
        if (["planner", "detail", "personal"].includes(name)) {
          const trigger = page.getByRole("button", {
            name: name === "personal" ? /打开账户菜单/ : "个人中心菜单",
            exact: name !== "personal",
          });
          await trigger.click();
          const popover = page.locator("[popover]:popover-open");
          await popover.waitFor();
          const rect = await popover.boundingBox();
          assert.ok(
            rect.x >= 0 &&
              rect.y >= 0 &&
              rect.x + rect.width <= width + 1 &&
              rect.y + rect.height <= height + 1,
          );
          row.popover = await popover.evaluate((el) => {
            const s = getComputedStyle(el);
            return {
              background: s.backgroundColor,
              border: s.borderColor,
              shadow: s.boxShadow,
              radius: s.borderRadius,
            };
          });
          await page.screenshot({
            path: path.join(screenshots, `${width}-${name}-popover.jpg`),
            quality: 82,
          });
          await page.keyboard.press("Escape");
          await popover.waitFor({ state: "hidden" });
          assert.equal(
            await trigger.evaluate((el) => document.activeElement === el),
            true,
          );
        }
        if (name === "start") {
          await page.getByRole("radio", { name: /第一次去日本/ }).click();
          await page.getByRole("button", { name: /下一步/ }).click();
          assert.ok(
            await page
              .getByText("旅行偏好", { exact: true })
              .first()
              .isVisible(),
          );
        }
        if (name === "home") {
          await page.getByRole("link", { name: /让我们开始吧/ }).click();
          await page.waitForURL(base + "/start");
          await page.goBack();
          await page.waitForURL((url) => url.pathname === "/");
        }
        if (name === "planner" || name === "detail") {
          await page
            .getByRole("button", { name: "个人中心菜单", exact: true })
            .click();
          await page
            .getByRole("link", { name: "进入个人中心", exact: true })
            .click();
          await page.waitForURL(base + "/personal-center");
          assert.equal(await page.locator("[data-main-shell]").count(), 0);
        }
        if (name === "personal") {
          await page.goto(base + "/personal-center/account", {
            waitUntil: "networkidle",
          });
          const edit = page.getByRole("button", {
            name: "编辑资料",
            exact: true,
          });
          await edit.click();
          await page.getByLabel(/昵称/).fill("Shell QA");
          await page
            .getByRole("link", { name: "TravelAssist 首页", exact: true })
            .filter({ visible: true })
            .first()
            .click();
          const guard = page.getByRole("dialog", {
            name: "您有尚未保存的修改",
          });
          await guard
            .getByRole("button", { name: "继续编辑", exact: true })
            .click();
          assert.equal(await page.getByLabel(/昵称/).inputValue(), "Shell QA");
          await page
            .getByRole("link", { name: "TravelAssist 首页", exact: true })
            .filter({ visible: true })
            .first()
            .click();
          await guard
            .getByRole("button", { name: "放弃修改", exact: true })
            .click();
          await page.waitForURL((url) => url.pathname === "/");
          row.unsavedGuard = "cancel retains edits; discard navigates";
        }
        await page.goto(base + route, { waitUntil: "networkidle" });
        await page
          .getByRole("link", { name: "TravelAssist 首页", exact: true })
          .filter({ visible: true })
          .first()
          .click();
        await page.waitForURL((url) => url.pathname === "/");
        row.navigation = "passed";
        row.keyboard = "passed";
        row.overflow = false;
      }
      rows.push(row);
      console.log(`${width} ${name} PASS`);
    }
    await context.close();
  }
  assert.deepEqual(errors, [], "no runtime/hydration or missing asset errors");
} finally {
  await browser.close();
  await writeFile(
    path.join(out, "report.json"),
    JSON.stringify(
      {
        auth: "local visual fixture, not live Auth",
        map: "existing no-token fallback, not live Mapbox",
        baseline,
        baseUrl: base,
        executionBase: "e74904830cbf8e6745b2013b2888e38984ccf96d",
        screenshotDirectory: screenshots,
        rows,
        errors,
      },
      null,
      2,
    ),
  );
}
