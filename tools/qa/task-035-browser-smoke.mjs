import assert from "node:assert/strict";
import { createRequire } from "node:module";

const baseUrl = process.env.TASK_035_QA_URL ?? "http://127.0.0.1:3135";
const parsedBaseUrl = new URL(baseUrl);
assert.ok(
  ["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname),
  "TASK-035 browser smoke is local-only",
);

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
assert.ok(
  playwrightModule,
  "PLAYWRIGHT_MODULE must point to an existing external Playwright runtime",
);
const { chromium } = createRequire(import.meta.url)(playwrightModule);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.TASK_035_BROWSER_CHANNEL ?? "msedge",
});
const results = [];

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|did not match|Minified React/i.test(message.text())) {
        runtimeErrors.push(message.text());
      }
    });

    for (const route of [
      "/",
      "/start",
      "/planner",
      "/planner?view=detail&day=1",
    ]) {
      const response = await page.goto(baseUrl + route, {
        waitUntil: "networkidle",
      });
      assert.ok(response, `missing document response for ${route}`);
      assert.ok(
        response.status() < 400,
        `${route} returned ${response.status()}`,
      );
      await page.locator("body").waitFor({ state: "visible" });
      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(
        geometry.scrollWidth <= geometry.clientWidth + 1,
        `${route} has horizontal overflow`,
      );
      results.push({
        route,
        viewport: `${viewport.width}x${viewport.height}`,
        status: response.status(),
        horizontalOverflow: false,
      });
    }

    assert.deepEqual(runtimeErrors, []);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      engine: "Chromium channel supplied by the execution environment",
      liveMapbox: "not claimed",
      liveAuth: "not claimed",
      results,
    },
    null,
    2,
  ),
);
