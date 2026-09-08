import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.equal(new URL(base).hostname, "127.0.0.1");
const out = ".cache/qa/trip-preparation",
  report = "docs/qa/trip-preparation";
await mkdir(out, { recursive: true });
await mkdir(report, { recursive: true });
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
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) =>
      errors.push(e.message.replace(/pk\.[\w.-]+/g, "[redacted]")),
    );
    if (width < 1000)
      await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/personal-center/companions");
    await page
      .getByRole("button", { name: "编辑 Haru 的同行人资料", exact: true })
      .click();
    await page.getByLabel("昵称 / 称呼 *", { exact: true }).fill("Haru QA");
    await page
      .getByRole("button", { name: "关闭编辑窗口", exact: true })
      .click();
    await page.getByRole("alertdialog").waitFor();
    await page.getByRole("button", { name: "继续编辑", exact: true }).click();
    assert.equal(
      await page.getByLabel("昵称 / 称呼 *", { exact: true }).inputValue(),
      "Haru QA",
    );
    await page.screenshot({ path: `${out}/${width}-companion-editor.png` });
    // The save footer is sticky and already visible; avoid scrolling it away.
    const saveBox = await page
      .getByRole("button", { name: "保存同行人", exact: true })
      .boundingBox();
    await page.mouse.click(
      saveBox.x + saveBox.width / 2,
      saveBox.y + saveBox.height / 2,
    );
    await page.screenshot({ path: `${out}/${width}-companion-after.png` });
    await page.waitForFunction(() =>
      localStorage
        .getItem("travelassist.companion-library.v1")
        ?.includes("Haru QA"),
    );
    await page.goto(base + "/planner?view=detail&day=1&scope=overview");
    if (width >= 1000)
      await page
        .locator('[data-map-engine="mapbox"]')
        .waitFor({ timeout: 45000 });
    const right = async () => {
      if (
        width < 1200 &&
        !(await page.locator("[data-detail-sidebar]").isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行仪表盘", exact: true })
          .click();
    };
    await right();
    await page.getByLabel("不乘飞机", { exact: false }).check();
    await page.getByRole("button", { name: "完成行程", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "完成行程 · 出发前确认",
      exact: true,
    });
    await dialog.waitFor();
    await dialog.getByLabel("行程名称", { exact: true }).fill("樱花旅行 QA");
    await dialog.getByRole("button", { name: "选择单人", exact: true }).click();
    await dialog.getByRole("button", { name: /Haru QA/ }).waitFor();
    await dialog.getByRole("button", { name: "选择组合", exact: true }).click();
    await dialog.getByRole("button", { name: /家庭出游/ }).click();
    await dialog.getByRole("button", { name: /家庭出游/ }).click();
    assert.equal(
      await dialog.getByRole("button", { name: /^移除/ }).count(),
      3,
    );
    assert.equal(
      await dialog.getByRole("button", { name: /保存并保留/ }).isDisabled(),
      true,
    );
    while (await dialog.getByRole("button", { name: /^移除/ }).count())
      await dialog.getByRole("button", { name: /^移除/ }).first().click();
    await dialog
      .getByRole("button", { name: "＋ 添加临时成员", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "＋ 添加临时成员", exact: true })
      .click();
    await dialog
      .getByLabel("我已了解，保存后继续处理这些事项", { exact: true })
      .check();
    const b = await dialog.boundingBox();
    assert.ok(Math.abs(b.x + b.width / 2 - width / 2) < 3);
    assert.ok(Math.abs(b.y + b.height / 2 - height / 2) < 3);
    assert.ok(
      b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= width + 1 &&
        b.y + b.height <= height + 1,
    );
    await page.screenshot({ path: `${out}/${width}-completion.png` });
    await page.evaluate(() => {
      window.qaOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "travelassist.saved-workspace.v1")
          throw new DOMException(
            "QA storage unavailable",
            "QuotaExceededError",
          );
        return window.qaOriginalSetItem.call(this, key, value);
      };
    });
    await dialog.getByRole("button", { name: /保存并保留/ }).click();
    await dialog.getByText(/保存失败/).waitFor();
    assert.equal(
      await dialog.getByLabel("行程名称", { exact: true }).inputValue(),
      "樱花旅行 QA",
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("travelassist.saved-workspace.v1"),
      ),
      null,
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.qaOriginalSetItem;
      delete window.qaOriginalSetItem;
    });
    await dialog.getByRole("button", { name: /保存并保留/ }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1"))
          ?.snapshot.plans[0].name === "樱花旅行 QA",
    );
    await page.reload();
    await right();
    await page.getByLabel("不乘飞机", { exact: false }).uncheck();
    await page
      .getByRole("button", { name: "＋ 录入航班 / 购票需求", exact: true })
      .click();
    const flight = page.locator("[data-flight-project]");
    await flight.waitFor();
    await flight.getByLabel("出发机场", { exact: true }).fill("东京羽田 HND");
    await flight.getByLabel("到达机场", { exact: true }).fill("大阪关西 KIX");
    await flight
      .getByRole("button", { name: "加入购票预约", exact: true })
      .click();
    await page.screenshot({ path: `${out}/${width}-flight.png` });
    await flight
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await right();
    assert.match(
      await page.locator("[data-detail-sidebar]").innerText(),
      /待购票|购票需求/,
    );
    assert.match(
      await page.locator("[data-fixed-ai-actions]").innerText(),
      /待重新检查/,
    );
    if (width < 768) {
      await page
        .getByRole("button", { name: "关闭当日执行仪表盘", exact: true })
        .click();
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "保存行程", exact: true }).click();
    const saved = await page.evaluate(() => {
      const s = JSON.parse(
        localStorage.getItem("travelassist.saved-workspace.v1"),
      );
      return {
        members: s.snapshot.draft.preparations.classic.members.length,
        flight: s.snapshot.draft.preparations.classic.flights[0].status,
      };
    });
    assert.deepEqual(saved, { members: 2, flight: "queued" });
    await page.goto(base + "/planner");
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    await page.getByRole("tab", { name: "住宿·餐饮", exact: true }).click();
    await page.locator("[data-area-recommendations]").waitFor();
    await page.screenshot({ path: `${out}/${width}-dining.png` });
    await page.getByRole("tab", { name: "旅行体检", exact: true }).click();
    await page
      .getByRole("heading", { name: "当天出行体检", exact: true })
      .waitFor();
    await page.screenshot({ path: `${out}/${width}-health.png` });
    assert.equal(errors.length, 0, JSON.stringify(errors));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    results.push({
      width,
      height,
      browser: browser.version(),
      map: width >= 1000 ? "live" : "forced-fallback",
      companionPersistence: true,
      discardContinuePreservesEdits: true,
      failedSavePreservesEdits: true,
      groupDeduplication: true,
      memberMismatchBlocked: true,
      centeredDialog: true,
      temporaryMembers: true,
      completionSaveReload: true,
      flightQueuePersisted: true,
      receiptInvalidated: true,
      dailyPanels: true,
      errors,
    });
    await context.close();
  }
  await writeFile(
    report + "/results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(results);
} finally {
  await browser.close();
}
