import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const out = "docs/qa/TASK-012",
  report = [];
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(12000);
    if (fallback)
      await page.route("https://api.mapbox.com/**", (route) =>
        route.abort("failed"),
      );
    await page.goto("http://127.0.0.1:3112/planner");
    await page
      .locator('[data-map-engine="' + (fallback ? "fallback" : "mapbox") + '"]')
      .waitFor({ timeout: 45000 });
    if (fallback)
      await page
        .getByText("底图暂不可用 · 已切换可操作示意地图", { exact: true })
        .waitFor({ timeout: 25000 });
    const canvas = fallback
      ? null
      : await page.locator(".mapboxgl-canvas").elementHandle();
    await page
      .getByRole("button", { name: "收起地图工具", exact: true })
      .click();
    await page
      .getByRole("button", { name: "展开地图工具", exact: true })
      .click();
    if (canvas)
      assert.ok(
        await page
          .locator(".mapboxgl-canvas")
          .evaluate((n, c) => n === c, canvas),
      );
    const more = page.getByRole("button", {
      name: "更多行程设置",
      exact: true,
    });
    await more.click();
    for (let n = 0; n < 35; n++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await page
          .getByRole("dialog", { name: "更多行程设置", exact: true })
          .evaluate((e) => e.contains(document.activeElement)),
      );
    }
    await page.keyboard.press("Escape");
    assert.ok(await more.evaluate((e) => e === document.activeElement));
    await more.click();
    await page.mouse.click(40, 65);
    assert.equal(
      await page
        .getByRole("dialog", { name: "更多行程设置", exact: true })
        .count(),
      0,
    );
    await page.getByRole("tab", { name: "移动", exact: true }).click();
    await page.locator("summary").filter({ hasText: "地图地点列表" }).click();
    await page
      .getByRole("group", { name: "地图等价操作列表" })
      .getByRole("button")
      .filter({ hasText: "浅草寺" })
      .click();
    assert.equal(
      await page
        .getByRole("tab", { name: "移动", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    assert.ok(
      await page
        .locator(
          '[data-secondary-panel="movement"] [data-item][aria-pressed="true"]',
        )
        .count(),
    );
    await page
      .getByRole("button", { name: "关闭地图快速卡", exact: true })
      .click();
    await page.locator("summary").filter({ hasText: "地图地点列表" }).click();
    await page
      .locator(
        '[data-secondary-panel="movement"] [data-item][aria-pressed="true"]',
      )
      .click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "天气·备选", exact: true }).click();
    const replacement = page
      .getByRole("button")
      .filter({ hasText: "预览替换" })
      .first();
    await replacement.click();
    await page.getByRole("dialog", { name: "天气备选影响预览" }).waitFor();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    for (const mode of ["threeDays", "all"]) {
      await page
        .getByRole("button", {
          name: mode === "threeDays" ? "3日" : "全日",
          exact: true,
        })
        .click();
      if (mode === "threeDays") await page.keyboard.press("Escape");
      for (const label of [
        "行程",
        "移动",
        "预约·票务",
        "天气·备选",
        "住宿·餐饮",
        "详细",
      ]) {
        await page.getByRole("tab", { name: label, exact: true }).click();
        assert.equal(
          await page
            .locator("[data-bottom-panel]")
            .getAttribute("data-bottom-range"),
          mode,
        );
        assert.ok(
          Math.abs(
            (await page.locator("[data-bottom-panel]").boundingBox()).height -
              225,
          ) < 1,
        );
      }
    }
    await page.getByRole("tab", { name: "预约·票务", exact: true }).click();
    await page
      .locator('[data-secondary-panel="booking"]')
      .getByRole("button", { name: "完成预约", exact: true })
      .click();
    const pendingCandidate = page
      .locator("[data-booking-item]")
      .filter({ has: page.getByRole("button", { name: /前往预约.*官方/ }) })
      .first();
    const pending = page.locator(
      '[data-booking-item="' +
        (await pendingCandidate.getAttribute("data-booking-item")) +
        '"]',
    );
    await pending.getByRole("button", { name: /前往预约.*官方/ }).click();
    await pending
      .getByRole("button", { name: "我已完成预约（手动标记）", exact: true })
      .click();
    assert.ok(
      await pending
        .getByText("✓ 已记录手动确认。真实订单查询、取消、支付不在当前范围。", {
          exact: true,
        })
        .count(),
    );
    await page.keyboard.press("Escape");
    if (fallback) {
      await page.getByRole("button", { name: "1日", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.screenshot({ path: out + "/planner-fallback-1440x900.png" });
    }
    for (const [width, height, mode, file] of [
      [1280, 800, "threeDays", "planner-three-days-1280x800.png"],
      [1180, 800, "all", "planner-all-days-1180x800.png"],
    ]) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole("button", {
          name: mode === "threeDays" ? "3日" : "全日",
          exact: true,
        })
        .click();
      if (mode === "threeDays") await page.keyboard.press("Escape");
      await page.getByRole("tab", { name: "行程", exact: true }).click();
      if (!fallback) await page.screenshot({ path: out + "/" + file });
    }
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    );
    report.push({
      engine: fallback
        ? "forced network failure / interactive fallback"
        : "real Mapbox",
      toolbar: "same canvas",
      keyboard: "focus trap / Escape / restore / outside close",
      selection: "map → active mobility / second click detail",
      weather: "replacement preview cancel",
      ranges: "all six tabs × three days / all days",
      booking: "existing provider and manual confirmation",
      documentOverflow: false,
    });
    await page.close();
  }
  await writeFile(
    out + "/interaction-qa.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
