import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-status-stack";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    await page.locator('[data-workspace-mode="planner"]').waitFor();
    if (width >= 768) {
      await page
        .getByRole("textbox", { name: "搜索景点、城市或酒店", exact: true })
        .fill("东京");
      await page.getByRole("button", { name: "搜索", exact: true }).click();
      assert.equal(await page.locator("#header-search").count(), 0);
      await page
        .getByRole("status")
        .filter({ hasText: "搜索服务尚未接入" })
        .waitFor();
    } else {
      await page.getByRole("button", { name: "搜索", exact: true }).click();
      await page.locator("#header-search").waitFor();
      await page.keyboard.press("Escape");
    }
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    await page
      .getByRole("button", { name: "更多行程设置", exact: true })
      .click();
    const settings = page.locator("#more-trip-settings");
    const content = settings.locator("h3").locator("..");
    const scroll = await content.evaluate((e) => ({
      height: e.clientHeight,
      scroll: e.scrollHeight,
    }));
    assert.ok(
      scroll.scroll <= scroll.height + 2,
      JSON.stringify({ width, scroll }),
    );
    await page.screenshot({ path: `${out}/${width}-settings.png` });
    await page.keyboard.press("Escape");
    await page.goto(base + "/planner?view=detail&day=2");
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    const board = page.locator("[data-detail-board]");
    await board.waitFor();
    const dimensions = await board.evaluate((e) => ({
      height: e.clientHeight,
      scroll: e.scrollHeight,
    }));
    assert.ok(
      dimensions.scroll <= dimensions.height + 2,
      JSON.stringify(dimensions),
    );
    const dock = await page
      .getByRole("region", { name: "单日执行工作区" })
      .boundingBox();
    if (width >= 768) assert.ok(Math.abs(dock.height - height * 0.25) < 2);
    for (const node of await board.locator('[id^="detail-status-"]').all()) {
      const { a, b } = await node.evaluate((e) => ({
        a: e.getBoundingClientRect().toJSON(),
        b: e.querySelector("span").getBoundingClientRect().toJSON(),
      }));
      assert.ok(Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1);
      assert.ok(
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1,
        JSON.stringify({ a, b }),
      );
    }
    const normal = board.locator("[data-detail-column]").filter({
      has: page.locator('[id^="detail-status-"][data-status="normal"]'),
    });
    for (const column of await normal.all())
      assert.equal(await column.locator('[aria-label$="提醒"]').count(), 0);
    const target = board
      .locator("[data-detail-column]")
      .filter({ has: page.locator('[aria-label$="提醒"]') })
      .first();
    const itemId = await target.getAttribute("data-detail-column");
    const trigger = target.locator('[aria-label$="提醒"]');
    await trigger.scrollIntoViewIfNeeded();
    const stationary = await target.locator("[data-detail-item]").boundingBox();
    await trigger.click();
    const popup = page.locator("#detail-card-expansion");
    await popup.waitFor();
    const expanded = await popup.boundingBox();
    assert.ok(
      Math.abs(expanded.width - stationary.width) < 1 &&
        Math.abs(expanded.height - stationary.height) < 1,
    );
    assert.deepEqual(
      await target.locator("[data-detail-item]").boundingBox(),
      stationary,
    );
    await popup.getByRole("button", { name: /更多操作/ }).click();
    await page
      .getByRole("button", { name: "完成（本地）", exact: true })
      .click();
    const resolved = board.locator(`[data-detail-column="${itemId}"]`);
    assert.equal(
      await resolved.locator('[aria-label$="提醒"]').count(),
      0,
      "resolved advice disappears",
    );
    if (await resolved.locator("[data-reservation-card]").count())
      assert.ok(
        await resolved
          .locator("[data-reservation-card]")
          .getAttribute("data-primary-status"),
      );
    await page.screenshot({ path: `${out}/${width}-board.png` });
    if (width < 768) await page.keyboard.press("Escape");
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const recheck = page.getByRole("button", {
      name: "AI 重新检查",
      exact: true,
    });
    await recheck.scrollIntoViewIfNeeded();
    const rb = await recheck.boundingBox();
    assert.ok(rb.width > 75 && rb.height >= 38, JSON.stringify(rb));
    await recheck.click();
    await page
      .getByRole("status")
      .filter({ hasText: "模拟 AI 检查已更新" })
      .waitFor();
    await page.screenshot({ path: `${out}/${width}-ai.png` });
    await page.goto(base + "/planner?view=detail&day=1");
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await board.waitFor();
    for (const kind of ["hotel", "restaurant"]) {
      const hasItem = await board
        .locator(`[data-detail-item][data-kind="${kind}"]`)
        .count();
      const missing = board.locator(`[data-missing-arrangement="${kind}"]`);
      assert.equal(await missing.count(), hasItem ? 0 : 1);
      if (!hasItem)
        assert.equal(await missing.getByRole("button").isEnabled(), true);
    }
    await page.screenshot({ path: `${out}/${width}-missing.png` });
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      settings: scroll,
      board: dimensions,
      aiButton: rb,
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
