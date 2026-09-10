import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://localhost:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out =
  process.env.PLANNER_QA_OUT || "docs/qa/browser-trip-save/action-layout";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const results = [],
  errors = [];
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [1440, 650],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/planner?view=detail&day=1`);
    await page.waitForFunction(
      () =>
        !document.querySelector("[data-browser-trip-actions] button")?.disabled,
    );
    const automatic = width < 768 || height < 700;
    if (automatic) await click(page, "当日执行轨道");
    const back = page.getByRole("button", {
      name: "← 返回 Planner",
      exact: true,
    });
    const save = page.getByRole("button", { name: "保存行程", exact: true });
    const add = page.getByRole("button", { name: "新增行程项目", exact: true });
    const bounds = await Promise.all(
      [back, save, add].map((e) => e.boundingBox()),
    );
    for (const box of bounds)
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1);
    assert.ok(bounds[0].x + bounds[0].width <= bounds[1].x + 1);
    assert.ok(bounds[1].x + bounds[1].width <= bounds[2].x + 1);
    assert.ok(Math.abs(bounds[0].y - bounds[2].y) < 2);
    await page.screenshot({ path: `${out}/${width}x${height}-expanded.png` });
    await click(page, "收起行程栏");
    await page
      .locator("[data-detail-collapsed-bar]")
      .waitFor({ state: "visible" });
    const bar = await page.locator("[data-detail-collapsed-bar]").boundingBox();
    assert.ok(Math.abs(bar.y + bar.height - height) < 2, JSON.stringify(bar));
    assert.ok(bar.height <= 92, JSON.stringify(bar));
    assert.equal(await page.locator("[data-browser-trip-actions]").count(), 1);
    await click(page, "保存行程");
    await page
      .getByText("已保存到此浏览器 · 刷新可恢复", { exact: true })
      .waitFor();
    await page.screenshot({ path: `${out}/${width}x${height}-collapsed.png` });
    await click(page, "当日执行轨道");
    await add.waitFor({ state: "visible" });
    await click(page, "← 返回 Planner");
    await page.waitForURL(`${base}/planner`);
    assert.equal(await page.getByRole("dialog").count(), 0);
    results.push({
      width,
      height,
      sameRowOrder: true,
      minimizedBar: bar,
      saveFromBar: true,
      expandAndReturn: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ base, results, errors }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ results, errors }, null, 2));
