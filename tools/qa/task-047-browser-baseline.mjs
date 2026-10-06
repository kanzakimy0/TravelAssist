import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { preferenceLocalRuntime } from "../../tests/task-045-local-helpers.mjs";
import { startApp } from "../../tests/task-018-local-helpers.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const local = preferenceLocalRuntime();
let app, browser, user;
const evidence = [];
try {
  const email = "task047-baseline-" + randomUUID() + "@example.test",
    password = "Local-" + randomUUID() + "!";
  const result = await local.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(result.error, null);
  user = result.data.user.id;
  app = await startApp(local);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const login = await context.request.post(app.origin + "/auth/signin", {
    headers: { Origin: app.origin },
    data: { email, password },
  });
  assert.equal(login.status(), 200);
  const page = await context.newPage();
  await mkdir(".artifacts/task047/baseline-browser", { recursive: true });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/",
      "/start",
      "/planner",
      "/personal-center",
      "/personal-center/companions",
    ]) {
      await page.goto(app.origin + route, { waitUntil: "networkidle" });
      const geometry = await page.evaluate(() =>
        Object.fromEntries(
          [
            "header",
            "main",
            "h1",
            "[data-companion-page]",
            "[data-primary-page-title]",
          ].map((selector) => {
            const e = document.querySelector(selector);
            if (!e) return [selector, null];
            const r = e.getBoundingClientRect();
            return [
              selector,
              { x: r.x, y: r.y, width: r.width, height: r.height },
            ];
          }),
        ),
      );
      evidence.push({ width, height, route, geometry });
      if (route.endsWith("/companions"))
        await page.screenshot({
          path:
            ".artifacts/task047/baseline-browser/" +
            width +
            "x" +
            height +
            ".png",
          fullPage: true,
        });
    }
  }
  await writeFile(
    ".artifacts/task047/baseline-browser/geometry.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    "Baseline real Auth/browser geometry: " +
      evidence.length +
      " pages; five supported Companion screenshots",
  );
} finally {
  await browser?.close();
  await app?.stop();
  if (user) await local.admin.auth.admin.deleteUser(user);
  await local.db.end();
}
