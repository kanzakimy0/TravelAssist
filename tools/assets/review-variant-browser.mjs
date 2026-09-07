// Optional acceptance utility: use the existing external Playwright runtime, never install a browser dependency.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { ROOT, document } from "./variant-common.mjs";
if (!process.env.PLAYWRIGHT_MODULE || !process.env.CHROME_EXE)
  throw Error("Set existing PLAYWRIGHT_MODULE and CHROME_EXE");
const { chromium } = await import(
  pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = { viewports: [], pageErrors: [], externalRequests: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => report.pageErrors.push(e.message));
  await page.route(/^https?:/, (route) => {
    report.externalRequests.push(route.request().url());
    return route.abort();
  });
  const output = resolve(ROOT, "tmp/assets-nightly/browser");
  mkdirSync(output, { recursive: true });
  await page.goto(
    pathToFileURL(
      resolve(ROOT, "assets/design/asset-library/previews/variant-review.html"),
    ).href,
  );
  await page.locator("img").evaluateAll(async (images) => {
    for (const img of images) img.loading = "eager";
    await Promise.all(images.map((img) => img.decode()));
  });
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const measured = await page.evaluate(() => ({
      decoded: document.querySelectorAll("img").length,
      failed: [...document.images].filter((i) => !i.complete || !i.naturalWidth)
        .length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(measured.failed, 0);
    assert.equal(measured.horizontalOverflow, false);
    assert.ok(measured.decoded > 400);
    await page.screenshot({ path: resolve(output, `review-${width}.png`) });
    report.viewports.push({ width, height, ...measured });
  }
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.externalRequests, []);
  await document(
    ROOT,
    "docs/assets/generated/variant-browser-review.json",
    report,
  );
  console.log(report);
} finally {
  await browser.close();
}
