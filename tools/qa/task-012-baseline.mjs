import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
await mkdir("docs/qa/TASK-012", { recursive: true });
try {
  for (const width of [1600, 1440, 1280, 1180, 1024, 390]) {
    const height =
      width >= 1440 ? 900 : width === 390 ? 844 : width === 1024 ? 768 : 800;
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto("http://127.0.0.1:3111/planner");
    await page.locator("[data-map-workspace]").waitFor();
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    const region = page.locator("[data-right-lower]");
    await region.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await region.screenshot({
      path: `docs/qa/TASK-012/recommendations-before-${width}.png`,
    });
    await writeFile(
      `docs/qa/TASK-012/recommendations-before-${width}.json`,
      JSON.stringify(
        await region.evaluate((e) => ({
          html: e.innerHTML,
          width: e.getBoundingClientRect().width,
          height: e.getBoundingClientRect().height,
          cards: [...e.querySelectorAll("button[aria-pressed]")].map((c) => ({
            width: c.getBoundingClientRect().width,
            height: c.getBoundingClientRect().height,
            text: c.textContent,
          })),
        })),
        null,
        2,
      ) + "\n",
    );
    await page.close();
  }
} finally {
  await browser.close();
}
