import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_0252_URL || "http://localhost:3132";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/TASK-025.2",
  screens = ".cache/qa/task0252-screenshots";
await mkdir(out, { recursive: true });
await mkdir(screens, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [],
  errors = [],
  requests = [],
  evidence = [];
const measure = () => {
  const boxes = Object.fromEntries(
    [
      ["brand", '[data-main-header] a[href="/"]'],
      ["language", "[data-main-header] summary"],
      ["eyebrow", "main section > p:first-child"],
      ["title", "#home-heading"],
      ["subtitle", "main section > p:nth-of-type(2)"],
      ["cta", 'main a[href="/start"]'],
      ["account", 'main a[href="/personal-center"]'],
      ["ai", 'button[aria-controls="home-ai-conversation-panel"]'],
    ].map(([name, selector]) => {
      const el = document.querySelector(selector),
        r = el.getBoundingClientRect(),
        s = getComputedStyle(el);
      return [
        name,
        {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          font: s.font,
          fontFamily: s.fontFamily,
          color: s.color,
          borderRadius: s.borderRadius,
          background: s.background,
          shadow: s.boxShadow,
        },
      ];
    }),
  );
  const img = document.querySelector('img[alt=""]:not([data-main-header] img)');
  return {
    boxes,
    overflow: document.documentElement.scrollWidth > innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: innerHeight,
    videoCount: document.querySelectorAll("video").length,
    poster: {
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      currentSrc: img.currentSrc,
      objectPosition: getComputedStyle(img).objectPosition,
      placeholder: getComputedStyle(img).backgroundImage,
    },
    cls: window.__homeCls || 0,
  };
};
try {
  for (const [width, height, motion] of [
    [1672, 941, "no-preference"],
    [1440, 900, "no-preference"],
    [1024, 768, "no-preference"],
    [390, 844, "no-preference"],
    [320, 568, "no-preference"],
    [1440, 900, "reduce"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: motion,
    });
    await context.addInitScript(() => {
      window.__homeCls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput) window.__homeCls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) =>
      errors.push({ width, motion, error: e.message }),
    );
    page.on("console", (m) => {
      if (m.type() === "error")
        errors.push({ width, motion, error: m.text(), url: m.location().url });
    });
    page.on("response", (r) => {
      if (/home-hero|favicon|\.(webm|mp4)/.test(r.url()))
        requests.push({
          width,
          motion,
          url: r.url(),
          status: r.status(),
          type: r.request().resourceType(),
          bytes: Number(r.headers()["content-length"]) || null,
        });
    });
    await page.goto(base, { waitUntil: "networkidle" });
    const initial = await page.evaluate(measure);
    assert.equal(initial.overflow, false);
    assert.ok(initial.scrollHeight <= height + 1);
    assert.equal(initial.videoCount, 0);
    assert.equal(initial.poster.complete, true);
    assert.ok(initial.poster.naturalWidth > 0);
    assert.ok(
      Number(new URL(initial.poster.currentSrc).searchParams.get("w")) >=
        Math.min(1672, Math.max(width, (height * 1672) / 941)),
      "poster candidate must cover the viewport without low-resolution upscaling",
    );
    assert.equal(initial.cls, 0);
    assert.equal(await page.getByRole("main").count(), 1);
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
    assert.equal(
      await page
        .getByRole("link", { name: "TravelAssist 首页" })
        .getAttribute("href"),
      "/",
    );
    assert.equal(
      await page
        .getByRole("link", { name: "游客 · 个人中心" })
        .getAttribute("href"),
      "/personal-center",
    );
    assert.ok(
      await page
        .getByRole("button", { name: "登录（账号功能将在后续任务中接入）" })
        .isDisabled(),
    );
    assert.equal(await page.getByText("Yuki", { exact: false }).count(), 0);
    const { boxes } = initial;
    for (const v of Object.values(boxes)) {
      assert.ok(
        v.x >= 0 &&
          v.y >= 0 &&
          v.x + v.width <= width + 1 &&
          v.y + v.height <= height + 1,
      );
    }
    assert.ok(Math.abs(boxes.cta.x + boxes.cta.width / 2 - width / 2) < 1);
    assert.ok(boxes.brand.x + boxes.brand.width < boxes.language.x);
    assert.ok(boxes.cta.y + boxes.cta.height < boxes.account.y);
    assert.ok(
      boxes.account.y + boxes.account.height < boxes.ai.y ||
        boxes.account.x + boxes.account.width < boxes.ai.x,
    );
    if (width === 1672) {
      assert.ok(
        boxes.eyebrow.y / height >= 0.22 && boxes.eyebrow.y / height <= 0.25,
      );
      assert.ok(
        boxes.title.y / height >= 0.29 && boxes.title.y / height <= 0.39,
      );
      assert.ok(boxes.cta.width >= 360 && boxes.cta.width <= 390);
      assert.ok(boxes.cta.height >= 76 && boxes.cta.height <= 88);
    }
    const screenshot = `${screens}/${width}x${height}${motion === "reduce" ? "-reduced-motion" : ""}.png`;
    await page.screenshot({ path: screenshot });
    evidence.push({
      path: screenshot,
      sha256: createHash("sha256")
        .update(await readFile(screenshot))
        .digest("hex"),
    });
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".main-skip-link")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page
        .locator("#home-content")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    assert.equal(new URL(page.url()).hash, "");
    await page.keyboard.press("Tab");
    const cta = page.getByRole("link", { name: "让我们开始吧" });
    assert.equal(
      await cta.evaluate((el) => el === document.activeElement),
      true,
    );
    assert.equal(
      await cta.evaluate((el) => getComputedStyle(el).outlineStyle),
      "solid",
    );
    await cta.hover();
    assert.deepEqual(await cta.boundingBox(), {
      x: boxes.cta.x,
      y: boxes.cta.y,
      width: boxes.cta.width,
      height: boxes.cta.height,
    });
    const ai = page.getByRole("button", { name: "打开 AI 助手" });
    await ai.click();
    const close = page
      .locator("#home-ai-conversation-panel")
      .getByRole("button", { name: "关闭 AI 助手" });
    assert.equal(
      await close.evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .locator("#home-ai-conversation-panel")
      .evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
    const panel = await page
      .locator("#home-ai-conversation-panel")
      .boundingBox();
    assert.ok(panel.y >= 0 && panel.y + panel.height <= boxes.ai.y);
    await page.keyboard.press("Escape");
    assert.equal(
      await ai.evaluate((el) => el === document.activeElement),
      true,
    );
    await ai.click();
    await close.click();
    assert.equal(
      await ai.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.locator("[data-main-header] summary").click();
    assert.ok(await page.getByText("更多语言即将开放").isVisible());
    await page.locator("[data-main-header] summary").click();
    await cta.click();
    await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
    await page.goBack();
    await page.locator("#home-heading").waitFor();
    await page.goForward();
    await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
    await page.goBack();
    await page.locator("#home-heading").waitFor();
    await page.getByRole("link", { name: "游客 · 个人中心" }).click();
    await page.waitForURL(/\/login\?returnTo=/);
    rows.push({
      width,
      height,
      motion,
      ...initial,
      checks:
        "landmarks / links / guest / focus / hover / AI open-close-Escape / language / history / account login guard PASS",
    });
    await context.close();
  }

  const slowContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const slowPage = await slowContext.newPage();
  let releaseImage;
  const imageGate = new Promise((resolve) => {
    releaseImage = resolve;
  });
  await slowPage.route("**/_next/image?*", async (route) => {
    if (
      decodeURIComponent(route.request().url()).includes(
        "home-hero-sakura-sunset",
      )
    )
      await imageGate;
    await route.continue();
  });
  await slowPage.goto(base, { waitUntil: "domcontentloaded" });
  const slowPoster = slowPage.locator("img").first();
  const placeholderStyle = await slowPoster.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  assert.notEqual(placeholderStyle, "none");
  const before = await slowPage.locator("#home-heading").boundingBox();
  const placeholderPath = screens + "/1440x900-poster-loading.png";
  await slowPage.screenshot({ path: placeholderPath });
  evidence.push({
    path: placeholderPath,
    sha256: createHash("sha256")
      .update(await readFile(placeholderPath))
      .digest("hex"),
  });
  releaseImage();
  await slowPage.waitForFunction(() => {
    const img = document.querySelector("img");
    return img.complete && img.naturalWidth > 0;
  });
  assert.deepEqual(
    await slowPage.locator("#home-heading").boundingBox(),
    before,
  );
  await slowContext.close();
  const firstPaint = {
    delayedPoster: "blur placeholder visible before request completes",
    geometry: "unchanged after image decoded",
    screenshot: placeholderPath,
  };
  const newErrors = errors.filter((e) => !e.url?.endsWith("/favicon.ico"));
  assert.deepEqual(newErrors, []);
  assert.equal(requests.filter((r) => /\.(webm|mp4)/.test(r.url)).length, 0);
  const report = {
    rows,
    firstPaint,
    errors,
    newErrors,
    requests,
    evidence,
    posterBytes: (
      await stat("public/media/home-concept/home-hero-sakura-sunset.webp")
    ).size,
  };
  await writeFile(
    out + "/browser-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${rows.length}/6 Home viewport/motion cases PASS; no new errors; CLS zero; no video requests`,
  );
} finally {
  await browser.close();
}
