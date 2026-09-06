import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3000";
const evidenceDir = path.resolve("docs/evidence/WBS-5.5-B/preferences");
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [390, 844],
  [320, 740],
];
const routes = [
  "mobility",
  "attractions",
  "dining",
  "accommodation",
  "budget",
  "experience",
  "advanced",
];
const consoleProblems = [];
const assetFailures = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      if (message.location().url === `${baseUrl}/favicon.ico`) return;
      consoleProblems.push(
        `${label} console.${message.type()}: ${message.text()}`,
      );
    }
  });
  page.on("pageerror", (error) =>
    consoleProblems.push(`${label}: ${error.message}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      assetFailures.push(`${label} ${response.status()}: ${response.url()}`);
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
    `${label}: ${JSON.stringify(overflow)}`,
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);
    const response = await page.goto(`${baseUrl}/personal-center/preferences`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200);
    await page
      .getByRole("heading", { name: "旅行偏好", exact: true })
      .waitFor();
    assert.equal(await page.locator('svg[role="img"]').count(), 2);
    assert.equal(
      await page.locator('a[href^="/personal-center/preferences/"]').count(),
      7,
    );
    await assertNoOverflow(page, label);

    const mainImages = page.locator("main img");
    for (let index = 0; index < (await mainImages.count()); index += 1) {
      await mainImages.nth(index).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(120);
    const decoded = await mainImages.evaluateAll((images) =>
      images.map((image) => ({
        src: image.currentSrc,
        complete: image.complete,
        width: image.naturalWidth,
      })),
    );
    for (const image of decoded) {
      assert.ok(
        image.complete && image.width > 0,
        `image decode failed: ${JSON.stringify(image)}`,
      );
    }

    if (width <= 390) {
      const cards = page.locator("article");
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      assert.ok(
        first && second && second.y > first.y + first.height - 2,
        `${label} radars must stack`,
      );
    }

    const contentArea = page.locator("#personal-content");
    await contentArea.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-overview.png`),
    });
    await contentArea.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-categories.png`),
    });
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  await page.goto(`${baseUrl}/personal-center/preferences`, {
    waitUntil: "networkidle",
  });

  const natureAxis = page.getByRole("button", { name: "自然：很喜欢" });
  await natureAxis.focus();
  await page.getByText("自然", { exact: true }).last().waitFor();
  await page.getByText("很喜欢", { exact: true }).waitFor();

  const help = page.getByRole("button", { name: "旅行画像说明" });
  await help.focus();
  const tooltip = page.getByRole("tooltip");
  await tooltip.waitFor();
  assert.equal(await tooltip.isVisible(), true);

  const resetButton = page.getByRole("button", { name: "重置偏好" }).first();
  await resetButton.focus();
  await resetButton.press("Enter");
  const dialog = page.getByRole("alertdialog", { name: "重置长期偏好？" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "取消" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByText("12 项已设置", { exact: true }).waitFor();

  await resetButton.focus();
  await resetButton.press("Enter");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "重置偏好" }).click();
  await page.getByText("还没有形成完整的旅行画像", { exact: true }).waitFor();
  await page.getByText("0 项已设置", { exact: true }).waitFor();
  assert.equal(await page.getByText("未设置", { exact: true }).count(), 8);
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-reset-empty.png"),
    fullPage: true,
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("link", { name: /移动/ }).click();
  await page.getByRole("heading", { name: "移动", exact: true }).waitFor();
  await page
    .getByText("铁路优先 · 少换乘 · 步行中等", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "返回旅行偏好" }).click();
  await page.getByRole("heading", { name: "旅行偏好", exact: true }).waitFor();

  for (const route of routes) {
    const routeResponse = await page.goto(
      `${baseUrl}/personal-center/preferences/${route}`,
      { waitUntil: "networkidle" },
    );
    assert.equal(routeResponse?.status(), 200, route);
    await page.getByRole("link", { name: "返回旅行偏好" }).waitFor();
    await assertNoOverflow(page, route);
  }
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-advanced.png"),
    fullPage: true,
  });

  for (const route of ["/personal-center", "/personal-center/account"]) {
    const regressionResponse = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(regressionResponse?.status(), 200, route);
    await assertNoOverflow(page, `regression ${route}`);
  }
  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");

  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(assetFailures, [], assetFailures.join("\n"));
console.log(`WBS-5.5-B browser QA passed; evidence: ${evidenceDir}`);
