import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://localhost:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.PLANNER_QA_OUT || "docs/qa/browser-trip-save/fallback";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = [],
  errors = [];
const key = "travelassist.saved-workspace.v1";
async function click(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function edit(page, suffix) {
  await page.waitForURL(/view=detail/);
  await page.locator('[data-workspace-mode="detail"]').waitFor();
  if (!(await page.locator("[data-detail-item]").first().isVisible()))
    await click(page, "当日执行轨道");
  await page
    .locator("[data-detail-item]")
    .filter({ hasText: "浅草寺" })
    .first()
    .click();
  await page
    .locator("[data-detail-map-inspector]")
    .getByRole("button", { name: "调整行程", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "浅草寺" });
  await dialog.getByLabel("内容", { exact: true }).fill(`浅草寺${suffix}`);
  await dialog
    .getByRole("button", { name: "调整时间 / 更改内容", exact: true })
    .click();
  await click(page, "关闭行程项目详情");
  if (
    await page
      .getByRole("button", { name: "关闭当日执行轨道", exact: true })
      .isVisible()
  )
    await click(page, "关闭当日执行轨道");
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/planner?view=detail&day=1`);
    await page.getByRole("button", { name: "保存行程", exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector("[data-browser-trip-actions] button")?.disabled,
    );
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      window.qaWorkspaceMap =
        document.querySelector(".mapboxgl-canvas") ||
        document.querySelector("[data-map-workspace]");
    });
    const bounds = await page
      .locator("[data-browser-trip-actions]")
      .boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y + bounds.height < height,
    );
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      null,
    );
    await edit(page, "（未保存）");
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      null,
    );
    await click(page, "← 返回 Planner");
    await page
      .getByRole("dialog", { name: "您有尚未保存的行程修改" })
      .waitFor();
    await page.screenshot({ path: `${out}/${width}-guard.png` });
    await page.keyboard.press("Escape");
    assert.match(page.url(), /view=detail/);
    await click(page, "← 返回 Planner");
    await click(page, "放弃修改并返回");
    await page.waitForURL(`${base}/planner`);
    assert.ok(
      await page.evaluate(
        () =>
          window.qaWorkspaceMap.isConnected &&
          window.qaWorkspaceMap ===
            (document.querySelector(".mapboxgl-canvas") ||
              document.querySelector("[data-map-workspace]")),
      ),
    );
    if (width < 1200) await click(page, "旅行设置与方案");
    await click(page, "进入行程详情");
    await page.waitForURL(/view=detail/);
    await edit(page, "（浏览器保存）");
    await click(page, "保存行程");
    await page.waitForFunction(
      (key) => localStorage.getItem(key) !== null,
      key,
    );
    const saved = await page.evaluate((key) => localStorage.getItem(key), key);
    assert.ok(saved.includes("浅草寺（浏览器保存）"));
    await page.screenshot({ path: `${out}/${width}-saved.png` });
    await page.reload();
    await page
      .getByText("已载入上次保存 · 仅此浏览器", { exact: true })
      .waitFor();
    if (width < 768) await click(page, "当日执行轨道");
    assert.ok(
      await page
        .locator("[data-detail-item]")
        .filter({ hasText: "浅草寺（浏览器保存）" })
        .count(),
    );
    if (width < 768) await click(page, "关闭当日执行轨道");
    await click(page, "← 返回 Planner");
    await page.waitForURL(`${base}/planner`);
    await click(page, "打开已保存行程");
    await page.waitForURL(/view=detail/);
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      saved,
    );
    report.push({
      width,
      height,
      savedAndRestored: true,
      discardAndEscape: true,
      noAutoSave: true,
      mapLifecycleRetained: true,
      bounds,
    });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/planner`);
  await click(page, "进入行程详情");
  await page.waitForURL(/view=detail/);
  await edit(page, "（失败保护）");
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await click(page, "← 返回 Planner");
  await click(page, "保存并返回");
  await page.getByRole("alert").filter({ hasText: "保存失败" }).waitFor();
  assert.match(page.url(), /view=detail/);
  await click(page, "继续编辑");
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  // Browser Back must offer the same protection for the shared workspace.
  await page.evaluate(() => window.history.back());
  await page.getByRole("dialog", { name: "您有尚未保存的行程修改" }).waitFor();
  await click(page, "继续编辑");
  assert.match(page.url(), /view=detail/);
  await page.getByRole("link", { name: "TravelAssist", exact: true }).click();
  await page.getByRole("dialog", { name: "您有尚未保存的行程修改" }).waitFor();
  await click(page, "继续编辑");
  await click(page, "← 返回 Planner");
  await click(page, "保存并返回");
  await page.waitForURL(`${base}/planner`);
  await click(page, "打开已保存行程");
  // Concurrent tab updates must not get overwritten.
  await page.evaluate((key) => {
    const next = JSON.parse(localStorage.getItem(key));
    next.savedAt = "2026-09-07T12:00:00Z";
    localStorage.setItem(key, JSON.stringify(next));
  }, key);
  await click(page, "保存行程");
  await page
    .locator("[data-browser-trip-actions]")
    .getByText(/另一页面已更新/)
    .waitFor();
  report.push({
    quotaFailureProtected: true,
    browserBackGuard: true,
    logoGuard: true,
    saveAndReturn: true,
    concurrentWriteProtected: true,
  });
  await context.close();
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ base, report, errors }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ report, errors }, null, 2));
