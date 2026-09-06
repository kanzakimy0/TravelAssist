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
  process.env.WBS_EVIDENCE_DIR ?? "docs/evidence/wbs-5.4-b-v2/personal-center",
);
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [976, 888],
  [390, 844],
  [320, 740],
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const consoleProblems = [];
const nonBlockingObservations = [];

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      if (message.location().url === `${baseUrl}/favicon.ico`) {
        nonBlockingObservations.push(
          `${label}: global favicon.ico is absent (non-blocking baseline 404)`,
        );
        return;
      }
      consoleProblems.push(
        `${label} console.${message.type()}: ${message.text()} @ ${JSON.stringify(message.location())}`,
      );
    }
  });
  page.on("pageerror", (error) => {
    consoleProblems.push(`${label} pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      consoleProblems.push(
        `${label} response ${response.status()}: ${response.url()}`,
      );
    }
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
    `${label} horizontal overflow: ${JSON.stringify(overflow)}`,
  );
}

async function assertAccountEditDoesNotOverlapAvatar(page, label, width) {
  if (width < 768) return;
  const editButton = page.getByRole("button", {
    name: "编辑资料",
    exact: true,
  });
  const accountMenu = page.getByRole("button", { name: /账户菜单/ });
  const profileHeading = page.getByRole("heading", {
    name: "个人资料",
    exact: true,
  });
  const [editBox, accountBox, profileCardBox] = await Promise.all([
    editButton.boundingBox(),
    accountMenu.boundingBox(),
    profileHeading.locator("xpath=ancestor::section[1]").boundingBox(),
  ]);
  assert.ok(
    editBox && accountBox && profileCardBox,
    `${label} account actions missing`,
  );
  const overlaps =
    editBox.x < accountBox.x + accountBox.width &&
    editBox.x + editBox.width > accountBox.x &&
    editBox.y < accountBox.y + accountBox.height &&
    editBox.y + editBox.height > accountBox.y;
  assert.equal(overlaps, false, `${label} edit button overlaps account avatar`);
  assert.ok(
    width >= 1024 || accountBox.y + accountBox.height <= profileCardBox.y,
    `${label} account avatar must stay in the compact top bar: ${JSON.stringify(
      {
        accountBox,
        profileCardBox,
      },
    )}`,
  );
}

async function assertPreferenceActionsClearGlobalTools(page, label) {
  const detailsLink = page.getByRole("link", {
    name: "更多详细设置",
    exact: true,
  });
  const resetButton = page.getByRole("button", {
    name: "重置偏好",
    exact: true,
  });
  const notificationButton = page.getByRole("button", { name: /通知/ });
  const accountMenu = page.getByRole("button", { name: /账户菜单/ });
  const [detailsBox, resetBox, notificationBox, accountBox] = await Promise.all(
    [
      detailsLink.boundingBox(),
      resetButton.boundingBox(),
      notificationButton.boundingBox(),
      accountMenu.boundingBox(),
    ],
  );
  assert.ok(
    detailsBox && resetBox && notificationBox && accountBox,
    `${label} preference or global header actions missing`,
  );
  const preferenceActionRight = Math.max(
    detailsBox.x + detailsBox.width,
    resetBox.x + resetBox.width,
  );
  const globalToolLeft = Math.min(notificationBox.x, accountBox.x);
  assert.ok(
    globalToolLeft - preferenceActionRight >= 12,
    `${label} preference actions must leave a 12px gap before the global tools: ${JSON.stringify(
      {
        detailsBox,
        resetBox,
        notificationBox,
        accountBox,
      },
    )}`,
  );
}

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const label = `${width}x${height}`;
    attachDiagnostics(page, label);

    await page.goto(`${baseUrl}/personal-center`, { waitUntil: "networkidle" });
    await assertNoOverflow(page, `${label} home`);
    const homeAccountMenuBox = await page
      .getByRole("button", { name: /账户菜单/ })
      .boundingBox();
    assert.ok(homeAccountMenuBox, `${label} home account menu missing`);

    if (width >= 1280) {
      const desktopHomeLayout = await page.evaluate(() => {
        const sidebar = document.querySelector(
          'aside[aria-label="个人中心侧栏"]',
        );
        const content = document.querySelector("#personal-content");
        const contentInner = content?.firstElementChild;
        const accountMenu = document.querySelector(
          'button[aria-label*="账户菜单"]',
        );
        const featureHeading = document.querySelector("#more-features-title");
        const featureSection = featureHeading?.closest("section");
        if (
          !sidebar ||
          !content ||
          !contentInner ||
          !accountMenu ||
          !featureSection
        )
          return null;

        const sidebarRect = sidebar.getBoundingClientRect();
        const contentInnerRect = contentInner.getBoundingClientRect();
        const accountMenuRect = accountMenu.getBoundingClientRect();
        const featureRect = featureSection.getBoundingClientRect();
        return {
          sidebarLeft: sidebarRect.left,
          sidebarTop: sidebarRect.top,
          sidebarRightGap: window.innerWidth - sidebarRect.right,
          sidebarBottomGap: window.innerHeight - sidebarRect.bottom,
          topActionGap: contentInnerRect.top - accountMenuRect.bottom,
          contentOverflow: content.scrollHeight - content.clientHeight,
          featureBottom: featureRect.bottom,
          viewportHeight: window.innerHeight,
        };
      });

      assert.ok(desktopHomeLayout, `${label} desktop home metrics missing`);
      assert.ok(
        desktopHomeLayout.sidebarLeft >= 16 &&
          desktopHomeLayout.sidebarTop >= 16 &&
          desktopHomeLayout.sidebarBottomGap >= 16 &&
          desktopHomeLayout.sidebarRightGap > 16,
        `${label} sidebar must float inside the shared canvas: ${JSON.stringify(desktopHomeLayout)}`,
      );
      assert.ok(
        desktopHomeLayout.topActionGap >= 14,
        `${label} home cards need breathing room below the avatar: ${JSON.stringify(desktopHomeLayout)}`,
      );
      assert.ok(
        desktopHomeLayout.contentOverflow <= 1 &&
          desktopHomeLayout.featureBottom <=
            desktopHomeLayout.viewportHeight - 12,
        `${label} more features must remain in the first screen: ${JSON.stringify(desktopHomeLayout)}`,
      );
    }

    await page.screenshot({
      path: path.join(evidenceDir, `${label}-home.png`),
      fullPage: true,
    });

    if (width === 390) {
      const trigger = page.getByRole("button", { name: /账户菜单/ });
      await trigger.click();
      await page.getByRole("navigation", { name: "账户快捷导航" }).waitFor();
      await page.screenshot({
        path: path.join(evidenceDir, `${label}-avatar-popover.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
    }

    if (width >= 1280) {
      await page.goto(`${baseUrl}/personal-center/preferences`, {
        waitUntil: "networkidle",
      });
      await page
        .getByRole("heading", { name: "旅行偏好", exact: true })
        .waitFor();
      await assertNoOverflow(page, `${label} preferences`);
      await assertPreferenceActionsClearGlobalTools(page, label);
    }

    await page.goto(`${baseUrl}/personal-center/account`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("heading", { name: "个人资料", exact: true })
      .waitFor();
    await assertNoOverflow(page, `${label} account`);
    await assertAccountEditDoesNotOverlapAvatar(page, label, width);
    const accountAccountMenuBox = await page
      .getByRole("button", { name: /账户菜单/ })
      .boundingBox();
    assert.ok(accountAccountMenuBox, `${label} account menu missing`);
    assert.ok(
      Math.abs(homeAccountMenuBox.y - accountAccountMenuBox.y) <= 1,
      `${label} home and account avatars must share the same vertical position: ${JSON.stringify(
        {
          home: homeAccountMenuBox,
          account: accountAccountMenuBox,
        },
      )}`,
    );

    if (width >= 1280) {
      const desktopAccountLayout = await page.evaluate(() => {
        const content = document.querySelector("#personal-content");
        const accountPage = document.querySelector("[data-account-page]");
        const pageTitle = accountPage?.querySelector("h1");
        const contactTitle = Array.from(
          accountPage?.querySelectorAll("h2") ?? [],
        ).find((heading) => heading.textContent === "联系方式");
        const contactCard = contactTitle?.closest("section");
        const contactRows = Array.from(
          contactCard?.querySelectorAll("dl > div") ?? [],
        );
        const accountEntryTitle = document.querySelector(
          "#account-entry-title",
        );
        const accountEntrySection = accountEntryTitle?.closest("section");
        if (!content || !pageTitle || !contactCard || !accountEntrySection) {
          return null;
        }

        const titleRect = pageTitle.getBoundingClientRect();
        const contactRect = contactCard.getBoundingClientRect();
        const entryRect = accountEntrySection.getBoundingClientRect();
        return {
          titleWidth: titleRect.width,
          contactHeight: contactRect.height,
          contactRowCount: contactRows.length,
          contactRowHeights: contactRows.map(
            (row) => row.getBoundingClientRect().height,
          ),
          contentOverflow: content.scrollHeight - content.clientHeight,
          entryBottom: entryRect.bottom,
          contentBottom: content.getBoundingClientRect().bottom,
          bottomGap: content.getBoundingClientRect().bottom - entryRect.bottom,
        };
      });

      assert.ok(desktopAccountLayout, `${label} account metrics missing`);
      assert.ok(
        desktopAccountLayout.titleWidth > 40,
        `${label} account title must be visible: ${JSON.stringify(desktopAccountLayout)}`,
      );
      assert.equal(desktopAccountLayout.contactRowCount, 2);
      assert.ok(
        Math.abs(
          desktopAccountLayout.contactRowHeights[0] -
            desktopAccountLayout.contactRowHeights[1],
        ) <= 1,
        `${label} contact rows must share the card evenly: ${JSON.stringify(desktopAccountLayout)}`,
      );
      assert.ok(
        desktopAccountLayout.contentOverflow <= 1 &&
          desktopAccountLayout.entryBottom <=
            desktopAccountLayout.contentBottom &&
          desktopAccountLayout.bottomGap >= 0 &&
          desktopAccountLayout.bottomGap <= 24,
        `${label} account layout must fill one screen: ${JSON.stringify(desktopAccountLayout)}`,
      );
    }

    await page.screenshot({
      path: path.join(evidenceDir, `${label}-account-view.png`),
      fullPage: true,
    });

    if (width >= 1280) {
      const accountSubpages = [
        ["/personal-center/account/security", "登录与安全", "security"],
        ["/personal-center/account/privacy", "数据与隐私", "privacy"],
        [
          "/personal-center/account/booking-sync",
          "预订与账户同步",
          "booking-sync",
        ],
        [
          "/personal-center/account/privacy/delete",
          "删除账户",
          "delete-account",
        ],
      ];
      for (const [route, heading, slug] of accountSubpages) {
        const response = await page.goto(`${baseUrl}${route}`, {
          waitUntil: "networkidle",
        });
        assert.equal(response?.status(), 200, `${label} ${route}`);
        await page
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        await assertNoOverflow(page, `${label} ${route}`);
        const subpageLayout = await page.evaluate(() => {
          const content = document.querySelector("#personal-content");
          const root = document.querySelector("[data-account-subpage]");
          if (!content || !root) return null;
          const clippedSections = Array.from(root.querySelectorAll("section"))
            .map((section) => section.scrollHeight - section.clientHeight)
            .filter((overflow) => overflow > 1);
          return {
            contentOverflow: content.scrollHeight - content.clientHeight,
            rootBottom: root.getBoundingClientRect().bottom,
            contentBottom: content.getBoundingClientRect().bottom,
            bottomGap:
              content.getBoundingClientRect().bottom -
              root.getBoundingClientRect().bottom,
            clippedSections,
          };
        });
        assert.ok(subpageLayout, `${label} ${route} metrics missing`);
        assert.ok(
          subpageLayout.contentOverflow <= 1 &&
            subpageLayout.rootBottom <= subpageLayout.contentBottom &&
            subpageLayout.bottomGap >= 0 &&
            subpageLayout.bottomGap <= 16 &&
            subpageLayout.clippedSections.length === 0,
          `${label} ${route} must fill one screen without clipping: ${JSON.stringify(subpageLayout)}`,
        );
        await page.screenshot({
          path: path.join(evidenceDir, `${label}-${slug}.png`),
          fullPage: true,
        });
      }
    }
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page, "functional");
  await page.goto(`${baseUrl}/personal-center`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("link", { name: "账户", exact: true }).click();
  await page.getByRole("heading", { name: "个人资料", exact: true }).waitFor();

  const initialEditButton = page.getByRole("button", { name: "编辑资料" });
  if (await initialEditButton.count()) await initialEditButton.click();
  const nickname = page.getByLabel(/昵称/);
  await nickname.fill("");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.getByText("请输入昵称").waitFor();
  await nickname.fill("Yuki Preview");

  await page.getByLabel("国家 / 地区", { exact: true }).selectOption("美国");
  assert.equal(
    await page.getByLabel("时区").inputValue(),
    "Asia/Tokyo",
    "region must not overwrite a manual timezone",
  );
  await page.getByRole("button", { name: /采用时区建议/ }).click();
  assert.equal(
    await page.getByLabel("时区").inputValue(),
    "America/Los_Angeles",
  );

  const avatarInput = page.locator('input[type="file"]');
  await avatarInput.setInputFiles(
    path.resolve(
      "public/media/personal-center/photoreal-v3/sidebar-torii-photo.webp",
    ),
  );
  await page.getByAltText("本地头像预览").waitFor();
  await page
    .locator("#personal-content")
    .evaluate((element) => (element.scrollTop = 0));
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-account-edit-avatar.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "删除头像" }).click();
  assert.equal(
    await page.locator('[data-kind="default"]').count(),
    1,
    "remove returns to the real default placeholder",
  );
  await page.getByRole("button", { name: "恢复默认头像" }).click();
  assert.equal(await page.locator('[data-kind="default"]').count(), 1);

  await page.getByRole("button", { name: "取消" }).last().click();
  assert.equal(await page.getByText("Yuki Preview").count(), 0);

  await page.getByRole("button", { name: "编辑资料" }).click();
  await nickname.fill("Yuki Saved");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.getByText("已保存", { exact: true }).waitFor();

  await page.getByRole("button", { name: /添加紧急联系人/ }).click();
  const contactDialog = page.getByRole("dialog", {
    name: "添加紧急联系人",
  });
  await contactDialog.getByRole("button", { name: "保存联系人" }).click();
  await contactDialog.getByText("请输入姓名").waitFor();
  await contactDialog.getByLabel(/姓名/).fill("山田太郎");
  await contactDialog.getByLabel(/与您的关系/).fill("父亲");
  await contactDialog.getByLabel(/手机号码/).fill("90-1234-5678");
  await contactDialog.getByRole("button", { name: "保存联系人" }).click();
  await page.getByRole("heading", { name: "山田太郎" }).waitFor();
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-emergency-contact.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "编辑", exact: true }).last().click();
  const editDialog = page.getByRole("dialog", {
    name: "编辑紧急联系人",
  });
  await editDialog.getByLabel(/与您的关系/).fill("家人");
  await editDialog.getByRole("button", { name: "保存联系人" }).click();
  await page.getByText(/家人 · \+81 90-1234-5678/).waitFor();
  await page.getByRole("button", { name: "删除", exact: true }).last().click();
  const deleteDialog = page.getByRole("dialog", {
    name: "删除这位紧急联系人？",
  });
  await deleteDialog.getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "删除", exact: true }).last().click();
  await deleteDialog.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("heading", { name: "山田 太郎" }).waitFor();

  await nickname.fill("Unsaved Name");
  await page.getByRole("link", { name: "我的旅行", exact: true }).click();
  const unsavedDialog = page.getByRole("dialog", {
    name: "您有尚未保存的修改",
  });
  await unsavedDialog.waitFor();
  await page.screenshot({
    path: path.join(evidenceDir, "1440x900-unsaved-sidebar.png"),
    fullPage: true,
  });
  await unsavedDialog.getByRole("button", { name: "继续编辑" }).click();
  assert.match(page.url(), /\/personal-center\/account$/);

  const avatarTrigger = page.getByRole("button", { name: /账户菜单/ });
  await avatarTrigger.click();
  await page
    .getByRole("link", { name: "我的旅行", exact: true })
    .last()
    .click();
  await unsavedDialog.waitFor();
  await unsavedDialog.getByRole("button", { name: "继续编辑" }).click();
  await page.keyboard.press("Escape");

  await page.evaluate(() => window.history.back());
  await unsavedDialog.waitFor();
  await unsavedDialog.getByRole("button", { name: "继续编辑" }).click();
  assert.match(page.url(), /\/personal-center\/account$/);

  await page.getByRole("button", { name: "取消" }).last().click();
  if ((await avatarTrigger.getAttribute("aria-expanded")) === "true") {
    await avatarTrigger.click();
  }
  await page.waitForTimeout(80);
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "true");
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");
  await avatarTrigger.click();
  await page.waitForTimeout(80);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(
    await avatarTrigger.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await avatarTrigger.click();
  await page.mouse.click(520, 520);
  await page.waitForTimeout(80);
  assert.equal(await avatarTrigger.getAttribute("aria-expanded"), "false");

  const routes = [
    ["/personal-center", "我的首页"],
    ["/personal-center/trips", "我的旅行"],
    ["/personal-center/preferences", "旅行偏好"],
    ["/personal-center/companions", "同行人"],
    ["/personal-center/account", "账户"],
  ];
  for (const [route, activeLabel] of routes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
    const currentLinks = page.locator('a[aria-current="page"]');
    assert.equal(await currentLinks.count(), 1, `${route} active nav count`);
    await currentLinks
      .locator("span")
      .filter({ hasText: activeLabel })
      .first()
      .waitFor();
  }

  const primaryPageTitles = [
    ["/personal-center/trips", "我的旅行"],
    ["/personal-center/preferences", "旅行偏好"],
    ["/personal-center/companions", "同行人"],
    ["/personal-center/account", "账户"],
  ];
  const primaryTitleMetrics = [];
  const primaryFlowerMetrics = [];
  for (const [route, title] of primaryPageTitles) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const heading = page.locator("[data-primary-page-title]");
    const flower = page.locator("[data-title-flower]");
    await heading.waitFor();
    assert.equal(await heading.textContent(), title);
    assert.equal(
      await flower.count(),
      1,
      `${route} must render one title flower cluster`,
    );
    primaryTitleMetrics.push(
      await heading.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          top: element.getBoundingClientRect().top,
          height: element.getBoundingClientRect().height,
        };
      }),
    );
    primaryFlowerMetrics.push(
      await flower.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          fontSize: style.fontSize,
          textShadow: style.textShadow,
          top: element.getBoundingClientRect().top,
        };
      }),
    );
  }
  assert.equal(
    new Set(primaryTitleMetrics.map(({ fontSize }) => fontSize)).size,
    1,
    `primary page title font sizes differ: ${JSON.stringify(primaryTitleMetrics)}`,
  );
  assert.equal(
    new Set(primaryTitleMetrics.map(({ lineHeight }) => lineHeight)).size,
    1,
    `primary page title line heights differ: ${JSON.stringify(primaryTitleMetrics)}`,
  );
  assert.ok(
    Math.max(...primaryTitleMetrics.map(({ height }) => height)) -
      Math.min(...primaryTitleMetrics.map(({ height }) => height)) <=
      1,
    `primary page title heights differ: ${JSON.stringify(primaryTitleMetrics)}`,
  );
  assert.ok(
    Math.max(...primaryTitleMetrics.map(({ top }) => top)) -
      Math.min(...primaryTitleMetrics.map(({ top }) => top)) <=
      2,
    `primary page title positions differ: ${JSON.stringify(primaryTitleMetrics)}`,
  );
  assert.ok(
    primaryFlowerMetrics.every(
      ({ fontSize, textShadow, top }, index) =>
        fontSize === "42px" &&
        textShadow !== "none" &&
        !textShadow.includes("rgb(245, 177, 186)") &&
        Math.abs(primaryTitleMetrics[index].top - top) <= 2,
    ),
    `primary pages must use one large blossom aligned to the title: ${JSON.stringify(
      {
        titles: primaryTitleMetrics,
        flowers: primaryFlowerMetrics,
      },
    )}`,
  );

  for (const route of [
    "/personal-center/account/security",
    "/personal-center/account/privacy",
    "/personal-center/account/booking-sync",
    "/personal-center/account/privacy/delete",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, route);
  }
  await page.goBack({ waitUntil: "networkidle" });
  await page.goForward({ waitUntil: "networkidle" });
  await assertNoOverflow(page, "functional final");
  await context.close();
} finally {
  await browser.close();
}

assert.deepEqual(consoleProblems, [], consoleProblems.join("\n"));
console.log([...new Set(nonBlockingObservations)].join("\n"));
console.log(`WBS-5.4-B-V2 browser QA passed; evidence: ${evidenceDir}`);
