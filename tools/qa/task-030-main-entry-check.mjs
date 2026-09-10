import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TASK_030_URL || "http://localhost:3133";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/TASK-030",
  screens = ".cache/qa/task030/screenshots";
const draftKey = "travelassist.trip-wizard.v1",
  bridgeKey = "travelassist.mock-plan-selection.v1";
await mkdir(out, { recursive: true });
await mkdir(screens, { recursive: true });
const baseline = JSON.parse(
  await readFile("docs/qa/TASK-025.2/account-capsule-home-report.json", "utf8"),
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [],
  evidence = [],
  errors = [],
  mutations = [],
  failures = [];
const cta = (page) =>
  page.getByRole("link", { name: "让我们开始吧", exact: true });
const stored = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), draftKey);
const exactPath = (page, path) => assert.equal(page.url(), base + path);
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function screenshot(page, name) {
  const path = `${screens}/${name}.png`;
  await page.screenshot({ path });
  evidence.push({
    path,
    absolutePath: `${process.cwd().replaceAll("\\", "/")}/${path}`,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  });
}
function measure() {
  const boxes = Object.fromEntries(
    [
      ["brand", '[data-main-header] a[href="/"]'],
      ["language", "[data-main-header] summary"],
      ["eyebrow", "main section > p:first-child"],
      ["title", "#home-heading"],
      ["subtitle", "main section > p:nth-of-type(2)"],
      ["cta", 'main a[href="/start"]'],
      ["account", 'main a[href="/personal-center"]'],
      ["login", 'main a[href^="/login"]'],
      ["help", 'button[aria-controls="home-help-popover"]'],
      ["footer", "footer"],
      ["ai", 'button[aria-controls="home-ai-conversation-panel"]'],
    ].flatMap(([name, selector]) => {
      const el = document.querySelector(selector);
      if (!el) return [];
      const r = el.getBoundingClientRect(),
        s = getComputedStyle(el);
      return [
        [
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
        ],
      ];
    }),
  );
  const el = document.querySelector('main a[href="/start"]'),
    r = el.getBoundingClientRect();
  const points = [
    [0.1, 0.5],
    [0.5, 0.5],
    [0.9, 0.5],
  ].map(([x, y]) =>
    el.contains(
      document.elementFromPoint(r.x + r.width * x, r.y + r.height * y),
    ),
  );
  return {
    boxes,
    hitPoints: points,
    overflow: document.documentElement.scrollWidth > innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    cls: window.__entryCls || 0,
  };
}
async function home(page) {
  await page.waitForURL(base + "/");
  await page.locator("#home-heading").waitFor();
}
async function start(page) {
  await page.waitForURL(base + "/start");
  await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
  exactPath(page, "/start");
}
async function tabToCta(page) {
  for (let n = 0; n < 18; n++) {
    await page.keyboard.press("Tab");
    if (await cta(page).evaluate((el) => el === document.activeElement)) return;
  }
  assert.fail("CTA was not reachable by Tab");
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [320, 568],
  ]) {
    for (const mode of ["guest", "signed-in"]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 640,
      });
      await context.addInitScript(() => {
        window.__entryCls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.__entryCls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      if (mode === "signed-in")
        await context.addCookies([
          {
            name: "sb-127-auth-token",
            url: base,
            value:
              "base64-" +
              Buffer.from(
                JSON.stringify({
                  access_token: "task0252-verified-profile",
                  refresh_token: "fixture",
                  expires_at: 4102444800,
                  expires_in: 3600,
                  token_type: "bearer",
                  user: {
                    id: "00000000-0000-4000-8000-000000000024",
                    user_metadata: { full_name: "不可采信的 Cookie 姓名" },
                  },
                }),
              ).toString("base64url"),
          },
        ]);
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on("pageerror", (e) =>
        errors.push({ width, mode, type: "pageerror", message: e.message }),
      );
      page.on("console", (m) => {
        if (m.type() === "error")
          errors.push({
            width,
            mode,
            type: "console",
            message: m.text(),
            url: m.location().url,
          });
      });
      page.on("request", (r) => {
        if (!["GET", "HEAD", "OPTIONS"].includes(r.method()))
          mutations.push({ width, mode, method: r.method(), url: r.url() });
      });
      await page.route(
        "https://avatar.example.invalid/verified.webp",
        (route) =>
          route.fulfill({
            path: "public/media/personal-center/travelassist-logo-torii.png",
            contentType: "image/png",
          }),
      );
      const trail = [];
      page.on("framenavigated", (f) => {
        if (f === page.mainFrame())
          trail.push(new URL(f.url()).pathname + new URL(f.url()).search);
      });
      console.log(`Checking ${width}x${height} ${mode}`);
      try {
        await page.goto(base, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (mode === "signed-in") {
          assert.ok(
            await page
              .getByRole("main")
              .getByRole("link", { name: "验收账户 · 个人中心" })
              .isVisible(),
          );
          assert.equal(
            await page.getByText("不可采信的 Cookie 姓名").count(),
            0,
          );
          assert.equal(
            await page.getByRole("link", { name: "登录", exact: true }).count(),
            0,
          );
        }
        assert.equal(await cta(page).count(), 1);
        assert.equal(await cta(page).getAttribute("href"), "/start");
        assert.equal(await cta(page).evaluate((el) => el.tagName), "A");
        const description = await cta(page).getAttribute("aria-describedby");
        assert.equal(await page.locator(`[id="${description}"]`).count(), 1);
        assert.equal(
          await page.locator(`[id="${description}"]`).innerText(),
          "进入旅行需求填写流程",
        );
        const initial = await page.evaluate(measure);
        assert.equal(initial.overflow, false);
        assert.ok(initial.scrollHeight <= height + 1);
        assert.equal(initial.cls, 0);
        const b = initial.boxes.cta;
        assert.ok(
          b.width >= 44 &&
            b.height >= 44 &&
            b.x >= 0 &&
            b.y >= 0 &&
            b.x + b.width <= width &&
            b.y + b.height <= height,
        );
        assert.deepEqual(initial.hitPoints, [true, true, true]);
        for (const key of ["brand", "account", "login", "footer", "ai"]) {
          const v = initial.boxes[key];
          if (!v) continue;
          assert.ok(
            b.x + b.width <= v.x ||
              v.x + v.width <= b.x ||
              b.y + b.height <= v.y ||
              v.y + v.height <= b.y,
            `CTA blocked by ${key}`,
          );
        }
        if (mode === "guest")
          assert.deepEqual(
            initial.boxes,
            baseline.rows.find(
              (r) => r.width === width && r.motion === "no-preference",
            ).boxes,
            "Home visual freeze",
          );
        await screenshot(page, `${width}x${height}-${mode}-home`);
        await page.evaluate(() =>
          localStorage.setItem("task030-existing-data", "keep"),
        );
        await tabToCta(page);
        const focus = await cta(page).evaluate((el) => {
          const s = getComputedStyle(el);
          return { style: s.outlineStyle, width: s.outlineWidth };
        });
        assert.equal(focus.style, "solid");
        assert.ok(parseFloat(focus.width) >= 2);
        await screenshot(page, `${width}x${height}-${mode}-focus`);
        await page.keyboard.press("Enter");
        await start(page);
        const emptyDraft = await stored(page);
        assert.equal(emptyDraft.currentStep, 0);
        assert.deepEqual(emptyDraft.draft.generatedPlans, []);
        assert.equal(emptyDraft.draft.generationStatus.state, "idle");
        assert.deepEqual(
          await page.evaluate(() => Object.keys(localStorage).sort()),
          ["task030-existing-data", draftKey].sort(),
        );
        await page.goBack();
        await home(page);
        await page.goForward();
        await start(page);
        assert.deepEqual(await stored(page), emptyDraft);
        await page.goBack();
        await home(page);
        if (width < 640) await cta(page).tap();
        else await cta(page).click();
        await start(page);
        await page.goBack();
        await home(page);
        await cta(page).click({ clickCount: 3, delay: 15 });
        await start(page);
        await page.goBack();
        await home(page); // one Back must leave Start, no duplicate entry
        await cta(page).focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await start(page);
        await page.goBack();
        await home(page);
        await cta(page).click();
        await start(page);
        assert.equal((await stored(page)).draft.generationStatus.runId, 0);
        await page.getByRole("radio", { name: /第一次去日本/ }).click();
        await button(page, "下一步").click();
        await page.getByRole("button", { name: /^自然风景，当前/ }).click();
        const slider = page.getByRole("slider").first();
        await slider.focus();
        await page.keyboard.press("End");
        assert.equal(await slider.inputValue(), "5");
        await button(page, "保存草稿").click();
        const saved = await stored(page);
        assert.equal(saved.currentStep, 1);
        assert.equal(saved.draft.familiarity, "first");
        assert.ok(saved.draft.likes.includes("自然风景"));
        await page.reload();
        await page
          .getByRole("heading", { name: "您对什么感兴趣？", exact: true })
          .waitFor();
        assert.deepEqual(await stored(page), saved);
        await page.goBack();
        await home(page);
        assert.deepEqual(await stored(page), saved);
        await cta(page).click();
        await page.waitForURL(base + "/start");
        await page
          .getByRole("heading", { name: "您对什么感兴趣？", exact: true })
          .waitFor();
        assert.deepEqual(await stored(page), saved);
        await button(page, "下一步").click();
        await page
          .getByRole("heading", { name: "这次旅行怎么安排？", exact: true })
          .waitFor();
        await button(page, "增加成人").click();
        const adults = (await stored(page)).draft.party.adults;
        assert.equal(adults, 2);
        await button(page, "上一步").click();
        await button(page, "下一步").click();
        assert.equal((await stored(page)).draft.party.adults, adults);
        await screenshot(page, `${width}x${height}-${mode}-wizard`);
        await button(page, "生成方案").click();
        await page
          .getByRole("heading", {
            name: "为您准备了 3 个旅行方案",
            exact: true,
          })
          .waitFor();
        assert.equal(await page.getByRole("article").count(), 3);
        await button(page, "查看这个方案").nth(1).click();
        await screenshot(page, `${width}x${height}-${mode}-plans`);
        const finalDraft = await stored(page);
        assert.equal(finalDraft.draft.selectedPlanId, "slow-depth");
        await button(page, "进入详细路线").click();
        await page.waitForURL(base + "/planner");
        await page
          .locator('[data-planner][data-workspace-mode="planner"]')
          .waitFor();
        await page.waitForFunction(
          (key) => localStorage.getItem(key) === null,
          bridgeKey,
        );
        assert.equal((await stored(page)).draft.selectedPlanId, "slow-depth");
        if (
          (await page
            .locator("#planner-workspace")
            .getAttribute("data-right-collapsed")) === "true"
        )
          await button(page, "旅行设置与方案").click();
        await page.getByText("深度体验之旅", { exact: true }).first().waitFor();
        await page
          .locator('[data-recommendation="depth"][data-selected="true"]')
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", {
              name: "选择方案 02：深度体验之旅",
              exact: true,
            })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("task030-existing-data"),
          ),
          "keep",
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        exactPath(page, "/planner");
        await screenshot(page, `${width}x${height}-${mode}-planner`);
        assert.ok(
          !trail.some((p) => p.startsWith("/login") || p.includes("?")),
          JSON.stringify(trail),
        );
        rows.push({
          width,
          height,
          mode,
          status: "PASS",
          initial,
          focus,
          trail,
          checks: [
            "semantic /start link",
            "single CTA",
            "Tab + Enter",
            "click/touch",
            "Back + Forward",
            "triple click / Enter with single Back",
            "no trip or generation side effects on entry",
            "saved draft reload + Home reentry",
            "existing Wizard interaction",
            "existing mock generation",
            "selected plan handoff and bridge consumption",
            "no UI redesign",
          ],
        });
      } catch (e) {
        await screenshot(page, `${width}x${height}-${mode}-failure`);
        failures.push({ width, height, mode, message: e.message });
        throw e;
      } finally {
        await context.close();
      }
    }
  }
  // The ordinary hyperlink still performs a real document navigation without JavaScript.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(base);
  await cta(page).click();
  await page.waitForURL(base + "/start");
  assert.ok(
    (await page.locator("body").innerText()).includes("正在恢复旅行草稿"),
  );
  rows.push({
    mode: "no-javascript",
    status: "PASS",
    scope:
      "Native Home link reaches /start; interactive Wizard requires JavaScript as before",
  });
  await context.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
  console.log(
    "PASS: 8 guest/signed-in viewport main flows + native no-JS link; no browser errors or mutation requests",
  );
} finally {
  await writeFile(
    `${out}/browser-report.json`,
    JSON.stringify(
      {
        base,
        fixture:
          "Existing local TASK-024/025.2 verified profile fixture; no live Auth/provider services",
        rows,
        errors,
        mutations,
        failures,
        evidence,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
