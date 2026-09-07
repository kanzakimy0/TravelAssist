import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-audit-fixes";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    const showRight = async () => {
      if (
        width < 1200 &&
        !(await page
          .locator("[data-right-panel],[data-detail-sidebar]")
          .isVisible())
      )
        await page
          .getByRole("button", { name: /^(旅行设置与方案|当日执行仪表盘)$/ })
          .click();
    };
    const showBottom = async () => {
      if (
        width < 768 &&
        !(await page.locator("[data-detail-board]").isVisible())
      )
        await page
          .getByRole("button", { name: "当日执行轨道", exact: true })
          .click();
    };
    await page.goto(base + "/planner");
    await page.locator('[data-workspace-mode="planner"]').waitFor();
    await showRight();
    const trigger = page.getByRole("button", { name: /^景点偏好/ });
    const original = await trigger.innerText();
    await trigger.click();
    let menu = page.locator("#quick-sights");
    await menu.getByRole("button", { name: /历史文化/ }).click();
    assert.equal(await trigger.innerText(), original);
    await menu.getByRole("button", { name: "取消", exact: true }).click();
    await trigger.click();
    assert.equal(
      await menu
        .getByRole("button", { name: /历史文化/ })
        .getAttribute("aria-pressed"),
      "false",
    );
    await menu.getByRole("button", { name: /历史文化/ }).click();
    await menu.getByRole("button", { name: "应用设置", exact: true }).click();
    assert.match(
      await page.locator("[data-right-panel]").innerText(),
      /预览 1 项变更/,
    );
    await page.getByRole("button", { name: /^同行人/ }).click();
    menu = page.locator("#quick-travelers");
    await menu.getByRole("button", { name: "增加婴儿", exact: true }).click();
    await menu
      .getByRole("button", { name: "减少成人男性", exact: true })
      .click();
    await menu
      .getByRole("button", { name: "减少成人女性", exact: true })
      .click();
    assert.match(await menu.innerText(), /婴儿必须有成年同行人/);
    await page.keyboard.press("Escape");
    await page.goto(base + "/planner?view=detail&day=2");
    await page.locator('[data-workspace-mode="detail"]').waitFor();
    await showBottom();
    await page.getByRole("button", { name: "新增项目", exact: true }).click();
    let add = page.locator("[data-inline-add-project]");
    await add
      .getByRole("textbox", { name: "名称", exact: true })
      .fill("校验项目");
    await add.locator("input[type=time]").nth(0).fill("15:00");
    await add.locator("input[type=time]").nth(1).fill("14:00");
    await add
      .getByRole("button", { name: "加入本地草稿", exact: true })
      .click();
    assert.match(await add.getByRole("alert").innerText(), /结束时间必须晚于/);
    await add.locator("input[type=time]").nth(0).fill("10:00");
    await add.locator("input[type=time]").nth(1).fill("11:00");
    await add
      .getByRole("button", { name: "加入本地草稿", exact: true })
      .click();
    assert.match(await add.getByRole("alert").innerText(), /重叠/);
    await page.keyboard.press("Escape");
    await showBottom();
    await page
      .locator('[data-detail-item][data-kind="attraction"]')
      .first()
      .click();
    let inspector = page.locator("[data-detail-map-inspector]");
    await inspector
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    let editor = inspector.locator("[data-inline-trip-editor]");
    await editor.locator("input[type=time]").nth(0).fill("10:00");
    await editor.locator("input[type=time]").nth(1).fill("14:00");
    await editor
      .getByRole("button", { name: "调整时间 / 更改内容", exact: true })
      .click();
    assert.match(await editor.getByRole("status").innerText(), /重叠/);
    await inspector
      .getByRole("button", { name: "关闭行程项目详情", exact: true })
      .click();
    await inspector
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await showBottom();
    const ticket = page.locator("[data-reservation-card]").first();
    await ticket.click();
    await inspector
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    editor = inspector.locator("[data-inline-trip-editor]");
    await editor
      .getByRole("button", { name: "完成（本地）", exact: true })
      .click();
    await inspector
      .getByRole("button", { name: "调整行程", exact: true })
      .click();
    editor = inspector.locator("[data-inline-trip-editor]");
    await editor
      .getByRole("button", { name: "撤销完成", exact: true })
      .waitFor();
    assert.match(await editor.innerText(), /需确认/);
    await editor.getByRole("button", { name: "撤销完成", exact: true }).click();
    await inspector
      .getByRole("button", { name: "关闭项目详情框", exact: true })
      .click();
    await showRight();
    let sidebar = page.locator("[data-detail-sidebar]");
    await sidebar
      .getByRole("button", { name: "重新检查", exact: true })
      .click();
    assert.match(
      await sidebar.locator("[data-fixed-ai-actions]").innerText(),
      /已复检 5 项/,
    );
    await sidebar
      .getByRole("button", { name: "预约当日待办", exact: true })
      .click();
    const review = page.locator("#bulk-booking-review");
    assert.match(await review.innerText(), /第 2 天 1 项待预约/);
    assert.doesNotMatch(await review.innerText(), /芦之湖游船/);
    await page.keyboard.press("Escape");
    await sidebar
      .getByRole("button", { name: "查看全程待办", exact: true })
      .click();
    await page
      .locator("#all-booking-scope")
      .getByRole("button", { name: "全程预约", exact: true })
      .click();
    assert.match(await review.innerText(), /全方案 2 项待预约/);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await sidebar
      .getByRole("button", { name: "展开预计开销", exact: true })
      .click();
    assert.match(await page.locator("#section-expenses").innerText(), /待估算/);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: `${out}/${width}-sidebar.png` });
    if (width < 1200)
      await page
        .getByRole("button", { name: "关闭当日执行仪表盘", exact: true })
        .click();
    await showBottom();
    await page.getByRole("button", { name: /第3天/ }).click();
    await page.waitForTimeout(100);
    await showBottom();
    assert.equal(
      await page.locator('[data-missing-arrangement="hotel"]').count(),
      0,
    );
    await page.screenshot({ path: `${out}/${width}-last-day.png` });
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      quickDraft: true,
      timeValidation: true,
      completionSeparate: true,
      bookingScope: true,
      localRecheck: true,
      lastNight: true,
      errors,
    });
    await page.close();
  }
  await writeFile(
    out + "/results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(results);
} finally {
  await browser.close();
}
