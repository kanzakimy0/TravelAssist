import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.TASK_011_QA_URL || "http://127.0.0.1:3111";
if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) {
  throw new Error("TASK-011 browser QA may only target localhost");
}
const outputDirectory = path.resolve("docs/qa/TASK-011");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact", width: 1180, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: viewport.name === "compact" ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const source = message.location().url;
      if (source.endsWith("/favicon.ico") && message.text().includes("404")) {
        return;
      }
      errors.push(`${message.text()}${source ? ` (${source})` : ""}`);
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${baseUrl}/planner`);
    await page.locator("[data-map-workspace]").waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: path.join(outputDirectory, `${viewport.name}-planner.png`),
      fullPage: true,
    });
    assert.equal(
      await page
        .locator("body")
        .evaluate((body) => body.scrollWidth <= innerWidth),
      true,
      `${viewport.name} planner must not overflow horizontally`,
    );

    if (viewport.name === "desktop") {
      await page.evaluate(() => {
        window.__task011MapWorkspace = document.querySelector(
          "[data-map-workspace]",
        );
      });
      assert.equal(
        await page.getByRole("button", { name: /第1天/ }).count(),
        1,
      );
      await page.getByRole("button", { name: /进入行程详情/ }).click();
      await page.waitForURL(`${baseUrl}/planner?view=detail&day=1`);
      assert.equal(
        await page.evaluate(
          () =>
            window.__task011MapWorkspace ===
            document.querySelector("[data-map-workspace]"),
        ),
        true,
        "Planner → Detail must preserve the same map workspace DOM node",
      );
      assert.equal(
        await page
          .locator("[data-detail-heading]")
          .evaluate((heading) => heading === document.activeElement),
        true,
        "Detail heading should receive transition focus",
      );
      assert.equal(await page.getByRole("button", { name: "3日" }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "全日" }).count(), 0);

      await page.getByRole("button", { name: /第2天/ }).click();
      await page.waitForURL(`${baseUrl}/planner?view=detail&day=2`);
      await page.goBack();
      await page.waitForURL(`${baseUrl}/planner?view=detail&day=1`);
      await page.goBack();
      await page.waitForURL(`${baseUrl}/planner`);
      await page.goForward();
      await page.waitForURL(`${baseUrl}/planner?view=detail&day=1`);

      const firstItem = page.locator("[data-detail-item]").first();
      await firstItem.click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.equal(
        await firstItem.evaluate(
          (element) => element === document.activeElement,
        ),
        true,
        "Escape should close item dialog and restore focus",
      );
      await firstItem.click();
      const itemDialog = page.getByRole("dialog");
      await itemDialog.locator("button").last().focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await itemDialog.evaluate(
          (dialog) =>
            dialog === document.activeElement ||
            dialog.contains(document.activeElement),
        ),
        true,
        "Native modal dialog should contain keyboard focus",
      );
      await page.mouse.click(4, 4);
      await itemDialog.waitFor({ state: "detached" });
      assert.equal(
        await firstItem.evaluate(
          (element) => element === document.activeElement,
        ),
        true,
        "Backdrop close should restore focus",
      );

      await page.getByRole("button", { name: "新增行程项目" }).click();
      const addDialog = page.getByRole("dialog", { name: "新增行程项目" });
      await addDialog.getByLabel("类型").selectOption("task");
      await addDialog.getByLabel("名称").fill("领取寄存行李");
      await addDialog.getByLabel("开始").fill("18:30");
      await addDialog.getByLabel("结束").fill("18:45");
      await addDialog.getByRole("button", { name: "加入本地草稿" }).click();
      await page.getByRole("button", { name: /领取寄存行李/ }).waitFor();
      await page.getByText(/已自动保存/).waitFor();
      await page.reload();
      await page.getByRole("button", { name: /领取寄存行李/ }).waitFor();

      await page.getByRole("button", { name: "AI 重新检查" }).click();
      await page.getByText(/模拟 AI 检查已更新/).waitFor();
      await page.getByRole("button", { name: "调整后续行程" }).click();
      await page.getByRole("button", { name: "应用建议（本地）" }).click();
      await page.getByRole("button", { name: /预约前缓冲/ }).waitFor();
    } else {
      await page.goto(`${baseUrl}/planner?view=detail&day=2`);
      if (viewport.name === "compact") {
        await page.getByRole("button", { name: "当日执行仪表盘" }).click();
        await page.getByRole("dialog", { name: "当日执行仪表盘" }).waitFor();
        await page.getByRole("button", { name: "关闭当日执行仪表盘" }).click();
      } else {
        await page.getByRole("button", { name: "当日执行仪表盘" }).click();
        await page.getByRole("button", { name: "关闭当日执行仪表盘" }).click();
        await page.getByRole("button", { name: "当日执行轨道" }).click();
        await page.getByRole("dialog", { name: "当日执行轨道" }).waitFor();
        await page.getByRole("button", { name: "关闭当日执行轨道" }).click();
      }
    }

    await page.goto(`${baseUrl}/planner?view=detail&day=99`);
    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: "当日执行轨道" }).click();
    }
    await page.getByRole("button", { name: /第1天/ }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /第1天/ })
        .getAttribute("aria-pressed"),
      "true",
      "Invalid day should fall back to Day 1",
    );
    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: "关闭当日执行轨道" }).click();
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outputDirectory, `${viewport.name}-detail.png`),
      fullPage: true,
    });
    assert.equal(
      await page
        .locator("body")
        .evaluate((body) => body.scrollWidth <= innerWidth),
      true,
      `${viewport.name} detail must not overflow horizontally`,
    );
    if (errors.length) throw new Error(errors.join("\n"));
    report.push({ ...viewport, status: "passed" });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDirectory, "report.json"),
  `${JSON.stringify({ baseUrl, report }, null, 2)}\n`,
);
console.log(JSON.stringify(report));
