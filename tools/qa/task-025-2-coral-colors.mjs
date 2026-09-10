import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_0252_URL || "http://localhost:3132";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = ".cache/qa/coral-after";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [];
const errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const c = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base, { waitUntil: "networkidle" });
    const heroPaint = await p
      .getByRole("link", { name: /让我们开始吧/ })
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    await p.screenshot({ path: `${out}/home-${width}.png` });
    await p.goto(base + "/login", { waitUntil: "networkidle" });
    await p.screenshot({ path: `${out}/login-${width}.png` });
    rows.push({
      name: "login",
      width,
      paint: await p
        .locator('button[type="submit"]')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundImage),
      heroPaint,
    });
    assert.equal(rows.at(-1).paint, heroPaint);
    await c.addCookies([
      {
        name: "sb-127-auth-token",
        url: base,
        value:
          "base64-" +
          Buffer.from(
            JSON.stringify({
              access_token: "task024-visual-fixture",
              refresh_token: "fixture",
              expires_at: 4102444800,
              expires_in: 3600,
              token_type: "bearer",
              user: { id: "00000000-0000-4000-8000-000000000024" },
            }),
          ).toString("base64url"),
      },
    ]);
    for (const [name, route] of [
      ["start", "/start"],
      ["planner", "/planner"],
      ["detail", "/planner?view=detail&day=1"],
      ["personal", "/personal-center"],
      ["trips", "/personal-center/trips"],
      ["preferences", "/personal-center/preferences"],
      ["mobility", "/personal-center/preferences/mobility"],
      ["attractions", "/personal-center/preferences/attractions"],
      ["dining", "/personal-center/preferences/dining"],
      ["accommodation", "/personal-center/preferences/accommodation"],
      ["budget", "/personal-center/preferences/budget"],
      ["companions", "/personal-center/companions"],
      ["account", "/personal-center/account"],
    ]) {
      await p.goto(base + route, { waitUntil: "networkidle" });
      if (name === "detail") {
        await p
          .getByRole("button", { name: "保存到浏览器并进入详情", exact: true })
          .click();
        await p
          .getByRole("button", { name: "关闭保存方案并进入详情", exact: true })
          .waitFor({ state: "hidden" });
      }
      await p.locator("main").first().waitFor();
      if (width < 768 && ["planner", "detail"].includes(name)) {
        await p
          .getByRole("button", {
            name: name === "planner" ? "旅行设置与方案" : "当日执行仪表盘",
            exact: true,
          })
          .click();
      }
      await p.mouse.move(0, 0);
      const paints = await p.evaluate(() =>
        [...document.querySelectorAll('button,a,[aria-current="step"] span,h3')]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            text: e.textContent.trim().slice(0, 28),
            background: getComputedStyle(e).backgroundImage,
          }))
          .filter((x) => x.background.startsWith("linear-gradient")),
      );
      if (["start", "planner", "detail", "personal"].includes(name))
        assert.ok(
          paints.some((x) => x.background === heroPaint),
          `${name} must share Home CTA paint`,
        );
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${name} overflow`);
      if (name === "start") {
        const dot = p.locator('[aria-current="step"] span').first();
        assert.equal(
          await dot.evaluate((el) => getComputedStyle(el).backgroundImage),
          heroPaint,
        );
      }
      if (name === "planner" || name === "detail") {
        const line = p.locator('[data-route-role="selected"]').first();
        assert.equal(await line.getAttribute("stroke"), "#e95b4b");
      }
      await p.screenshot({
        path: `${out}/${name}${width < 768 && ["planner", "detail"].includes(name) ? "-controls" : ""}-${width}.png`,
      });
      rows.push({ name, route, width, paints, overflow });
    }
    await c.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "docs/qa/TASK-025.2/coral-colors-report.json",
    JSON.stringify(
      {
        rows,
        errors,
        fixture: "Local synthetic Auth fixture; no live provider.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${rows.length} cross-page color cases PASS`);
} finally {
  await browser.close();
}
