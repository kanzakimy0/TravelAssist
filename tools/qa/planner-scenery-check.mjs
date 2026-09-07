import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:3113";
const phase = process.env.SCENERY_PHASE || "before";
const out = `docs/qa/planner-scenery/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const rows = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/planner");
    await page.locator('[data-workspace-mode="planner"]').waitFor();
    await page.waitForTimeout(2000);
    const dimensions = await page.locator("#planner-workspace").boundingBox();
    await page.screenshot({ path: `${out}/${width}-planner.png` });
    if (width < 1200)
      await page
        .getByRole("button", { name: "旅行设置与方案", exact: true })
        .click();
    const panel = page.locator("[data-right-panel]");
    const panelBox = await panel.boundingBox();
    const cardBoxes = await panel
      .locator("button[aria-pressed]")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const b = node.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        }),
      );
    await page.screenshot({ path: `${out}/${width}-settings.png` });
    const photo = await page
      .locator("[data-planner]")
      .evaluate((node) => getComputedStyle(node).backgroundImage);
    if (phase === "after")
      assert.match(photo, /sakura-coast-fuji-train-sunset/);
    await page
      .getByRole("button", { name: "进入行程详情", exact: true })
      .click();
    await page.waitForURL(/view=detail/);
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    await page.screenshot({ path: `${out}/${width}-detail.png` });
    assert.deepEqual(errors, []);
    rows.push({ width, height, dimensions, panelBox, cardBoxes, errors });
    await page.close();
  }
  if (phase === "after") {
    const before = JSON.parse(
      await readFile("docs/qa/planner-scenery/before/results.json", "utf8"),
    );
    for (let i = 0; i < rows.length; i++) {
      for (const key of ["dimensions", "panelBox"])
        for (const axis of ["x", "y", "width", "height"])
          assert.ok(
            Math.abs(before[i][key][axis] - rows[i][key][axis]) < 1,
            `${rows[i].width} ${key} ${axis}`,
          );
      assert.deepEqual(rows[i].cardBoxes, before[i].cardBoxes);
    }
  }
  await writeFile(`${out}/results.json`, JSON.stringify(rows, null, 2));
  console.log(`${phase}: ${rows.length} viewport checks passed`);
} finally {
  await browser.close();
}
