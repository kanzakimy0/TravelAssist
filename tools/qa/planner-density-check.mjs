import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.DENSITY_URL || "http://localhost:3116";
const before = process.env.DENSITY_BASELINE_URL;
const live = process.env.DENSITY_LIVE === "1";
for (const url of [base, before].filter(Boolean))
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const out = `${process.env.DENSITY_OUT || "docs/qa/planner-density"}/${live ? "mapbox" : "fallback"}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [],
  errors = [];
const near = (a, b, label) =>
  assert.ok(Math.abs(a - b) <= 1, `${label}: ${a} != ${b}`);
const box = (locator) => locator.boundingBox();
async function recommendations(page, width, capture) {
  if (width < 1200)
    await page
      .getByRole("button", { name: "旅行设置与方案", exact: true })
      .click();
  const region = page.locator("[data-right-lower]");
  if (capture)
    await region.screenshot({
      path: `${out}/recommendations-${capture}-${width}.png`,
    });
  const geometry = await region.evaluate((e) => ({
    width: e.getBoundingClientRect().width,
    height: e.getBoundingClientRect().height,
    cards: [...e.querySelectorAll("button[aria-pressed]")].map((c) => ({
      width: c.getBoundingClientRect().width,
      height: c.getBoundingClientRect().height,
      text: c.textContent,
    })),
  }));
  if (width < 1200)
    await page
      .getByRole("button", { name: "关闭旅行设置与方案", exact: true })
      .click();
  return geometry;
}
try {
  for (const [width, height] of [
    [2560, 1440],
    [1920, 1080],
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1180, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    if (!live)
      await context.route("https://api.mapbox.com/**", (route) =>
        route.abort("failed"),
      );
    let baseline;
    if (before) {
      const p = await context.newPage();
      await p.goto(before + "/planner");
      if (!live)
        await p
          .getByText("底图暂不可用 · 已切换可操作示意地图", { exact: true })
          .waitFor();
      else
        await p
          .locator('[data-map-engine="mapbox"]')
          .waitFor({ timeout: 45000 });
      baseline = await recommendations(p, width, "before");
      await p.close();
    }
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/mapbox|ERR_FAILED|favicon/.test(m.text() + m.location().url)
      )
        errors.push(m.text());
    });
    await page.goto(base + "/planner");
    await page
      .locator(`[data-map-engine="${live ? "mapbox" : "fallback"}"]`)
      .waitFor({ timeout: 45000 });
    if (!live)
      await page
        .getByText("底图暂不可用 · 已切换可操作示意地图", { exact: true })
        .waitFor();
    if (baseline)
      assert.deepEqual(
        await recommendations(page, width, "after"),
        baseline,
        `frozen recommendations ${width}`,
      );
    if (width >= 1200) {
      const rail = await box(page.locator("[data-right-panel]"));
      const search = await box(page.getByRole("search"));
      assert.ok(
        search.x >= rail.x && search.x + search.width <= width,
        "search stays inside right rail",
      );
      const upper = page.locator("[data-right-upper]");
      const first = await box(upper.locator("button").first());
      const cta = await box(
        page.getByRole("button", { name: "进入行程详情", exact: true }),
      );
      const upperBox = await box(upper);
      near(cta.x, first.x, "CTA baseline");
      assert.ok(
        cta.y + cta.height <= upperBox.y + upperBox.height,
        "CTA stays inside quick settings",
      );
      const style = await upper.evaluate((e) => getComputedStyle(e));
      assert.ok(cta.width > first.width * 1.9, "CTA spans full pair width");
      void style;
    }
    const range = page.getByRole("group", { name: "地图日程范围" });
    const initial = await box(range);
    const day = range.locator("button").first();
    await day.click();
    near(
      (await box(page.locator("#day-choices"))).width,
      (await box(day)).width,
      "day menu width",
    );
    await page.keyboard.press("Escape");
    await range.getByRole("button", { name: "3日", exact: true }).click();
    near((await box(range)).width, initial.width, "three day control width");
    const three = range.locator("button").nth(1);
    assert.match(await three.innerText(), /D1-D3/);
    near(
      (await box(page.locator("#day-choices"))).width,
      (await box(three)).width,
      "three day menu width",
    );
    await page.keyboard.press("Escape");
    await range.getByRole("button", { name: "1日", exact: true }).click();
    await page.keyboard.press("Escape");
    const toolbar = page.getByRole("complementary", { name: "地图工具" });
    const arrow = toolbar.getByRole("button", {
      name: "收起地图工具",
      exact: true,
    });
    assert.notEqual(
      await arrow.locator("svg").evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    await arrow.click();
    await toolbar
      .getByRole("button", { name: "展开地图工具", exact: true })
      .click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    const dock = page.locator("[data-bottom-panel]");
    const dockBox = await box(dock);
    if (width >= 768) {
      near(dockBox.height, height / 4, "dock height 25dvh");
      near(dockBox.x, 0, "dock left");
      near(dockBox.y + dockBox.height, height, "dock bottom");
      near(
        dockBox.x + dockBox.width,
        width >= 1200 ? width * 0.75 : width,
        "dock right",
      );
      near(
        (await box(dock.getByRole("tablist"))).y,
        dockBox.y,
        "tabs flush top",
      );
      const bands = await box(page.locator("[data-time-bands]"));
      const content = await box(dock.getByRole("tabpanel"));
      assert.ok(
        bands.height >= content.height - 32,
        "timeline fills content height",
      );
    }
    assert.equal(await dock.locator('[class*="executionSummary"]').count(), 0);
    await page.screenshot({ path: `${out}/${width}x${height}-itinerary.png` });
    for (const label of [
      "移动",
      "预约·票务",
      "天气·备选",
      "住宿·餐饮",
      "详细",
    ]) {
      await dock.getByRole("tab", { name: label, exact: true }).click();
      near((await box(dock)).height, dockBox.height, "tab stable height");
      if (label === "移动")
        await page.screenshot({
          path: `${out}/${width}x${height}-movement.png`,
        });
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "no page overflow",
    );
    if (width === 1440) {
      await page.getByRole("button", { name: /旅行日期/ }).click();
      const returning = await page
        .getByLabel("返回日期", { exact: true })
        .inputValue();
      const extended = new Date(returning + "T12:00:00Z");
      extended.setUTCDate(extended.getUTCDate() + 2);
      await page
        .getByLabel("返回日期", { exact: true })
        .fill(extended.toISOString().slice(0, 10));
      await page
        .getByRole("button", { name: "应用日期区间", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await range.getByRole("button", { name: "3日", exact: true }).click();
      await page
        .locator("#day-choices")
        .getByRole("button", { name: "D2-D4", exact: true })
        .click();
      assert.equal(
        await range
          .getByRole("button", { name: "D2-D4 ▾", exact: true })
          .count(),
        1,
      );
      near(
        (await box(range)).width,
        initial.width,
        "D2-D4 unchanged control width",
      );
      await range.getByRole("button", { name: "D2-D4 ▾", exact: true }).click();
      await page.screenshot({ path: `${out}/D2-D4-compact-menu.png` });
      await page.keyboard.press("Escape");
    }
    if (width < 768)
      await page
        .getByRole("button", { name: "关闭当天安排", exact: true })
        .click();
    results.push({
      width,
      height,
      dockHeight: dockBox.height,
      recommendations: baseline ? "unchanged" : "not compared",
      status: "passed",
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ results, errors }, null, 2) + "\n",
  );
}
console.log(JSON.stringify({ results, errors }));
