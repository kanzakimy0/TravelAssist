import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const out = ".cache/qa/planner-working-plan";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) =>
      errors.push(e.message.replace(/pk\.[\w.-]+/g, "[redacted]")),
    );
    if (width < 1000)
      await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto("http://127.0.0.1:3113/planner?view=detail&day=1");
    await page
      .getByRole("dialog", { name: "保存方案并进入详情", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await page.waitForURL(/\/planner$/);
    const bottom = async () => {
      if (
        width < 768 &&
        !(await page.locator("[data-bottom-panel]").isVisible())
      )
        await page
          .getByRole("button", { name: "当天安排", exact: true })
          .click();
    };
    const closeBottom = async () => {
      const close = page.getByRole("button", {
        name: "关闭当天安排",
        exact: true,
      });
      if (await close.isVisible()) await close.click();
    };
    const right = async () => {
      if (
        width < 1200 &&
        !(await page.locator("[data-right-panel]").isVisible())
      )
        await page
          .getByRole("button", { name: "旅行设置与方案", exact: true })
          .click();
    };
    await bottom();
    const card = page.locator('[data-planned-sight="classic-asakusa"]');
    await card.getByRole("button", { name: /编辑.*的时间/ }).click();
    await page.getByLabel("开始时间", { exact: true }).fill("08:30");
    await page.getByRole("button", { name: "应用时间", exact: true }).click();
    await page
      .getByRole("button", { name: /重叠 \d+ 项/ })
      .first()
      .click();
    await page
      .getByRole("dialog", { name: "选择要拖动的项目", exact: true })
      .getByRole("button", { name: /浅草寺.*置顶后拖动/ })
      .click();
    const handle = card.locator("[data-drag-handle]"),
      top = page.locator('[data-sight-scroll="planned"]').first();
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    const before = await top.evaluate((e) => e.scrollWidth);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2, {
      steps: 3,
    });
    await top.evaluate((e) => {
      const r = e.querySelector("[data-axis-start]");
      const minute = 715;
      const x =
        r.offsetLeft +
        ((minute - Number(r.dataset.axisStart)) /
          (Number(r.dataset.axisEnd) - Number(r.dataset.axisStart))) *
          r.offsetWidth;
      e.scrollLeft = Math.max(0, x - e.clientWidth / 2);
    });
    const ruler = page.locator("[data-axis-start]").first();
    const target = await ruler.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return {
        x:
          r.left +
          ((715 - Number(e.dataset.axisStart)) /
            (Number(e.dataset.axisEnd) - Number(e.dataset.axisStart))) *
            r.width,
        y: r.bottom + 26,
      };
    });
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.locator('[data-drop-minute="715"]').waitFor();
    assert.match(
      await page.locator('[data-drop-minute="715"]').innerText(),
      /11时55分/,
    );
    assert.equal(await top.evaluate((e) => e.scrollWidth), before);
    await page.screenshot({ path: `${out}/${width}-drag.png` });
    await page.mouse.up();
    assert.match(await card.innerText(), /11:55/);
    await page.getByRole("tab", { name: "住宿·餐饮", exact: true }).click();
    const breakfast = page.locator('[data-area-slot="breakfast"]');
    assert.ok((await breakfast.getByRole("button").count()) >= 2);
    const choice = breakfast.getByRole("button").first();
    if (width >= 1000) await choice.hover();
    else await choice.click();
    const reason = page.getByRole("dialog", {
      name: await choice.innerText(),
      exact: true,
    });
    await reason.waitFor();
    assert.match(await reason.innerText(), /规划建议/);
    await page.screenshot({ path: `${out}/${width}-reason.png` });
    await page.keyboard.press("Escape");
    await closeBottom();
    await page
      .getByRole("group", { name: "地图日程范围" })
      .getByRole("button", { name: "3日", exact: true })
      .click();
    await page.getByRole("button", { name: "D1-D3", exact: true }).click();
    await bottom();
    assert.equal(await page.locator("[data-area-slot]").count(), 4);
    assert.equal(await page.locator("[data-area-day]").count(), 12);
    await page.screenshot({ path: `${out}/${width}-three-meals.png` });
    await closeBottom();
    await right();
    await page
      .getByRole("button", { name: "进入行程详情", exact: true })
      .click();
    const first = page.getByRole("dialog", {
      name: "保存方案并进入详情",
      exact: true,
    });
    await first.waitFor();
    const boxes = await first
      .locator("footer button")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().width));
    assert.ok(Math.abs(boxes[0] - boxes[1]) <= 1);
    await page
      .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1")),
    );
    assert.equal(saved.snapshot.workingPlanId, "classic");
    await page.getByRole("button", { name: /返回推荐及增删项目/ }).click();
    await page.waitForURL(/\/planner$/);
    await right();
    const working = page.locator('[data-recommendation="classic"]');
    await working.getByText("当前工作中方案", { exact: true }).waitFor();
    assert.equal(
      await working
        .getByRole("button", { name: "进入行程详情", exact: true })
        .count(),
      1,
    );
    await page
      .locator('[data-recommendation="depth"]')
      .getByRole("button", { name: "切换方案", exact: true })
      .click();
    const switching = page.getByRole("dialog", {
      name: "切换工作方案？",
      exact: true,
    });
    await switching.waitFor();
    const checks = await switching
      .locator('label input[type="checkbox"]')
      .evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect(),
            t = e.nextElementSibling.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            left: r.left,
            textLeft: t.left,
            delta: r.top - t.top,
          };
        }),
      );
    assert.ok(
      checks.every(
        (r) =>
          r.width === 16 &&
          r.height === 16 &&
          r.textLeft > r.left + 16 &&
          r.delta >= 0 &&
          r.delta < 8,
      ),
      JSON.stringify(checks),
    );
    await switching.getByRole("button", { name: "取消", exact: true }).click();
    assert.equal(
      await working.getByText("当前工作中方案", { exact: true }).count(),
      1,
    );
    await page
      .locator('[data-recommendation="depth"]')
      .getByRole("button", { name: "切换方案", exact: true })
      .click();
    await switching
      .getByLabel("我确认切换工作方案并替换当前保存记录", { exact: true })
      .check();
    assert.equal(
      await switching
        .getByLabel("先把原工作方案存为草稿（推荐）", { exact: true })
        .isChecked(),
      true,
    );
    await page.screenshot({ path: `${out}/${width}-switch.png` });
    // Failed archive must not switch or overwrite the active saved workspace.
    await page.evaluate(() => {
      window.__qaSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "travelassist.working-drafts.v1")
          throw new DOMException("QA quota", "QuotaExceededError");
        return window.__qaSet.call(this, k, v);
      };
    });
    await switching
      .getByRole("button", { name: "存为草稿并切换", exact: true })
      .click();
    assert.ok(await switching.isVisible());
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1"))
            .snapshot.workingPlanId,
      ),
      "classic",
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__qaSet;
      delete window.__qaSet;
    });
    await switching
      .getByRole("button", { name: "存为草稿并切换", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    const archive = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travelassist.working-drafts.v1")),
    );
    assert.equal(archive.length, 1);
    assert.equal(archive[0].snapshot.workingPlanId, "classic");
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1"))
            .snapshot.workingPlanId,
      ),
      "depth",
    );
    await page.reload();
    assert.equal(
      await page
        .getByRole("dialog", { name: "保存方案并进入详情", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: /返回推荐及增删项目/ }).click();
    await page.waitForURL(/\/planner$/);
    await page.getByRole("button", { name: /浏览器草稿（1）/ }).click();
    await page
      .getByRole("dialog", { name: "浏览器草稿", exact: true })
      .getByRole("button", { name: /载入：/ })
      .click();
    await page
      .getByRole("dialog", { name: "切换工作方案？", exact: true })
      .getByLabel("我确认切换工作方案并替换当前保存记录", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "存为草稿并切换", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    const restored = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1"))
          .snapshot,
    );
    assert.equal(restored.workingPlanId, "classic");
    assert.equal(
      restored.plans
        .find((p) => p.id === "classic")
        .items.find((i) => i.id === "classic-asakusa").startTime,
      "11:55",
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      snapped: "11:55",
      overlapDrag: true,
      areaRows: 12,
      firstEntry: true,
      switchProtected: true,
      archive: true,
      storageFailureSafe: true,
      errors,
    });
    await context.close();
  }
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
