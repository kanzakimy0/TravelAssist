import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/detail-status-location";
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
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|Minified React|did not match/i.test(message.text()))
        errors.push(message.text());
    });
    await page.route("https://api.mapbox.com/**", (route) => route.abort());
    await page.goto(base + "/planner?view=detail&day=1");
    const bottom = async () => {
      const close = page.getByRole("button", {
        name: "关闭当日执行仪表盘",
        exact: true,
      });
      if (await close.isVisible()) await close.click();
      if (
        width < 768 &&
        !(await page.locator('[aria-label="单日执行工作区"]').isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行轨道", exact: true })
          .click();
    };
    const right = async () => {
      const close = page.getByRole("button", {
        name: "关闭当日执行轨道",
        exact: true,
      });
      if (await close.isVisible()) await close.click();
      if (
        width < 1200 &&
        !(await page.locator("[data-detail-sidebar]").isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行仪表盘", exact: true })
          .click();
    };
    const inspector = page.locator("[data-detail-map-inspector]");
    const heading = inspector.locator("header h2").first();
    await bottom();
    const minimize = await page
      .getByRole("button", { name: "收起行程栏", exact: true })
      .boundingBox();
    const overview = await page
      .getByRole("button", { name: /行程总览.*全程摘要/ })
      .boundingBox();
    assert.ok(minimize.x < overview.x);
    const confirmed = page
      .locator("[data-detail-column]")
      .filter({ has: page.locator('[data-detail-item][title*="东京晴空塔"]') });
    assert.equal(await confirmed.locator("[data-reservation-card]").count(), 0);
    const warning = page
      .locator("[data-primary-status]")
      .filter({ has: page.locator("[data-status-action]") })
      .first();
    const agree = await warning
      .getByRole("button", { name: /^(同意|更改)$/ })
      .boundingBox();
    const ignore = await warning
      .getByRole("button", { name: "无视", exact: true })
      .boundingBox();
    assert.ok(
      Math.abs(agree.width - ignore.width) < 1 &&
        Math.abs(agree.height - ignore.height) < 1,
    );
    // The primary action now applies an available time suggestion. Inspection
    // remains on the reminder body, instead of pretending agreement is navigation.
    await warning.locator("[data-status-action]").click();
    await inspector.waitFor();
    const initial = await heading.innerText();
    await bottom();
    await page.locator('[data-detail-item][title*="东京晴空塔"]').click();
    await heading.filter({ hasText: "东京晴空塔" }).waitFor();
    assert.notEqual(await heading.innerText(), initial);
    assert.equal(await inspector.count(), 1);
    await inspector
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    await page.locator("[data-inline-trip-editor]").waitFor();
    await bottom();
    await page.locator('[data-detail-item][title*="浅草寺"]').click();
    await heading.filter({ hasText: "浅草寺" }).waitFor();
    assert.equal(await page.locator("[data-inline-trip-editor]").count(), 0);
    await bottom();
    await page.getByRole("button", { name: "新增项目", exact: true }).click();
    await page.locator("[data-inline-add-project]").waitFor();
    await bottom();
    await page.locator('[data-detail-item][title*="浅草寺"]').click();
    assert.equal(await page.locator("[data-inline-add-project]").count(), 0);
    await heading.filter({ hasText: "浅草寺" }).waitFor();
    await page.screenshot({ path: `${out}/${width}-project-switch.png` });
    await right();
    const side = page.locator("[data-detail-sidebar]");
    const geometry = await side
      .locator("[data-slot-section] [data-meal-slot]")
      .evaluateAll((rows) =>
        rows.map((row) => {
          const r = row.getBoundingClientRect();
          const v = row.closest("[data-slot-section]").getBoundingClientRect();
          return {
            row: r.toJSON(),
            viewport: v.toJSON(),
            actions: [...row.querySelectorAll("button")].map((b) => {
              const rect = b.getBoundingClientRect();
              const target = document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              );
              return {
                rect: rect.toJSON(),
                hit: target === b || b.contains(target),
              };
            }),
          };
        }),
      );
    assert.equal(geometry.length, 4);
    for (const g of geometry)
      for (const button of g.actions) {
        assert.ok(
          button.rect.y >= g.viewport.y &&
            button.rect.y + button.rect.height <=
              g.viewport.y + g.viewport.height + 1,
          JSON.stringify(g),
        );
        assert.ok(button.hit, JSON.stringify(g));
      }
    const hotel = await side
      .locator('[data-slot-section="lodging"]')
      .boundingBox();
    const dining = await side
      .locator('[data-slot-section="dining"]')
      .boundingBox();
    assert.ok(Math.abs(dining.height - hotel.height * 3) < 1);
    await page.screenshot({ path: `${out}/${width}-sidebar.png` });
    await bottom();
    await page.getByRole("button", { name: /行程总览.*全程摘要/ }).click();
    await page.locator("[data-trip-overview-board]").waitFor();
    for (const name of ["早餐", "午餐", "晚餐", "住宿"])
      assert.match(
        await page.locator('[data-overview-day="1"]').innerText(),
        new RegExp(name),
      );
    await page
      .locator('[data-overview-day="2"] [data-overview-entry]')
      .filter({ hasText: "河口湖湖畔" })
      .click();
    await heading.filter({ hasText: "河口湖湖畔" }).waitFor();
    assert.equal(await inspector.count(), 1);
    await right();
    assert.equal(
      await page
        .locator("[data-trip-overview-sidebar] [data-slot-section]")
        .count(),
      0,
    );
    await side.getByRole("button", { name: /第 2 天.*项冲突/ }).click();
    await page.waitForURL(/day=2.*scope=overview/);
    await page.screenshot({ path: `${out}/${width}-overview.png` });
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      buttonsVisibleAndClickable: true,
      sameInspectorSwitch: true,
      overviewSharedSidebar: true,
      errors,
    });
    await page.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(8000);
  await page.route("https://api.mapbox.com/**", (route) => route.abort());
  await page.goto(base + "/planner?view=detail&day=1");
  let inspector = page.locator("[data-detail-map-inspector]");
  await page.getByRole("button", { name: "新增项目", exact: true }).click();
  await inspector.getByLabel("搜索现有地点", { exact: true }).fill("浅草");
  await inspector.getByRole("button", { name: /浅草寺.*选择并定位/ }).click();
  await inspector.getByLabel("名称", { exact: true }).fill("QA 目录地点");
  await inspector.locator('input[type="time"]').nth(0).fill("06:00");
  await inspector.locator('input[type="time"]').nth(1).fill("06:20");
  await inspector
    .getByRole("button", { name: "加入本地草稿", exact: true })
    .click();
  await inspector.getByText(/已匹配现有地点/).waitFor();
  await page.getByRole("button", { name: "新增项目", exact: true }).click();
  await inspector
    .getByRole("button", { name: "手动地图位置", exact: true })
    .click();
  await inspector.getByLabel("经度", { exact: true }).fill("999");
  await inspector.getByLabel("纬度", { exact: true }).fill("35.6");
  await inspector.getByLabel("名称", { exact: true }).fill("QA 手动地图项目");
  await inspector.locator('input[type="time"]').nth(0).fill("06:40");
  await inspector.locator('input[type="time"]').nth(1).fill("07:00");
  await inspector
    .getByRole("button", { name: "加入本地草稿", exact: true })
    .click();
  await inspector.getByRole("alert").filter({ hasText: "经度" }).waitFor();
  await inspector.getByLabel("经度", { exact: true }).fill("139.7454");
  await inspector
    .getByRole("button", { name: "加入本地草稿", exact: true })
    .click();
  await inspector.getByText(/139.7454, 35.6/).waitFor();
  await page.getByRole("button", { name: "保存行程", exact: true }).click();
  await page.waitForFunction(() =>
    localStorage.getItem("travelassist.saved-workspace.v1"),
  );
  await page.reload();
  await page
    .locator("[data-detail-item]")
    .filter({ hasText: "QA 手动地图项目" })
    .waitFor();
  const mapButton = page.locator(
    'svg [data-map-stop][aria-label*="QA 手动地图项目"]',
  );
  assert.equal(await mapButton.count(), 1);
  await mapButton.click();
  await inspector.getByText(/139.7454, 35.6/).waitFor();
  await page.screenshot({ path: `${out}/saved-map-location.png` });
  await page.getByRole("button", { name: "新增项目", exact: true }).click();
  await inspector
    .locator("summary")
    .filter({ hasText: "时间冲突示例" })
    .click();
  await inspector
    .getByRole("button", { name: "添加红色冲突测试", exact: true })
    .click();
  await inspector
    .locator("h2")
    .filter({ hasText: "[测试] 时间重叠检查" })
    .waitFor();
  const testCard = page
    .locator("[data-detail-column]")
    .filter({ has: page.locator("[data-detail-item]", { hasText: "[测试]" }) });
  assert.equal(await testCard.locator('[data-status="error"]').count(), 2);
  await page.screenshot({ path: `${out}/red-conflict-test.png` });
  await inspector
    .getByRole("button", { name: "调整行程", exact: true })
    .click();
  await inspector.getByRole("button", { name: "删除", exact: true }).click();
  await testCard.waitFor({ state: "detached" });
  assert.equal(
    await page.locator('[data-detail-column] [data-status="error"]').count(),
    0,
  );
  results.push({
    locations: "catalog + manual + invalid input + save/reload + map selection",
    conflictTest: "red on both sides, removable",
  });
  await page.close();
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log("PASS", results);
} finally {
  await browser.close();
}
