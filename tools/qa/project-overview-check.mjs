import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/project-overview";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner?view=detail&day=2");
    const bottom = async () => {
      if (
        width < 768 &&
        !(await page.locator('[aria-label="单日执行工作区"]').isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行轨道", exact: true })
          .click();
    };
    const right = async () => {
      if (
        await page
          .getByRole("button", { name: "关闭当日执行轨道", exact: true })
          .isVisible()
      )
        await page
          .getByRole("button", { name: "关闭当日执行轨道", exact: true })
          .click();
      if (
        width < 1200 &&
        !(await page
          .locator("[data-detail-sidebar],[data-trip-overview-sidebar]")
          .isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行仪表盘", exact: true })
          .click();
    };
    await bottom();
    const order = await page
      .locator("[data-detail-board] [data-order]")
      .evaluateAll((es) => es.map((e) => e.dataset.order));
    assert.deepEqual(order, [...order].sort());
    const missing = page.locator('[data-missing-meal="breakfast"]');
    assert.equal(await missing.getAttribute("data-order"), "07:00");
    assert.doesNotMatch(await missing.innerText(), /07:00/);
    await missing.getByRole("button", { name: "无视", exact: true }).click();
    assert.equal(
      await missing
        .getByRole("button", { name: "无视", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await missing.getByRole("button", { name: "同意", exact: true }).click();
    await page
      .getByRole("complementary", { name: "项目详情框", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await bottom();
    await page.getByRole("button", { name: "新增项目", exact: true }).click();
    const inspector = page.getByRole("complementary", {
      name: "项目详情框",
      exact: true,
    });
    await inspector.waitFor();
    assert.equal(await page.locator("dialog:modal").count(), 0);
    await inspector.getByRole("button", { name: "任务", exact: true }).click();
    await inspector.getByLabel("名称", { exact: true }).fill("QA 新增项目");
    await inspector.locator('input[type="time"]').nth(0).fill("06:00");
    await inspector.locator('input[type="time"]').nth(1).fill("06:20");
    await inspector
      .getByRole("button", { name: "加入本地草稿", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "QA 新增项目", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await bottom();
    await page.getByRole("button", { name: /行程总览.*全程摘要/ }).click();
    await page.locator("[data-trip-overview-board]").waitFor();
    assert.match(page.url(), /scope=overview/);
    assert.equal(await page.locator("[data-overview-day]").count(), 3);
    await right();
    await page.locator("[data-trip-overview-sidebar]").waitFor();
    await page.screenshot({ path: `${out}/${width}-overview.png` });
    if (width < 1200)
      await page
        .getByRole("button", { name: "关闭当日执行仪表盘", exact: true })
        .click();
    await bottom();
    await page
      .locator("[data-trip-overview-board]")
      .getByRole("button", { name: /第2天/ })
      .click();
    await page.locator("[data-detail-board]").waitFor();
    assert.doesNotMatch(page.url(), /scope=overview/);
    assert.match(
      await page.locator("[data-detail-board]").innerText(),
      /QA 新增项目/,
    );
    if (width < 768)
      await page
        .getByRole("button", { name: "关闭当日执行轨道", exact: true })
        .click();
    await right();
    const side = page.locator("[data-detail-sidebar]");
    const counts = await side
      .locator('[aria-label="当日状态计数"]')
      .boundingBox();
    const hotel = await side
      .locator('[data-slot-section="lodging"]')
      .boundingBox();
    assert.ok(Math.abs(counts.height - hotel.height) < 1);
    const all = await side
      .getByRole("button", { name: "查看全程待办", exact: true })
      .boundingBox();
    const daily = await side
      .getByRole("button", { name: "预约当日待办", exact: true })
      .boundingBox();
    assert.ok(daily.x > all.x);
    assert.ok(Math.abs(daily.y - all.y) < 1);
    await page.screenshot({ path: `${out}/${width}-sidebar.png` });
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      overview: true,
      inlineAdd: true,
      mealOrder: true,
      bookingFooter: true,
      countHeight: true,
      errors,
    });
    await page.close();
  }
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(results);
} finally {
  await browser.close();
}
