import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://localhost:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-panel-boundaries";
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    await page.locator('[data-workspace-mode="planner"]').waitFor();
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    await page
      .locator("[data-right-upper]")
      .getByRole("button", { name: /^同行人/ })
      .click();
    await page
      .locator("#quick-travelers")
      .getByRole("button", { name: "增加老人", exact: true })
      .click();
    assert.match(
      await page.locator("[data-right-upper]").innerText(),
      /老人 1/,
    );
    await page
      .locator("#quick-travelers")
      .getByRole("button", { name: /关闭同行人/ })
      .click();
    const settings = page.getByRole("button", {
      name: "更多行程设置",
      exact: true,
    });
    const anchor = await settings.boundingBox();
    await settings.click();
    const modal = page.getByRole("dialog", {
      name: "更多行程设置",
      exact: true,
    });
    const box = await modal.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    assert.ok(box.y >= 0 && box.y + box.height <= height + 1);
    assert.equal(
      await modal
        .getByRole("navigation", { name: "行程设置分类" })
        .locator("button")
        .count(),
      7,
    );
    await modal.screenshot({ path: `${out}/${width}-settings.png` });
    const budget = modal.getByRole("slider", { name: "预算档位" });
    const originalBudget = await budget.inputValue();
    await budget.press("Home");
    await modal.getByRole("button", { name: "取消", exact: true }).click();
    await settings.click();
    assert.equal(
      await modal.getByRole("slider", { name: "预算档位" }).inputValue(),
      originalBudget,
    );
    await modal.getByRole("button", { name: "取消", exact: true }).click();
    if (width < 1200)
      await page
        .getByRole("button", { name: "关闭旅行设置与方案", exact: true })
        .click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    assert.equal(await page.locator("#bottom-context").count(), 0);
    for (const [tab, label] of [
      ["itinerary", "行程"],
      ["movement", "移动"],
      ["booking", "预约"],
      ["weather", "备选"],
      ["stayFood", "住宿·餐饮"],
      ["details", "旅行体检"],
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      const context = page.locator("#bottom-context");
      await context.waitFor();
      const rect = await context.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      assert.ok(rect.y >= 0 && rect.y + rect.height <= height + 1);
      const selectedTab = page.getByRole("tab", { name: label, exact: true });
      const tabRect = await selectedTab.boundingBox();
      assert.ok(
        Math.abs(rect.width - tabRect.width) < 1 &&
          Math.abs(rect.x - tabRect.x) < 1,
      );
      const contentBottom = tabRect.y + tabRect.height - 28;
      assert.ok(Math.abs(rect.y + rect.height - contentBottom) <= 2);
      assert.ok(rect.y + rect.height > tabRect.y);
      assert.ok(rect.height <= 281 + Math.max(0, tabRect.height - 28));
      assert.equal((await selectedTab.innerText()).trim(), "");
      assert.equal(await context.locator("section > p").count(), 3);
      if (tab === "movement") {
        const cards = page.locator("[data-movement-card]");
        assert.ok((await cards.count()) > 1);
        const card = cards.first();
        assert.equal(await card.locator(":scope > section").count(), 3);
        const heights = await card
          .locator(":scope > section")
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getBoundingClientRect().height),
          );
        assert.ok(
          Math.max(...heights) - Math.min(...heights) < 1,
          JSON.stringify(heights),
        );
        assert.equal(
          await card
            .getByRole("region", { name: "提示处理" })
            .locator("button")
            .count(),
          3,
        );
        await card
          .getByRole("button", { name: "接受提示", exact: true })
          .click();
        await cards
          .nth(1)
          .getByRole("button", { name: "忽略提示", exact: true })
          .click();
        assert.equal(
          await card
            .getByRole("button", { name: "接受提示", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        const plus = card.getByRole("button", { name: /更多决定/ });
        await plus.click();
        const menu = page.getByRole("dialog", {
          name: "更多决定",
          exact: true,
        });
        await menu.waitFor();
        assert.equal(await menu.locator(":scope > div > button").count(), 5);
        const menuBox = await menu.boundingBox();
        assert.ok(
          menuBox.x >= 0 &&
            menuBox.x + menuBox.width <= width + 1 &&
            menuBox.y >= 0 &&
            menuBox.y + menuBox.height <= height + 1,
        );
        await page.screenshot({ path: `${out}/${width}-movement-more.png` });
        await page.keyboard.press("Escape");
        assert.equal(
          await plus.evaluate((node) => document.activeElement === node),
          true,
        );
        await plus.click();
        await menu
          .getByRole("button", { name: "稍后核对", exact: true })
          .click();
        assert.match(await card.innerText(), /稍后核对/);
        assert.equal(
          await cards
            .nth(1)
            .getByRole("button", { name: "忽略提示", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
      }
      if (tab === "stayFood")
        assert.equal(
          await page.locator("[data-area-recommendations] > section").count(),
          3,
        );
      if (tab === "weather") {
        const alternate = page
          .getByRole("button", { name: /预览替换/ })
          .first();
        if (await alternate.count()) {
          await alternate.click();
          await page
            .getByRole("dialog", { name: "备选行程影响预览", exact: true })
            .waitFor();
          await page.keyboard.press("Escape");
          assert.equal(
            await page
              .getByRole("dialog", { name: "备选行程影响预览", exact: true })
              .count(),
            0,
          );
        }
      }
      await page.screenshot({ path: `${out}/${width}-${tab}.png` });
      const panelBefore = await page.getByRole("tabpanel").boundingBox();
      await page
        .getByRole("button", { name: `收起${label}详细信息`, exact: true })
        .click();
      assert.equal(await context.count(), 0);
      assert.match(
        await selectedTab.innerText(),
        new RegExp(label.replace("·", ".")),
      );
      assert.deepEqual(
        await page.getByRole("tabpanel").boundingBox(),
        panelBefore,
      );
      await page
        .getByRole("button", { name: `展开${label}详细信息`, exact: true })
        .click();
      await context.waitFor();
    }
    const lastTab = page.getByRole("tab", { name: "旅行体检", exact: true });
    await lastTab.focus();
    await lastTab.press("ArrowLeft");
    assert.equal(
      await page
        .getByRole("tab", { name: "住宿·餐饮", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Home");
    assert.equal(
      await page
        .getByRole("tab", { name: "行程", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.locator("#bottom-context").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#bottom-context").count(), 0);
    await page.getByRole("tab", { name: "预约", exact: true }).click();
    assert.equal(
      await page.getByRole("dialog", { name: "完成预约", exact: true }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "进入详情处理购票", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    await page
      .getByRole("button", { name: "管理全部预约（本地）", exact: true })
      .click();
    await page.getByRole("dialog", { name: "完成预约", exact: true }).waitFor();
    await page
      .getByRole("button", { name: "关闭完成预约", exact: true })
      .click();
    const area = page.getByRole("button", { name: /查看候选与预约/ }).first();
    await area.click();
    await page
      .getByRole("heading", { name: /区域内酒店推荐|区域内餐厅推荐/ })
      .waitFor();
    await page.screenshot({ path: `${out}/${width}-detail-area.png` });
    assert.deepEqual(errors, []);
    results.push({ width, height, anchor, settings: box, tabs: 6, errors });
    await page.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
