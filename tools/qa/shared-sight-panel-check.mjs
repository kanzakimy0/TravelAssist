import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/shared-sight-panel";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const report = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    const card = page.locator("[data-timeline-stop]").first();
    await card.waitFor();
    const id = await card.getAttribute("data-timeline-stop");
    const original = await page.locator("[data-map-workspace]").boundingBox();
    await page.evaluate(
      () => (window.qaMap = document.querySelector("[data-map-surface] > div")),
    );
    await card.click();
    const panel = page.locator("[data-detail-map-inspector]");
    await panel.waitFor();
    const split = await page.locator("[data-map-surface]").boundingBox();
    if (width >= 768)
      assert.ok(Math.abs(split.width - (original.width * 2) / 3) < 1);
    assert.equal(await page.locator("[data-map-quick-card]").count(), 0);
    assert.equal(
      await panel
        .getByRole("button", { name: "调整行程", exact: true })
        .count(),
      0,
    );
    await panel.getByRole("button", { name: "锁定安排", exact: true }).click();
    await panel
      .getByRole("button", { name: "解除编辑锁定", exact: true })
      .click();
    await page.screenshot({ path: `${out}/${width}-planner.png` });
    await page
      .getByRole("button", { name: "关闭景点详情", exact: true })
      .click();
    assert.ok(
      Math.abs(
        (await page.locator("[data-map-surface]").boundingBox()).width -
          original.width,
      ) < 1,
    );
    const marker = page.locator(`svg [data-map-stop="${id}"]`);
    await marker.focus();
    await page.keyboard.press("Enter");
    await panel.waitFor();
    assert.ok(
      await page.evaluate(
        () =>
          window.qaMap === document.querySelector("[data-map-surface] > div") &&
          window.qaMap.isConnected,
      ),
    );
    await panel
      .getByRole("button", { name: "查看完整资料", exact: true })
      .click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    report.push({
      width,
      height,
      mapBefore: original.width,
      mapAfter: split.width,
      errors,
    });
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
