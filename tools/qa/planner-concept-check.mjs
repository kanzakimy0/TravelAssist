// Local-only visual regression and the new header controls. No provider secrets logged.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3002";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = path.resolve("docs/qa/planner-concept-refinement");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const errors = [];
const geometry = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto(base + "/planner");
  await page.locator('[data-map-engine="mapbox"]').waitFor({ timeout: 30000 });
  const search = page.getByRole("button", {
    name: "搜索示例地点",
    exact: true,
  });
  await search.click();
  await page.getByRole("searchbox").fill("不存在的示例地点");
  assert.equal(
    await page.getByRole("status").filter({ hasText: "暂无匹配" }).count(),
    1,
  );
  await page.getByRole("searchbox").fill("浅草寺");
  await page
    .locator("#planner-search button")
    .filter({ hasText: "浅草寺" })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await search.click();
  await page.keyboard.press("Escape");
  assert.ok(await search.evaluate((el) => el === document.activeElement));
  await page.getByRole("button", { name: /^待预约提醒/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  // Fresh, unedited three-day fixture for a fair visual composition comparison.
  await page.reload();
  await page.locator('[data-map-engine="mapbox"]').waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "3日", exact: true }).click();
  await page.keyboard.press("Escape");
  for (const [width, height] of [
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1180, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(750);
    const metrics = await page.evaluate(() => {
      const box = (selector) => {
        const r = document.querySelector(selector)?.getBoundingClientRect();
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
      };
      return {
        map: box("[data-map-engine]"),
        canvas: box(".mapboxgl-canvas"),
        right: box("[data-right-panel]"),
        bottom: box("[data-bottom-panel]"),
      };
    });
    assert.ok(
      Math.abs(metrics.canvas.height - metrics.map.height) < 2,
      "Map canvas fills its host in production",
    );
    if (width >= 1200)
      assert.ok(Math.abs(metrics.right.width - width * 0.25) < 2);
    if (width >= 768)
      assert.ok(Math.abs(metrics.bottom.height - height * 0.25) < 2);
    geometry.push({ width, height, ...metrics });
    const images = await page
      .locator("[data-right-panel] img")
      .evaluateAll((elements) =>
        elements.every((el) => el.complete && el.naturalWidth > 0),
      );
    assert.ok(images, "Visible plan images loaded");
    await page.screenshot({
      path: path.join(output, `concept-three-day-${width}x${height}.png`),
    });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, "concept-checks.json"),
    JSON.stringify(
      {
        errors,
        geometry,
        checks: [
          "local-search/no-results/details",
          "search-Escape-focus-restore",
          "booking-reminder",
          "production-canvas-fills-host",
          "75-25-and-bottom-height-unchanged",
          "local-images-loaded",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ errors, geometry }));
} finally {
  await browser.close();
}
