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
  process.env.WBS_EVIDENCE_DIR ?? ".next/qa/WBS-5.10-B",
);
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 740],
];
const consoleProblems = [];
const responseProblems = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
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

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `trips ${width}x${height}`;
    attachDiagnostics(page, label);
    const response = await page.goto(`${baseUrl}/personal-center/trips`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, label);
    await page
      .getByRole("heading", { name: "我的旅行", exact: true })
      .waitFor();
    assert.equal(await page.getByRole("tab").count(), 5, label);
    assert.equal(
      await page
        .getByRole("link", { name: "新建旅程", exact: true })
        .getAttribute("href"),
      "/start?entry=step3",
    );
    await page
      .getByRole("heading", { name: "京都春日漫游", exact: true })
      .waitFor();
    await page
      .getByText("Persistence: Mock / in-memory only", { exact: true })
      .waitFor();
    await assertNoOverflow(page, label);
    await page.screenshot({
      path: path.join(evidenceDir, `${width}x${height}-top.png`),
    });
    await page.locator("#personal-content").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.screenshot({
      path: path.join(evidenceDir, `${width}x${height}-bottom.png`),
    });
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  const writeRequests = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      writeRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(`${baseUrl}/personal-center/trips`, {
    waitUntil: "networkidle",
  });
  const search = page.getByRole("searchbox", { name: "搜索行程名称或目的地" });
  await search.fill("大阪");
  await page
    .getByRole("heading", { name: "大阪秋日食旅", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "京都春日漫游", exact: true })
      .count(),
    0,
  );
  await search.fill("");
  await page
    .getByRole("combobox", { name: "目的地筛选" })
    .selectOption({ label: "北海道" });
  await page
    .getByRole("heading", { name: "北海道雪原假期", exact: true })
    .waitFor();

  await page.getByRole("tab", { name: /即将出发/ }).click();
  await page
    .getByRole("heading", { name: "京都春日漫游", exact: true })
    .waitFor();
  await page
    .getByRole("combobox", { name: "排序方式" })
    .selectOption("departureDesc");

  await page.getByRole("tab", { name: /草稿/ }).click();
  await page.getByRole("heading", { name: "未完成的旅行草稿" }).waitFor();
  const draftCards = page
    .locator("article")
    .filter({ has: page.getByText("草稿", { exact: false }) });
  assert.ok((await draftCards.count()) >= 2);
  await page.getByRole("button", { name: "删除", exact: true }).first().click();
  const normalDialog = page.getByRole("dialog", {
    name: /删除“濑户内艺术小旅行”/,
  });
  await normalDialog
    .getByText("此操作只影响当前页面内存中的草稿，刷新页面后会恢复演示数据。")
    .waitFor();
  await normalDialog.getByRole("button", { name: "确认删除" }).click();
  await page.getByText(/未触发任何合作方取消/).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "濑户内艺术小旅行" }).count(),
    0,
  );

  await page.getByRole("button", { name: "删除", exact: true }).click();
  const externalDialog = page.getByRole("dialog", {
    name: /删除“东京亲子周末”/,
  });
  await externalDialog
    .getByText(/不会取消酒店、门票、餐厅或交通合作方的预订/)
    .waitFor();
  await externalDialog.getByRole("button", { name: "取消" }).click();

  await page.getByRole("tab", { name: /历史/ }).click();
  for (const year of ["2027", "2026", "2025"])
    await page.getByRole("heading", { name: year, exact: true }).waitFor();
  await page
    .getByRole("button", { name: "旅行回顾", exact: true })
    .first()
    .click();
  const recapDialog = page.getByRole("dialog", { name: "北海道冬日列车" });
  await recapDialog.getByText("札幌雪祭与小樽运河", { exact: true }).waitFor();
  await recapDialog.getByRole("button", { name: "复制为新草稿" }).click();
  await page
    .getByRole("heading", { name: "北海道冬日列车（副本）", exact: true })
    .waitFor();
  await page.getByText(/展示快照复制为页内草稿/).waitFor();

  await page.getByRole("tab", { name: /历史/ }).click();
  await page.getByRole("button", { name: "取消收藏北海道冬日列车" }).click();
  await page
    .getByText("已取消收藏“北海道冬日列车”。", { exact: true })
    .waitFor();

  await page.getByRole("tab", { name: /收藏/ }).click();
  const favoriteFilters = page.locator('[aria-label="收藏类型筛选"] button');
  assert.equal(await favoriteFilters.count(), 6);
  await page.getByRole("button", { name: "餐饮", exact: true }).click();
  await page
    .getByRole("heading", { name: "祇园当地料理小店", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "查看详情" }).click();
  const detailDialog = page.getByRole("dialog", { name: "祇园当地料理小店" });
  await detailDialog
    .getByText("价格与预订操作暂不可用", { exact: true })
    .waitFor();
  await detailDialog.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "加入行程" }).click();
  await page
    .getByRole("button", { name: "已加入候选", disabled: true })
    .waitFor();
  await page.getByRole("button", { name: "移除" }).click();
  await page.getByText("还没有收藏", { exact: true }).waitFor();
  assert.deepEqual(writeRequests, [], writeRequests.join("\n"));

  for (const route of [
    "/personal-center",
    "/personal-center/preferences",
    "/personal-center/preferences/mobility",
    "/personal-center/preferences/attractions",
    "/personal-center/preferences/dining",
    "/personal-center/preferences/accommodation",
    "/personal-center/preferences/budget",
    "/personal-center/preferences/experience",
    "/personal-center/preferences/advanced",
    "/personal-center/companions",
    "/personal-center/account",
    "/start",
    "/start?entry=step3",
    "/planner",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    await assertNoOverflow(page, `regression ${route}`);
  }

  await page.goto(`${baseUrl}/personal-center/trips`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("link", { name: /TravelAssist/ })
    .first()
    .waitFor();
  const avatar = page.getByRole("button", { name: /账户菜单/ });
  await avatar.click();
  await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
  await page.keyboard.press("Escape");
  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(responseProblems, [], responseProblems.join("\n"));
console.log(`WBS-5.10-B browser QA passed; evidence: ${evidenceDir}`);
