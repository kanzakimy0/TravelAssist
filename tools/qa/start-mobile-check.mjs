import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.START_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.START_QA_OUT || "docs/qa/start-mobile/after";
const baseline = process.env.START_QA_BASELINE === "1";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const errors = [],
  results = [];
const key = "travelassist.trip-wizard.v1";
const sizes = [
  [1440, 900],
  [390, 844],
  [320, 740],
  [430, 932],
  [667, 375],
  [844, 390],
];
async function bounds(page, locator) {
  const b = await locator.boundingBox();
  const v = page.viewportSize();
  assert.ok(
    b &&
      b.x >= -1 &&
      b.y >= -1 &&
      b.x + b.width <= v.width + 1 &&
      b.y + b.height <= v.height + 1,
    JSON.stringify(b),
  );
}
try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 768,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (let step = 0; step < 5; step++) {
      await page.goto(`${base}/start`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(
        ({ key, step }) => {
          localStorage.setItem(
            key,
            JSON.stringify({
              version: 2,
              currentStep: Math.min(step, 3),
              draft: {
                familiarity: "first",
                generationStatus: {
                  state:
                    step === 4
                      ? "complete"
                      : step === 3
                        ? "generating"
                        : "idle",
                  activeStage: 0,
                  runId: 1,
                },
              },
            }),
          );
        },
        { key, step },
      );
      await page.reload();
      const titles = [
        "您对日本有多熟悉？",
        "您对什么感兴趣？",
        "这次旅行怎么安排？",
        "正在为您规划旅行…",
        "为您准备了 3 个旅行方案",
      ];
      await page
        .getByRole("heading", { name: titles[step], exact: true })
        .waitFor();
      await page.screenshot({
        path: `${out}/${width}x${height}-step${step + 1}.png`,
      });
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        height: innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        panel: document
          .querySelector("[data-wizard-panel]")
          ?.getBoundingClientRect()
          .toJSON(),
      }));
      if (!baseline) {
        assert.ok(geometry.scrollWidth <= width + 1, JSON.stringify(geometry));
        if (width < 768 || height < 480) {
          assert.ok(
            geometry.scrollHeight <= height + 1,
            JSON.stringify(geometry),
          );
          if (step < 3) {
            await bounds(
              page,
              page.getByRole("button", {
                name: step === 2 ? "生成方案" : "下一步",
                exact: true,
              }),
            );
            await bounds(
              page,
              page.getByRole("button", { name: "保存草稿", exact: true }),
            );
          }
        }
      }
      results.push({ width, height, step: step + 1, geometry });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ baseline, results, errors }, null, 2),
  );
  await browser.close();
}
console.log(`Start layout QA: ${results.length} screens passed`);
