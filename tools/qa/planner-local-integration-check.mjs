import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3114";
assert.equal(new URL(base).hostname, "127.0.0.1");
// Browser evidence is local QA output, not a production asset source.
const out = ".cache/qa/planner-local-integration";
const report = "docs/qa/planner-local-integration";
await mkdir(out, { recursive: true });
await mkdir(report, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const browserVersion = browser.version();
assert.ok(
  Number(browserVersion.split(".")[0]) >= 114,
  "QA requires a browser with native Popover support",
);
const results = [];
try {
  for (const [width, height, mode] of [
    [1440, 900, "live"],
    [1440, 900, "fallback"],
    [390, 844, "fallback"],
    [320, 740, "fallback"],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [],
      network = [];
    page.on("pageerror", (e) => {
      const message = e.message.replace(/pk\.[\w.-]+/g, "[redacted]");
      errors.push(message);
      console.log("PAGE_ERROR", message);
    });
    page.on("console", (m) => {
      if (m.type() === "error")
        console.log(
          "BROWSER_ERROR",
          m.text().replace(/pk\.[\w.-]+/g, "[redacted]"),
        );
    });
    page.on("response", (r) => {
      const u = new URL(r.url());
      if (u.hostname === "api.mapbox.com")
        network.push({ status: r.status(), kind: u.pathname.split("/")[1] });
    });
    if (mode === "fallback")
      await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto(base + "/planner");
    const map = page.locator("[data-map-engine]");
    await map.waitFor();
    if (mode === "live")
      await page
        .locator('[data-map-engine="mapbox"]')
        .waitFor({ timeout: 45000 });
    const bottom = async () => {
      if (
        width < 768 &&
        !(await page.locator("[data-bottom-panel]").isVisible())
      )
        await page
          .getByRole("button", { name: "当天安排", exact: true })
          .click();
    };
    await bottom();
    const timeline = page.locator('[data-planner-route-board="itinerary"]');
    await timeline.waitFor();
    assert.ok(await timeline.getByLabel("当天等分时间刻度").count());
    const upper = timeline.locator('[data-sight-row="planned"]');
    const lower = timeline.locator('[data-sight-row="reserve"]');
    assert.match(await upper.innerText(), /离开酒店/);
    assert.match(await upper.innerText(), /回到酒店/);
    const asakusa = upper.locator('[data-planned-sight="classic-asakusa"]');
    await asakusa.getByRole("button", { name: /编辑.*的时间/ }).click();
    await page.screenshot({
      path: out + "/" + width + "-" + mode + "-clock.png",
    });
    const pop = page.getByRole("dialog");
    await pop.getByLabel("持续时间（分钟）", { exact: true }).fill("60");
    await pop.getByRole("button", { name: "应用时间", exact: true }).click();
    assert.match(await asakusa.innerText(), /60分/);
    await asakusa.getByRole("button", { name: /^锁定/ }).click();
    assert.equal(
      await asakusa.getByRole("button", { name: /编辑.*的时间/ }).isDisabled(),
      true,
    );
    await asakusa.getByRole("button", { name: /^解锁/ }).click();
    // Deterministic keyboard drag, same reducer and insertion rule as pointer drop.
    const handle = asakusa.locator("[data-drag-handle]");
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.equal(
      await upper.locator('[data-planned-sight="classic-asakusa"]').count(),
      0,
    );
    const reserveCard = lower.locator('[data-reserve-sight="classic-asakusa"]');
    await reserveCard.getByRole("button", { name: /编辑.*的时间/ }).click();
    const insert = page
      .getByRole("dialog")
      .getByLabel("插入位置", { exact: true });
    const option = await insert.locator("option").allTextContents();
    const after = option.find((x) => x.includes("午餐"));
    assert.ok(after);
    await insert.selectOption({ label: after });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "放入时间轴", exact: true })
      .click();
    const clock = after.match(/(\d{2}):(\d{2}) \+15分/);
    assert.ok(clock);
    const minutes = Number(clock[1]) * 60 + Number(clock[2]) + 15;
    const expected =
      String(Math.floor(minutes / 60)).padStart(2, "0") +
      ":" +
      String(minutes % 60).padStart(2, "0");
    assert.match(await asakusa.innerText(), new RegExp(expected));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width >= 768) {
      const b = await page.locator("[data-bottom-panel]").boundingBox();
      assert.ok(Math.abs(b.height / height - 0.25) < 0.03);
    }
    await page.screenshot({
      path: out + "/" + width + "-" + mode + "-planner.png",
    });
    if (width >= 768) {
      await asakusa.locator("[data-drag-handle]").scrollIntoViewIfNeeded();
      const from = await asakusa.locator("[data-drag-handle]").boundingBox();
      const to = await lower.boundingBox();
      const rail = await timeline.boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        Math.max(to.x, rail.x + 80) + 40,
        to.y + to.height / 2,
        { steps: 15 },
      );
      await page.mouse.up();
      await page.screenshot({
        path: out + "/" + width + "-" + mode + "-pointer.png",
      });
      await lower.locator('[data-reserve-sight="classic-asakusa"]').waitFor();
    }
    const closeBottom = page.getByRole("button", {
      name: "关闭当天安排",
      exact: true,
    });
    if (await closeBottom.isVisible()) await closeBottom.click();
    await page.getByRole("button", { name: "全日", exact: true }).click();
    await bottom();
    assert.equal(await page.locator("[data-time-day]").count(), 3);
    await page.getByRole("tab", { name: "预约", exact: true }).click();
    assert.match(
      await page.locator("[data-bottom-panel]").innerText(),
      /预约|购票/,
    );
    await page.goto(base + "/planner?view=detail&day=1");
    if (mode === "live")
      await page
        .locator('[data-map-engine="mapbox"]')
        .waitFor({ timeout: 45000 });
    if (width < 768) {
      const button = page.getByRole("button", {
        name: "当日执行轨道",
        exact: true,
      });
      if (await button.isVisible()) await button.click();
    }
    await page.locator("[data-detail-board]").waitFor();
    const reminders = page.locator("[data-primary-status]");
    assert.ok(await reminders.count());
    const ignore = reminders
      .getByRole("button", { name: "无视", exact: true })
      .first();
    await ignore.click();
    await page.screenshot({
      path: out + "/" + width + "-" + mode + "-detail.png",
    });
    assert.equal(errors.length, 0, JSON.stringify(errors));
    results.push({
      width,
      height,
      mode,
      browserVersion,
      map: mode === "live" ? "mapbox" : "fallback",
      timeline: true,
      clock: true,
      lock: true,
      keyboardDrag: true,
      pointerDrag: width >= 768,
      allDayRange: true,
      insertAfterMinutes15: expected,
      detailIgnore: true,
      network,
      errors,
    });
    await context.close();
  }
  await writeFile(
    report + "/results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
