// Optional external Playwright; local app only. Never persist Mapbox URLs/tokens.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Local QA only");
const output =
  process.env.PLANNER_QA_OUTPUT || path.resolve("docs/qa/TASK-008.3");
const fallback = process.argv.includes("fallback");
const quick = process.argv.includes("quick");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = {
  engine: fallback ? "fallback" : "mapbox",
  environment: process.env.PLANNER_QA_ENVIRONMENT || "development",
  errors: [],
  warnings: [],
  sizes: [],
  checks: [],
};
const clean = (s) =>
  s.replace(/https?:\/\/\S+/g, "[URL]").replace(/pk\.[\w.-]+/g, "[TOKEN]");
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  if (fallback)
    await context.route("https://*.mapbox.com/**", (route) => route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => results.errors.push(clean(e.message)));
  page.on("console", (e) => {
    if (["error", "warning"].includes(e.type()))
      results.warnings.push({ type: e.type(), text: clean(e.text()) });
  });
  await page.goto(base + "/planner", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-map-engine="mapbox"]') ||
      /未配置|暂不可用/.test(
        document.querySelector('[class*="mapInfo"]')?.textContent || "",
      ),
    null,
    { timeout: 30000 },
  );
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = (name) =>
    page.screenshot({
      path: path.join(
        output,
        `${fallback ? "fallback" : "mapbox"}-${name}.png`,
      ),
    });
  const sizes = quick
    ? [[1600, 900]]
    : [
        [1600, 900],
        [1440, 900],
        [1280, 800],
        [1180, 800],
        [390, 844],
      ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    const measurements = await page.evaluate(() => {
      const box = (s) => {
        const r = document.querySelector(s)?.getBoundingClientRect();
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
      };
      return {
        right: box("[data-right-panel]"),
        upper: box("[data-right-upper]"),
        lower: box("[data-right-lower]"),
        bottom: box("[data-bottom-panel]"),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        verticalOverflow: document.documentElement.scrollHeight > innerHeight,
        engine: document.querySelector("[data-map-engine]").dataset.mapEngine,
      };
    });
    assert.equal(measurements.horizontalOverflow, false);
    assert.equal(measurements.verticalOverflow, false);
    assert.equal(measurements.engine, results.engine);
    results.sizes.push({ width, height, ...measurements });
    await shot(`${width}x${height}`);
    if (width < 1200) {
      await button("旅行设置与方案").click();
      await shot(`${width}x${height}-drawer`);
      if (width < 768) {
        await page.getByRole("button", { name: /景点偏好/ }).click();
        await button("更多设置 · 景点偏好").click();
        const panel = page.locator("#preference-detail-sights");
        await page.waitForFunction(() => {
          const r = document
            .querySelector("#preference-detail-sights")
            ?.getBoundingClientRect();
          return (
            r && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
          );
        });
        const rect = await panel.boundingBox();
        assert.ok(
          rect.x >= 0 &&
            rect.x + rect.width <= width &&
            rect.y + rect.height <= height,
        );
        await shot(`${width}x${height}-nested-preference`);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
      }
      await page.keyboard.press("Escape");
    }
    if (width < 768) {
      await button("查看行程安排").click();
      await page.locator("[data-time-bands]").waitFor();
      await shot(`${width}x${height}-sheet`);
      await page.keyboard.press("Escape");
    }
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(400);
  // New controls stay inside the established 75/25 and 1:1 shell.
  const lower = await page.locator("[data-right-lower]").boundingBox();
  await button("更多行程设置").click();
  assert.deepEqual(
    await page.locator("[data-right-lower]").boundingBox(),
    lower,
  );
  await page.getByRole("slider", { name: "预算档位" }).fill("2");
  await page.getByRole("slider", { name: "旅行节奏档位" }).fill("3");
  await button("更多设置 · 移动偏好").click();
  await page.getByLabel("单日最大步行", { exact: true }).fill("6 km");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#more-trip-settings").count(), 1);
  assert.equal(await page.locator("#preference-detail-movement").count(), 0);
  await shot("more-settings");
  await page.keyboard.press("Escape");
  await page.locator("[aria-controls]").filter({ hasText: "同行人" }).count();
  await page.getByRole("button", { name: /同行人/ }).click();
  await button("增加儿童").click();
  await button("增加婴儿").click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /景点偏好/ }).click();
  await button("摄影").click();
  await button("更多设置 · 景点偏好").click();
  await page.getByLabel("必去", { exact: true }).fill("浅草寺");
  await shot("preferences");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /旅行日期/ }).click();
  const departure = await page
    .getByLabel("出发日期", { exact: true })
    .inputValue();
  const returning = await page
    .getByLabel("返回日期", { exact: true })
    .inputValue();
  await page.getByLabel("返回日期", { exact: true }).fill(departure);
  await button("应用日期区间").click();
  assert.match(await page.locator("#quick-dates").innerText(), /超出/);
  const extended = new Date(returning + "T12:00:00Z");
  extended.setUTCDate(extended.getUTCDate() + 4);
  await page
    .getByLabel("返回日期", { exact: true })
    .fill(extended.toISOString().slice(0, 10));
  await button("应用日期区间").click();
  assert.match(await page.locator("#quick-dates").innerText(), /7 天 6 晚/);
  await page.keyboard.press("Escape");
  await button("第1天 ▾").click();
  await button("输入").click();
  await page.getByLabel("输入 Day", { exact: true }).fill("6");
  await button("确认范围").click();
  assert.equal(await button("第6天 ▾").count(), 1);
  await button("3日").click();
  await button("输入").click();
  await page.getByLabel("输入 Day", { exact: true }).fill("5");
  await button("确认范围").click();
  assert.equal(await button("D5-D7 ▾").count(), 1);
  await button("D5-D7 ▾").click();
  await button("输入").click();
  await page.getByLabel("输入 Day", { exact: true }).fill("1");
  await button("确认范围").click();
  assert.equal(await page.locator("[data-time-day]").count(), 3);
  await shot("three-day-comparison");
  for (const [width, height] of [
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1180, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const last = await page.locator("[data-time-day]").last().boundingBox();
    const panel = await page.getByRole("tabpanel").boundingBox();
    assert.ok(
      last.y + last.height <= panel.y + panel.height + 1,
      `Third day clipped at ${width}x${height}`,
    );
    await shot(`${width}x${height}-comparison`);
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(250);
  const geometry = await page.locator("[data-time-bands]").evaluate((e) => {
    const start = +e.dataset.axisStart,
      end = +e.dataset.axisEnd;
    return [...e.querySelectorAll("[data-start]")].map((s) => ({
      expected: (100 * (+s.dataset.end - +s.dataset.start)) / (end - start),
      actual: parseFloat(s.style.width),
    }));
  });
  for (const g of geometry) assert.ok(Math.abs(g.expected - g.actual) < 0.001);
  await button("1日").click();
  await button("输入").click();
  await page.getByLabel("输入 Day", { exact: true }).fill("1");
  await button("确认范围").click();
  await page.locator("[data-timeline-stop]").first().click();
  assert.equal(
    (await page.locator('[data-timeline-stop][aria-pressed="true"]').count()) >=
      1,
    true,
  );
  await page.getByText(/^地图地点列表/).click();
  const mapList = page.getByRole("group", { name: "地图等价操作列表" });
  const firstPoi = mapList.getByRole("button", { name: /行程内/ }).first();
  await firstPoi.click();
  await page.locator("[data-map-quick-card]").waitFor();
  await shot("morph-quick");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("[data-map-quick-card]").count(), 0);
  assert.equal(
    await firstPoi.evaluate((e) => e === document.activeElement),
    true,
  );
  // Exercise rendered map features, not only the equivalent accessible list.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  if (!fallback) {
    const canvas = page.locator(".mapboxgl-canvas");
    const rect = await canvas.boundingBox();
    await canvas.click({ position: { x: rect.width / 2, y: rect.height / 2 } });
  } else await page.locator("svg [data-map-stop]").first().click();
  await page.locator("[data-map-quick-card]").waitFor();
  assert.match(
    await page
      .locator("[data-map-quick-card]")
      .evaluate((e) => getComputedStyle(e).animationName),
    /cardMorph/,
  );
  await page.waitForTimeout(600);
  const mapRect = await page.locator("[data-map-engine]").boundingBox();
  await page.mouse.click(mapRect.x + mapRect.width - 10, mapRect.y + 250);
  assert.equal(await page.locator("[data-map-quick-card]").count(), 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await firstPoi.click();
  assert.match(
    await page
      .locator("[data-map-quick-card]")
      .evaluate((e) => getComputedStyle(e).animationName),
    /cardContent/,
  );
  await mapList.getByRole("button", { name: /备选/ }).first().click();
  await page.locator('[data-object-type="recommended-poi"]').waitFor();
  await page.keyboard.press("Escape");
  await mapList
    .getByRole("button", { name: /住宿.*查看区域推荐/ })
    .first()
    .click();
  await page.locator('[data-object-type="recommended-stay-area"]').waitFor();
  await shot("stay-area");
  const candidate = page
    .locator("[data-map-quick-card]")
    .getByRole("button", { name: /查看详细/ })
    .first();
  await candidate.click();
  await button("加入预约").click();
  await button("待预约 · 查看预约").click();
  const hotel = page
    .locator("[data-booking-item]")
    .filter({ hasText: "晚 / 一笔预约" })
    .first();
  await hotel
    .getByRole("button", { name: /前往预约/ })
    .first()
    .click();
  await hotel
    .getByRole("button", { name: "我已完成预约（手动标记）", exact: true })
    .click();
  const hotelName = (await hotel.locator("h4").innerText())
    .split(" · ")
    .slice(1)
    .join(" · ");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  assert.equal(
    await mapList.getByRole("button", { name: /住宿.*查看区域推荐/ }).count(),
    0,
  );
  await mapList
    .getByRole("button", { name: new RegExp(hotelName) })
    .first()
    .click();
  await page.locator('[data-object-type="confirmed-stay-point"]').waitFor();
  await shot("confirmed-hotel");
  await button("关闭地图快速卡").click();
  await button("第1天 ▾").click();
  await button("2").click();
  assert.match(
    await page.locator("[data-time-bands]").innerText(),
    new RegExp(hotelName),
  );
  await button("重新生成路线").click();
  await page.waitForTimeout(1100);
  assert.match(
    await page.locator("[data-time-bands]").innerText(),
    new RegExp(hotelName),
  );
  for (const name of [
    "行程",
    "移动",
    "预约·票务",
    "天气·备选",
    "住宿·餐饮",
    "详细",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    assert.ok((await page.getByRole("tabpanel").innerText()).length > 0);
  }
  results.checks.push(
    "settings/no-layout-shift/nested-Escape",
    "traveler-counts/preference-details",
    "date-protection/extension",
    "range-inputs/valid-three-day-window",
    "duration-ratios/shared-axis",
    "map-quick-card/Escape/focus-restore",
    "hotel-confirmation/area-hidden/next-day-anchor",
    "Mock-regenerate-preserves-booking",
    "six-tabs",
    "rendered-map-click/blank-dismiss/object-switch",
    "Morph/reduced-motion",
    "three-bands-visible-at-four-desktop-sizes",
    "mobile-nested-popover-viewport",
  );
  assert.deepEqual(results.errors, []);
  console.log(
    JSON.stringify({
      checks: results.checks,
      sizes: results.sizes,
      errors: results.errors,
    }),
  );
} catch (error) {
  await page?.screenshot({ path: path.join(output, "failure.png") });
  console.log(
    await page?.locator("[data-planner-popover]").evaluateAll((els) =>
      els.map((e) => ({
        title: e.getAttribute("aria-label"),
        rect: e.getBoundingClientRect().toJSON(),
      })),
    ),
  );
  throw error;
} finally {
  fs.writeFileSync(
    path.join(output, `${fallback ? "fallback" : "mapbox"}-checks.json`),
    JSON.stringify(results, null, 2) + "\n",
  );
  await browser.close();
}
