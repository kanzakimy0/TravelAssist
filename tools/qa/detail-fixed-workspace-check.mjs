import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/detail-fixed-workspace";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner?view=detail&day=2");
    await page.locator('[data-workspace-mode="detail"]').waitFor();
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      window.qaOriginalMap = document.querySelector("[data-map-surface] > div");
    });
    const mapRect = await page.locator("[data-map-workspace]").boundingBox();
    for (const kind of [
      "transport",
      "attraction",
      "restaurant",
      "activity",
      "hotel",
    ]) {
      if (width < 768)
        await page
          .getByRole("button", { name: "当日执行轨道", exact: true })
          .click();
      const card = page
        .locator(`[data-detail-item][data-kind="${kind}"]`)
        .first();
      await card.click();
      const inspector = page.locator("[data-detail-map-inspector]");
      await inspector.waitFor();
      if (width >= 768) {
        assert.ok(
          Math.abs(
            (await page.locator("[data-map-surface]").boundingBox()).width -
              (mapRect.width * 2) / 3,
          ) < 1,
        );
        assert.ok(
          Math.abs((await inspector.boundingBox()).y - mapRect.y) < 1,
          "inspector fills to map top",
        );
      }
      await inspector
        .getByRole("button", { name: "调整行程", exact: true })
        .click();
      await inspector.locator("[data-inline-trip-editor]").waitFor();
      const geometry = await inspector.evaluate((e) => ({
        panel: e.getBoundingClientRect().height,
        header: e.querySelector(":scope > header").getBoundingClientRect()
          .height,
      }));
      assert.ok(
        Math.abs(geometry.header / geometry.panel - 0.2) < 0.015,
        JSON.stringify(geometry),
      );
      assert.equal(
        await page.locator("dialog[open] [data-inline-trip-editor]").count(),
        0,
      );
      if (kind === "attraction") {
        await inspector
          .getByRole("textbox", { name: "内容", exact: true })
          .fill("河口湖湖畔 · 调整验证");
        await inspector
          .getByRole("button", { name: "调整时间 / 更改内容", exact: true })
          .click();
        assert.match(
          await inspector.locator(":scope > header").innerText(),
          /调整验证/,
        );
      }
      await page.screenshot({ path: `${out}/${width}-${kind}-editor.png` });
      await inspector
        .getByRole("button", { name: "关闭行程项目详情", exact: true })
        .click();
      assert.equal(
        await inspector.locator("[data-inline-trip-editor]").count(),
        0,
      );
      await inspector
        .getByRole("button", { name: "关闭景点详情", exact: true })
        .click();
      assert.ok(
        await page.evaluate(
          () =>
            window.qaOriginalMap ===
            document.querySelector("[data-map-surface] > div"),
        ),
      );
    }
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    const squares = await page
      .locator("[data-detail-item], [data-primary-status]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(
      squares.every((box) => Math.abs(box.width - box.height) < 1),
      JSON.stringify(squares),
    );
    assert.equal(
      await page
        .locator("[data-detail-column] > div:first-child > small")
        .count(),
      0,
    );
    for (const [selector, focus] of [
      ["[data-status-action]", "advice"],
      ["[data-reservation-card]", "booking"],
    ]) {
      for (let repeat = 0; repeat < 2; repeat++) {
        if (width < 768 && !(await page.locator(selector).first().isVisible()))
          await page
            .getByRole("button", { name: "当日执行轨道", exact: true })
            .click();
        await page.locator(selector).first().click();
        await page
          .locator('[data-focused-detail-section="' + focus + '"]')
          .waitFor();
        assert.equal(
          await page.locator("[data-inline-trip-editor]").count(),
          0,
        );
        if (focus === "booking") {
          await page
            .locator("[data-focused-detail-section]")
            .getByRole("button", { name: "管理预约", exact: true })
            .click();
          await page.getByRole("dialog", { name: /预约安排/ }).waitFor();
          await page.keyboard.press("Escape");
        }
        await page
          .locator("[data-detail-map-inspector]")
          .getByRole("button", { name: "关闭景点详情", exact: true })
          .click();
      }
    }
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const sidebar = page.locator("[data-detail-sidebar]");
    await sidebar.waitFor();
    await page.waitForTimeout(250);
    const footer = page.locator("[data-fixed-ai-actions]");
    const originalFooter = await footer.boundingBox();
    assert.ok(
      originalFooter.y >= 0 &&
        originalFooter.y + originalFooter.height <= height + 1,
      JSON.stringify(originalFooter),
    );
    assert.ok(
      await sidebar.evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
      "sidebar itself must not scroll",
    );
    assert.equal(
      await sidebar.getByRole("region", { name: "早中晚餐饮" }).count(),
      1,
    );
    assert.equal(
      await sidebar.getByRole("region", { name: "当晚住宿" }).count(),
      1,
    );
    assert.equal(await sidebar.locator("[data-tone]").count(), 4);
    const openMeals = async () => {
      const more = sidebar.getByRole("button", {
        name: "展开餐饮",
        exact: true,
      });
      if (await more.count()) {
        if (!(await page.locator("#slots-dining").count())) await more.click();
        return page.locator("#slots-dining");
      }
      return sidebar.locator('[data-slot-section="dining"]');
    };
    const closeMeals = async () => {
      if (await page.locator("#slots-dining").count())
        await page.keyboard.press("Escape");
    };
    const mealBoxes = await (
      await openMeals()
    )
      .locator("[data-meal-slot]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.equal(mealBoxes.length, 3);
    assert.ok(
      mealBoxes.every((box) => Math.abs(box.x - mealBoxes[0].x) < 1),
      "meals are horizontal rows",
    );
    assert.ok(
      mealBoxes[1].y > mealBoxes[0].y && mealBoxes[2].y > mealBoxes[1].y,
    );
    await closeMeals();
    const reservationBounds = await sidebar
      .getByRole("region", { name: "当日预约清单" })
      .boundingBox();
    assert.ok(
      Math.abs(reservationBounds.height - height / 4) < 1,
      "reservations occupy one quarter of viewport",
    );
    for (const id of ["day-overview", "expenses"]) {
      await sidebar
        .locator(`[data-fixed-section="${id}"]`)
        .getByRole("button", { name: /^展开/ })
        .scrollIntoViewIfNeeded();
      const positions = await sidebar
        .locator("[data-fixed-section],section[aria-label]")
        .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
      await sidebar
        .locator(`[data-fixed-section="${id}"]`)
        .getByRole("button", { name: /^展开/ })
        .click();
      await page.locator(`#section-${id}`).waitFor();
      assert.deepEqual(await footer.boundingBox(), originalFooter);
      assert.deepEqual(
        await sidebar
          .locator("[data-fixed-section],section[aria-label]")
          .evaluateAll((es) =>
            es.map((e) => e.getBoundingClientRect().toJSON()),
          ),
        positions,
      );
      await page.keyboard.press("Escape");
    }
    await sidebar
      .getByRole("button", { name: "AI 重新检查", exact: true })
      .click();
    await sidebar
      .getByRole("status")
      .filter({ hasText: "模拟 AI 检查已更新" })
      .waitFor();
    await sidebar
      .getByRole("button", { name: "调整后续行程", exact: true })
      .click();
    await page.locator("#fixed-adjustment-preview").waitFor();
    assert.deepEqual(await footer.boundingBox(), originalFooter);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: `${out}/${width}-sidebar.png` });
    const queue = sidebar.getByRole("region", { name: "当日预约清单" });
    const lunch = (await openMeals()).locator('[data-meal-slot="午餐"]');
    const queueBefore = await queue.locator("[data-reservation-item]").count();
    await lunch.getByRole("button", { name: "加入预约", exact: true }).click();
    await lunch
      .getByRole("button", { name: "查看预约", exact: true })
      .waitFor();
    assert.equal(
      await queue.locator("[data-reservation-item]").count(),
      queueBefore + 1,
    );
    assert.match(await queue.innerText(), /湖畔乡土午餐/);
    await closeMeals();
    await sidebar
      .getByRole("region", { name: "当晚住宿" })
      .getByRole("button", { name: "加入预约", exact: true })
      .click();
    assert.equal(
      await queue.locator("[data-reservation-item]").count(),
      queueBefore + 2,
    );
    assert.match(await queue.innerText(), /河口湖温泉旅馆/);
    await page.screenshot({ path: `${out}/${width}-reservation-queue.png` });
    assert.deepEqual(await footer.boundingBox(), originalFooter);
    await queue
      .getByRole("button", { name: "湖畔乡土午餐 · 预约", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: /湖畔乡土午餐.*预约安排/ })
      .waitFor();
    await page.keyboard.press("Escape");
    await queue.getByRole("button", { name: "全部预约", exact: true }).click();
    await page.locator("#bulk-booking-review").waitFor();
    await page.keyboard.press("Escape");
    await sidebar
      .getByRole("region", { name: "当晚住宿" })
      .getByRole("button", { name: "更换", exact: true })
      .click();
    await page.getByRole("dialog", { name: /更换酒店/ }).waitFor();
    await page.keyboard.press("Escape");
    await (
      await openMeals()
    )
      .locator('[data-meal-slot="早餐"]')
      .getByRole("button")
      .first()
      .click();
    const areaPanel = page.locator("[data-detail-map-inspector]");
    await areaPanel.waitFor();
    assert.equal(await page.locator("[data-detail-map-inspector]").count(), 1);
    await areaPanel
      .getByRole("button", { name: "加入行程", exact: true })
      .first()
      .click();
    await areaPanel
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const updatedMeals = await openMeals();
    assert.doesNotMatch(
      await updatedMeals.locator('[data-meal-slot="早餐"]').innerText(),
      /未安排/,
    );
    assert.match(
      await updatedMeals.locator('[data-meal-slot="午餐"]').innerText(),
      /湖畔乡土午餐/,
    );
    await closeMeals();
    if (width < 1200)
      await page
        .getByRole("button", { name: "关闭当日执行仪表盘", exact: true })
        .click();
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await page
      .getByRole("button", { name: "新增行程项目", exact: true })
      .click();
    const add = page.getByRole("dialog", { name: "新增行程项目", exact: true });
    await add
      .getByRole("textbox", { name: "名称", exact: true })
      .fill("自定义安排检查");
    await add
      .getByRole("button", { name: "加入本地草稿", exact: true })
      .click();
    await page
      .locator("[data-detail-item]")
      .filter({ hasText: "自定义安排检查" })
      .click();
    await page
      .locator("[data-detail-map-inspector]")
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    await page.locator("[data-inline-trip-editor]").waitFor();
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      fixedFooter: originalFooter,
      allKindsOpen: true,
      mapPreserved: true,
      inlineEdit: true,
      expansionStable: true,
      errors,
    });
    await page.close();
  }
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
