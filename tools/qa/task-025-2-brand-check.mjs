import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_0252_URL || "http://localhost:3132";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const baseline = process.env.TASK_0252_BASELINE === "true";
const out = "docs/qa/TASK-025.2";
const screenshots = ".cache/qa/brand-after";
await mkdir(screenshots, { recursive: true });
const visuals = [];
await mkdir(out, { recursive: true });
const baselineFile = out + "/regression-baseline.json";
const previous = baseline
  ? null
  : JSON.parse(await readFile(baselineFile, "utf8"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [],
  errors = [];
try {
  for (const [width, height] of [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 568],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await context.addCookies([
      {
        name: "sb-127-auth-token",
        url: base,
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
      },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push({ width, error: e.message }));
    page.on("console", (m) => {
      if (m.type() === "error")
        errors.push({ width, error: m.text(), url: m.location().url });
    });
    for (const [name, route] of [
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
      if (name === "detail") {
        await page
          .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
          .click();
        await page
          .getByRole("button", { name: "关闭保存方案并进入详情", exact: true })
          .waitFor({ state: "hidden" });
      }
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: screenshots + "/" + name + "-" + width + ".png",
      });
      const measured = await page.evaluate(() => {
        const selectors = [
          "main",
          "main > div",
          "main > section",
          "#personal-content",
          "#personal-content > div",
          "aside",
          "[data-main-header]",
          "[data-map-workspace]",
          "[data-map-surface]",
          "[data-right-panel]",
          "[data-bottom-panel]",
          "#planner-workspace",
          "#planner-workspace > aside",
          "#planner-workspace > div:nth-of-type(2)",
          "[data-detail-collapsed-bar]",
        ];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          geometry: Object.fromEntries(
            selectors.map((s) => [
              s,
              [...document.querySelectorAll(s)].map((e) => {
                const r = e.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              }),
            ]),
          ),
        };
      });
      assert.equal(measured.overflow, false, `${name} ${width} overflow`);
      const row = { name, width, height, route, ...measured };
      rows.push(row);
      if (previous)
        assert.deepEqual(
          row,
          previous.rows.find((r) => r.name === name && r.width === width),
        );
      const visual = { name, width, height };
      const logo = page
        .getByRole("link", {
          name: name === "personal" ? /TravelAssist/ : "TravelAssist 首页",
        })
        .first();
      visual.tokens = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          [
            "--color-bg-elevated",
            "--color-bg-muted",
            "--color-text-primary",
            "--color-accent-primary",
            "--color-border-subtle",
            "--color-focus-ring",
            "--font-heading",
            "--elevation-popover",
          ].map((key) => [key, css.getPropertyValue(key).trim()]),
        );
      });
      assert.deepEqual(visual.tokens, visuals[0]?.tokens || visual.tokens);
      if (name !== "personal") {
        visual.logo = await logo.evaluate((el) => {
          const c = getComputedStyle(el);
          return { radius: c.borderRadius, background: c.backgroundColor };
        });
        await logo.hover();
        visual.logoHover = await logo.evaluate(
          (el) => getComputedStyle(el).backgroundColor,
        );
        await page.mouse.move(0, 0);
      }
      if (["planner", "detail", "personal"].includes(name)) {
        const trigger = page.getByRole("button", {
          name: name === "personal" ? /打开账户菜单/ : "个人中心菜单",
          exact: name !== "personal",
        });
        await trigger.click();
        const popover = page.locator("[popover]:popover-open");
        await popover.waitFor();
        const box = await popover.boundingBox();
        assert.ok(
          box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1,
        );
        visual.popover = await popover.evaluate((el) => {
          const c = getComputedStyle(el);
          return {
            background: c.backgroundColor,
            border: c.borderColor,
            shadow: c.boxShadow,
            radius: c.borderRadius,
          };
        });
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: screenshots + "/" + name + "-popover-" + width + ".png",
          });
        await page.keyboard.press("Escape");
        await popover.waitFor({ state: "hidden" });
        assert.equal(
          await trigger.evaluate((el) => document.activeElement === el),
          true,
        );
        visual.escapeRestoresFocus = true;
      }
      if (name === "start") {
        const option = page.getByRole("radio", { name: /第一次去日本/ });
        await option.click();
        // Move keyboard focus away and back so :focus-visible is genuinely exercised.
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        const focused = await page.evaluate(() => ({
          width: getComputedStyle(document.activeElement).outlineWidth,
          color: getComputedStyle(document.activeElement).outlineColor,
        }));
        assert.notEqual(focused.width, "0px");
        visual.keyboardFocus = focused;
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: screenshots + "/start-focus-" + width + ".png",
          });
        await page.getByRole("button", { name: /下一步/ }).click();
        assert.ok(
          await page.getByText("旅行偏好", { exact: true }).first().isVisible(),
        );
        visual.wizardNextWorks = true;
      }
      visuals.push(visual);
    }
    await context.close();
  }
  // Preserve baseline failures separately and reject any new candidate error.
  if (previous) {
    const normalize = (items) =>
      items.map((e) => ({
        ...e,
        url: e.url ? new URL(e.url).pathname : undefined,
      }));
    assert.deepEqual(normalize(errors), normalize(previous.errors));
  }
  await writeFile(
    out + "/brand-report.json",
    JSON.stringify(
      {
        baseRevision: "d9ee82f7515bfc09d61d07db0232a5af203c2d16",
        fixture: "Local visual fixture only; no live Auth/Map credentials.",
        rows,
        visuals,
        screenshots,
        reducedMotion: "reduce",
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${baseline ? "baseline" : "candidate"}: ${rows.length}/20 geometry checks; ${errors.length} console/page errors`,
  );
} finally {
  await browser.close();
}
