import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-compact-secondary";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1600, 900],
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    for (const [tab, label] of [
      ["booking", "预约"],
      ["weather", "备选"],
      ["details", "旅行体检"],
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await page
        .getByRole("button", { name: `收起${label}详细信息`, exact: true })
        .click();
      const panel = page.locator(`[data-secondary-panel="${tab}"]`);
      await panel.waitFor();
      const cards = panel.locator(
        "section > article, section > button[data-item]",
      );
      const boxes = await cards.evaluateAll((es) =>
        es.map((e) => e.getBoundingClientRect().toJSON()),
      );
      assert.ok(boxes.length > 0);
      assert.ok(
        boxes.every((b) => b.width <= Math.max(312, width < 768 ? width : 0)),
        JSON.stringify(boxes),
      );
      if (tab === "details")
        assert.equal(await panel.locator("dl > div").count(), boxes.length * 3);
      await page.screenshot({ path: `${out}/${width}-${tab}.png` });
    }
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      compactCards: true,
      healthMetrics: true,
      errors,
    });
    await page.close();
  }
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(results);
} finally {
  await browser.close();
}
