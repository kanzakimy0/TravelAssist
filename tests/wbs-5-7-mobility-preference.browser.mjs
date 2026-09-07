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
  process.env.WBS_EVIDENCE_DIR ?? "docs/evidence/WBS-5.7-B/mobility",
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
      responseProblems.push(`${label} ${response.status()}: ${response.url()}`);
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

async function dismissUnsavedDialog(page) {
  const dialog = page.getByRole("dialog", {
    name: "您有尚未保存的修改",
  });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "继续编辑" }).click();
  await dialog.waitFor({ state: "hidden" });
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);
    const response = await page.goto(
      `${baseUrl}/personal-center/preferences/mobility`,
      { waitUntil: "networkidle" },
    );
    assert.equal(response?.status(), 200, label);
    await page
      .getByRole("heading", { name: "移动偏好", exact: true })
      .waitFor();
    await page.getByText("平衡 · 少换乘 · 少步行", { exact: true }).waitFor();
    assert.equal(await page.getByRole("radio").count(), 3);
    assert.equal(await page.getByRole("checkbox").count(), 3);
    const checkboxGeometry = await page
      .getByRole("checkbox")
      .evaluateAll((checkboxes) =>
        checkboxes.map((checkbox) => {
          const input = checkbox.getBoundingClientRect();
          const card = checkbox.parentElement?.getBoundingClientRect();
          return {
            contained:
              Boolean(card) &&
              input.top >= card.top - 1 &&
              input.bottom <= card.bottom + 1 &&
              input.left >= card.left - 1 &&
              input.right <= card.right + 1,
          };
        }),
      );
    assert.equal(
      checkboxGeometry.every((item) => item.contained),
      true,
      `${label}: checkbox focus target must stay inside its card`,
    );
    assert.equal(await page.locator('button[aria-pressed="true"]').count(), 2);
    const heroImage = page.locator("main img").first();
    await heroImage.waitFor();
    assert.equal(
      await heroImage.evaluate(
        (image) => image.complete && image.naturalWidth > 0,
      ),
      true,
    );
    await assertNoOverflow(page, label);

    const contentArea = page.locator("#personal-content");
    await contentArea.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-top.png`),
    });
    await contentArea.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.screenshot({
      path: path.join(evidenceDir, `${label}-bottom.png`),
    });
    if (width <= 390) {
      const publicTransitLabel = page.getByText("不乘坐公共交通", {
        exact: true,
      });
      await publicTransitLabel.click();
      const selectedCard = await page
        .getByRole("checkbox", { name: /不乘坐公共交通/ })
        .evaluate((checkbox) =>
          checkbox.parentElement?.getBoundingClientRect().toJSON(),
        );
      assert.ok(
        selectedCard && selectedCard.bottom > 64 && selectedCard.top < height,
        `${label}: checkbox focus must not jump content to a phantom position`,
      );
    }
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  await page.goto(`${baseUrl}/personal-center/preferences/mobility`, {
    waitUntil: "networkidle",
  });

  const balanced = page.getByRole("radio", { name: /平衡/ });
  const efficient = page.getByRole("radio", { name: /效率优先/ });
  assert.equal(await balanced.getAttribute("aria-checked"), "true");
  await efficient.click();
  assert.equal(await efficient.getAttribute("aria-checked"), "true");
  await page.getByText("效率优先 · 少换乘 · 少步行", { exact: true }).waitFor();
  await page.getByText("有未保存的修改", { exact: true }).waitFor();

  const noPublicTransit = page.getByRole("checkbox", {
    name: /不乘坐公共交通/,
  });
  const noBus = page.getByRole("checkbox", { name: /不乘坐公交/ });
  await noPublicTransit.check();
  await page.getByText("可用路线可能明显减少", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: /少步行/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await noPublicTransit.isChecked(), true);
  await noBus.check();
  await page.getByText("“不乘坐公交”已被包含", { exact: true }).waitFor();
  assert.equal(await noPublicTransit.isChecked(), true);
  assert.equal(await noBus.isChecked(), true);

  await page.getByRole("button", { name: "取消" }).click();
  await page.getByText("平衡 · 少换乘 · 少步行", { exact: true }).waitFor();
  assert.equal(await noPublicTransit.isChecked(), false);
  assert.equal(await noBus.isChecked(), false);

  await page.getByRole("radio", { name: /轻松优先/ }).click();
  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.getByText("✓ 已保存", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        !window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
    false,
  );

  await page.getByRole("button", { name: "恢复默认" }).click();
  await page.getByText("平衡 · 少换乘 · 少步行", { exact: true }).waitFor();
  await page.getByRole("button", { name: "取消" }).click();
  await page.getByText("轻松优先 · 少换乘 · 少步行", { exact: true }).waitFor();

  const noFerry = page.getByRole("checkbox", { name: /不乘坐游船/ });
  await page.getByText("不乘坐游船", { exact: true }).click();
  assert.equal(
    await page.evaluate(
      () =>
        !window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
    true,
  );

  await page.getByRole("link", { name: "返回旅行偏好" }).click();
  await dismissUnsavedDialog(page);
  assert.equal(await noFerry.isChecked(), true);

  await page.getByRole("link", { name: "同行人", exact: true }).click();
  await dismissUnsavedDialog(page);
  assert.equal(await noFerry.isChecked(), true);

  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  const accountNavigation = page.getByRole("navigation", {
    name: "账户快捷导航",
  });
  await accountNavigation.getByRole("link", { name: "账户设置" }).click();
  await dismissUnsavedDialog(page);
  assert.equal(await noFerry.isChecked(), true);

  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.getByRole("link", { name: "返回旅行偏好" }).click();
  await page.getByRole("heading", { name: "旅行偏好", exact: true }).waitFor();

  for (const route of [
    "attractions",
    "dining",
    "accommodation",
    "budget",
    "experience",
    "advanced",
  ]) {
    const routeResponse = await page.goto(
      `${baseUrl}/personal-center/preferences/${route}`,
      { waitUntil: "networkidle" },
    );
    assert.equal(routeResponse?.status(), 200, route);
    await page.getByRole("link", { name: "返回旅行偏好" }).waitFor();
    assert.equal(
      await page.getByText(/详细编辑将在后续对应 WBS/).count(),
      1,
      route,
    );
  }

  for (const route of [
    "/personal-center/preferences",
    "/personal-center/companions",
    "/personal-center/account",
  ]) {
    const regressionResponse = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(regressionResponse?.status(), 200, route);
    await assertNoOverflow(page, `regression ${route}`);
  }

  const regressionAvatarTrigger = page.getByRole("button", {
    name: /账户菜单/,
  });
  await regressionAvatarTrigger.click();
  await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  assert.equal(
    await regressionAvatarTrigger.getAttribute("aria-expanded"),
    "false",
  );

  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(responseProblems, [], responseProblems.join("\n"));
console.log(`WBS-5.7-B browser QA passed; evidence: ${evidenceDir}`);
