import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3000";
const evidenceDir = path.resolve("docs/evidence/wbs-5.4-b-v2/personal-center");
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [390, 844],
  [320, 740],
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const consoleProblems = [];
const nonBlockingObservations = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      if (message.location().url === `${baseUrl}/favicon.ico`) {
        nonBlockingObservations.push(
          `${label}: global favicon.ico is absent (non-blocking baseline 404)`,
        );
        return;
      }
      consoleProblems.push(
        `${label} console.${message.type()}: ${message.text()} @ ${JSON.stringify(message.location())}`,
      );
    }
  });
  page.on("pageerror", (error) => {
    consoleProblems.push(`${label} pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      consoleProblems.push(
        `${label} response ${response.status()}: ${response.url()}`,
      );
    }
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
    `${label} horizontal overflow: ${JSON.stringify(overflow)}`,
  );
}

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);

    await page.goto(`${baseUrl}/personal-center`, { waitUntil: "networkidle" });
    await assertNoOverflow(page, `${label} home`);
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-home.png`),
      fullPage: true,
    });

    if (width === 390) {
      const trigger = page.getByRole("button", { name: /账户菜单/ });
      await trigger.click();
      await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
      await page.screenshot({
        path: path.join(evidenceDir, `${label}-avatar-popover.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
    }

    await page.goto(`${baseUrl}/personal-center/account`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", { name: "账户", exact: true }).waitFor();
    await assertNoOverflow(page, `${label} account`);
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-account-view.png`),
      fullPage: true,
    });
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  await page.goto(`${baseUrl}/personal-center/account`, {
    waitUntil: "networkidle",
  });

  await page.getByRole("button", { name: "编辑资料" }).click();
  const nickname = page.getByLabel(/昵称/);
  await nickname.fill("");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.getByText("请输入昵称").waitFor();
  await nickname.fill("Yuki Preview");

  await page.getByLabel("国家 / 地区", { exact: true }).selectOption("美国");
  assert.equal(
    await page.getByLabel("时区").inputValue(),
    "Asia/Tokyo",
    "region must not overwrite a manual timezone",
  );
  await page.getByRole("button", { name: /采用时区建议/ }).click();
  assert.equal(
    await page.getByLabel("时区").inputValue(),
    "America/Los_Angeles",
  );

  const avatarInput = page.locator('input[type="file"]');
  await avatarInput.setInputFiles(
    path.resolve(
      "public/media/personal-center/photoreal-v3/sidebar-torii-photo.webp",
    ),
  );
  await page.getByAltText("本地头像预览").waitFor();
  await page
    .locator("#personal-content")
    .evaluate((element) => (element.scrollTop = 0));
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-account-edit-avatar.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "删除头像" }).click();
  assert.equal(
    await page.locator('[data-kind="default"]').count(),
    1,
    "remove returns to the real default placeholder",
  );
  await page.getByRole("button", { name: "恢复默认头像" }).click();
  assert.equal(await page.locator('[data-kind="default"]').count(), 1);

  await page.getByRole("button", { name: "取消" }).last().click();
  assert.equal(await page.getByText("Yuki Preview").count(), 0);

  await page.getByRole("button", { name: "编辑资料" }).click();
  await nickname.fill("Yuki Saved");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.getByText("已保存", { exact: true }).waitFor();

  await page.getByRole("button", { name: /添加紧急联系人/ }).click();
  const contactDialog = page.getByRole("dialog", {
    name: "添加紧急联系人",
  });
  await contactDialog.getByRole("button", { name: "保存联系人" }).click();
  await contactDialog.getByText("请输入姓名").waitFor();
  await contactDialog.getByLabel(/姓名/).fill("山田太郎");
  await contactDialog.getByLabel(/与您的关系/).fill("父亲");
  await contactDialog.getByLabel(/手机号码/).fill("90-1234-5678");
  await contactDialog.getByRole("button", { name: "保存联系人" }).click();
  await page.getByRole("heading", { name: "山田太郎" }).waitFor();
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-emergency-contact.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "编辑", exact: true }).click();
  const editDialog = page.getByRole("dialog", {
    name: "编辑紧急联系人",
  });
  await editDialog.getByLabel(/与您的关系/).fill("家人");
  await editDialog.getByRole("button", { name: "保存联系人" }).click();
  await page.getByText(/家人 · \+81 90-1234-5678/).waitFor();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: "删除这位紧急联系人？",
  });
  await deleteDialog.getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await deleteDialog.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByText("还没有紧急联系人").waitFor();

  await nickname.fill("Unsaved Name");
  await page.getByRole("link", { name: "我的旅行", exact: true }).click();
  const unsavedDialog = page.getByRole("dialog", {
    name: "您有尚未保存的修改",
  });
  await unsavedDialog.waitFor();
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-unsaved-sidebar.png"),
    fullPage: true,
  });
  await unsavedDialog.getByRole("button", { name: "继续编辑" }).click();
  assert.match(page.url(), /\/personal-center\/account$/);

  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  await page
    .getByRole("link", { name: "我的旅行", exact: true })
    .last()
    .click();
  await unsavedDialog.waitFor();
  await unsavedDialog.getByRole("button", { name: "继续编辑" }).click();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "取消" }).last().click();
  if ((await avatarTrigger.getAttribute("aria-expanded")) === "true") {
    await avatarTrigger.click();
  }
  await page.waitForTimeout(80);
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "true");
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(
    await avatarTrigger.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await avatarTrigger.click();
  await page.mouse.click(520, 520);
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");

  const routes = [
    ["/personal-center", "我的首页"],
    ["/personal-center/trips", "我的旅行"],
    ["/personal-center/preferences", "旅行偏好"],
    ["/personal-center/companions", "同行人"],
    ["/personal-center/account", "账户"],
  ];
  for (const [route, activeLabel] of routes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    const currentLinks = page.locator('a[aria-current="page"]');
    assert.equal(await currentLinks.count(), 1, `${route} active nav count`);
    await currentLinks.getByText(activeLabel, { exact: true }).waitFor();
  }

  for (const route of [
    "/personal-center/account/security",
    "/personal-center/account/privacy",
    "/personal-center/account/booking-sync",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
  }
  await page.goBack({ waitUntil: "networkidle" });
  await page.goForward({ waitUntil: "networkidle" });
  await assertNoOverflow(page, "functional final");
  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
console.log([...new Set(nonBlockingObservations)].join("\n"));
console.log(`WBS-5.4-B-V2 browser QA passed; evidence: ${evidenceDir}`);
