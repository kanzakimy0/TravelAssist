import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("CODEX_PLAYWRIGHT_PATH is required");
const { chromium, firefox, webkit } = require(playwrightPath);

const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3000";
const browserName = (process.env.WBS_BROWSER ?? "edge").toLowerCase();
const evidenceDir = path.resolve(
  process.env.WBS_EVIDENCE_DIR ?? ".next/qa/WBS-9.12-B",
);
const browserEvidenceDir = path.join(evidenceDir, browserName);
await mkdir(browserEvidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1279, 800],
  [1024, 768],
  [1023, 768],
  [768, 1024],
  [767, 900],
  [430, 932],
  [390, 844],
  [375, 812],
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
  "/personal-center/account/privacy/delete",
  "/personal-center/account/booking-sync",
];
const allRoutes = [...coreRoutes, ...detailRoutes];
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

async function assertSemanticIntegrity(page, label) {
  const failures = await page.evaluate(() => {
    const problems = [];
    for (const element of document.querySelectorAll(
      "[aria-controls], [aria-describedby], [aria-labelledby]",
    )) {
      for (const attribute of [
        "aria-controls",
        "aria-describedby",
        "aria-labelledby",
      ]) {
        const ids = element.getAttribute(attribute)?.trim().split(/\s+/) ?? [];
        for (const id of ids) {
          if (id && !document.getElementById(id))
            problems.push(attribute + " references missing #" + id);
        }
      }
    }
    for (const element of document.querySelectorAll("[tabindex]")) {
      const value = Number(element.getAttribute("tabindex"));
      if (value > 0) problems.push("positive tabindex " + value);
    }
    const primaryTitle = document.querySelectorAll("h1");
    if (primaryTitle.length !== 1)
      problems.push("expected one h1, found " + primaryTitle.length);
    return problems;
  });
  assert.deepEqual(failures, [], label + ": " + failures.join("; "));
}

async function assertFocusVisible(page, locator, label) {
  const focusStyle = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });
  assert.ok(
    (focusStyle.outlineStyle !== "none" && focusStyle.outlineWidth > 0) ||
      focusStyle.boxShadow !== "none",
    label + ": " + JSON.stringify(focusStyle),
  );
}

async function assertMobileTouchTargets(page, label) {
  const undersized = await page.evaluate(() =>
    [...document.querySelectorAll("main button, main a[href], main summary")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          element.closest("[hidden], [inert]")
        )
          return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.width < 44 || rect.height < 44)
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const name =
          element.textContent?.trim().slice(0, 28) ||
          element.getAttribute("aria-label");
        return (
          name + ": " + Math.round(rect.width) + "x" + Math.round(rect.height)
        );
      }),
  );
  assert.deepEqual(undersized, [], label + ": " + undersized.join(", "));
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
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "打开个人中心导航",
  );
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
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "打开个人中心导航",
  );
  assert.equal(
    await trigger.evaluate((element) => document.activeElement === element),
    true,
    `${label} backdrop focus return`,
  );
}

const browserType =
  browserName === "firefox"
    ? firefox
    : browserName === "webkit"
      ? webkit
      : chromium;
if (!["edge", "chromium", "firefox", "webkit"].includes(browserName))
  throw new Error("Unsupported WBS_BROWSER: " + browserName);
const browser = await browserType.launch(
  browserName === "edge"
    ? { channel: "msedge", headless: true }
    : { headless: true },
);
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
    await page.screenshot({
      path: path.join(browserEvidenceDir, `${label}.png`),
    });
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

  const matrixViewports = [
    { width: 1440, height: 900 },
    { width: 1279, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ];
  for (const viewport of matrixViewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    attachDiagnostics(page, "full route matrix " + viewport.width);
    for (const route of allRoutes) {
      const response = await page.goto(baseUrl + route, {
        waitUntil: "networkidle",
      });
      const label = viewport.width + " " + route;
      assert.equal(response?.status(), 200, label);
      await page.locator("#personal-content").waitFor();
      await assertNoOverflow(page, label);
      await assertSemanticIntegrity(page, label);
      assert.equal(
        await page
          .locator("[data-personal-nav-item][aria-current=page]")
          .count(),
        1,
        label + " active navigation",
      );
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
                  element.tagName + ":" + getComputedStyle(element).fontSize,
              ),
          );
        assert.deepEqual(smallInputs, [], label + " mobile input font");
      }
    }
    await context.close();
  }

  const keyboardContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const keyboardPage = await keyboardContext.newPage();
  attachDiagnostics(keyboardPage, "keyboard and popover");
  await keyboardPage.goto(baseUrl + "/personal-center", {
    waitUntil: "networkidle",
  });
  const skipLink = keyboardPage.getByRole("link", {
    name: "跳到主要内容",
  });
  await keyboardPage.keyboard.press("Tab");
  assert.equal(
    await skipLink.evaluate((element) => document.activeElement === element),
    true,
    "first Tab reaches skip link",
  );
  await assertFocusVisible(keyboardPage, skipLink, "skip link focus-visible");
  await keyboardPage.keyboard.press("Tab");
  await keyboardPage.keyboard.press("Shift+Tab");
  assert.equal(
    await skipLink.evaluate((element) => document.activeElement === element),
    true,
    "Shift+Tab returns to skip link",
  );
  await keyboardPage.keyboard.press("Enter");
  assert.equal(
    await keyboardPage
      .locator("#personal-content")
      .evaluate((element) => document.activeElement === element),
    true,
    "skip link moves focus to main",
  );

  const avatarTrigger = keyboardPage.getByRole("button", {
    name: /账户菜单/,
  });
  await avatarTrigger.focus();
  await keyboardPage.keyboard.press("Enter");
  const accountPopover = keyboardPage.locator("div[popover]:popover-open");
  await accountPopover.waitFor();
  await keyboardPage.waitForFunction(
    () =>
      document
        .querySelector('button[aria-label*="账户菜单"]')
        ?.getAttribute("aria-expanded") === "true",
  );
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "true");
  await keyboardPage.keyboard.press("Tab");
  assert.equal(
    await accountPopover.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
    "Tab enters account popover",
  );
  await assertFocusVisible(
    keyboardPage,
    keyboardPage.locator(":focus"),
    "popover focus-visible",
  );
  await keyboardPage.keyboard.press("Escape");
  await accountPopover.waitFor({ state: "hidden" });
  assert.equal(
    await avatarTrigger.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "popover Escape focus return",
  );
  await avatarTrigger.click();
  await accountPopover.waitFor();
  await keyboardPage.mouse.click(10, 500);
  await accountPopover.waitFor({ state: "hidden" });
  assert.equal(
    await avatarTrigger.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "popover outside-close focus return",
  );
  await keyboardContext.close();

  const profileDialogContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const profileDialogPage = await profileDialogContext.newPage();
  attachDiagnostics(profileDialogPage, "profile dialog");
  await profileDialogPage.goto(baseUrl + "/personal-center/account", {
    waitUntil: "networkidle",
  });
  const addContact = profileDialogPage.getByRole("button", {
    name: /添加紧急联系人/,
  });
  await addContact.focus();
  await addContact.click();
  const contactDialog = profileDialogPage.getByRole("dialog", {
    name: "添加紧急联系人",
  });
  await contactDialog.waitFor();
  assert.equal(
    await contactDialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
    "profile dialog initial focus",
  );
  await contactDialog.evaluate((element) => {
    const focusable = [
      ...element.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]",
      ),
    ];
    focusable.at(-1)?.focus();
  });
  await profileDialogPage.keyboard.press("Tab");
  const nativeWrapState = await contactDialog.evaluate((element) => ({
    inDialog: element.contains(document.activeElement),
    onBody: document.activeElement === document.body,
  }));
  assert.equal(
    nativeWrapState.inDialog || nativeWrapState.onBody,
    true,
    "native modal focus never reaches underlying controls",
  );
  if (nativeWrapState.onBody) {
    await profileDialogPage.keyboard.press("Tab");
    assert.equal(
      await contactDialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
      true,
      "native dialog returns focus on wrap",
    );
  }
  await profileDialogPage.keyboard.press("Escape");
  await contactDialog.waitFor({ state: "hidden" });
  assert.equal(
    await addContact.evaluate((element) => document.activeElement === element),
    true,
    "profile dialog Escape focus return",
  );
  await profileDialogContext.close();

  const companionContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const companionPage = await companionContext.newPage();
  attachDiagnostics(companionPage, "companion dialogs");
  await companionPage.goto(baseUrl + "/personal-center/companions", {
    waitUntil: "networkidle",
  });
  const deleteTrigger = companionPage
    .getByRole("button", { name: /删除同行人/ })
    .first();
  await deleteTrigger.focus();
  await companionPage.keyboard.press("Enter");
  const deleteDialog = companionPage.getByRole("alertdialog", {
    name: /删除/,
  });
  await deleteDialog.waitFor();
  const deleteCancel = deleteDialog.getByRole("button", { name: "取消" });
  const deleteConfirm = deleteDialog.getByRole("button", {
    name: "确认删除同行人",
  });
  assert.equal(
    await deleteCancel.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "delete dialog initial focus",
  );
  await companionPage.keyboard.press("Shift+Tab");
  assert.equal(
    await deleteConfirm.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "delete dialog Shift+Tab wraps",
  );
  await companionPage.keyboard.press("Tab");
  assert.equal(
    await deleteCancel.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "delete dialog Tab wraps",
  );
  await companionPage.keyboard.press("Escape");
  await deleteDialog.waitFor({ state: "detached" });
  await companionPage.waitForFunction(() =>
    document.activeElement
      ?.getAttribute("aria-label")
      ?.startsWith("删除同行人 "),
  );
  assert.equal(
    await deleteTrigger.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "delete dialog Escape focus return",
  );

  const addCompanion = companionPage.getByRole("button", {
    name: "添加同行人",
    exact: true,
  });
  await addCompanion.click();
  const editorDialog = companionPage.getByRole("dialog", {
    name: "添加同行人",
  });
  await editorDialog.waitFor();
  const firstEditorInput = editorDialog.getByRole("textbox").first();
  await firstEditorInput.fill("文本扩展测试同行人");
  const editorClose = editorDialog.getByRole("button", {
    name: "关闭编辑窗口",
  });
  await editorClose.click();
  const discardDialog = companionPage.getByRole("alertdialog", {
    name: /尚未保存/,
  });
  await discardDialog.waitFor();
  const continueEditing = discardDialog.getByRole("button", {
    name: "继续编辑",
  });
  const discardChanges = discardDialog.getByRole("button", {
    name: "放弃修改",
  });
  assert.equal(
    await continueEditing.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "discard dialog initial focus",
  );
  await companionPage.keyboard.press("Tab");
  assert.equal(
    await discardChanges.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "discard dialog Tab wraps",
  );
  await companionPage.keyboard.press("Shift+Tab");
  assert.equal(
    await continueEditing.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "discard dialog Shift+Tab wraps",
  );
  await companionPage.keyboard.press("Escape");
  await discardDialog.waitFor({ state: "detached" });
  await companionPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "关闭编辑窗口",
  );
  assert.equal(
    await editorClose.evaluate((element) => document.activeElement === element),
    true,
    "discard Escape returns focus to editor trigger",
  );
  await companionPage.keyboard.press("Escape");
  await discardDialog.waitFor();
  await discardDialog.getByRole("button", { name: "放弃修改" }).click();
  await editorDialog.waitFor({ state: "detached" });
  await companionPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "添加同行人",
  );
  assert.equal(
    await addCompanion.evaluate(
      (element) => document.activeElement === element,
    ),
    true,
    "editor focus returns after discard",
  );
  await companionContext.close();

  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await touchContext.newPage();
  attachDiagnostics(touchPage, "mobile touch targets");
  for (const route of [
    "/personal-center/trips",
    "/personal-center/preferences/mobility",
    "/personal-center/companions",
    "/personal-center/account",
    "/personal-center/account/privacy/delete",
  ]) {
    await touchPage.goto(baseUrl + route, { waitUntil: "networkidle" });
    await assertMobileTouchTargets(touchPage, route);
  }
  await touchContext.close();

  const liveContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const livePage = await liveContext.newPage();
  attachDiagnostics(livePage, "empty and live feedback");
  await livePage.goto(baseUrl + "/personal-center/trips", {
    waitUntil: "networkidle",
  });
  const searchInput = livePage.getByRole("searchbox", {
    name: "搜索行程名称或目的地",
  });
  await searchInput.fill("不存在的行程-9.12");
  assert.ok(
    await livePage.locator("[aria-live=polite]:visible").count(),
    "filtered empty state exposes a polite live region",
  );
  await searchInput.fill("");
  await livePage.getByRole("tab", { name: "历史" }).click();
  const favoriteButton = livePage.getByRole("button", { name: /收藏/ }).first();
  await favoriteButton.click();
  const status = livePage.getByRole("status");
  await status.waitFor();
  assert.match(await status.textContent(), /已收藏|已取消收藏/);
  await liveContext.close();

  const zoomEvidence = [];
  const desktopZoomContext = await browser.newContext({
    viewport: { width: 720, height: 450 },
  });
  const desktopZoomPage = await desktopZoomContext.newPage();
  attachDiagnostics(desktopZoomPage, "desktop 200 percent effective viewport");
  await desktopZoomPage.goto(
    baseUrl + "/personal-center/account/privacy/delete",
    { waitUntil: "networkidle" },
  );
  await assertNoOverflow(
    desktopZoomPage,
    "desktop 200 percent effective viewport",
  );
  await assertSemanticIntegrity(
    desktopZoomPage,
    "desktop 200 percent effective viewport",
  );
  assert.equal(
    await desktopZoomPage.locator("#personal-content").isVisible(),
    true,
  );
  await desktopZoomPage.screenshot({
    path: path.join(browserEvidenceDir, "zoom-desktop-effective-200.png"),
  });
  zoomEvidence.push("desktop: 1440x900 represented by 720x450 CSS viewport");
  await desktopZoomContext.close();

  if (browserName === "edge" || browserName === "chromium") {
    const mobileZoomContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobileZoomPage = await mobileZoomContext.newPage();
    attachDiagnostics(mobileZoomPage, "mobile page scale 200 percent");
    await mobileZoomPage.goto(baseUrl + "/personal-center/companions", {
      waitUntil: "networkidle",
    });
    const cdp = await mobileZoomContext.newCDPSession(mobileZoomPage);
    await cdp.send("Emulation.setPageScaleFactor", {
      pageScaleFactor: 2,
    });
    const scale = await mobileZoomPage.evaluate(
      () => window.visualViewport?.scale ?? 1,
    );
    assert.ok(scale >= 1.9, "mobile visual viewport scale: " + scale);
    await assertNoOverflow(mobileZoomPage, "mobile page scale 200 percent");
    assert.equal(
      await mobileZoomPage
        .getByRole("navigation", { name: "个人中心" })
        .isVisible(),
      true,
    );
    await mobileZoomPage.screenshot({
      path: path.join(browserEvidenceDir, "zoom-mobile-200.png"),
    });
    zoomEvidence.push(
      "mobile: CDP pageScaleFactor=2, visualViewport.scale=" + scale,
    );
    await mobileZoomContext.close();
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const label = "text expansion " + viewport.width;
    attachDiagnostics(page, label);
    await page.goto(baseUrl + "/personal-center/companions", {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll(
          "h1,h2,h3,p,span,label,button,a,input,select,textarea,small,strong",
        ),
      ];
      const sizes = elements.map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
      elements.forEach((element, index) => {
        const size = sizes[index];
        if (Number.isFinite(size) && size > 0)
          element.style.fontSize = Math.min(size * 1.5, 72) + "px";
      });
      const heading = document.querySelector("h1");
      if (heading)
        heading.textContent +=
          " — Personal Center accessibility expanded content";
    });
    await assertNoOverflow(page, label);
    assert.equal(await page.locator("#personal-content").isVisible(), true);
    await page.screenshot({
      path: path.join(
        browserEvidenceDir,
        "text-expansion-" + viewport.width + ".png",
      ),
      fullPage: true,
    });
    await context.close();
  }

  const motionScanContext = await browser.newContext({
    viewport: { width: 1279, height: 800 },
    reducedMotion: "reduce",
  });
  const motionScanPage = await motionScanContext.newPage();
  attachDiagnostics(motionScanPage, "reduced motion scan");
  await motionScanPage.goto(baseUrl + "/personal-center/companions", {
    waitUntil: "networkidle",
  });
  const activeMotion = await motionScanPage.evaluate(() => {
    const parseDurations = (value) =>
      value.split(",").map((part) => {
        const token = part.trim();
        return token.endsWith("ms")
          ? Number.parseFloat(token) / 1000
          : Number.parseFloat(token);
      });
    return [...document.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden")
          return false;
        return (
          parseDurations(style.animationDuration).some(
            (value) => value > 0.01,
          ) ||
          parseDurations(style.transitionDuration).some((value) => value > 0.01)
        );
      })
      .map((element) => element.tagName + "." + element.className)
      .slice(0, 20);
  });
  assert.deepEqual(activeMotion, [], activeMotion.join(", "));
  await motionScanContext.close();

  await writeFile(
    path.join(browserEvidenceDir, "summary.json"),
    JSON.stringify(
      {
        task: "WBS-9.12-B",
        browser: browserName,
        baseUrl,
        routes: allRoutes,
        viewports: viewports.map(([width, height]) => ({ width, height })),
        responsiveModes: [
          "Wide Desktop",
          "Compact Desktop / Landscape",
          "Tablet Portrait",
          "Mobile",
        ],
        zoomEvidence,
        consoleProblems,
        responseProblems,
        result: "PASS",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
assert.deepEqual(responseProblems, [], responseProblems.join("\n"));
console.log(
  "WBS-9.12-B " +
    browserName +
    " browser QA passed; evidence: " +
    browserEvidenceDir,
);
