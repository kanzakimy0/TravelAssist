import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const baseline = process.env.QA_BASELINE === "1";
const out = "docs/qa/planner-settings-redesign";
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
    const trigger = page.getByRole("button", {
      name: "更多行程设置",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "更多行程设置",
      exact: true,
    });
    await dialog.screenshot({
      path: `${out}/${baseline ? "before" : "after"}-${width}.png`,
    });
    if (baseline) {
      await page.close();
      continue;
    }
    const box = await dialog.boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width + 1 &&
        box.y + box.height <= height + 1,
    );
    assert.ok(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      "dialog must not overflow horizontally",
    );
    const budget = dialog.getByRole("slider", { name: "预算档位" });
    const original = await budget.inputValue();
    await budget.press(original === "0" ? "End" : "Home");
    const changed = await budget.inputValue();
    assert.notEqual(original, changed);
    const nav = dialog.getByRole("navigation", { name: "行程设置分类" });
    const categories = nav.locator("button");
    assert.equal(await categories.count(), 7);
    for (let i = 1; i < 7; i++) {
      await categories.nth(i).click();
      assert.equal(
        await categories.nth(i).getAttribute("aria-current"),
        "true",
      );
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
    }
    await categories.nth(1).click();
    const choice = dialog.getByRole("button", { name: "少换乘", exact: true });
    const selected = await choice.getAttribute("aria-pressed");
    await choice.click();
    await dialog.getByRole("button", { name: /更多设置 ·/ }).click();
    assert.equal(await dialog.locator("[data-inline-settings]").count(), 1);
    const field = dialog.locator("[data-inline-settings] input").first();
    await field.fill("测试条件");
    await dialog.screenshot({ path: `${out}/expanded-${width}.png` });
    const applyBox = await dialog
      .getByRole("button", { name: "应用设置", exact: true })
      .boundingBox();
    assert.ok(
      applyBox.y >= box.y && applyBox.y + applyBox.height <= box.y + box.height,
      "footer stays inside dialog",
    );
    await categories.nth(0).click();
    assert.equal(
      await budget.inputValue(),
      changed,
      "draft survives categories",
    );
    await dialog.getByRole("button", { name: "取消", exact: true }).click();
    await trigger.click();
    assert.equal(await budget.inputValue(), original, "cancel restores budget");
    await nav.locator("button").nth(1).click();
    assert.equal(
      await choice.getAttribute("aria-pressed"),
      selected,
      "cancel restores preferences",
    );
    await choice.click();
    await dialog.getByRole("button", { name: "应用设置", exact: true }).click();
    await trigger.click();
    await nav.locator("button").nth(1).click();
    assert.notEqual(
      await choice.getAttribute("aria-pressed"),
      selected,
      "apply persists preferences",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(
      await trigger.evaluate((el) => document.activeElement === el),
      "Escape restores focus",
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      box,
      draftCancelApply: true,
      inlineDetails: true,
      focusRestore: true,
      errors,
    });
    await page.close();
  }
  if (!baseline)
    await writeFile(
      `${out}/results.json`,
      JSON.stringify(results, null, 2) + "\n",
    );
  console.log(JSON.stringify({ baseline, results }, null, 2));
} finally {
  await browser.close();
}
