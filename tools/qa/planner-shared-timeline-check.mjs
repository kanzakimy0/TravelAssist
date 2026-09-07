import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-shared-timeline";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    const sights = page.locator("[data-timeline-stop]");
    await sights.first().waitFor();
    assert.ok((await sights.count()) > 0);
    assert.ok(
      (
        await sights.evaluateAll((nodes) => nodes.map((n) => n.dataset.kind))
      ).every((kind) => kind === "attraction"),
    );
    await sights.first().click();
    assert.equal(await sights.first().getAttribute("aria-pressed"), "true");
    assert.equal(
      await page
        .locator('[data-sights-only="true"] [data-status="normal"]')
        .count(),
      0,
    );
    await page.screenshot({ path: `${out}/${width}-planner.png` });
    if (width < 768) await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "3日", exact: true }).click();
    if (width < 768)
      await page.getByRole("button", { name: "当天安排", exact: true }).click();
    assert.equal(await page.locator("[data-time-day]").count(), 3);
    assert.ok(
      (
        await sights.evaluateAll((nodes) => nodes.map((n) => n.dataset.kind))
      ).every((kind) => kind === "attraction"),
    );
    await page.screenshot({ path: `${out}/${width}-three-days.png` });
    await page.goto(base + "/planner?view=detail&day=2");
    if (width < 768)
      await page
        .getByRole("button", { name: "当日执行轨道", exact: true })
        .click();
    await page.locator("[data-detail-item]").first().waitFor();
    await page.waitForTimeout(450);
    assert.ok(
      (await page
        .locator('[data-detail-item]:not([data-kind="attraction"])')
        .count()) > 0,
    );
    const nodes = page.locator('[data-sights-only="false"] [data-status]');
    const statuses = await nodes.evaluateAll((nodes) =>
      nodes.map((n) => ({
        status: n.dataset.status,
        symbol: n.querySelector('[aria-hidden="true"]')?.textContent,
        title: n.title,
      })),
    );
    for (const node of statuses) {
      assert.equal(
        node.symbol,
        { normal: "✓", warning: "!", error: "×" }[node.status],
      );
      assert.ok(node.title.includes("："));
    }
    assert.ok(statuses.some((n) => n.status === "normal"));
    assert.ok(
      statuses.some((n) => n.status === "warning" || n.status === "error"),
    );
    await page.screenshot({ path: `${out}/${width}-detail.png` });
    const lake = page
      .locator("[data-detail-item]")
      .filter({ hasText: "河口湖湖畔" });
    const lakeId = await lake.getAttribute("data-detail-item");
    await lake.click();
    const editor = page.getByRole("dialog", {
      name: "河口湖湖畔",
      exact: true,
    });
    await editor.getByLabel("开始", { exact: true }).fill("08:30");
    await editor
      .getByRole("button", { name: "调整时间 / 更改内容", exact: true })
      .click();
    await page
      .getByRole("button", { name: "关闭行程项目详情", exact: true })
      .click();
    const changedNode = page.locator(`[id="detail-status-${lakeId}"]`);
    // Conflicting edits are rejected by the existing guard, not silently applied.
    assert.equal(await changedNode.getAttribute("data-status"), "normal");
    assert.ok((await lake.innerText()).includes("10:00"));
    await lake.click();
    await editor.getByLabel("开始", { exact: true }).fill("09:35");
    await editor
      .getByRole("button", { name: "调整时间 / 更改内容", exact: true })
      .click();
    await page
      .getByRole("button", { name: "关闭行程项目详情", exact: true })
      .click();
    assert.equal(await changedNode.getAttribute("data-status"), "warning");
    assert.equal(
      await changedNode.locator('[aria-hidden="true"]').innerText(),
      "!",
    );
    await lake.click();
    await editor
      .getByRole("button", { name: "完成（本地）", exact: true })
      .click();
    assert.equal(await changedNode.getAttribute("data-status"), "normal");
    assert.equal(
      await changedNode.locator('[aria-hidden="true"]').innerText(),
      "✓",
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("travelassist.saved-workspace.v1"),
      ),
      null,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      sightsOnly: true,
      threeDays: true,
      statuses,
      errors,
    });
    await page.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
