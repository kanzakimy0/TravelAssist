// Anonymous production navigation QA. Hold only read-only RSC responses;
// never sign in, read user cookies, send email or mutate the existing Local DB.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const base = process.env.WBS_BASE_URL;
assert.equal(base, "http://127.0.0.1:3000");
const evidence = process.env.WBS_EVIDENCE_DIR;
assert.ok(evidence);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.WBS_BROWSER === "edge"
    ? { channel: "msedge", headless: true }
    : { headless: true },
);
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    // New context per viewport also avoids measuring cached route transitions.
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let runtimeErrors = 0;
    let authWrites = 0;
    page.on("pageerror", () => runtimeErrors++);
    await page.route("**/auth/**", (route) => {
      if (route.request().method() === "POST") {
        authWrites++;
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(base + "/login", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "邮箱登录", exact: true }).click();
    for (const [target, name, heading, oldHeading] of [
      ["/forgot-password", "忘记密码？", "找回密码", "欢迎回来"],
      ["/login", "← 返回登录", "欢迎回来", "找回密码"],
    ]) {
      let release;
      let arrive;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const arrived = new Promise((resolve) => {
        arrive = resolve;
      });
      const pattern = base + target + "?*";
      await page.route(pattern, async (route) => {
        if (route.request().headers().rsc !== "1") return route.continue();
        const response = await route.fetch();
        arrive();
        await gate;
        await route.fulfill({ response });
      });
      const link = page.getByRole("link", { name, exact: true });
      await link.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const photo = document.querySelector(
          'aside[aria-label="日本旅行摄影"]',
        );
        const initial = photo.getBoundingClientRect();
        const state = {
          frames: 0,
          blankFrames: 0,
          placeholderFrames: 0,
          photoSizeChanges: 0,
          running: true,
        };
        window.__authNavigationQA = state;
        function sample() {
          if (!state.running) return;
          state.frames++;
          const card = document.querySelector("#auth-content");
          if (!card?.querySelector("h1") || !card.querySelector("form"))
            state.blankFrames++;
          if (card?.textContent.includes("正在准备你的旅程入口"))
            state.placeholderFrames++;
          const rect = photo.getBoundingClientRect();
          if (
            Math.abs(rect.width - initial.width) > 1 ||
            Math.abs(rect.height - initial.height) > 1
          )
            state.photoSizeChanges++;
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      const clicked = link.click();
      try {
        await Promise.race([
          arrived,
          new Promise((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error("RSC navigation was not requested")),
              10000,
            );
            timer.unref();
          }),
        ]);
        await page
          .getByRole("status")
          .filter({ hasText: "页面切换中" })
          .waitFor();
        await page.waitForTimeout(500);
        assert.equal(
          await page
            .getByRole("heading", { name: oldHeading, exact: true })
            .isVisible(),
          true,
          "Old form stays visible during pending",
        );
        assert.equal(
          await page
            .locator("[data-pending]")
            .evaluate((el) => Number(getComputedStyle(el).opacity)),
          1,
          "Inline pending hint visible on slow navigation",
        );
        assert.equal(
          await page
            .locator('input:not([type="checkbox"])')
            .evaluateAll((inputs) =>
              inputs.every((input) => input.value === ""),
            ),
          true,
        );
        await page.screenshot({
          path: path.join(
            evidence,
            `${viewport.width}x${viewport.height}${target.replaceAll("/", "-")}-pending.png`,
          ),
          fullPage: true,
        });
      } finally {
        release();
      }
      await clicked;
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.waitForTimeout(100);
      const samples = await page.evaluate(() => {
        window.__authNavigationQA.running = false;
        return window.__authNavigationQA;
      });
      assert.ok(samples.frames >= 10, "Observed pending frames");
      for (const key of [
        "blankFrames",
        "placeholderFrames",
        "photoSizeChanges",
      ])
        assert.equal(samples[key], 0, key);
      assert.equal(
        await page
          .getByRole("status")
          .filter({ hasText: "页面切换中" })
          .count(),
        0,
      );
      results.push({ viewport, target, ...samples });
      await page.unroute(pattern);
    }
    assert.equal(runtimeErrors, 0);
    assert.equal(authWrites, 0);
    console.log(
      `PASS ${viewport.width}x${viewport.height}: both delayed transitions retained the form without intermediate screen`,
    );
    await context.close();
  }
  await writeFile(
    path.join(evidence, "summary.json"),
    JSON.stringify(
      {
        status: "PASS",
        version: browser.version(),
        accountDataTouched: false,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
