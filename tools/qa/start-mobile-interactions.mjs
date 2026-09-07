import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.START_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.START_QA_OUT || "docs/qa/start-mobile/interactions";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const results = [],
  errors = [];
const key = "travelassist.trip-wizard.v1";
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
const stored = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function inViewport(page, locator) {
  const b = await locator.boundingBox(),
    v = page.viewportSize();
  assert.ok(
    b &&
      b.x >= -1 &&
      b.y >= -1 &&
      b.x + b.width <= v.width + 1 &&
      b.y + b.height <= v.height + 1,
    JSON.stringify(b),
  );
}
try {
  for (const [width, height] of [
    [390, 844],
    [320, 740],
    [667, 375],
    [844, 390],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/start`);
    await page.getByRole("radio", { name: /第一次去日本/ }).click();
    await click(page, "下一步");
    await page.getByRole("button", { name: /^自然风景，当前/ }).click();
    await click(page, "设置自然风景详细偏好");
    await inViewport(page, page.getByRole("dialog"));
    await page.getByRole("dialog").getByRole("checkbox").first().check();
    await click(page, "确认");
    const sliders = page.getByRole("slider");
    assert.equal(await sliders.count(), 6);
    for (let i = 0; i < 6; i++) {
      await sliders.nth(i).scrollIntoViewIfNeeded();
      await sliders.nth(i).focus();
      await page.keyboard.press("End");
      assert.equal(await sliders.nth(i).inputValue(), "5");
      await inViewport(
        page,
        page.getByRole("button", { name: "下一步", exact: true }),
      );
    }
    await page.screenshot({ path: `${out}/${width}x${height}-sliders.png` });
    await click(page, "下一步");
    await click(page, "具体日期");
    await page.getByRole("button", { name: /^出发日期，/ }).click();
    await inViewport(
      page,
      page.getByRole("dialog", { name: "出发日期", exact: true }),
    );
    await page.screenshot({ path: `${out}/${width}x${height}-calendar.png` });
    await click(page, "今天");
    await page.getByRole("button", { name: /^返回日期，/ }).click();
    await click(page, "今天");
    assert.ok((await stored(page)).draft.exactDeparture);
    await click(page, "计划日期");
    await page.getByRole("button", { name: /^计划出发，/ }).click();
    await inViewport(page, page.getByRole("listbox"));
    await page.getByRole("listbox").getByRole("option").nth(1).click();
    await page.getByRole("button", { name: /^计划返回，/ }).click();
    await page.getByRole("listbox").getByRole("option").nth(2).click();
    await click(page, "更多地区");
    await inViewport(page, page.getByRole("dialog"));
    await page.getByRole("searchbox").fill("长野");
    await page.getByRole("checkbox", { name: /长野/ }).check();
    await click(page, "确认选择");
    assert.equal((await stored(page)).draft.selectedPrefectures.length, 1);
    for (const [button, title] of [
      ["设置交通详情 →", "交通偏好详情"],
      ["补充儿童 / 老人详情 →", "同行人员详情"],
      ["设置预算详情 →", "预算详情"],
    ]) {
      await click(page, button);
      await inViewport(
        page,
        page.getByRole("dialog", { name: title, exact: true }),
      );
      await page.screenshot({ path: `${out}/${width}x${height}-${title}.png` });
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
    }
    await click(page, "增加成人");
    await click(page, "＋ 添加机票");
    await inViewport(page, page.getByRole("dialog"));
    await page.getByLabel("出发机场", { exact: true }).fill("HND");
    assert.equal(
      await page
        .getByLabel("出发机场", { exact: true })
        .evaluate((el) => getComputedStyle(el).fontSize),
      "16px",
    );
    await page.getByLabel("到达机场", { exact: true }).fill("CTS");
    await page.getByLabel("日期", { exact: true }).fill("2026-10-10");
    await page.getByLabel("起飞时间", { exact: true }).fill("09:30");
    // A reduced viewport exercises reachability when the onscreen keyboard takes space.
    await page.setViewportSize({ width, height: Math.min(height, 440) });
    await inViewport(page, page.getByRole("dialog"));
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "保存", exact: true })
      .scrollIntoViewIfNeeded();
    await inViewport(
      page,
      page
        .getByRole("dialog")
        .getByRole("button", { name: "保存", exact: true }),
    );
    await click(page, "保存");
    await page.setViewportSize({ width, height });
    const draft = (await stored(page)).draft;
    assert.equal(draft.anchors.flights[0].departureAirport, "HND");
    await click(page, "上一步");
    await click(page, "下一步");
    assert.deepEqual((await stored(page)).draft, draft);
    await page.reload();
    await page.getByRole("heading", { name: "这次旅行怎么安排？" }).waitFor();
    assert.deepEqual((await stored(page)).draft, draft);
    await click(page, "生成方案");
    await page
      .getByRole("heading", { name: "为您准备了 3 个旅行方案" })
      .waitFor();
    assert.equal(await page.getByRole("article").count(), 3);
    await page
      .getByRole("button", { name: "查看这个方案", exact: true })
      .last()
      .click();
    const link = page.getByRole("button", {
      name: "进入详细路线",
      exact: true,
    });
    await link.scrollIntoViewIfNeeded();
    await inViewport(page, link);
    await page.screenshot({
      path: `${out}/${width}x${height}-selected-plan.png`,
    });
    await inViewport(
      page,
      page.getByRole("button", { name: "← 返回调整", exact: true }),
    );
    await click(page, "← 返回调整");
    assert.deepEqual((await stored(page)).draft.anchors, draft.anchors);
    results.push({
      width,
      height,
      status: "passed",
      checks: [
        "six sliders",
        "interest detail",
        "calendar",
        "planned dates",
        "region search",
        "three detail dialogs",
        "flight form",
        "short viewport",
        "draft forward/back/refresh",
        "generation",
        "three plans",
        "return",
      ],
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
console.log(`Mobile interaction QA: ${results.length} sizes passed`);
