import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/bulk-booking";
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
    page.setDefaultTimeout(12000);
    const errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(r.method()))
        writes.push(r.url());
    });
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner?view=detail&day=2");
    await page.locator('[data-workspace-mode="detail"]').waitFor();
    await page.evaluate(() => {
      window.qaMap = document.querySelector("[data-map-surface] > div");
    });
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const sidebar = page.locator("[data-detail-sidebar]");
    await sidebar.waitFor();
    const sections = await sidebar
      .locator("[data-fixed-section],section[aria-label]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(
      sections.every(
        (r) =>
          Math.abs(r.x - sections[0].x) < 1 &&
          Math.abs(r.width - sections[0].width) < 1,
      ),
      JSON.stringify(sections),
    );
    const meals = await sidebar
      .locator("[data-meal-slot]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(
      meals.every((r) => r.height >= 43),
      JSON.stringify(meals),
    );
    const footer = await sidebar
      .locator("[data-fixed-ai-actions]")
      .boundingBox();
    assert.ok(footer.y + footer.height <= height + 1);
    await page.screenshot({ path: out + "/" + width + "-sidebar.png" });
    const beforeQueue = await sidebar
      .locator("[data-reservation-item]")
      .allTextContents();
    const trigger = sidebar.locator("[data-bulk-booking-trigger]");
    await trigger.click();
    const review = page.locator("#bulk-booking-review");
    await review.waitFor();
    assert.ok(await trigger.isDisabled());
    assert.match(await review.innerText(), /未查询网站/);
    assert.match(await review.innerText(), /示例最低单价/);
    const popup = await review.boundingBox();
    assert.ok(
      popup.x >= 0 &&
        popup.x + popup.width <= width + 1 &&
        popup.y >= 0 &&
        popup.y + popup.height <= height + 1,
      JSON.stringify(popup),
    );
    await page.waitForTimeout(1200);
    assert.ok(await trigger.isDisabled());
    await page.keyboard.press("Escape");
    await trigger.click();
    await review.waitFor();
    const opened = Date.now();
    assert.ok(await trigger.isDisabled(), "reopen must reset countdown");
    await page.waitForTimeout(2200);
    assert.ok(await trigger.isDisabled(), "cannot confirm before 3 seconds");
    await page.waitForFunction(
      () => !document.querySelector("[data-bulk-booking-trigger]").disabled,
    );
    assert.ok(Date.now() - opened >= 2900);
    await page.screenshot({ path: out + "/" + width + "-review.png" });
    await trigger.click({ clickCount: 2 });
    const progress = page.locator("[data-booking-progress]");
    await progress.waitFor();
    assert.equal(
      await page.locator("#bulk-booking-review").count(),
      0,
      "double click cannot reopen or submit again",
    );
    assert.match(await progress.innerText(), /不会新增真实订单/);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-booking-progress]")
        ?.textContent.includes("核对演示完成"),
    );
    assert.match(await progress.innerText(), /未提交/);
    assert.ok(
      await page.locator("[data-map-surface]").evaluate((e) => e.inert),
    );
    assert.ok(
      await page.evaluate(
        () =>
          window.qaMap === document.querySelector("[data-map-surface] > div"),
      ),
    );
    await page.screenshot({ path: out + "/" + width + "-progress.png" });
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    const ticket = page.locator("[data-reservation-card]").first();
    const adviceAction = page.locator("[data-status-action]").first();
    assert.ok(
      Math.abs(
        (await ticket.boundingBox()).width -
          (await adviceAction.boundingBox()).width,
      ) < 1,
      "status action and folded ticket have the same width",
    );
    await ticket.click();
    await page.locator('[data-focused-detail-section="booking"]').waitFor();
    assert.equal(
      await page.locator("[data-booking-progress]").count(),
      0,
      "opening a ticket must leave the booking-progress layer",
    );
    await page
      .locator('[data-focused-detail-section="booking"]')
      .getByRole("button", { name: "管理预约", exact: true })
      .click();
    await page.getByRole("dialog", { name: /预约安排/ }).waitFor();
    await page.keyboard.press("Escape");
    await page
      .locator("[data-detail-map-inspector]")
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    assert.equal(
      await page.locator("[data-booking-progress]").count(),
      0,
      "old progress must not reappear after closing details",
    );
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    assert.deepEqual(
      await sidebar.locator("[data-reservation-item]").allTextContents(),
      beforeQueue,
    );
    const moreMeals = sidebar.getByRole("button", {
      name: "展开餐饮",
      exact: true,
    });
    if (await moreMeals.count()) await moreMeals.click();
    const mealScope = (await page.locator("#slots-dining").count())
      ? page.locator("#slots-dining")
      : sidebar;
    await mealScope
      .locator('[data-meal-slot="早餐"]')
      .getByRole("button")
      .first()
      .click();
    const strip = page.locator("[data-recommendation-strip]");
    await strip.waitFor();
    const cards = await strip
      .locator(":scope > article")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(cards.length >= 3 && cards.length <= 5);
    assert.ok(cards.every((r) => Math.abs(r.x - cards[0].x) < 1));
    assert.ok(cards[1].y >= cards[0].y + cards[0].height);
    await page.screenshot({ path: out + "/" + width + "-recommendations.png" });
    const rowClass = await strip
      .locator(":scope > article")
      .first()
      .getAttribute("class");
    await page
      .locator("[data-detail-map-inspector]")
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    await sidebar
      .getByRole("region", { name: "当晚住宿" })
      .getByRole("button", { name: "更换", exact: true })
      .click();
    const hotelDialog = page.getByRole("dialog", { name: /更换酒店/ });
    await hotelDialog.waitFor();
    const hotelRows = hotelDialog.locator(
      "[data-recommendation-strip] > article",
    );
    assert.ok((await hotelRows.count()) >= 3 && (await hotelRows.count()) <= 5);
    assert.equal(
      await hotelRows.first().getAttribute("class"),
      rowClass,
      "hotels and meals share the same row component",
    );
    const hotelBoxes = await hotelRows.evaluateAll((es) =>
      es.map((e) => e.getBoundingClientRect().toJSON()),
    );
    assert.ok(hotelBoxes.every((r) => Math.abs(r.x - hotelBoxes[0].x) < 1));
    assert.ok(hotelBoxes[1].y >= hotelBoxes[0].y + hotelBoxes[0].height);
    await page.screenshot({
      path: out + "/" + width + "-hotel-recommendations.png",
    });
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, [], "no order / payment POSTs");
    results.push({
      width,
      height,
      countdown: true,
      reopenResets: true,
      readonly: true,
      mapPreserved: true,
      recommendationRows: cards.length,
      ticketAfterProgress: true,
      errors,
    });
    await page.close();
  }
  await writeFile(
    out + "/results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
