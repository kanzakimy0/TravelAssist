import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-route-board";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(9000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (/hydration|Minified React|did not match/i.test(m.text()))
        errors.push(m.text());
    });
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
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
      const b = page.getByRole("button", { name: "关闭当天安排", exact: true });
      if (await b.isVisible()) await b.click();
    };
    await bottom();
    const board = page.locator('[data-planner-route-board="itinerary"]');
    await board.waitFor();
    const upper = board.locator('[data-sight-row="planned"]'),
      lower = board.locator('[data-sight-row="reserve"]');
    const u = await upper.boundingBox(),
      l = await lower.boundingBox();
    assert.ok(u.y + u.height < l.y);
    const panel = await page.locator("[data-bottom-panel]").boundingBox();
    if (width >= 768)
      assert.ok(
        Math.abs(panel.height / height - 0.25) < 0.025,
        JSON.stringify(panel),
      );
    const movable = upper.locator('[data-planned-sight="classic-asakusa"]');
    const titleBefore = await movable
      .locator("[data-timeline-stop]")
      .innerText();
    assert.equal(
      await upper
        .locator('[data-planned-sight="classic-skytree"]')
        .getByRole("button", { name: /已保护，不可移为备用$/ })
        .isDisabled(),
      true,
    );
    await page.screenshot({ path: `${out}/${width}-itinerary.png` });
    await movable.getByRole("button", { name: /移为备用$/ }).click();
    assert.equal(
      await upper.locator('[data-planned-sight="classic-asakusa"]').count(),
      0,
    );
    const held = lower.locator('[data-reserve-sight="place-2"]');
    await held.getByRole("button", { name: /放回方案$/ }).click();
    assert.equal(
      await movable.locator("[data-timeline-stop]").innerText(),
      titleBefore,
    );
    await movable.getByRole("button", { name: /移为备用$/ }).click();
    await lower
      .locator('[data-reserve-sight="alternative-1-1"]')
      .getByRole("button", { name: /加入方案$/ })
      .click();
    await upper
      .locator('[data-planned-sight="classic-shelf-alternative-1-1-day1"]')
      .waitFor();
    assert.equal(
      await lower.locator('[data-reserve-sight="alternative-1-1"]').count(),
      0,
    );
    await upper
      .locator('[data-planned-sight="classic-shelf-alternative-1-1-day1"]')
      .getByRole("button", { name: /移为备用$/ })
      .click();
    await lower
      .locator('[data-reserve-sight="place-2"]')
      .getByRole("button", { name: /放回方案$/ })
      .click();
    await movable.locator("[data-timeline-stop]").click();
    const inspector = page.getByRole("complementary", {
      name: "项目详情框",
      exact: true,
    });
    await inspector.waitFor();
    await bottom();
    await lower
      .locator('[data-reserve-sight="place-18"]')
      .getByRole("button", { name: /查看备用景点/ })
      .click();
    assert.equal(await inspector.count(), 1);
    assert.match(await inspector.innerText(), /谷中老街/);
    await page
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await bottom();
    await page.getByRole("tab", { name: "移动", exact: true }).click();
    const fold = page.getByRole("button", {
      name: "收起移动详细信息",
      exact: true,
    });
    if (await fold.isVisible()) await fold.click();
    const movement = page.locator('[data-planner-route-board="movement"]');
    await movement.waitFor();
    const stopAppearance = await movement
      .locator("[data-movement-cards] > div > button")
      .first()
      .evaluate((button) => ({
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
        fontSize: getComputedStyle(button.querySelector("strong")).fontSize,
        fontWeight: getComputedStyle(button.querySelector("strong")).fontWeight,
      }));
    assert.ok(Math.abs(stopAppearance.width * 1.3 - stopAppearance.height) < 1);
    assert.equal(stopAppearance.fontSize, "11px");
    assert.equal(stopAppearance.fontWeight, "500");
    assert.equal(
      await movement.locator('[data-sight-row="reserve"]').count(),
      0,
    );
    assert.equal(await movement.locator("[data-movement-card]").count(), 5);
    const connector = movement.locator("[data-movement-card]").first(),
      edit = connector.getByRole("button", { name: /修改交通：/ });
    // The itinerary round-trip invalidated the old route, rather than silently
    // keeping a provider-looking estimate for a changed connection.
    assert.equal(await connector.getAttribute("data-risk"), "warning");
    assert.match(await edit.innerText(), /待核对/);
    const movementBox = await edit.boundingBox();
    assert.ok(movementBox.width < movementBox.height * 0.87);
    assert.ok(
      Math.abs(movementBox.width - Math.max(72, movementBox.height * 0.74)) < 1,
    );
    assert.ok(
      Math.abs(stopAppearance.width - Math.max(44, movementBox.width / 2)) < 1,
    );
    assert.ok(movementBox.height >= 84 && movementBox.height <= 136);
    const pairStyle = await movement
      .locator("[data-movement-cards] > div")
      .first()
      .evaluate((e) => getComputedStyle(e).flexGrow);
    assert.equal(pairStyle, "0");
    const stripBox = await movement
      .locator("[data-movement-cards]")
      .boundingBox();
    assert.ok(
      movementBox.y >= stripBox.y &&
        movementBox.y + movementBox.height <= stripBox.y + stripBox.height + 1,
      JSON.stringify({ width, movementBox, stripBox }),
    );
    assert.ok(
      await edit.evaluate(
        (button) => button.scrollHeight <= button.clientHeight + 1,
      ),
    );
    const before = await edit.innerText();
    await edit.click();
    let popup = page.getByRole("dialog", { name: "修改移动段", exact: true });
    await popup.getByRole("button", { name: "出租车", exact: true }).click();
    await popup.getByLabel("预计移动（分钟）", { exact: true }).fill("25");
    await popup.getByRole("button", { name: "取消", exact: true }).click();
    assert.equal(await edit.innerText(), before);
    await edit.click();
    popup = page.getByRole("dialog", { name: "修改移动段", exact: true });
    await popup.getByRole("button", { name: "出租车", exact: true }).click();
    await popup.getByLabel("预计移动（分钟）", { exact: true }).fill("25");
    await popup.getByLabel("额外缓冲（分钟）", { exact: true }).fill("10");
    await page.screenshot({ path: `${out}/${width}-movement-edit.png` });
    await popup
      .getByRole("button", { name: "应用并标记冲突", exact: true })
      .click();
    assert.match(await edit.innerText(), /出租车/);
    assert.match(await edit.innerText(), /25 分.*10 分/s);
    assert.equal(await connector.getAttribute("data-conflict"), "true");
    assert.equal(await connector.getAttribute("data-mode"), "taxi");
    assert.equal(await connector.getAttribute("data-risk"), "error");
    const redGradient = await edit.evaluate(
      (b) => getComputedStyle(b).backgroundImage,
    );
    assert.match(redGradient, /135deg/);
    assert.match(redGradient, /rgb\(242, 184, 182\)/);

    const nextConnector = movement.locator("[data-movement-card]").nth(1);
    const nextEdit = nextConnector.getByRole("button", { name: /修改交通：/ });
    for (const [duration, risk] of [
      [50, "warning"],
      [30, "normal"],
    ]) {
      await nextEdit.click();
      const menu = page.getByRole("dialog", {
        name: "修改移动段",
        exact: true,
      });
      await menu.getByRole("button", { name: "巴士", exact: true }).click();
      await menu
        .getByLabel("预计移动（分钟）", { exact: true })
        .fill(String(duration));
      await menu.getByLabel("额外缓冲（分钟）", { exact: true }).fill("0");
      await menu
        .getByRole("button", { name: "应用交通修改", exact: true })
        .click();
      assert.equal(await nextConnector.getAttribute("data-mode"), "bus");
      assert.equal(await nextConnector.getAttribute("data-risk"), risk);
      const paint = await nextEdit.evaluate((b) => ({
        fill: getComputedStyle(b).backgroundColor,
        gradient: getComputedStyle(b).backgroundImage,
      }));
      if (risk === "warning") {
        assert.match(paint.gradient, /rgb\(247, 224, 154\)/);
        assert.match(paint.gradient, /135deg/);
        await page.screenshot({ path: `${out}/${width}-movement-warning.png` });
      } else {
        assert.equal(paint.gradient, "none");
        assert.equal(paint.fill, "rgb(235, 223, 245)");
      }
    }
    await edit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${width}-movement.png` });
    await closeBottom();
    for (const range of ["3日", "全日"]) {
      await page.getByRole("button", { name: range, exact: true }).click();
      const choices = page.getByRole("dialog", {
        name: "选择连续三天",
        exact: true,
      });
      if (await choices.isVisible())
        await choices
          .getByRole("button", { name: "D1-D3", exact: true })
          .click();
      await bottom();
      assert.equal(await page.locator("[data-time-day]").count(), 3);
      await closeBottom();
    }
    // Detail overview lends precisely the old dining+hotel area to advice.
    await page.goto(base + "/planner?view=detail&day=1");
    const right = async () => {
      const c = page.getByRole("button", {
        name: "关闭当日执行轨道",
        exact: true,
      });
      if (await c.isVisible()) await c.click();
      if (
        width < 1200 &&
        !(await page.locator("[data-detail-sidebar]").isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行仪表盘", exact: true })
          .click();
    };
    await right();
    const side = page.locator("[data-detail-sidebar]");
    await side.waitFor();
    await page.waitForTimeout(300);
    const advice = await side
        .locator('[data-fixed-section="day-overview"]')
        .boundingBox(),
      dining = await side.locator('[data-slot-section="dining"]').boundingBox(),
      hotel = await side.locator('[data-slot-section="lodging"]').boundingBox();
    const colors = await side
      .locator("[data-tone]")
      .evaluateAll((es) => es.map((e) => getComputedStyle(e).backgroundColor));
    assert.deepEqual(colors, [
      "rgb(225, 239, 229)",
      "rgb(251, 239, 211)",
      "rgb(249, 224, 219)",
      "rgb(227, 235, 247)",
    ]);
    const cr = page.getByRole("button", {
      name: "关闭当日执行仪表盘",
      exact: true,
    });
    if (await cr.isVisible()) await cr.click();
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await page.getByRole("button", { name: /行程总览.*全程摘要/ }).click();
    await page.waitForURL(/scope=overview/);
    await page
      .locator("[data-trip-overview-board]")
      .waitFor({ state: "attached" });
    await right();
    assert.equal(await side.locator("[data-slot-section]").count(), 0);
    await page.waitForTimeout(300);
    const expanded = await side
      .locator('[data-fixed-section="day-overview"]')
      .boundingBox();
    assert.ok(
      Math.abs(expanded.y - advice.y) < 1,
      JSON.stringify({ width, advice, dining, hotel, expanded }),
    );
    assert.ok(
      Math.abs(expanded.y + expanded.height - hotel.y - hotel.height) < 1,
    );
    assert.ok(
      expanded.height > advice.height + dining.height + hotel.height - 1,
    );
    await page.screenshot({ path: `${out}/${width}-overview.png` });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      plannedAndReserve: true,
      roundTrip: true,
      protected: true,
      movementCancelApply: true,
      compactPortraitCards: true,
      transportModeColors: true,
      diagonalRedYellowRisk: true,
      itineraryInvalidatesOldRoute: true,
      rangeViews: true,
      overviewReclaimed: true,
      softStatusColors: true,
      errors,
    });
    await page.close();
  }
  const savedPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await savedPage.route("https://api.mapbox.com/**", (r) => r.abort());
  await savedPage.goto(base + "/planner");
  await savedPage
    .locator('[data-planned-sight="classic-asakusa"]')
    .getByRole("button", { name: /移为备用$/ })
    .click();
  await savedPage
    .locator("[data-right-lower] button")
    .filter({ hasText: "方案 02" })
    .click();
  assert.equal(
    await savedPage
      .locator('[data-reserve-sight="place-2"]')
      .getByRole("button", { name: /放回方案$/ })
      .count(),
    0,
  );
  await savedPage
    .locator("[data-right-lower] button")
    .filter({ hasText: "方案 01" })
    .click();
  await savedPage
    .locator('[data-reserve-sight="place-2"]')
    .getByRole("button", { name: /放回方案$/ })
    .waitFor();
  await savedPage.getByRole("tab", { name: "移动", exact: true }).click();
  await savedPage
    .getByRole("button", { name: "收起移动详细信息", exact: true })
    .click();
  await savedPage
    .locator("[data-movement-card]")
    .first()
    .getByRole("button", { name: /修改交通：/ })
    .click();
  const editor = savedPage.getByRole("dialog", {
    name: "修改移动段",
    exact: true,
  });
  await editor.getByRole("button", { name: "出租车", exact: true }).click();
  await editor.getByLabel("预计移动（分钟）", { exact: true }).fill("25");
  await editor.getByLabel("额外缓冲（分钟）", { exact: true }).fill("10");
  await editor
    .getByRole("button", { name: "应用交通修改", exact: true })
    .click();
  assert.equal(
    await savedPage.evaluate(() =>
      localStorage.getItem("travelassist.saved-workspace.v1"),
    ),
    null,
  );
  await savedPage.evaluate(() => {
    window.qaRouteMap = document.querySelector("[data-map-workspace]");
  });
  await savedPage
    .getByRole("button", { name: "进入行程详情", exact: true })
    .click();
  await savedPage.waitForURL(/view=detail/);
  assert.ok(
    await savedPage.evaluate(
      () =>
        window.qaRouteMap.isConnected &&
        window.qaRouteMap === document.querySelector("[data-map-workspace]"),
    ),
  );
  await savedPage
    .getByRole("button", { name: "保存行程", exact: true })
    .click();
  await savedPage.waitForFunction(
    () => localStorage.getItem("travelassist.saved-workspace.v1") !== null,
  );
  const saved = await savedPage.evaluate(() =>
    JSON.parse(localStorage.getItem("travelassist.saved-workspace.v1")),
  );
  const plan = saved.snapshot.plans.find((p) => p.id === "classic");
  assert.ok(plan.reserveItems.some((i) => i.id === "classic-asakusa"));
  assert.equal(Object.values(plan.movementLegs)[0].duration, 25);
  await savedPage.reload();
  await savedPage
    .getByText(/^已载入上次保存 · 仅此浏览器/)
    .first()
    .waitFor();
  await savedPage.screenshot({ path: `${out}/save-restored.png` });
  await savedPage
    .getByRole("button", { name: "← 返回推荐", exact: true })
    .click();
  await savedPage.waitForURL(base + "/planner");
  await savedPage
    .locator('[data-reserve-sight="place-2"]')
    .getByRole("button", { name: /放回方案$/ })
    .waitFor();
  await savedPage.getByRole("tab", { name: "移动", exact: true }).click();
  assert.match(
    await savedPage.locator("[data-movement-card]").first().innerText(),
    /出租车.*25 分/s,
  );
  results.push({
    saveInDetail: true,
    restoreReserveAndTraffic: true,
    planIsolation: true,
    noPlannerAutoSave: true,
    sameMapLifecycle: true,
  });
  await savedPage.close();
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
