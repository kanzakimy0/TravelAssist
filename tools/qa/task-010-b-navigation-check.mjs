import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_010_B_URL || "http://127.0.0.1:3112";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const output = path.resolve("docs/qa/TASK-010-B");
await mkdir(output, { recursive: true });
const routes = [
  "/",
  "/start",
  "/planner",
  "/personal-center",
  "/personal-center/trips",
  "/personal-center/preferences",
  "/personal-center/companions",
  "/personal-center/account",
  "/personal-center/account/security",
  "/personal-center/account/privacy",
  "/personal-center/account/booking-sync",
  ...[
    "mobility",
    "attractions",
    "dining",
    "accommodation",
    "budget",
    "experience",
    "advanced",
  ].map((category) => `/personal-center/preferences/${category}`),
];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
const errors = [];
const logo = (page) =>
  page
    .getByRole("link", { name: /TravelAssist/ })
    .filter({ visible: true })
    .first();
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.location().url.endsWith("/favicon.ico")
      )
        errors.push(message.text());
    });
    for (const route of routes) {
      await page.goto(base + route);
      await logo(page).waitFor();
      assert.equal(await logo(page).getAttribute("href"), "/");
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width} ${route}: overflow`,
      );
      assert.equal(await page.locator('a[href="#"]').count(), 0);
      await logo(page).click();
      await page.waitForURL(base + "/");
      results.push({ viewport: `${width}x${height}`, route, logo: "passed" });
    }
    for (const source of ["/personal-center", "/personal-center/trips"]) {
      for (const [label, target] of [
        [source.endsWith("trips") ? "返回当前规划" : "继续规划", "/planner"],
        ["开始新旅行", "/start?entry=step3"],
      ]) {
        await page.goto(base + source);
        await page.getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL(base + target);
        if (target.includes("step3"))
          await page
            .getByRole("heading", { name: "这次旅行怎么安排？", level: 1 })
            .waitFor();
        await page.goBack();
        await page.waitForURL(base + source);
        await page.goForward();
        await page.waitForURL(base + target);
      }
    }
    await page.goto(base + "/personal-center");
    assert.equal(
      await page
        .getByRole("link", { name: "继续规划", exact: true })
        .evaluate((element) => getComputedStyle(element).color),
      "rgb(255, 250, 246)",
    );
    await page.getByRole("button", { name: /账户菜单/ }).click();
    const nav = page.getByRole("navigation", { name: "账户快捷导航" });
    await nav.waitFor();
    assert.equal(
      await nav
        .getByRole("link", { name: /返回首页|返回 TravelAssist/ })
        .count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", { name: /退出登录/ }).isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await nav.isVisible(), false);
    assert.ok(
      await page
        .getByRole("button", { name: /账户菜单/ })
        .evaluate((element) => element === document.activeElement),
    );
    await page.screenshot({
      path: path.join(output, `${width}x${height}-home.png`),
    });
    await page.goto(base + "/personal-center/trips");
    await page.getByRole("link", { name: "开始新旅行", exact: true }).waitFor();
    await page.screenshot({
      path: path.join(output, `${width}x${height}-trips.png`),
    });
    await page.goto(base + "/personal-center/account");
    for (const sub of ["security", "privacy", "booking-sync"]) {
      await page.locator(`a[href="/personal-center/account/${sub}"]`).click();
      await page.waitForURL(base + "/personal-center/account/" + sub);
      await page.getByRole("link", { name: "返回账户" }).click();
      await page.waitForURL(base + "/personal-center/account");
    }
    const editProfile = page.getByRole("button", { name: "编辑资料" });
    if (await editProfile.count()) await editProfile.click();
    await page.getByLabel(/昵称/).fill("Guard QA");
    await logo(page).click();
    const guard = page.getByRole("dialog", { name: "您有尚未保存的修改" });
    await guard.waitFor();
    await page.screenshot({
      path: path.join(output, `${width}x${height}-guard.png`),
    });
    await guard.getByRole("button", { name: "继续编辑" }).click();
    assert.equal(await page.getByLabel(/昵称/).inputValue(), "Guard QA");
    await logo(page).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    assert.ok(
      await logo(page).evaluate(
        (e) =>
          e === document.activeElement &&
          getComputedStyle(e).outlineStyle !== "none",
      ),
    );
    await page.keyboard.press("Enter");
    await guard.waitFor();
    await guard.getByRole("button", { name: "放弃修改" }).click();
    await page.waitForURL(base + "/");
    await logo(page).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    assert.ok(
      await logo(page).evaluate(
        (e) =>
          e === document.activeElement &&
          getComputedStyle(e).outlineStyle !== "none",
      ),
    );
    await page.keyboard.press("Enter");
    await page.waitForURL(base + "/");
    results.push({
      viewport: `${width}x${height}`,
      actions: "4 passed",
      history: "passed",
      accountSubpages: "passed",
      guardCancelConfirm: "passed",
      keyboard: "passed",
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
await writeFile(
  path.join(output, "report.json"),
  JSON.stringify(
    { results, errors, detail: "Pending TASK-011-A / Draft PR #102" },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ logoChecks: routes.length * 4, viewports: 4, errors }),
);
