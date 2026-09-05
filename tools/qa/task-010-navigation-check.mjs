import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.TASK_010_QA_URL || "http://127.0.0.1:3100";
const outputDirectory = path.resolve("docs/qa/TASK-010");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
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
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const source = message.location().url;
        if (source.endsWith("/favicon.ico") && message.text().includes("404")) {
          return;
        }
        errors.push(`${message.text()}${source ? ` (${source})` : ""}`);
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${baseUrl}/`);
    await page.getByRole("link", { name: "让我们开始吧" }).waitFor();
    await page.getByRole("link", { name: "个人中心" }).waitFor();
    if (!(await page.getByRole("button", { name: /登录/ }).isDisabled())) {
      throw new Error("Login boundary must remain disabled");
    }
    await page.getByRole("link", { name: "让我们开始吧" }).click();
    await page.waitForURL(`${baseUrl}/start`);
    await page.getByRole("heading", { name: "您对日本有多熟悉？" }).waitFor();

    await page.goto(`${baseUrl}/start?entry=step3`);
    const stepThreeHeading = page.getByRole("heading", {
      name: "这次旅行怎么安排？",
      level: 1,
    });
    await stepThreeHeading.waitFor();
    const focusedHeading = await stepThreeHeading.evaluate(
      (element) => document.activeElement === element,
    );
    if (!focusedHeading)
      throw new Error("Step 3 heading did not receive focus");
    if (
      (await page.locator("body").evaluate((body) => body.scrollWidth)) >
      viewport.width
    ) {
      throw new Error(
        `horizontal overflow at ${viewport.width}x${viewport.height}`,
      );
    }

    await page.screenshot({
      path: path.join(outputDirectory, `${viewport.name}-step3.png`),
      fullPage: true,
    });

    await page.evaluate(() =>
      localStorage.removeItem("travelassist.trip-wizard.v1"),
    );
    await page.goto(`${baseUrl}/start?entry=invalid`);
    await page.getByRole("heading", { name: "您对日本有多熟悉？" }).waitFor();

    if (viewport.name === "desktop") {
      await page.goto(`${baseUrl}/start?entry=step3`);
      await page.getByRole("button", { name: "生成方案" }).click();
      await page
        .getByRole("heading", { name: "为您准备了 3 个旅行方案" })
        .waitFor({ timeout: 8000 });
      const selectedCard = page
        .locator("article")
        .filter({ hasText: "深度慢游" });
      await selectedCard.getByRole("button", { name: "查看这个方案" }).click();
      await selectedCard
        .getByRole("link", { name: "使用此方案并进入地图" })
        .click();
      await page.waitForURL(`${baseUrl}/planner`);
      await page
        .getByRole("button", { name: /当前方案 深度体验之旅/ })
        .waitFor();
      await page.goBack();
      await page.waitForURL(`${baseUrl}/start?entry=step3`);
      await page.goForward();
      await page.waitForURL(`${baseUrl}/planner`);
      await page.getByRole("link", { name: "新建旅行" }).waitFor();
      await page.getByRole("link", { name: "个人中心" }).waitFor();
    }

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
