import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE,
);
const base = "http://localhost:3136",
  baseline = "http://localhost:3137";
const out = "docs/qa/TASK-033",
  screens = ".cache/qa/task033/screenshots";
await mkdir(out, { recursive: true });
await mkdir(screens, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [],
  regression = [],
  evidence = [],
  errors = [],
  mutations = [],
  failures = [];
const initial = JSON.parse(
  await readFile(".cache/qa/task033/initial-audit.json", "utf8"),
);
const widths = [
  [1440, 900],
  [1024, 768],
  [390, 844],
  [320, 568],
];
const id = "home-ai-conversation-panel";
const entry = (p) => p.locator(`button[aria-controls="${id}"]`);
const panel = (p) => p.locator("#" + id);
const close = (p) =>
  panel(p).getByRole("button", { name: "关闭 AI 助手", exact: true });
const input = (p) =>
  panel(p).getByRole("textbox", { name: "告诉 AI 您的旅行想法", exact: true });
async function screenshot(p, name) {
  const path = `${screens}/${name}.png`;
  await p.screenshot({ path });
  evidence.push({
    path,
    absolutePath: `${process.cwd().replaceAll("\\", "/")}/${path}`,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  });
}
async function finishAnimation(p) {
  await panel(p).evaluate(async (e) =>
    Promise.all(
      e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})),
    ),
  );
}
function geometry() {
  return Object.fromEntries(
    [
      "#home-heading",
      'main a[href="/start"]',
      'main a[href="/personal-center"]',
      'main a[href^="/login"]',
      "footer",
      'button[aria-controls="home-ai-conversation-panel"]',
      "[data-wizard-panel]",
      "[data-wizard-content]",
      "[data-map-workspace]",
      "[data-right-panel]",
      "[data-bottom-panel]",
      "[data-detail-sidebar]",
      "[data-detail-column]",
      "[class*=bottomSlot]",
      "[data-main-header]",
      "[data-planner] > header",
    ].flatMap((s) => {
      const e = document.querySelector(s);
      if (!e) return [];
      const r = e.getBoundingClientRect();
      return [[s, { x: r.x, y: r.y, width: r.width, height: r.height }]];
    }),
  );
}
async function snap(p) {
  return p.evaluate(() => ({
    url: location.href,
    history: history.length,
    storage: Object.fromEntries(Object.entries(localStorage).sort()),
    scroll: [scrollX, scrollY],
  }));
}
async function noOverflow(p) {
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
}
async function open(p, method) {
  assert.equal(await entry(p).getAttribute("aria-expanded"), "false");
  if (method === "click") await entry(p).click();
  else {
    await entry(p).focus();
    await p.keyboard.press(method);
  }
  await close(p).waitFor();
  await finishAnimation(p);
  assert.equal(await entry(p).getAttribute("aria-expanded"), "true");
  assert.equal(await panel(p).count(), 1);
  assert.ok(await close(p).evaluate((e) => e === document.activeElement));
}
async function closed(p) {
  await panel(p).waitFor({ state: "detached" });
  assert.equal(await entry(p).getAttribute("aria-expanded"), "false");
  assert.ok(await entry(p).evaluate((e) => e === document.activeElement));
}
async function hit(p, locator) {
  const r = await locator.boundingBox();
  assert.ok(r);
  assert.ok(
    await locator.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return e.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
  );
  return r;
}
async function makeContext(
  width,
  height,
  motion = "reduce",
  member = false,
  origin = base,
) {
  const c = await browser.newContext({
    viewport: { width, height },
    reducedMotion: motion,
    hasTouch: width < 500,
  });
  if (member)
    await c.addCookies([
      {
        url: origin,
        name: "sb-127-auth-token",
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
                user_metadata: { full_name: "伪造 Cookie 身份" },
              },
            }),
          ).toString("base64url"),
      },
    ]);
  await c.route("https://avatar.example.invalid/verified.webp", (r) =>
    r.fulfill({
      path: "public/media/personal-center/avatar-yuki.webp",
      contentType: "image/webp",
    }),
  );
  return c;
}
function watch(p, key) {
  p.on("pageerror", (e) =>
    errors.push({ key, type: "page", message: e.message }),
  );
  p.on("console", (m) => {
    if (m.type() === "error")
      errors.push({ key, type: "console", message: m.text() });
  });
  p.on("request", (r) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(r.method()))
      mutations.push({ key, method: r.method(), url: r.url() });
  });
}
try {
  for (const [width, height] of widths)
    for (const motion of ["no-preference", "reduce"])
      for (const member of [false, true]) {
        const key = `${width}-${motion}-${member ? "verified" : "guest"}`,
          c = await makeContext(width, height, motion, member),
          p = await c.newPage();
        watch(p, key);
        await p.goto(base, { waitUntil: "networkidle" });
        await p.evaluate(() => document.fonts.ready);
        await noOverflow(p);
        const before = await p.evaluate(geometry),
          state = await snap(p);
        const e = entry(p);
        const er = await hit(p, e);
        assert.ok(er.width >= 44 && er.height >= 44);
        await hit(
          p,
          p.getByRole("link", { name: "让我们开始吧", exact: true }),
        );
        await hit(
          p,
          p.getByRole("main").getByRole("link", { name: /个人中心/ }),
        );
        for (const a of await p
          .locator('footer a, main a[href^="/login"]')
          .all())
          await hit(p, a);
        await p.locator('a[href^="#"]').first().focus();
        for (
          let i = 0;
          i < 30 && !(await e.evaluate((e) => e === document.activeElement));
          i++
        )
          await p.keyboard.press("Tab");
        assert.ok(await e.evaluate((e) => e === document.activeElement));
        assert.ok(
          await e.evaluate(
            (e) =>
              e.matches(":focus-visible") &&
              getComputedStyle(e).outlineStyle === "solid",
          ),
        );
        await p.keyboard.press("Enter");
        await close(p).waitFor();
        await finishAnimation(p);
        assert.ok(await close(p).evaluate((e) => e === document.activeElement));
        assert.equal(await panel(p).count(), 1);
        assert.equal(await e.getAttribute("aria-expanded"), "true");
        const send = panel(p).getByRole("button", {
          name: "发送（AI 服务尚未接入）",
          exact: true,
        });
        assert.ok(await send.isDisabled());
        assert.ok(
          await panel(p)
            .getByText("AI 服务将在后续接入", { exact: true })
            .isVisible(),
        );
        await p.keyboard.press("Tab");
        assert.ok(await input(p).evaluate((e) => e === document.activeElement));
        await input(p).fill("界面验收：只输入，不发送。");
        await p.keyboard.press("Enter");
        const value = await input(p).inputValue();
        await e.click();
        assert.equal(await panel(p).count(), 1);
        assert.equal(await input(p).inputValue(), value);
        const pr = await panel(p).boundingBox();
        assert.ok(pr.y >= 0);
        assert.ok(
          width <= 352 ? pr.y >= er.y + er.height : pr.y + pr.height <= er.y,
        );
        assert.deepEqual(await p.evaluate(geometry), before);
        assert.deepEqual({ ...(await snap(p)), scroll: state.scroll }, state);
        if (motion === "reduce") {
          assert.equal(
            await panel(p).evaluate((e) => getComputedStyle(e).animationName),
            "none",
          );
          assert.equal(
            await p
              .locator('button[aria-label="关闭 AI 助手"]')
              .filter({ hasNot: p.locator("#never") })
              .first()
              .evaluate((e) => getComputedStyle(e).animationName),
            "none",
          );
        }
        await screenshot(p, key + "-open");
        await p.keyboard.press("Escape");
        await closed(p);
        await open(p, "Space");
        await close(p).click();
        await closed(p);
        await open(p, "click");
        await p
          .locator('button[aria-label="关闭 AI 助手"]')
          .first()
          .click({ position: { x: 4, y: Math.round(height / 2) } });
        await closed(p);
        if (width < 500) {
          await e.tap();
          await close(p).waitFor();
          await close(p).tap();
          await closed(p);
        }
        assert.deepEqual(await snap(p), state);
        assert.deepEqual(await p.evaluate(geometry), before);
        await noOverflow(p);
        await screenshot(p, key + "-closed");
        rows.push({
          key,
          width,
          height,
          motion,
          member,
          entry: er,
          panel: pr,
          pointer: true,
          enter: true,
          space: true,
          escape: true,
          backdrop: true,
          close: true,
          focusReturn: true,
          singlePanel: true,
          disabledSend: true,
          unchangedUrlHistoryStorage: true,
          geometryUnchanged: true,
        });
        await c.close();
      }
  // Chromium's real environment-variable override, including a shorter mobile address-bar viewport.
  for (const height of [568, 480]) {
    const c = await makeContext(320, height),
      p = await c.newPage();
    watch(p, `safe-${height}`);
    const cdp = await c.newCDPSession(p);
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 24, right: 28, bottom: 34, left: 28 },
    });
    await p.goto(base, { waitUntil: "networkidle" });
    for (const a of await p.locator("main a").all()) await hit(p, a);
    await open(p, "click");
    const er = await entry(p).boundingBox(),
      pr = await panel(p).boundingBox();
    assert.ok(
      er.x >= 28 && er.x + er.width <= 292 && er.y + er.height <= height - 34,
    );
    assert.ok(
      pr.x >= 28 &&
        pr.x + pr.width <= 292 &&
        pr.y >= er.y + er.height &&
        pr.y + pr.height <= height - 34,
    );
    await noOverflow(p);
    await input(p).focus();
    const pageScroll = await p.evaluate(() => [scrollX, scrollY]);
    await panel(p).evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    const r = await panel(p).boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.wheel(0, 800);
    await p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.deepEqual(await p.evaluate(() => [scrollX, scrollY]), pageScroll);
    assert.equal(
      await panel(p).evaluate((e) => getComputedStyle(e).overscrollBehaviorY),
      "contain",
    );
    await screenshot(p, `safe-area-320-${height}`);
    await p.keyboard.press("Escape");
    await closed(p);
    rows.push({
      key: `safe-area-320-${height}`,
      insets: { top: 24, right: 28, bottom: 34, left: 28 },
      entry: er,
      panel: pr,
      scrollContained: true,
    });
    await c.close();
  }
  // Fresh exact baseline and candidate snapshots, followed by real local draft preservation.
  for (const [width, height] of widths) {
    let expected;
    for (const origin of [baseline, base]) {
      const c = await makeContext(width, height, "reduce", false, origin),
        p = await c.newPage();
      watch(p, `${origin}-${width}`);
      const pageRows = [];
      for (const [name, path] of [
        ["home", "/"],
        ["start", "/start"],
        ["planner", "/planner"],
        ["detail", "/planner?view=detail&day=1"],
      ]) {
        await p.goto(origin + path, { waitUntil: "networkidle" });
        await p.evaluate(() => document.fonts.ready);
        if (name === "start")
          await p.getByRole("radio", { name: /第一次去日本/ }).waitFor();
        if (name === "detail") {
          const confirm = p.getByRole("button", {
            name: "保存到浏览器并进入详情",
            exact: true,
          });
          if (await confirm.isVisible()) await confirm.click();
          await p.locator("dialog[open]").waitFor({ state: "hidden" });
        }
        await noOverflow(p);
        pageRows.push({ name, geometry: await p.evaluate(geometry) });
        if (origin === base) await screenshot(p, `${width}-regression-${name}`);
      }
      if (origin === baseline) expected = pageRows;
      else {
        const guarded = (rows) =>
          rows.map((row) => {
            const geometry = { ...row.geometry };
            if (width <= 352)
              delete geometry[
                'button[aria-controls="home-ai-conversation-panel"]'
              ];
            return { ...row, geometry };
          });
        assert.deepEqual(guarded(pageRows), guarded(expected));
        if (width <= 352) {
          const ai =
            pageRows[0].geometry[
              'button[aria-controls="home-ai-conversation-panel"]'
            ];
          assert.equal(ai.width, 44);
          assert.equal(ai.height, 44);
          assert.equal(ai.y, 88);
        }
        // Create Wizard state through its real controls, retaining the Detail's browser-saved trip.
        await p.goto(base + "/start", { waitUntil: "networkidle" });
        await p.getByRole("radio", { name: /去过几次/ }).click();
        await p.getByRole("button", { name: /下一步/ }).click();
        await p.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem("travelassist.trip-wizard.v1"))
              ?.currentStep === 1,
        );
        await p.goto(base, { waitUntil: "networkidle" });
        const state = await snap(p);
        assert.ok(state.storage["travelassist.trip-wizard.v1"]);
        assert.ok(state.storage["travelassist.saved-workspace.v1"]);
        await open(p, "click");
        await input(p).fill("不修改已有草稿");
        await p.keyboard.press("Escape");
        await closed(p);
        assert.deepEqual(await snap(p), state);
        await p
          .getByRole("link", { name: "让我们开始吧", exact: true })
          .click();
        await p.waitForURL(base + "/start");
        assert.equal(
          await p.evaluate(
            () =>
              JSON.parse(localStorage.getItem("travelassist.trip-wizard.v1"))
                .currentStep,
          ),
          1,
        );
        await p.goto(base + "/planner?view=detail&day=1", {
          waitUntil: "networkidle",
        });
        assert.equal(await p.locator("dialog[open]").count(), 0);
        const raw = await p.evaluate(() =>
          Object.fromEntries(Object.entries(localStorage).sort()),
        );
        assert.deepEqual(raw, state.storage);
      }
      regression.push({
        width,
        height,
        origin,
        pages: pageRows,
        unchanged: origin === base,
        draftAndPlannerPreserved: origin === base,
      });
      await c.close();
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
} catch (e) {
  failures.push(e.stack);
  throw e;
} finally {
  await browser.close();
  await writeFile(
    `${out}/browser-report.json`,
    JSON.stringify(
      {
        executionBase: "0f7955ae62e04aeacf43f56dcacf2a9249582e96",
        base,
        baseline,
        initialAudit: initial,
        rows,
        regression,
        errors,
        mutations,
        failures,
      },
      null,
      2,
    ),
  );
  await writeFile(`${out}/screenshots.json`, JSON.stringify(evidence, null, 2));
  console.log(
    `${rows.length} AI cases; ${regression.length} regression batches; ${errors.length} errors; ${mutations.length} mutations; ${failures.length} failures`,
  );
}
