import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-detail-choices";
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
    await page.waitForTimeout(350);
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    for (const [group, title, key, option] of [
      ["sights", "景点偏好", "避开人群", "尽量错峰"],
      ["food", "餐饮偏好", "早餐需求", "当地早餐店"],
      ["stay", "住宿偏好", "床型", "双床"],
    ]) {
      await page
        .locator("[data-right-upper]")
        .getByRole("button", { name: new RegExp("^" + title) })
        .click();
      const quick = page.locator("#quick-" + group);
      const detail = page.locator("#preference-detail-" + group);
      async function open() {
        await quick
          .getByRole("button", { name: new RegExp("更多设置") })
          .click();
        await detail.waitFor();
      }
      const field = () => detail.getByRole("group", { name: key, exact: true });
      const pick = () =>
        field().getByRole("button", { name: new RegExp(option) });
      await open();
      await pick().click();
      await detail.getByRole("button", { name: "取消", exact: true }).click();
      await open();
      assert.equal(await pick().getAttribute("aria-pressed"), "false");
      await pick().click();
      await detail
        .getByRole("button", { name: "应用偏好", exact: true })
        .click();
      await open();
      assert.equal(await pick().getAttribute("aria-pressed"), "true");
      await field()
        .getByRole("button", { name: /未限定/ })
        .click();
      await page.keyboard.press("Escape");
      await open();
      assert.equal(await pick().getAttribute("aria-pressed"), "true");
      let manual = 0;
      const tabs = detail
        .getByRole("group", { name: "详细设置分区" })
        .locator("button");
      for (let i = 0; i < 3; i++) {
        await tabs.nth(i).click();
        manual += await detail.locator("input").count();
        assert.equal(await detail.locator("select,textarea").count(), 0);
        const rect = await detail.boundingBox();
        assert.ok(
          rect.x >= 0 &&
            rect.y >= 0 &&
            rect.x + rect.width <= width + 1 &&
            rect.y + rect.height <= height + 1,
        );
        await detail.evaluate((e) => (e.scrollTop = 0));
        await page.screenshot({ path: `${out}/${width}-${group}-${i}.png` });
      }
      assert.equal(manual, group === "sights" ? 2 : 1);
      const manualSection = group === "food" ? 1 : 0;
      await tabs.nth(manualSection).click();
      const customText =
        group === "stay"
          ? "每房每晚 ¥18,500"
          : group === "food"
            ? "花生过敏，避免交叉接触"
            : "伏见稻荷与平等院";
      await detail.locator("input").first().fill(customText);
      await detail
        .getByRole("button", { name: "应用偏好", exact: true })
        .click();
      await open();
      await tabs.nth(manualSection).click();
      assert.equal(
        await detail.locator("input").first().inputValue(),
        customText,
      );
      await detail.locator("input").first().fill("不保存的测试修改");
      await detail.getByRole("button", { name: "取消", exact: true }).click();
      await open();
      await tabs.nth(manualSection).click();
      assert.equal(
        await detail.locator("input").first().inputValue(),
        customText,
      );
      await detail.getByRole("button", { name: "取消", exact: true }).click();
      await page.keyboard.press("Escape");
      results.push({
        width,
        height,
        group,
        manual,
        cancel: true,
        apply: true,
        escape: true,
      });
    }
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("travelassist.saved-workspace.v1"),
      ),
      null,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
