import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3000";
const evidenceDir = path.resolve(
  process.env.WBS_EVIDENCE_DIR ?? ".next/qa/WBS-5.20-B",
);
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1279, 800],
  [1024, 768],
  [1023, 768],
  [768, 1024],
  [767, 900],
  [390, 844],
  [320, 740],
];
const coreRoutes = [
  "/personal-center",
  "/personal-center/trips",
  "/personal-center/preferences",
  "/personal-center/companions",
  "/personal-center/account",
];
const detailRoutes = [
  "/personal-center/preferences/mobility",
  "/personal-center/preferences/attractions",
  "/personal-center/preferences/dining",
  "/personal-center/preferences/accommodation",
  "/personal-center/preferences/budget",
  "/personal-center/preferences/experience",
  "/personal-center/preferences/advanced",
  "/personal-center/account/security",
  "/personal-center/account/privacy",
  "/personal-center/account/booking-sync",
];
const consoleProblems = [];
const responseProblems = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      if (message.location().url === `${baseUrl}/favicon.ico`) return;
      consoleProblems.push(
        `${label} console.${message.type()}: ${message.text()}`,
      );
    }
  });
  page.on("pageerror", (error) =>
    consoleProblems.push(`${label}: ${error.message}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico"))
      responseProblems.push(`${label} ${response.status()}: ${response.url()}`);
  });
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert.ok(
    overflow.document <= 1 && overflow.body <= 1,
    `${label}: ${JSON.stringify(overflow)}`,
  );
}

async function openDrawer(page) {
  const trigger = page.getByRole("button", { name: "打开个人中心导航" });
  await trigger.click();
  await page.locator("body[data-personal-drawer-open=true]").waitFor();
  return trigger;
}

async function assertDrawer(page, label) {
  const trigger = await openDrawer(page);
  const panel = page.locator("#personal-sidebar-panel");
  assert.equal(await panel.getAttribute("role"), "dialog", label);
  assert.equal(await panel.getAttribute("aria-modal"), "true", label);
  assert.equal(
    await page
      .locator("#personal-content")
      .evaluate((element) => element.style.overflow),
    "hidden",
    label,
  );
  assert.equal(
    await panel.evaluate((element) => element.contains(document.activeElement)),
    true,
    `${label} initial focus`,
  );

  const wrap = await panel.evaluate((element) => {
    const focusable = [
      ...element.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    focusable.at(-1)?.focus();
    return focusable.length;
  });
  assert.ok(wrap >= 7, label);
  await page.keyboard.press("Tab");
  assert.equal(
    await panel.evaluate(
      (element) =>
        document.activeElement ===
        element.querySelector(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    ),
    true,
    `${label} Tab wrap`,
  );
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await panel.evaluate((element) => {
      const focusable = [
        ...element.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      return document.activeElement === focusable.at(-1);
    }),
    true,
    `${label} Shift+Tab wrap`,
  );

  await page.keyboard.press("Escape");
  await page
    .locator("body[data-personal-drawer-open=true]")
    .waitFor({ state: "detached" });
  assert.equal(
    await trigger.evaluate((element) => document.activeElement === element),
    true,
    `${label} Escape focus return`,
  );

  await openDrawer(page);
  await page.getByRole("button", { name: "关闭个人中心导航" }).last().click();
  await page
    .locator("body[data-personal-drawer-open=true]")
    .waitFor({ state: "detached" });
  assert.equal(
    await trigger.evaluate((element) => document.activeElement === element),
    true,
    `${label} backdrop focus return`,
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);
    const response = await page.goto(`${baseUrl}/personal-center`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, label);
    const navItems = page.locator("[data-personal-nav-item]");
    assert.equal(await navItems.count(), 5, label);

    if (width >= 1280) {
      const sidebarWidth = await page
        .getByRole("complementary", { name: "个人中心侧栏" })
        .evaluate((element) => element.getBoundingClientRect().width);
      assert.ok(sidebarWidth >= 200, `${label} full sidebar`);
      assert.equal(
        await navItems
          .first()
          .evaluate((element) =>
            [...element.querySelectorAll("span")].some(
              (span) =>
                span.textContent === "我的首页" &&
                getComputedStyle(span).display !== "none",
            ),
          ),
        true,
        `${label} full label`,
      );
    } else if (width >= 1024) {
      const sidebarWidth = await page
        .getByRole("complementary", { name: "个人中心侧栏" })
        .evaluate((element) => element.getBoundingClientRect().width);
      assert.ok(
        sidebarWidth >= 80 && sidebarWidth <= 96,
        `${label} compact rail`,
      );
      const target = navItems.nth(1);
      const tooltip = page.locator('[role="tooltip"]').nth(1);
      await target.hover();
      await page.waitForTimeout(180);
      assert.equal(
        await tooltip.evaluate((element) => getComputedStyle(element).opacity),
        "1",
        `${label} hover tooltip`,
      );
      await target.focus();
      await page.waitForTimeout(180);
      assert.equal(
        await tooltip.evaluate((element) => getComputedStyle(element).opacity),
        "1",
        `${label} focus tooltip`,
      );
    } else if (width >= 768) {
      const trigger = page.getByRole("button", { name: "打开个人中心导航" });
      await trigger.waitFor();
      assert.equal(
        await page.locator("#personal-sidebar-panel").getAttribute("inert"),
        "",
        `${label} closed drawer inert`,
      );
      await assertDrawer(page, label);
    } else {
      const mobileNav = page.getByRole("navigation", { name: "个人中心" });
      const links = mobileNav.getByRole("link");
      assert.equal(await links.count(), 5, label);
      const mobileLabels = ["首页", "旅行", "偏好", "同行人", "账户"];
      for (let index = 0; index < mobileLabels.length; index += 1) {
        assert.equal(
          await links
            .nth(index)
            .evaluate(
              (element, expected) =>
                [...element.querySelectorAll("span")].some(
                  (span) =>
                    span.textContent === expected &&
                    getComputedStyle(span).display !== "none",
                ),
              mobileLabels[index],
            ),
          true,
          `${label} mobile label ${mobileLabels[index]}`,
        );
      }
      for (let index = 0; index < 5; index += 1) {
        const box = await links.nth(index).boundingBox();
        assert.ok(
          box && box.height >= 44 && box.width >= 44,
          `${label} touch target ${index}`,
        );
      }
      const selected = links.first();
      const selectedStyle = await selected.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        border: getComputedStyle(element).borderColor,
        weight: getComputedStyle(element).fontWeight,
      }));
      assert.notEqual(
        selectedStyle.background,
        "rgba(0, 0, 0, 0)",
        `${label} selected background`,
      );
      assert.notEqual(
        selectedStyle.border,
        "rgba(0, 0, 0, 0)",
        `${label} selected border`,
      );
      assert.ok(
        Number(selectedStyle.weight) >= 600,
        `${label} selected weight`,
      );
      const paddingBottom = await page
        .locator("#personal-content")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).paddingBottom),
        );
      assert.ok(paddingBottom >= 90, `${label} bottom navigation clearance`);
      assert.equal(
        await page
          .getByRole("button", { name: "打开个人中心导航" })
          .isVisible(),
        false,
        label,
      );
    }
    await assertNoOverflow(page, label);
    await page.screenshot({ path: path.join(evidenceDir, `${label}.png`) });
    await context.close();
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    attachDiagnostics(page, `core ${viewport.width}`);
    for (const route of coreRoutes) {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
      });
      assert.equal(response?.status(), 200, `${viewport.width} ${route}`);
      await assertNoOverflow(page, `${viewport.width} ${route}`);
      if (viewport.width < 768) {
        const smallInputs = await page
          .locator("input:visible, select:visible, textarea:visible")
          .evaluateAll((elements) =>
            elements
              .filter(
                (element) =>
                  Number.parseFloat(getComputedStyle(element).fontSize) < 16,
              )
              .map(
                (element) =>
                  `${element.tagName}:${getComputedStyle(element).fontSize}`,
              ),
          );
        assert.deepEqual(
          smallInputs,
          [],
          `${route}: ${smallInputs.join(", ")}`,
        );
      }
    }
    await context.close();
  }

  const regressionContext = await browser.newContext({
    viewport: { width: 1023, height: 768 },
  });
  const regressionPage = await regressionContext.newPage();
  attachDiagnostics(regressionPage, "route regression");
  for (const route of detailRoutes) {
    const response = await regressionPage.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    await assertNoOverflow(regressionPage, route);
  }
  await regressionContext.close();

  const guardContext = await browser.newContext({
    viewport: { width: 768, height: 1024 },
  });
  const guardPage = await guardContext.newPage();
  attachDiagnostics(guardPage, "tablet guard");
  await guardPage.goto(`${baseUrl}/personal-center/preferences/mobility`, {
    waitUntil: "networkidle",
  });
  await guardPage.getByRole("checkbox").first().click();
  await openDrawer(guardPage);
  await guardPage
    .locator("#personal-sidebar-panel")
    .getByRole("link", { name: /我的旅行/ })
    .click();
  const unsaved = guardPage.getByRole("dialog", { name: "您有尚未保存的修改" });
  await unsaved.waitFor();
  assert.equal(
    await unsaved.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
    "guard owns focus above drawer",
  );
  await unsaved.getByRole("button", { name: "继续编辑" }).click();
  await guardPage
    .locator("#personal-sidebar-panel")
    .getByRole("link", { name: /我的旅行/ })
    .click();
  await unsaved.getByRole("button", { name: "放弃修改" }).click();
  await guardPage.waitForURL(`${baseUrl}/personal-center/trips`);
  await guardPage
    .locator("body[data-personal-drawer-open=true]")
    .waitFor({ state: "detached" });
  assert.equal(
    await guardPage.locator("body[data-personal-drawer-open=true]").count(),
    0,
    "drawer closes after guarded navigation",
  );
  await guardContext.close();

  const textContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const textPage = await textContext.newPage();
  attachDiagnostics(textPage, "text expansion");
  await textPage.goto(`${baseUrl}/personal-center/trips`, {
    waitUntil: "networkidle",
  });
  await textPage.evaluate(() => {
    document
      .querySelectorAll("[data-personal-nav-item] span")
      .forEach((element) => {
        if (element.textContent) element.textContent += " 長い";
      });
    const heading = document.querySelector("h1");
    if (heading) heading.textContent += " — Extended title";
    const button = [...document.querySelectorAll("a,button")].find((element) =>
      element.textContent?.includes("新建旅程"),
    );
    if (button) button.textContent += " Extended";
  });
  await assertNoOverflow(textPage, "text expansion");
  await textContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1279, height: 800 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  attachDiagnostics(reducedPage, "reduced motion");
  await reducedPage.goto(`${baseUrl}/personal-center`, {
    waitUntil: "networkidle",
  });
  const motion = await reducedPage
    .locator("[data-personal-nav-item]")
    .first()
    .evaluate((element) => ({
      transition: getComputedStyle(element).transitionDuration,
      animation: getComputedStyle(element).animationDuration,
    }));
  assert.ok(
    Number.parseFloat(motion.transition) <= 0.01,
    JSON.stringify(motion),
  );
  assert.ok(
    Number.parseFloat(motion.animation) <= 0.01,
    JSON.stringify(motion),
  );
  await reducedContext.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(responseProblems, [], responseProblems.join("\n"));
console.log(`WBS-5.20-B browser QA passed; evidence: ${evidenceDir}`);
