import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const out = ".cache/qa/planner-booking-choice";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) =>
      errors.push(e.message.replace(/pk\.[\w.-]+/g, "[redacted]")),
    );
    page.setDefaultTimeout(12000);
    await page.route("https://api.mapbox.com/**", (r) => r.abort());
    await page.goto("http://127.0.0.1:3113/planner?view=detail&day=2");
    await page
      .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "保存方案并进入详情", exact: true })
      .waitFor({ state: "hidden" });
    await page.goto("http://127.0.0.1:3113/planner?view=detail&day=2");
    if (width < 1200)
      await page
        .getByRole("button", { name: "当日执行仪表盘", exact: true })
        .click();
    const trigger = page.locator("[data-bulk-booking-trigger]");
    await trigger.click();
    const review = page.locator("#bulk-booking-review");
    await review.waitFor();
    const row = review
      .locator("article")
      .filter({ has: page.locator("button[aria-pressed]") })
      .first();
    const offers = row.locator("button[aria-pressed]");
    assert.ok((await offers.count()) >= 2, await review.innerText());
    assert.equal(await row.locator('button[aria-pressed="true"]').count(), 1);
    assert.match(await row.innerText(), /自动最低示例价/);
    const manual = offers.last(),
      provider = await manual.locator("span").innerText();
    await manual.click();
    assert.equal(await manual.getAttribute("aria-pressed"), "true");
    assert.match(await row.innerText(), /已选渠道/);
    assert.ok(await trigger.isDisabled());
    await manual.click();
    assert.match(await row.innerText(), /自动最低示例价/);
    await manual.click();
    const selectedAt = Date.now();
    await page.screenshot({ path: `${out}/${width}-choice.png` });
    await page.waitForFunction(
      () => !document.querySelector("[data-bulk-booking-trigger]").disabled,
    );
    assert.ok(Date.now() - selectedAt >= 2800);
    await trigger.click();
    const progress = page.locator("[data-booking-progress]");
    await progress.waitFor();
    assert.ok((await progress.innerText()).includes(`已选渠道：${provider}`));
    assert.match(await progress.innerText(), /订单确认 0 笔/);
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      manualProvider: provider,
      highlight: true,
      automaticMinimum: true,
      countdown: true,
      realOrders: 0,
      errors,
    });
    await context.close();
  }
  await writeFile(out + "/result.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
