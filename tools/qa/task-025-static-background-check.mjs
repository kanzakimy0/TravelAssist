import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_025_URL || "http://localhost:3128";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = ".cache/qa/task025-screenshots";
await mkdir(out, { recursive: true });
await mkdir("docs/qa/TASK-025", { recursive: true });
const baseline = JSON.parse(
  await readFile(
    process.env.TASK_025_BASELINE || "docs/qa/TASK-025/geometry-baseline.json",
    "utf8",
  ),
);
const selectors = Object.keys(baseline.rows[0].geometry);
const geometry = (ss) =>
  Object.fromEntries(
    ss.map((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return [s, { x: r.x, y: r.y, width: r.width, height: r.height }];
    }),
  );
const browser = await chromium.launch({
  headless: true,
  channel: process.env.CHROME_CHANNEL || "msedge",
});
const report = {
  executionBase: "088f467b8ff666ddd9774f8d6b7ad351fd54f00a",
  baseUrl: base,
  scope: "Static MVP; no live Auth or video enhancement",
  rows: [],
  errors: [],
};
const screenshots = [];
async function shot(page, name) {
  const path = `${out}/${name}.jpg`;
  const b = await page.screenshot({ path, type: "jpeg", quality: 86 });
  screenshots.push({
    path,
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
}
try {
  for (const motion of ["no-preference", "reduce"])
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [390, 844],
      [320, 568],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: motion,
        deviceScaleFactor: 1,
      });
      await context.addInitScript(() => {
        window.__qa = { cls: 0, lcp: 0 };
        new PerformanceObserver((l) => {
          for (const e of l.getEntries())
            if (!e.hadRecentInput) window.__qa.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__qa.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const errors = [],
        requests = [],
        imageResponses = [],
        jobs = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("request", (r) =>
        requests.push({ url: r.url(), type: r.resourceType() }),
      );
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
        if (r.url().includes("home-hero-poster"))
          jobs.push(
            (async () => {
              const h = await r.allHeaders();
              imageResponses.push({
                url: r.url(),
                status: r.status(),
                contentType: h["content-type"],
                cacheControl: h["cache-control"],
                bytes: (await r.body()).length,
              });
            })(),
          );
      });
      let release;
      const gate = new Promise((r) => {
        release = r;
      });
      await page.route("**/_next/image?*", async (route) => {
        if (route.request().url().includes("home-hero-poster")) await gate;
        await route.continue();
      });
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.locator("#home-heading").waitFor();
      const poster = page.locator('img[src*="home-hero-poster"]');
      const early = await poster.evaluate((img) => ({
        complete: img.complete,
        background: getComputedStyle(img).backgroundImage,
        position: getComputedStyle(img).position,
      }));
      assert.equal(early.complete, false);
      assert.match(early.background, /data:image\/svg\+xml/);
      assert.equal(early.position, "absolute");
      const before = await page.evaluate(geometry, selectors);
      if (motion === "no-preference" && [1440, 320].includes(width))
        await shot(page, `${width}-loading`);
      release();
      await poster.evaluate((img) => img.decode());
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(
        () =>
          getComputedStyle(
            document.querySelector('img[src*="home-hero-poster"]'),
          ).backgroundImage === "none",
      );
      const after = await page.evaluate(geometry, selectors);
      assert.deepEqual(before, after, "no geometry shift during image load");
      assert.deepEqual(
        after,
        baseline.rows.find((r) => r.width === width).geometry,
        "accepted TASK-024 geometry",
      );
      assert.equal(await page.locator("video,source").count(), 0);
      assert.equal(await page.locator("main").count(), 1);
      assert.equal(await page.locator("[data-main-header]").count(), 1);
      assert.equal(
        await page.getByRole("heading", { name: "下一站，去哪里？" }).count(),
        1,
      );
      assert.equal(
        await page.getByText("规划行程 · 对话调整", { exact: true }).count(),
        1,
      );
      assert.equal(
        await page.getByRole("button", { name: /登录（账号功能/ }).isDisabled(),
        true,
      );
      const measured = await page.evaluate(() => {
        const i = document.querySelector('img[src*="home-hero-poster"]'),
          s = getComputedStyle(i);
        return {
          ...window.__qa,
          currentSrc: i.currentSrc,
          naturalWidth: i.naturalWidth,
          naturalHeight: i.naturalHeight,
          objectFit: s.objectFit,
          objectPosition: s.objectPosition,
          overflow: document.documentElement.scrollWidth > innerWidth,
          preload: [
            ...document.querySelectorAll('link[rel="preload"][as="image"]'),
          ].some((e) =>
            e.getAttribute("imagesrcset")?.includes("home-hero-poster"),
          ),
          decorative: !!i.closest('[aria-hidden="true"]'),
          animations: i.getAnimations().length,
          resource: performance
            .getEntriesByType("resource")
            .filter((e) => e.name.includes("home-hero-poster"))
            .map((e) => ({
              name: e.name,
              duration: e.duration,
              transferSize: e.transferSize,
              decodedBodySize: e.decodedBodySize,
            })),
        };
      });
      assert.equal(measured.cls, 0);
      assert.equal(measured.overflow, false);
      assert.equal(measured.preload, true);
      assert.equal(measured.decorative, true);
      assert.equal(measured.animations, 0);
      assert.ok(measured.naturalWidth > 0);
      await shot(
        page,
        `${width}-${motion === "reduce" ? "reduced-motion" : "static"}`,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent.trim()),
        "跳到主要内容",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "home-content",
      );
      const focusOrder = [];
      for (let n = 0; n < 12; n++) {
        await page.keyboard.press("Tab");
        const f = await page.evaluate(() => ({
          text: document.activeElement.textContent.trim(),
          label: document.activeElement.getAttribute("aria-label"),
          outline: getComputedStyle(document.activeElement).outlineStyle,
        }));
        focusOrder.push(f);
        if (f.label === "打开 AI 助手") break;
      }
      assert.ok(focusOrder.some((f) => f.text.includes("让我们开始吧")));
      assert.ok(focusOrder.some((f) => f.text.includes("个人中心")));
      assert.equal(focusOrder.at(-1).label, "打开 AI 助手");
      assert.equal(focusOrder.at(-1).outline, "solid");
      await page.keyboard.press("Enter");
      await page.getByRole("region", { name: "您好，想去哪里？" }).waitFor();
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-controls"),
        ),
        "home-ai-conversation-panel",
      );
      // Isolate the ordinary route round trip from a pre-existing Next hash-history bug.
      // TASK-024 production also keeps Start mounted after back to /#home-content.
      // Skip-link focus and AI keyboard behavior above are still tested unchanged.
      await page.goto(base, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /让我们开始吧/ }).click();
      await page.waitForURL("**/start");
      await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
      await page.goBack({ waitUntil: "networkidle" });
      await poster.evaluate((i) => i.decode());
      // Pointer remains over the CTA after Back; compare its resting geometry.
      await page.mouse.move(0, 0);
      await page.locator('a[href="/start"]').evaluate(async (e) => {
        await new Promise(requestAnimationFrame);
        await Promise.all(
          e.getAnimations().map((a) => a.finished.catch(() => {})),
        );
      });
      assert.deepEqual(await page.evaluate(geometry, selectors), after);
      await page.getByRole("link", { name: /个人中心/ }).click();
      await page.waitForURL("**/login?**");
      assert.equal(
        new URL(page.url()).searchParams.get("returnTo"),
        "/personal-center",
      );
      await page.goBack({ waitUntil: "networkidle" });
      await poster.evaluate((i) => i.decode());
      await page.reload({ waitUntil: "networkidle" });
      await poster.evaluate((img) => img.decode());
      const naturalLoad = await page.evaluate(() => ({
        ...window.__qa,
        resources: performance
          .getEntriesByType("resource")
          .filter((e) => e.name.includes("home-hero-poster"))
          .map((e) => ({
            name: e.name,
            duration: e.duration,
            transferSize: e.transferSize,
            decodedBodySize: e.decodedBodySize,
          })),
      }));
      assert.equal(naturalLoad.cls, 0);
      assert.deepEqual(await page.evaluate(geometry, selectors), after);
      await Promise.all(jobs);
      const videoRequests = requests.filter((r) =>
        /\.(webm|mp4)(\?|$)/i.test(r.url),
      );
      assert.equal(videoRequests.length, 0);
      assert.deepEqual(errors, []);
      report.rows.push({
        width,
        height,
        reducedMotion: motion,
        deviceScaleFactor: 1,
        delayedPreview: early,
        geometry: after,
        geometryMatchesBaseline: true,
        measured,
        naturalLoad,
        focusOrder,
        aiKeyboard: "PASS",
        startAndBack: "PASS",
        personalGuestGuardAndBack: "PASS",
        videoRequests,
        imageResponses,
        requests,
        errors,
      });
      console.log(`${width}x${height} ${motion}: PASS`);
      await context.close();
    }
} catch (e) {
  report.errors.push(String(e.stack || e));
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    "docs/qa/TASK-025/report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(
    "docs/qa/TASK-025/screenshots.json",
    JSON.stringify(screenshots, null, 2) + "\n",
  );
  await writeFile(
    "docs/qa/TASK-025/geometry-baseline.json",
    JSON.stringify(baseline, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({ passed: report.rows.length, errors: report.errors }),
  );
}
