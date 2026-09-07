import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/detail-responsive-groups";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1600, 900],
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
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await page.waitForTimeout(250);
    const geometry = await page
      .locator("[data-detail-column]")
      .evaluateAll((es) =>
        es.map((e) => {
          const card = e.querySelector("[data-detail-item]");
          const lower = e.querySelector("[data-primary-status]");
          const viewport = e.closest('[class*="viewport"]');
          return {
            card: card?.getBoundingClientRect().toJSON(),
            lower: lower?.getBoundingClientRect().toJSON(),
            viewport: viewport?.getBoundingClientRect().toJSON(),
            buttons: [
              ...e.querySelectorAll(
                "[data-reservation-card], [data-status-action]",
              ),
            ].map((b) => b.getBoundingClientRect().toJSON()),
            polygon: getComputedStyle(e, "::before").clipPath,
            pointer: getComputedStyle(e, "::before").pointerEvents,
          };
        }),
      );
    for (const g of geometry) {
      if (!g.card || !g.lower) continue;
      assert.ok(Math.abs(g.card.width - g.card.height) < 1, JSON.stringify(g));
      assert.ok(
        Math.abs(g.lower.width - g.lower.height) < 1,
        JSON.stringify(g),
      );
      assert.ok(g.lower.x > g.card.x + g.card.width, JSON.stringify(g));
      assert.ok(
        Math.abs(g.lower.y - g.card.y - g.card.height / 4) < 1,
        JSON.stringify(g),
      );
      assert.ok(
        g.lower.y + g.lower.height <= g.viewport.y + g.viewport.height + 1,
        JSON.stringify(g),
      );
      for (const b of g.buttons)
        assert.ok(
          b.y + b.height <= g.viewport.y + g.viewport.height + 1,
          JSON.stringify(g),
        );
      assert.match(g.polygon, /polygon/);
      assert.equal(g.pointer, "none");
    }
    await page.screenshot({ path: `${out}/${width}-cards.png` });
    for (const [selector, focus] of [
      ["[data-status-action]", "advice"],
      ["[data-reservation-card]", "booking"],
    ]) {
      if (width < 768 && !(await page.locator(selector).first().isVisible()))
        await page
          .getByRole("button", { name: "当日执行轨道", exact: true })
          .click();
      await page.locator(selector).first().click();
      await page.locator(`[data-focused-detail-section="${focus}"]`).waitFor();
      await page
        .locator("[data-detail-map-inspector]")
        .getByRole("button", { name: "关闭项目详情框", exact: true })
        .click();
    }
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const sidebar = page.locator("[data-detail-sidebar]");
    await sidebar.waitFor();
    await page.waitForTimeout(150);
    const bounds = await sidebar.boundingBox();
    const sections = sidebar.locator(
      "[data-fixed-section],[data-slot-section],[data-fixed-ai-actions]",
    );
    const before = await sections.evaluateAll((es) =>
      es.map((e) => e.getBoundingClientRect().toJSON()),
    );
    const reservations = await sidebar
      .locator('[data-fixed-section="reservations"]')
      .boundingBox();
    const lodging = await sidebar
      .locator('[data-slot-section="lodging"]')
      .boundingBox();
    const footer = await sidebar
      .locator("[data-fixed-ai-actions]")
      .boundingBox();
    console.log(
      JSON.stringify({ width, height, bounds, lodging, reservations, footer }),
    );
    await page.screenshot({ path: `${out}/${width}-sidebar.png` });
    assert.ok(Math.abs(reservations.height - height / 4) < 1);
    const advice = await sidebar
      .locator('[data-fixed-section="day-overview"]')
      .boundingBox();
    const diningBounds = await sidebar
      .locator('[data-slot-section="dining"]')
      .boundingBox();
    assert.ok(Math.abs(advice.height - lodging.height * 3) < 1);
    assert.ok(Math.abs(diningBounds.height - lodging.height * 3) < 1);
    assert.ok(footer.y + footer.height <= height + 1, JSON.stringify(footer));
    assert.ok(
      await sidebar.evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
    );
    assert.ok(
      before.every(
        (b) =>
          Math.abs(b.x - before[0].x) < 1 &&
          Math.abs(b.width - before[0].width) < 1,
      ),
    );
    for (const [selector, popup] of [
      ['[data-fixed-section="day-overview"]', "#section-day-overview"],
      ['[data-slot-section="dining"]', "#slots-dining"],
    ]) {
      const button = sidebar
        .locator(selector)
        .getByRole("button", { name: /^展开/ });
      if (!(await button.count())) continue;
      await button.click();
      await page.locator(popup).waitFor();
      const expandedBox = await page.locator(popup).boundingBox();
      const originalBox = await sidebar.locator(selector).boundingBox();
      assert.ok(Math.abs(expandedBox.x - originalBox.x) < 2);
      assert.ok(Math.abs(expandedBox.y - originalBox.y) < 2);
      assert.ok(Math.abs(expandedBox.width - originalBox.width) < 2);
      assert.equal(await page.locator(popup).getAttribute("role"), null);
      assert.equal(await page.locator(popup).getAttribute("popover"), null);
      assert.deepEqual(
        await sections.evaluateAll((es) =>
          es.map((e) => e.getBoundingClientRect().toJSON()),
        ),
        before,
      );
      if (popup === "#slots-dining") {
        const rows = page.locator(popup).locator("[data-meal-slot]");
        assert.equal(await rows.count(), 3);
        const r = await rows.evaluateAll((es) =>
          es.map((e) => e.getBoundingClientRect().toJSON()),
        );
        assert.ok(r.every((b) => Math.abs(b.x - r[0].x) < 1));
        assert.ok(r[0].y < r[1].y && r[1].y < r[2].y);
      }
      await page.screenshot({ path: `${out}/${width}-${popup.slice(1)}.png` });
      await page
        .locator(popup)
        .getByRole("button", { name: "折叠", exact: true })
        .click();
      await page.locator(popup).waitFor({ state: "detached" });
    }
    const dining = sidebar.locator('[data-slot-section="dining"]');
    const more = dining.getByRole("button", { name: "展开餐饮", exact: true });
    if (await more.count()) await more.click();
    const meals = (await more.count()) ? page.locator("#slots-dining") : dining;
    const lunch = meals.locator('[data-meal-slot="午餐"]');
    const count = await sidebar.locator("[data-reservation-item]").count();
    await lunch.getByRole("button", { name: "加入预约", exact: true }).click();
    await lunch
      .getByRole("button", { name: "查看预约", exact: true })
      .waitFor();
    assert.equal(
      await sidebar.locator("[data-reservation-item]").count(),
      count + 1,
    );
    if (await page.locator("#slots-dining").count())
      await page.keyboard.press("Escape");
    const hotel = sidebar.locator('[data-slot-section="lodging"]');
    if (
      await hotel.getByRole("button", { name: "展开住宿", exact: true }).count()
    )
      await hotel
        .getByRole("button", { name: "展开住宿", exact: true })
        .click();
    const hotelContent = (await page.locator("#slots-lodging").count())
      ? page.locator("#slots-lodging")
      : hotel;
    await hotelContent
      .getByRole("button", { name: "更换", exact: true })
      .click();
    await page.getByRole("dialog", { name: /更换酒店/ }).waitFor();
    await page.keyboard.press("Escape");
    if (width === 1440 && (await more.count())) {
      await more.click();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
      const popup = await page.locator("#slots-dining").boundingBox();
      assert.ok(
        popup.x >= 0 &&
          popup.y >= 0 &&
          popup.x + popup.width <= 1280 &&
          popup.y + popup.height <= 800,
      );
      const resizedBooking = await sidebar
        .locator('[data-fixed-section="reservations"]')
        .boundingBox();
      assert.ok(Math.abs(resizedBooking.height - 200) < 1);
      const resizedSections = await sections.evaluateAll((es) =>
        es.map((e) => e.getBoundingClientRect().toJSON()),
      );
      await page
        .locator("#slots-dining")
        .getByRole("button", { name: "折叠", exact: true })
        .click();
      assert.deepEqual(
        await sections.evaluateAll((es) =>
          es.map((e) => e.getBoundingClientRect().toJSON()),
        ),
        resizedSections,
      );
      await page.setViewportSize({ width, height });
    }
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      cardPairs: "offset 25%, fully visible",
      sidebar:
        "3:3:1 advice/dining/lodging; booking 25dvh; fixed overlay expansion",
      actions: "ticket / advice / dining queue / hotel replacement passed",
    });
    await page.close();
  }
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log("PASS", results);
} finally {
  await browser.close();
}
