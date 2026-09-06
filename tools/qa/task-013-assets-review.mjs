// Optional visual QA uses an externally supplied Playwright installation, not a new project dependency.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { ROOT, CATALOG, json } from "../assets/asset-utils.mjs";
if (!process.env.PLAYWRIGHT_MODULE || !process.env.CHROME_EXE)
  throw Error(
    "Set PLAYWRIGHT_MODULE and CHROME_EXE to existing local installations",
  );
const { chromium } = await import(
  pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const folder = resolve(ROOT, "assets/design/asset-library/previews");
  mkdirSync(folder, { recursive: true });
  await page.goto(
    pathToFileURL(resolve(folder, "asset-library-preview.html")).href,
  );
  const geometry = await page.locator("article svg").evaluateAll((svgs) =>
    svgs.map((svg) => {
      const box = svg.getBoundingClientRect(),
        content = svg.getBBox();
      return {
        width: box.width,
        height: box.height,
        contentWidth: content.width,
        contentHeight: content.height,
      };
    }),
  );
  if (
    geometry.length !== 138 ||
    geometry.some((g) => g.width <= 0 || g.contentWidth <= 0)
  )
    throw Error("Missing or empty preview drawing");
  await page.screenshot({
    path: resolve(folder, "review-desktop.png"),
    fullPage: true,
  });
  await page
    .locator("#map-markers")
    .screenshot({ path: resolve(folder, "review-markers.png") });
  await page
    .locator("#destination_placeholder")
    .screenshot({ path: resolve(folder, "review-destinations.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Mobile contact sheet overflow");
  await page.screenshot({
    path: resolve(folder, "review-mobile.png"),
    fullPage: true,
  });
  const decoded = [];
  // Independently decode each delivered file; inline preview alone cannot prove SVG file validity.
  for (const asset of json(CATALOG + "asset-manifest.v1.json").assets.filter(
    (a) => a.runtime.kind === "local",
  )) {
    const href = pathToFileURL(
      resolve(ROOT, "public" + asset.runtime.path),
    ).href;
    const result = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, href);
    if (!result.width || !result.height)
      throw Error("SVG decode failed: " + asset.id);
    decoded.push({ id: asset.id, ...result });
  }
  if (errors.length) throw Error(errors.join("\n"));
  const report = {
    task: "TASK-013-A",
    viewports: [
      [1440, 1000],
      [390, 844],
    ],
    inlineSamples: geometry.length,
    decodedSVGs: decoded.length,
    horizontalOverflow: overflow,
    pageErrors: errors,
    decoded,
  };
  writeFileSync(
    resolve(folder, "review-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log({
    decoded: decoded.length,
    inline: geometry.length,
    errors,
    overflow,
  });
} finally {
  await browser.close();
}
