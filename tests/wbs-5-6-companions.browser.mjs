import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);
const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3000";
const evidenceDir = path.resolve(
  process.env.WBS_EVIDENCE_DIR ?? "docs/evidence/WBS-5.6-B/companions",
);
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [390, 844],
  [320, 740],
];
const consoleProblems = [];
const responseProblems = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.location().url === `${baseUrl}/favicon.ico`) return;
    if (
      ["error", "warning"].includes(message.type()) &&
      !message.text().includes("favicon.ico")
    ) {
      consoleProblems.push(
        `${label} console.${message.type()}: ${message.text()}`,
      );
    }
  });
  page.on("pageerror", (error) =>
    consoleProblems.push(`${label}: ${error.message}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico"))
      responseProblems.push(`${label} ${response.status()}: ${response.url()}`);
  });
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert.ok(
    overflow.document <= 1 && overflow.body <= 1,
    `${label}: ${JSON.stringify(overflow)}`,
  );
}

async function assertDesktopCompanionPageFits(page, label, width) {
  if (width < 1280) return;
  const overflow = await page.evaluate(() => {
    const content = document.getElementById("personal-content");
    return content ? content.scrollHeight - content.clientHeight : 0;
  });
  assert.ok(overflow <= 1, `${label}: vertical overflow ${overflow}px`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);
    const response = await page.goto(`${baseUrl}/personal-center/companions`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200);
    await page.getByRole("heading", { name: "同行人", exact: true }).waitFor();
    await page.getByRole("heading", { name: "我的同行人" }).waitFor();
    await page.getByRole("heading", { name: "常用出行组合" }).waitFor();
    await page.getByRole("heading", { name: "特殊需求摘要" }).waitFor();
    assert.equal(await page.getByText("本人", { exact: true }).count(), 1);
    assert.equal(await page.getByLabel("删除同行人 Yuki").count(), 0);
    await assertNoOverflow(page, label);
    await assertDesktopCompanionPageFits(page, label, width);
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-overview.png`),
      fullPage: true,
    });
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  await page.goto(`${baseUrl}/personal-center/companions`, {
    waitUntil: "networkidle",
  });

  const addButton = page
    .getByRole("button", { name: "添加同行人", exact: true })
    .first();
  await addButton.click();
  let drawer = page.getByRole("dialog", { name: "添加同行人" });
  await drawer.waitFor();
  await drawer.getByRole("button", { name: "保存同行人" }).click();
  await drawer.getByText("请输入昵称或称呼。").waitFor();
  await drawer.getByLabel("昵称 / 称呼 *").fill("Mio");
  await drawer.getByLabel("关系").fill("朋友");
  await drawer.getByLabel("年龄层 *").selectOption("adult");
  await drawer.getByText("喜欢户外", { exact: true }).click();
  const avatarInput = drawer.locator('input[type="file"]');
  await avatarInput.setInputFiles(
    path.resolve("public/media/personal-center/avatar-yuki.webp"),
  );
  assert.match(
    await drawer.locator("img").first().getAttribute("src"),
    /^blob:/,
  );
  await drawer.getByRole("button", { name: "恢复默认头像" }).click();
  await drawer.getByRole("button", { name: "保存同行人" }).click();
  await page.getByRole("heading", { name: "Mio" }).waitFor();

  await page.getByRole("button", { name: "编辑 Mio 的同行人资料" }).click();
  drawer = page.getByRole("dialog", { name: "编辑 Mio" });
  await drawer.getByLabel("关系").fill("旅行朋友");
  await drawer.getByRole("button", { name: "保存同行人" }).click();
  await page.getByText(/旅行朋友 · 成人/).waitFor();

  await page.getByRole("button", { name: "删除同行人 Mio" }).click();
  let deleteDialog = page.getByRole("alertdialog", { name: "删除 Mio？" });
  await deleteDialog.getByRole("button", { name: "取消" }).click();
  await page.getByRole("heading", { name: "Mio" }).waitFor();
  await page.getByRole("button", { name: "删除同行人 Mio" }).click();
  deleteDialog = page.getByRole("alertdialog", { name: "删除 Mio？" });
  await deleteDialog.getByRole("button", { name: "确认删除同行人" }).click();
  assert.equal(await page.getByRole("heading", { name: "Mio" }).count(), 0);

  await page.getByRole("button", { name: "创建常用组合", exact: true }).click();
  let groupDrawer = page.getByRole("dialog", { name: "创建常用组合" });
  await groupDrawer.getByLabel("组合名称 *").fill("周末散步");
  const checkedMembers = groupDrawer.locator('input[type="checkbox"]:checked');
  for (let index = (await checkedMembers.count()) - 1; index >= 0; index -= 1)
    await checkedMembers.nth(index).uncheck();
  await groupDrawer.getByRole("button", { name: "保存组合" }).click();
  await groupDrawer.getByText("请至少选择 1 位成员。").waitFor();
  await groupDrawer.getByText("Yuki", { exact: true }).click();
  await groupDrawer.getByRole("button", { name: "保存组合" }).click();
  await page.getByRole("heading", { name: "周末散步" }).waitFor();
  await page.getByRole("button", { name: "编辑常用组合 周末散步" }).click();
  groupDrawer = page.getByRole("dialog", { name: "编辑 周末散步" });
  await groupDrawer.getByText("Haru", { exact: true }).click();
  await groupDrawer.getByRole("button", { name: "保存组合" }).click();
  await page
    .getByText(/2 位同行人/)
    .last()
    .waitFor();

  const seatNeed = page.getByRole("button", { name: /需要儿童座椅.*2 人/ });
  await seatNeed.click();
  await page.getByText("Haru、Sora", { exact: true }).waitFor();

  await addButton.click();
  drawer = page.getByRole("dialog", { name: "添加同行人" });
  await drawer.getByLabel("昵称 / 称呼 *").fill("未保存");
  await drawer.getByRole("button", { name: "关闭编辑窗口" }).click();
  let discardDialog = page.getByRole("alertdialog", {
    name: "您还有尚未保存的修改。",
  });
  await discardDialog.getByRole("button", { name: "继续编辑" }).click();
  await drawer.waitFor();
  await page.keyboard.press("Escape");
  discardDialog = page.getByRole("alertdialog", {
    name: "您还有尚未保存的修改。",
  });
  await discardDialog.getByRole("button", { name: "放弃修改" }).click();
  await addButton.waitFor();
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "添加同行人",
  );

  await addButton.click();
  drawer = page.getByRole("dialog", { name: "添加同行人" });
  await drawer.getByLabel("昵称 / 称呼 *").fill("守卫测试");
  await page.waitForTimeout(80);
  const beforeUnloadGuarded = await page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(beforeUnloadGuarded, true);

  await page
    .getByRole("link", { name: "我的首页", exact: true })
    .first()
    .click({ force: true });
  let navigationDialog = page.getByRole("dialog", {
    name: "您有尚未保存的修改",
  });
  await navigationDialog.waitFor();
  await navigationDialog.getByRole("button", { name: "继续编辑" }).click();
  await drawer.waitFor();

  await page
    .locator('div[popover] a[href="/personal-center/account"]')
    .evaluate((link) => link.click());
  navigationDialog = page.getByRole("dialog", {
    name: "您有尚未保存的修改",
  });
  await navigationDialog.waitFor();
  await navigationDialog.getByRole("button", { name: "继续编辑" }).click();
  await drawer.getByRole("button", { name: "关闭编辑窗口" }).click();
  discardDialog = page.getByRole("alertdialog", {
    name: "您还有尚未保存的修改。",
  });
  await discardDialog.getByRole("button", { name: "放弃修改" }).click();
  for (const route of [
    "/personal-center",
    "/personal-center/preferences",
    "/personal-center/account",
    "/personal-center/trips",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    await assertNoOverflow(page, route);
  }
  await page.goto(`${baseUrl}/personal-center/companions`, {
    waitUntil: "networkidle",
  });
  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");

  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-functional.png"),
    fullPage: true,
  });
  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(responseProblems, [], responseProblems.join("\n"));
console.log(`WBS-5.6-B browser QA passed; evidence: ${evidenceDir}`);
