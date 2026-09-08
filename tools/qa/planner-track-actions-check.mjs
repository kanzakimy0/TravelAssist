import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const out = ".cache/qa/planner-track-actions";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) =>
      errors.push(e.message.replace(/pk\.[\w.-]+/g, "[redacted]")),
    );
    if (width < 1000)
      await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto("http://127.0.0.1:3113/planner");
    await page.locator("[data-map-engine]").waitFor();
    if (width === 1440)
      await page
        .locator('[data-map-engine="mapbox"]')
        .waitFor({ timeout: 45000 });
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    const top = page.locator('[data-sight-scroll="planned"]').first(),
      lower = page.locator('[data-sight-scroll="reserve"]').first();
    await top.waitFor();
    const before = await top.evaluate((e) => e.scrollWidth);
    await lower.evaluate((e) => (e.scrollLeft = 75));
    const lowerScroll = await lower.evaluate((e) => e.scrollLeft);
    await top.evaluate((e) => (e.scrollLeft = 110));
    assert.equal(await lower.evaluate((e) => e.scrollLeft), lowerScroll);
    await top.evaluate((e) => (e.scrollLeft = 0));
    const card = page.locator('[data-planned-sight="classic-asakusa"]');
    await card.getByRole("button", { name: /编辑.*的时间/ }).click();
    await page
      .getByRole("dialog")
      .getByLabel("持续时间（分钟）", { exact: true })
      .fill("60");
    await page.getByRole("button", { name: "应用时间", exact: true }).click();
    const handle = card.locator("[data-drag-handle]");
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 60,
      box.y + box.height / 2 + 5,
      { steps: 6 },
    );
    assert.equal(
      await top.evaluate((e) => e.scrollWidth),
      before,
      "drag must not grow ruler",
    );
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.screenshot({ path: `${out}/${width}-tracks.png` });
    if (width < 768) await page.keyboard.press("Escape");
    await page
      .getByRole("group", { name: "地图日程范围" })
      .getByRole("button", { name: "3日", exact: true })
      .click();
    await page.getByRole("button", { name: "D1-D3", exact: true }).click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    assert.equal(
      await page.locator('[data-sight-scroll="planned"]').count(),
      3,
    );
    assert.equal(
      await page.locator('[data-planner-route-board="itinerary"] h3').count(),
      0,
    );
    assert.equal(
      await page
        .locator(
          '[data-planner-route-board="itinerary"] [class*="dayDivider"] time',
        )
        .count(),
      3,
    );
    await page.screenshot({ path: `${out}/${width}-three-days.png` });
    if (width < 768) await page.keyboard.press("Escape");
    await page
      .getByRole("group", { name: "地图日程范围" })
      .getByRole("button", { name: "1日", exact: true })
      .click();
    await page.getByRole("button", { name: "第1天", exact: true }).click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    await page.getByRole("tab", { name: "住宿·餐饮", exact: true }).click();
    assert.equal(await page.locator("[data-area-slot]").count(), 4);
    for (const slot of ["breakfast", "lunch", "dinner", "hotel"]) {
      const section = page.locator(`[data-area-slot="${slot}"]`);
      assert.ok((await section.locator("p").innerText()).length > 5);
      assert.ok(await section.getByRole("button").count());
    }
    await page.screenshot({ path: `${out}/${width}-meals.png` });
    if (width < 768)
      await page
        .getByRole("button", { name: "关闭当天安排", exact: true })
        .click();
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    const recommendation = page.locator('[data-recommendation="classic"]');
    await recommendation.getByText("已修改", { exact: true }).waitFor();
    await recommendation
      .getByRole("button", { name: "还原推荐", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "还原推荐方案？", exact: true })
      .getByRole("button", { name: "取消", exact: true })
      .click();
    assert.equal(
      await recommendation.getByText("已修改", { exact: true }).count(),
      1,
    );
    await recommendation
      .getByRole("button", { name: "还原推荐", exact: true })
      .click();
    await page.getByRole("button", { name: "确认还原", exact: true }).click();
    assert.equal(
      await recommendation.getByText("已修改", { exact: true }).count(),
      0,
    );
    await page.screenshot({ path: `${out}/${width}-recommendations.png` });
    // Save the second recommendation while the first is current.
    await page
      .locator("[data-recommendation]")
      .nth(1)
      .getByRole("button", { name: "保存并细化 →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1")),
    );
    assert.ok(saved.snapshot.currentPlanId !== "classic");
    await page.screenshot({ path: `${out}/${width}-detail.png` });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "no page overflow",
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      independentTracks: true,
      dragWidthStable: true,
      restoreCancelAndConfirm: true,
      saveSelectedPlan: saved.snapshot.currentPlanId,
      errors,
    });
    await context.close();
  }
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
