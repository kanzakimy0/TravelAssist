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
  process.env.WBS_EVIDENCE_DIR ?? ".next/qa/WBS-5.9-B",
);
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [390, 844],
  [320, 740],
];

const pages = [
  {
    route: "dining",
    title: "餐饮偏好",
    summary: "当地料理 · 小店 · 排队接受中等",
    radioGroups: 3,
    radios: 9,
    checkboxes: 0,
  },
  {
    route: "accommodation",
    title: "住宿偏好",
    summary: "交通方便 · 舒适 · 少换酒店",
    radioGroups: 3,
    radios: 9,
    checkboxes: 0,
  },
  {
    route: "budget",
    title: "预算偏好",
    summary: "中等预算 · 更愿意花在住宿和体验",
    radioGroups: 1,
    radios: 3,
    checkboxes: 2,
  },
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
    for (const preference of pages) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const label = `${preference.route} ${width}x${height}`;
      attachDiagnostics(page, label);
      const response = await page.goto(
        `${baseUrl}/personal-center/preferences/${preference.route}`,
        { waitUntil: "networkidle" },
      );
      assert.equal(response?.status(), 200, label);
      await page
        .getByRole("heading", { name: preference.title, exact: true })
        .waitFor();
      await page.getByText(preference.summary, { exact: true }).waitFor();
      assert.equal(
        await page.getByRole("radiogroup").count(),
        preference.radioGroups,
        label,
      );
      assert.equal(
        await page.getByRole("radio").count(),
        preference.radios,
        label,
      );
      assert.equal(
        await page.getByRole("checkbox").count(),
        preference.checkboxes,
        label,
      );

      const hierarchy = page.getByRole("navigation", {
        name: `${preference.title}三级菜单`,
      });
      assert.equal(await hierarchy.getByRole("link").count(), 3, label);
      assert.equal(
        await page.locator("[data-preference-level]").count(),
        3,
        label,
      );
      assert.equal(await page.locator("article[data-scope]").count(), 3, label);
      assert.equal(
        await page.locator("article[data-scope] button").count(),
        0,
        `${label}: boundary cards must stay informational`,
      );
      await page.getByText("Mock / in-memory only", { exact: true }).waitFor();

      const heroImage = page.locator("main img").first();
      await heroImage.waitFor();
      assert.equal(
        await heroImage.evaluate(
          (image) => image.complete && image.naturalWidth > 0,
        ),
        true,
        label,
      );
      await assertNoOverflow(page, label);

      const contentArea = page.locator("#personal-content");
      await contentArea.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({
        path: path.join(
          evidenceDir,
          `${preference.route}-${width}x${height}-top.png`,
        ),
      });
      await contentArea.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.screenshot({
        path: path.join(
          evidenceDir,
          `${preference.route}-${width}x${height}-bottom.png`,
        ),
      });
      await context.close();
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  const writeRequests = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      writeRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto(`${baseUrl}/personal-center/preferences/dining`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("radio", { name: "当地料理倾向：不特别", exact: true })
    .click();
  await page.getByText("小店 · 排队接受中等", { exact: true }).waitFor();
  await page.getByText("有未保存的修改", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        !window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
    true,
  );

  await page.getByRole("link", { name: "返回旅行偏好" }).click();
  await dismissUnsavedDialog(page);
  await page.getByRole("link", { name: "同行人", exact: true }).click();
  await dismissUnsavedDialog(page);
  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  await page
    .getByRole("navigation", { name: "账户快捷导航" })
    .getByRole("link", { name: "账户设置" })
    .click();
  await dismissUnsavedDialog(page);

  await page.getByRole("button", { name: "取消" }).click();
  await page
    .getByText("当地料理 · 小店 · 排队接受中等", { exact: true })
    .waitFor();
  await page
    .getByRole("radio", { name: "排队接受度：较高", exact: true })
    .click();
  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.getByText("✓ 已保存", { exact: true }).waitFor();
  await page
    .getByText("当地料理 · 小店 · 排队接受较高", { exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        !window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ),
    false,
  );
  await page.getByRole("button", { name: "恢复默认" }).click();
  await page
    .getByText("当地料理 · 小店 · 排队接受中等", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "取消" }).click();
  await page
    .getByText("当地料理 · 小店 · 排队接受较高", { exact: true })
    .waitFor();

  await page.goto(`${baseUrl}/personal-center/preferences/accommodation`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("radio", { name: "舒适度：不特别", exact: true })
    .click();
  await page.getByText("交通方便 · 少换酒店", { exact: true }).waitFor();
  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.getByText("✓ 已保存", { exact: true }).waitFor();
  await page.getByRole("button", { name: "恢复默认" }).click();
  await page.getByText("交通方便 · 舒适 · 少换酒店", { exact: true }).waitFor();
  await page.getByRole("button", { name: "取消" }).click();
  await page.getByText("交通方便 · 少换酒店", { exact: true }).waitFor();

  await page.goto(`${baseUrl}/personal-center/preferences/budget`, {
    waitUntil: "networkidle",
  });
  const accommodationAllocation = page.getByRole("checkbox", {
    name: /更愿意花在住宿/,
  });
  const experienceAllocation = page.getByRole("checkbox", {
    name: /更愿意花在体验/,
  });
  await accommodationAllocation.uncheck();
  await page.getByText("中等预算 · 更愿意花在体验", { exact: true }).waitFor();
  await experienceAllocation.uncheck();
  await page.getByText("中等预算", { exact: true }).waitFor();
  await page
    .getByRole("radio", { name: "总体消费倾向：较宽松", exact: true })
    .click();
  await page.getByText("较宽松预算", { exact: true }).waitFor();
  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.getByText("✓ 已保存", { exact: true }).waitFor();
  assert.deepEqual(writeRequests, [], writeRequests.join("\n"));

  for (const route of [
    "/personal-center/preferences",
    "/personal-center/preferences/mobility",
    "/personal-center/preferences/attractions",
    "/personal-center/preferences/experience",
    "/personal-center/preferences/advanced",
    "/personal-center/companions",
    "/personal-center/account",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    await assertNoOverflow(page, `regression ${route}`);
  }

  await page.goto(`${baseUrl}/personal-center/preferences/mobility`, {
    waitUntil: "networkidle",
  });
  await page.getByText("平衡 · 少换乘 · 少步行", { exact: true }).waitFor();
  await page.goto(`${baseUrl}/personal-center/preferences/attractions`, {
    waitUntil: "networkidle",
  });
  await page.getByText("自然 · 摄影 · 历史", { exact: true }).waitFor();
  for (const route of ["experience", "advanced"]) {
    await page.goto(`${baseUrl}/personal-center/preferences/${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page.getByText(/详细编辑将在后续对应 WBS/).count(),
      1,
      route,
    );
  }

  await page.goto(`${baseUrl}/personal-center/account`, {
    waitUntil: "networkidle",
  });
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
console.log(`WBS-5.9-B browser QA passed; evidence: ${evidenceDir}`);
