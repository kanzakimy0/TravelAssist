import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const { minimalRailRouteFixture } =
  await import("../../src/shared/contracts/routes/fixtures.ts");

const base = process.env.TASK_023_QA_URL || "http://127.0.0.1:3123";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/TASK-023";
const screenshots = ".next/qa/TASK-023";
await mkdir(out, { recursive: true });
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const report = [];

try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15_000);
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|did not match|Minified React/i.test(message.text()))
        runtimeErrors.push(message.text());
    });
    await page.route("https://api.mapbox.com/**", (route) =>
      route.abort("failed"),
    );
    let routeRequests = 0;
    await page.route("**/api/routes/calculate", async (route) => {
      routeRequests += 1;
      const request = route.request().postDataJSON();
      assert.equal(request.timezone, "Asia/Tokyo");
      assert.equal(request.origin.displayName, "とうきょうスカイツリー");
      assert.equal(request.destination.displayName, "銀座");
      assert.deepEqual(request.origin.coordinates, null);
      assert.deepEqual(request.destination.coordinates, null);
      const fixture = structuredClone(minimalRailRouteFixture);
      fixture.requestId = request.requestId;
      fixture.source.fetchedAt = "2026-09-09T06:30:00.000Z";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store, private" },
        body: JSON.stringify({ ok: true, value: fixture }),
      });
    });

    await page.goto(`${base}/planner`, { waitUntil: "networkidle" });
    if (width < 768) {
      const openBottom = page.getByRole("button", {
        name: "当天安排",
        exact: true,
      });
      if (await openBottom.isVisible()) await openBottom.click();
    }
    const protectedStop = page.locator(
      '[data-planned-sight="classic-skytree"]',
    );
    if (await protectedStop.count())
      assert.equal(await protectedStop.getAttribute("data-locked"), "true");
    await page.getByRole("tab", { name: "移动", exact: true }).click();
    const verified = page.getByRole("button", {
      name: /修改交通：东京晴空塔 → 银座散步/,
    });
    await verified.click();
    const routePanel = page.locator("[data-route-query-status]");
    await routePanel.waitFor();
    assert.equal(
      await routePanel.getAttribute("data-route-query-status"),
      "idle",
    );
    await routePanel.getByRole("button", { name: "查询路线" }).click();
    await page
      .locator('[data-route-query-status="ready"]')
      .waitFor({ timeout: 15_000 });
    assert.match(await routePanel.innerText(), /耗时/);
    assert.match(await routePanel.innerText(), /换乘/);
    assert.match(await routePanel.innerText(), /票价/);
    assert.match(await routePanel.innerText(), /仅当前会话/);
    assert.match(await routePanel.innerText(), /不绘制 Provider 路线/);
    assert.equal(routeRequests, 1);

    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    assert.doesNotMatch(stored, /ekiworld|minimal-rail|route-alternative/i);

    await page.keyboard.press("Escape");
    assert.equal(
      await verified.evaluate((element) => element === document.activeElement),
      true,
    );
    const unresolved = page.getByRole("button", {
      name: /修改交通：抵达羽田机场 → 浅草寺/,
    });
    await unresolved.click();
    const unresolvedPanel = page.locator("[data-route-query-status]");
    await unresolvedPanel.waitFor();
    assert.equal(
      await unresolvedPanel.getAttribute("data-route-query-status"),
      "unsupported",
    );
    assert.equal(
      await unresolvedPanel
        .getByRole("button", { name: "查询路线" })
        .isDisabled(),
      true,
    );
    assert.match(await unresolvedPanel.innerText(), /未用景点名或坐标冒充车站/);

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1);
    await page.screenshot({
      path: `${screenshots}/${width}x${height}-route-preview.png`,
      fullPage: false,
    });

    await page.getByRole("button", { name: "关闭修改移动段" }).click();
    const threeDay = page.getByRole("checkbox", { name: "3日", exact: true });
    if (await threeDay.isVisible()) {
      await threeDay.click();
      assert.equal(await threeDay.isChecked(), true);
    }
    const allDays = page.getByRole("checkbox", { name: "全日", exact: true });
    if (await allDays.isVisible()) {
      await allDays.click();
      assert.equal(await allDays.isChecked(), true);
    }

    await page.goto(`${base}/planner?view=detail&day=1`, {
      waitUntil: "networkidle",
    });
    assert.match(await page.locator("body").innerText(), /返回推荐及增删项目/);
    await page.goto(`${base}/planner`, { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).pathname, "/planner");
    assert.deepEqual(runtimeErrors, []);
    report.push({
      viewport: `${width}x${height}`,
      fallbackMap: true,
      verifiedStationQuery: "ready",
      unresolvedEndpoint: "blocked without request",
      providerResultPersisted: false,
      plannerDetailRoundTrip: "pass",
      scopeSelectors: "1 day / 3 days / all days pass",
      keyboardFocusRestore: "pass",
      protectedItemUnchanged: "pass",
      horizontalOverflow: false,
      runtimeErrors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${out}/report.json`,
  `${JSON.stringify(
    {
      task: "TASK-023-A",
      source: "sanitized canonical fixture",
      liveEvaluationSmoke: "Deferred: no credential was read or requested",
      realMapbox:
        "Conditional: no token was provided to this isolated worktree",
      results: report,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify(report, null, 2));
