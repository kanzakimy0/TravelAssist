import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TASK_012_QA_URL || "http://127.0.0.1:3112";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local QA only");
const live = process.env.TASK_012_LIVE === "1";
const out = process.env.TASK_012_QA_OUT || "docs/qa/TASK-012";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = [];
try {
  for (const [width, height] of [
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1180, 800],
    [1024, 768],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: width === 1280 ? "reduce" : "no-preference",
    });
    page.setDefaultTimeout(12000);
    if (!live)
      await page.route("https://api.mapbox.com/**", (route) =>
        route.abort("failed"),
      );
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/favicon|mapbox|ERR_FAILED/.test(m.text() + m.location().url)
      )
        errors.push(m.text());
    });
    await page.goto(base + "/planner");
    await page.locator("[data-map-engine]").waitFor();
    if (live)
      await page
        .locator('[data-map-engine="mapbox"]')
        .waitFor({ timeout: 45000 });
    else {
      await page.locator('[data-map-engine="fallback"]').waitFor();
      await page
        .getByText("底图暂不可用 · 已切换可操作示意地图", { exact: true })
        .waitFor({ timeout: 25000 });
    }
    await page.waitForTimeout(350);
    const mapNode = await page.locator("[data-map-workspace]").elementHandle();
    const canvasNode = live
      ? await page.locator(".mapboxgl-canvas").elementHandle()
      : null;
    if (live) {
      const hostBox = await page.locator(".mapboxgl-map").boundingBox();
      const mapBox = await page.locator("[data-map-workspace]").boundingBox();
      assert.ok(
        hostBox.height > 300 && Math.abs(hostBox.height - mapBox.height) < 1,
        "Mapbox host must actually fill workspace",
      );
    }
    assert.equal(
      await page
        .locator("[data-map-workspace]")
        .evaluate((e) => e.getBoundingClientRect().top),
      0,
    );
    assert.equal(
      await page
        .locator("[data-top-gradient]")
        .evaluate((e) => getComputedStyle(e).pointerEvents),
      "none",
    );
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    );
    await page.screenshot({
      path:
        out +
        "/planner-" +
        (live ? "mapbox-" : "fallback-") +
        (width === 1024 ? "compact-" : width === 390 ? "mobile-" : "default-") +
        width +
        "x" +
        height +
        ".png",
    });
    if (live)
      await page.screenshot({
        path:
          out +
          "/planner-" +
          (width === 1024
            ? "compact-"
            : width === 390
              ? "mobile-"
              : "default-") +
          width +
          "x" +
          height +
          ".png",
      });
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    const region = page.locator("[data-right-lower]");
    await region.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await region.screenshot({
      path: out + "/recommendations-after-" + width + ".png",
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
    const before = JSON.parse(
      await readFile(
        "docs/qa/TASK-012/recommendations-before-" + width + ".json",
        "utf8",
      ),
    );
    assert.deepEqual(
      geometry,
      { width: before.width, height: before.height, cards: before.cards },
      "recommendation geometry/content frozen " + width,
    );
    await page
      .getByRole("button", { name: "更多行程设置", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "更多行程设置",
      exact: true,
    });
    await dialog.waitFor();
    assert.equal(await dialog.locator("nav button").count(), 7);
    const slider = dialog.getByRole("slider", { name: "预算档位" });
    const initial = await slider.inputValue();
    await slider.fill(initial === "3" ? "0" : "3");
    await dialog.getByRole("button", { name: "取消", exact: true }).click();
    await page
      .getByRole("button", { name: "更多行程设置", exact: true })
      .click();
    assert.equal(
      await page.getByRole("slider", { name: "预算档位" }).inputValue(),
      initial,
    );
    await page
      .getByRole("slider", { name: "预算档位" })
      .fill(initial === "3" ? "0" : "3");
    if (width === 1440 && live)
      await page.screenshot({
        path: out + "/planner-more-settings-1440x900.png",
      });
    await page.getByRole("button", { name: "保存设置", exact: true }).click();
    await page
      .getByRole("button", { name: "预览 1 项变更", exact: true })
      .click();
    await page.getByRole("dialog", { name: "重新规划影响预览" }).waitFor();
    await page
      .getByRole("button", { name: "生成预览路线（Mock）", exact: true })
      .click();
    await page
      .getByRole("button", { name: "重新生成路线", exact: true })
      .waitFor();
    if (width < 1200)
      await page
        .getByRole("button", { name: "关闭旅行设置与方案", exact: true })
        .click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    const bottom = page.locator("[data-bottom-panel]");
    if (width >= 768) {
      assert.equal(
        await bottom.evaluate(
          (e) =>
            getComputedStyle(e.parentElement.parentElement, "::before")
              .pointerEvents,
        ),
        "none",
      );
      const h = (await bottom.boundingBox()).height;
      assert.ok(Math.abs(h - height * 0.25) <= 1, "bottom fixed25dvh " + h);
    }
    for (const [label, id] of [
      ["移动", "movement"],
      ["预约·票务", "booking"],
      ["天气·备选", "weather"],
      ["住宿·餐饮", "stayFood"],
      ["详细", "details"],
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await page.locator('[data-secondary-panel="' + id + '"]').waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width === 1440 && live)
        await page.screenshot({
          path:
            out +
            "/planner-" +
            {
              movement: "mobility",
              booking: "booking",
              weather: "weather",
              stayFood: "stay-dining",
              details: "detail-health",
            }[id] +
            "-1440x900.png",
        });
    }
    await page.getByRole("tab", { name: "行程", exact: true }).click();
    if (width < 768)
      await page
        .getByRole("button", { name: "关闭当天安排", exact: true })
        .click();
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    await page
      .getByRole("button", { name: "进入行程详情", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    if (live)
      assert.ok(
        await page
          .locator(".mapboxgl-canvas")
          .evaluate((node, original) => node === original, canvasNode),
        "same actual Mapbox canvas",
      );
    assert.ok(
      await page
        .locator("[data-map-workspace]")
        .evaluate((node, original) => node === original, mapNode),
      "same map DOM across Planner → Detail",
    );
    await page.goBack();
    await page.waitForURL((url) => !url.searchParams.has("view"));
    assert.equal(errors.length, 0, errors.join("\n"));
    report.push({
      width,
      height,
      engine: live ? "mapbox" : "fallback",
      recommendations: "geometry and content identical",
      draft: "cancel/save/preview pass",
      mapLifecycle: "same DOM",
      errors,
    });
    await page.close();
  }
  await writeFile(
    out + "/qa-" + (live ? "mapbox" : "fallback") + ".json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
