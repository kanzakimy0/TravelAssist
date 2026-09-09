import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const baseUrl = process.env.TASK_024_MAPBOX_URL || "http://127.0.0.1:3125";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const samples = [];
try {
  for (const viewport of [
    { id: "desktop", width: 1440, height: 900 },
    { id: "mobile", width: 390, height: 844 },
  ]) {
    for (const route of [
      { id: "planner", path: "/planner" },
      { id: "detail", path: "/planner?view=detail&day=1" },
    ]) {
      for (let run = 1; run <= 3; run += 1) {
        const context = await browser.newContext({
          viewport,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.name));
        const startedAt = performance.now();
        await page.goto(baseUrl + route.path, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await page
          .locator('[data-map-engine="mapbox"]')
          .waitFor({ timeout: 25_000 });
        await page.waitForTimeout(600);
        samples.push({
          viewport: viewport.id,
          route: route.id,
          run,
          elapsedMs: performance.now() - startedAt,
          engine: await page
            .locator("[data-map-engine]")
            .getAttribute("data-map-engine"),
          mapCanvasCount: await page.locator(".mapboxgl-canvas").count(),
          mapboxResourceCount: await page.evaluate(
            () =>
              performance
                .getEntriesByType("resource")
                .filter((entry) => /mapbox/i.test(entry.name)).length,
          ),
          errors,
        });
        await context.close();
      }
    }
  }
  assert.ok(samples.every((sample) => sample.engine === "mapbox"));
  assert.ok(samples.every((sample) => sample.mapCanvasCount === 1));
  assert.ok(samples.every((sample) => sample.errors.length === 0));
  const report = {
    task: "TASK-024-A",
    commit: process.env.TASK_024_COMMIT || "unknown",
    browser: browser.version(),
    mode: "real Mapbox base-map laboratory sample",
    runsPerScenario: 3,
    externalTransportNote:
      "Mapbox asset traffic is required for this explicit local sample; observation transport remains disabled.",
    samples,
    limitations: [
      "Local laboratory sample, not real-user p75.",
      "No provider routing credential or itinerary payload was used.",
    ],
  };
  await mkdir("docs/qa/task-024", { recursive: true });
  await writeFile(
    "docs/qa/task-024/mapbox.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        scenarios: samples.length,
        allMapbox: true,
        oneCanvasPerScenario: true,
        runtimeErrors: 0,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
