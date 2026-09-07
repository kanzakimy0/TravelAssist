import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.PLANNER_QA_OUT || "docs/qa/planner-stability/before";
const check = process.env.STABILITY_CHECK === "1";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    await page.waitForTimeout(350);
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    for (const [key, title] of [
      ["travelers", "同行人"],
      ["dates", "旅行日期"],
      ["sights", "景点偏好"],
      ["food", "餐饮偏好"],
      ["stay", "住宿偏好"],
    ]) {
      const trigger = page
        .locator("[data-right-upper]")
        .getByRole("button", { name: new RegExp("^" + title) });
      await trigger.click();
      const surface = page.locator("#quick-" + key);
      await surface.waitFor();
      const target =
        key === "travelers"
          ? surface.getByRole("button", { name: "增加成人男性", exact: true })
          : key === "dates"
            ? surface.getByRole("button", { name: "下个月", exact: true })
            : surface.locator("button[aria-pressed]").first();
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const before = {
        surface: await surface.boundingBox(),
        target: await target.boundingBox(),
        trigger: await trigger.boundingBox(),
      };
      await target.click();
      await page.waitForTimeout(150);
      const after = {
        surface: await surface.boundingBox(),
        target: await target.boundingBox(),
        trigger: await trigger.boundingBox(),
      };
      results.push({ width, height, key, before, after });
      if (check)
        for (const part of ["surface", "target", "trigger"])
          for (const axis of ["x", "y"])
            assert.ok(
              Math.abs(before[part][axis] - after[part][axis]) < 1.1,
              JSON.stringify(results.at(-1)),
            );
      if (["sights", "food", "stay"].includes(key)) {
        await surface.getByRole("button", { name: /更多设置/ }).click();
        const detail = page.locator("#preference-detail-" + key);
        const nav = detail
          .getByRole("group", { name: "详细设置分区" })
          .locator("button");
        for (let index = 1; index < (await nav.count()); index++) {
          await nav.nth(index).scrollIntoViewIfNeeded();
          await page.waitForTimeout(100);
          const before = {
            surface: await detail.boundingBox(),
            target: await nav.nth(index).boundingBox(),
          };
          await nav.nth(index).click();
          await page.waitForTimeout(150);
          const after = {
            surface: await detail.boundingBox(),
            target: await nav.nth(index).boundingBox(),
          };
          results.push({
            width,
            height,
            key: key + "-detail-" + index,
            before,
            after,
          });
          if (check)
            for (const part of ["surface", "target"])
              for (const axis of ["x", "y"])
                assert.ok(
                  Math.abs(before[part][axis] - after[part][axis]) < 1.1,
                  JSON.stringify(results.at(-1)),
                );
        }
        await page.keyboard.press("Escape");
      }
      await page.keyboard.press("Escape");
    }
    if (width < 1200) await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.waitForTimeout(150);
    const logo = await page
      .getByRole("link", { name: "TravelAssist", exact: true })
      .boundingBox();
    const form = await page.getByRole("search").first().boundingBox();
    const overlaps =
      logo.x < form.x + form.width &&
      logo.x + logo.width > form.x &&
      logo.y < form.y + form.height &&
      logo.y + logo.height > form.y;
    results.push({ width, search: { logo, form, overlaps } });
    if (check) {
      assert.ok(!overlaps);
      const panel = page.locator("#header-search");
      const box = await panel.boundingBox();
      assert.ok(
        box.y >= logo.y + logo.height &&
          box.x >= 0 &&
          box.x + box.width <= width + 1,
      );
      await page
        .getByRole("textbox", { name: "搜索关键词", exact: true })
        .fill("京都");
      await page.keyboard.press("Escape");
      assert.equal(await panel.count(), 0);
      await page.getByRole("button", { name: "搜索", exact: true }).click();
      assert.equal(
        await page
          .getByRole("textbox", { name: "搜索关键词", exact: true })
          .inputValue(),
        "京都",
      );
    }
    await page.screenshot({ path: `${out}/${width}-search.png` });
    await page.close();
  }
  if (check)
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [320, 740],
    ]) {
      for (const [index, id, bridge] of [
        [0, "classic-balanced", "classic"],
        [1, "slow-depth", "depth"],
        [2, "efficient-explorer", "relax"],
      ]) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.route("https://api.mapbox.com/**", (r) => r.abort());
        await page.goto(base + "/start");
        await page.getByRole("heading", { level: 1 }).waitFor();
        await page.evaluate(() =>
          localStorage.setItem(
            "travelassist.trip-wizard.v1",
            JSON.stringify({
              version: 2,
              currentStep: 3,
              draft: {
                familiarity: "first",
                generationStatus: {
                  state: "complete",
                  activeStage: 5,
                  runId: 1,
                },
              },
            }),
          ),
        );
        await page.reload();
        const card = page.getByRole("article").nth(index);
        const action = card.getByRole("button", {
          name: "查看这个方案",
          exact: true,
        });
        await action.scrollIntoViewIfNeeded();
        const before = await action.boundingBox();
        await action.click();
        const selected = card.getByRole("button", {
          name: "进入详细路线",
          exact: true,
        });
        const after = await selected.boundingBox();
        assert.equal(new URL(page.url()).pathname, "/start");
        assert.equal(await card.getByRole("link").count(), 0);
        assert.equal(await card.locator("button[aria-pressed]").count(), 1);
        assert.ok(
          Math.abs(before.height - after.height) < 1 &&
            Math.abs(before.y - after.y) < 1,
        );
        assert.equal(
          await page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("travelassist.trip-wizard.v1"))
                .draft.selectedPlanId,
          ),
          id,
        );
        if (index === 0)
          await page.screenshot({ path: `${out}/${width}-selected-plan.png` });
        await selected.click();
        await page.waitForURL(base + "/planner");
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("travelassist.mock-plan-selection.v1"),
          ),
          bridge,
        );
        results.push({ width, plan: id, twoClickNavigation: "passed" });
        await page.close();
      }
    }
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify(
    results.map((r) =>
      r.key
        ? {
            width: r.width,
            key: r.key,
            dy: r.after.surface.y - r.before.surface.y,
            targetDy: r.after.target.y - r.before.target.y,
          }
        : r,
    ),
  ),
);
