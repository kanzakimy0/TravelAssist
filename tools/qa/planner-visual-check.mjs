// Optional external browser tooling; no production dependency or stored token.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const loadExternalTool = createRequire(import.meta.url);
const { chromium } = loadExternalTool(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const directory = path.dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2] || "after";
if (!/^(before|after|fallback)$/.test(phase))
  throw new Error("Unexpected QA phase");
const output =
  process.env.PLANNER_QA_OUTPUT ||
  path.resolve(directory, "../../docs/qa/TASK-008.2");
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("QA is local-only");
const sizes = [
  [1600, 900],
  [1440, 900],
  [1280, 800],
  [1180, 800],
  [390, 844],
];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXE,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    if (phase === "fallback")
      await context.route("https://*.mapbox.com/**", (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [],
      warnings = [],
      network = [];
    const clean = (text) =>
      text
        .replace(/https?:\/\/\S+/g, "[URL]")
        .replace(/pk\.[\w.-]+/g, "[TOKEN]");
    page.on("pageerror", (e) => errors.push(clean(e.message)));
    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type()))
        warnings.push({ type: msg.type(), text: clean(msg.text()) });
    });
    page.on("requestfailed", (r) =>
      network.push({
        host: new URL(r.url()).hostname,
        error: r.failure()?.errorText,
      }),
    );
    await page.goto(`${base}/planner`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-map-engine="mapbox"]') ||
        /未配置|暂不可用/.test(
          document.querySelector('[class*="mapInfo"]')?.textContent || "",
        ),
      null,
      { timeout: 25000 },
    );
    const measurements = [];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(700);
      const measured = await page.evaluate(() => {
        const box = (selector) => {
          const r = document.querySelector(selector)?.getBoundingClientRect();
          return r
            ? { x: r.x, y: r.y, width: r.width, height: r.height }
            : null;
        };
        return {
          header: box("header"),
          right: box("[data-right-panel]"),
          upper: box("[data-right-upper]"),
          lower: box("[data-right-lower]"),
          bottom: box("[data-bottom-panel]"),
          map: box("[data-map-engine]"),
          engine: document.querySelector("[data-map-engine]").dataset.mapEngine,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(measured.overflow, false);
      assert.equal(
        measured.engine,
        phase === "fallback" ? "fallback" : "mapbox",
      );
      measurements.push({ viewport: `${width}x${height}`, ...measured });
      await page.screenshot({
        path: path.join(output, `${phase}-${width}x${height}.png`),
      });
      if (width === 390 || width === 1180) {
        await page
          .getByRole("button", { name: "旅行设置与方案", exact: true })
          .click();
        await page.getByRole("dialog").waitFor();
        await page.screenshot({
          path: path.join(output, `${phase}-${width}x${height}-drawer.png`),
        });
        await page.keyboard.press("Escape");
      }
      if (width === 390) {
        await page
          .getByRole("button", { name: "查看行程安排", exact: true })
          .click();
        await page.getByRole("dialog").waitFor();
        await page.screenshot({
          path: path.join(output, `${phase}-${width}x${height}-sheet.png`),
        });
        await page.keyboard.press("Escape");
      }
    }
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(500);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const lower = await page.locator("[data-right-lower]").boundingBox();
    await button("更多行程设置").click();
    assert.deepEqual(
      await page.locator("[data-right-lower]").boundingBox(),
      lower,
    );
    await page.screenshot({
      path: path.join(output, `${phase}-more-settings.png`),
    });
    await page.keyboard.press("Escape");
    assert.equal(
      await button("更多行程设置").getAttribute("aria-expanded"),
      "false",
    );
    await button("更多行程设置").click();
    await page
      .locator("header")
      .first()
      .click({ position: { x: 600, y: 30 } });
    assert.equal(
      await button("更多行程设置").getAttribute("aria-expanded"),
      "false",
    );
    await button("更多行程设置").click();
    await button("更多行程设置").click();
    assert.equal(
      await button("更多行程设置").getAttribute("aria-expanded"),
      "false",
    );
    await button("3日").click();
    await button("第1–3天").click();
    assert.equal(
      await page.locator("[data-map-range]").getAttribute("data-map-range"),
      "threeDays",
    );
    await page.screenshot({
      path: path.join(output, `${phase}-three-days.png`),
    });
    await button("全日").click();
    assert.equal(
      await page.locator("[data-map-range]").getAttribute("data-map-range"),
      "all",
    );
    await page.getByRole("button", { name: /方案 02/ }).click();
    assert.equal(
      await page
        .getByRole("button", { name: /方案 02/ })
        .getAttribute("aria-pressed"),
      "true",
    );
    await button("1日").click();
    await button("第2天").click();
    await button("第2天 ▾").click();
    await button("第1天").click();
    await page.locator("[data-timeline-stop]").first().click();
    assert.equal(
      await page
        .locator("[data-timeline-stop]")
        .first()
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("summary").filter({ hasText: "地图地点列表" }).click();
    assert.match(
      await page.getByRole("group", { name: "地图等价操作列表" }).innerText(),
      /已选中/,
    );
    await page
      .getByRole("group", { name: "地图等价操作列表" })
      .getByRole("button", { name: /浅草寺.*行程内/ })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.match(
      await page
        .locator('[data-timeline-stop][aria-pressed="true"]')
        .innerText(),
      /浅草寺/,
    );
    await page.locator("summary").filter({ hasText: "地图地点列表" }).click();
    await button("完成预约").click();
    await page.getByRole("dialog").waitFor();
    const pending = page
      .locator("[data-booking-item]")
      .filter({
        has: page.getByRole("button", { name: /前往预约（演示）/ }),
      })
      .first();
    const bookedId = await pending.getAttribute("data-booking-item");
    await pending
      .getByRole("button", { name: /前往预约（演示）/ })
      .first()
      .click();
    await pending
      .getByRole("button", { name: "我已完成预约（手动标记）", exact: true })
      .click();
    const booked = page.locator(`[data-booking-item="${bookedId}"]`);
    assert.match(await booked.innerText(), /固定时间/);
    const reservation = await booked.innerText();
    await page.keyboard.press("Escape");
    for (const label of [
      "移动",
      "预约·票务",
      "天气·备选",
      "住宿·餐饮",
      "详细",
      "行程",
    ])
      await page.getByRole("tab", { name: label, exact: true }).click();
    await button("重新生成路线").click();
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent.includes("重新生成路线"),
        )?.disabled,
    );
    await button("收起地图工具").click();
    await button("展开地图工具").click();
    await button("完成预约").click();
    assert.equal(await booked.innerText(), reservation);
    await page.keyboard.press("Escape");
    const result = {
      phase,
      environment: process.env.PLANNER_QA_ENVIRONMENT || "development",
      measurements,
      errors,
      warnings,
      network,
      regression: "passed",
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(output, `${phase}-checks.json`),
      JSON.stringify(result, null, 2) + "\n",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      warnings.filter(
        (w) =>
          w.type === "error" &&
          !(phase === "fallback" && /net::ERR_FAILED/.test(w.text)),
      ),
      [],
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
