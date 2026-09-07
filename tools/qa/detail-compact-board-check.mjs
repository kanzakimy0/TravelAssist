import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/detail-compact-board";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner?view=detail&day=2");
    const mobile = width < 768;
    if (mobile)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await page.locator("[data-detail-column]").first().waitFor();
    await page.waitForTimeout(350);
    const board = await page.locator("[data-detail-board]").evaluate((e) => ({
      height: e.clientHeight,
      scrollHeight: e.scrollHeight,
    }));
    const dock = await page
      .getByRole("region", { name: "单日执行工作区" })
      .boundingBox();
    if (!mobile) {
      assert.ok(
        Math.abs(dock.height - height * 0.25) < 2,
        JSON.stringify(dock),
      );
      assert.ok(board.scrollHeight <= board.height + 2, JSON.stringify(board));
    }
    const widths = await page
      .locator("[data-detail-item]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().width));
    assert.ok(widths.every((w) => w >= 95 && w <= 116));
    assert.equal(
      await page.getByRole("button", { name: /为.*添加预约/ }).count(),
      0,
    );
    await page.screenshot({ path: `${out}/${width}-compact.png` });
    const lake = page.locator("[data-detail-column]").filter({
      has: page.locator("[data-detail-item]").filter({ hasText: "河口湖湖畔" }),
    });
    assert.equal(await lake.locator("[data-reservation-card]").count(), 0);
    const reminder = lake.getByRole("button", {
      name: "河口湖湖畔提醒",
      exact: true,
    });
    await reminder.scrollIntoViewIfNeeded();
    const stationary = await lake.locator("[data-detail-item]").boundingBox();
    await reminder.click();
    const popup = page.locator("#detail-card-expansion");
    await popup.waitFor();
    const pb = await popup.boundingBox(),
      rb = await reminder.boundingBox();
    assert.ok(pb.y + pb.height <= rb.y, JSON.stringify({ pb, rb }));
    assert.ok(Math.abs(pb.width - stationary.width) < 1);
    assert.ok(Math.abs(pb.height - stationary.height) < 1);
    assert.deepEqual(
      await lake.locator("[data-detail-item]").boundingBox(),
      stationary,
    );
    await popup.getByRole("button", { name: "稍后", exact: true }).click();
    assert.match(await popup.innerText(), /已留待核对/);
    await page.screenshot({ path: `${out}/${width}-upward.png` });
    await page.keyboard.press("Escape");
    const bookingTrigger = page.locator("[data-reservation-card]").first();
    await bookingTrigger.click();
    await page
      .locator("#detail-card-expansion")
      .getByRole("button", { name: "管理预约", exact: true })
      .click();
    let booking = page.getByRole("dialog", {
      name: "富士急乐园 · 预约安排",
      exact: true,
    });
    await booking
      .getByRole("button", { name: /选择渠道/ })
      .first()
      .click();
    const complete = booking.getByRole("button", {
      name: "记录已完成预约",
      exact: true,
    });
    assert.equal(await complete.isDisabled(), true);
    await booking.getByRole("checkbox").check();
    await complete.click();
    assert.match(await booking.innerText(), /已手动确认/);
    await booking
      .getByRole("button", { name: "取消预约 · 更新记录", exact: true })
      .click();
    booking = page.getByRole("dialog", {
      name: "富士急乐园 · 记录渠道取消",
      exact: true,
    });
    const cancel = booking.getByRole("button", {
      name: "仅更新本地取消记录",
      exact: true,
    });
    assert.equal(await cancel.isDisabled(), true);
    await booking.getByRole("checkbox").check();
    await cancel.click();
    await page.keyboard.press("Escape");
    assert.ok(
      Math.abs(
        (
          await page
            .getByRole("region", { name: "单日执行工作区" })
            .boundingBox()
        ).height - dock.height,
      ) < 1,
    );
    await page.evaluate(() => {
      window.qaMap = document.querySelector("[data-map-surface] > div");
    });
    if (!mobile && (await page.locator("[data-detail-map-inspector]").count()))
      await page
        .getByRole("button", { name: "关闭景点详情", exact: true })
        .click();
    const original = await page.locator("[data-map-workspace]").boundingBox();
    await lake.locator("[data-detail-item]").click();
    await page.locator("[data-detail-map-inspector]").waitFor();
    await page.waitForTimeout(200);
    const split = await page.locator("[data-map-surface]").boundingBox();
    if (!mobile)
      assert.ok(Math.abs(split.width - (original.width * 2) / 3) < 1);
    assert.ok(
      await page.evaluate(
        () =>
          window.qaMap === document.querySelector("[data-map-surface] > div") &&
          window.qaMap.isConnected,
      ),
    );
    assert.equal(
      await page
        .getByRole("dialog", { name: "河口湖湖畔", exact: true })
        .count(),
      0,
    );
    await page.screenshot({ path: `${out}/${width}-split.png` });
    await page
      .locator("[data-detail-map-inspector]")
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "河口湖湖畔", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "关闭行程项目详情", exact: true })
      .click();
    await page
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    const marker = page
      .locator("svg [data-map-stop]")
      .filter({ hasText: "河口湖湖畔" })
      .first();
    await marker.focus();
    await page.keyboard.press("Enter");
    await page.locator("[data-detail-map-inspector]").waitFor();
    await page
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    assert.ok(
      Math.abs(
        (await page.locator("[data-map-surface]").boundingBox()).width -
          original.width,
      ) < 1,
    );
    const mapList = page.locator("[data-map-surface] details");
    await mapList.locator("summary").click();
    await mapList
      .getByRole("button")
      .filter({ hasText: "河口湖湖畔" })
      .first()
      .click();
    await page.locator("[data-detail-map-inspector]").waitFor();
    await page
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    report.push({
      width,
      height,
      dockHeight: dock.height,
      cardWidth: widths[0],
      mapBefore: original.width,
      mapAfter: split.width,
      errors,
    });
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
