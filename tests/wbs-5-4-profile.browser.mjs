// Run with an external Playwright installation; no website dependency is added.
// TRAVELASSIST_PLAYWRIGHT = absolute path to playwright package directory.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium, expect } = require(
  process.env.TRAVELASSIST_PLAYWRIGHT || "playwright/test",
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const origin = process.env.TRAVELASSIST_TEST_URL || "http://127.0.0.1:3000";
const output = "docs/tasks/evidence/WBS-5.4-B";
await mkdir(output, { recursive: true });
const consoleErrors = [],
  baselineWarnings = [],
  requests = [],
  results = [],
  viewports = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (message) => {
  const location = message.location().url;
  if (location === origin + "/favicon.ico" && message.text().includes("404")) {
    baselineWarnings.push({ url: location, message: message.text() });
    return;
  }
  if (["error", "warning"].includes(message.type()))
    consoleErrors.push(message.text());
});
page.on("request", (request) =>
  requests.push({ method: request.method(), url: request.url() }),
);
async function step(name, action) {
  await action();
  results.push({ name, result: "Passed" });
  console.log("PASS " + name);
}
const profile = () => page.locator('section[aria-labelledby="profile-title"]');
const settings = () =>
  page.locator('section[aria-labelledby="settings-title"]');
const emergency = () =>
  page.locator('section[aria-labelledby="emergency-title"]');
const dialog = () => page.getByRole("dialog");
const nickname = () => page.getByRole("textbox", { name: /昵称.*必填/ });
async function open() {
  await page.goto(origin + "/personal-center/account");
  await expect(
    page.getByRole("heading", { name: "账户", exact: true }),
  ).toBeVisible();
}
async function editProfile() {
  await profile().getByRole("button", { name: "编辑个人资料" }).click();
}
async function fillEmergency(name = "Test Contact") {
  await dialog()
    .getByRole("textbox", { name: /姓名.*必填/ })
    .fill(name);
  await dialog()
    .getByRole("textbox", { name: /关系.*必填/ })
    .fill("朋友");
  await dialog()
    .getByRole("combobox", { name: /国家.*区号.*必填/ })
    .selectOption("日本 +81");
  await dialog()
    .getByRole("textbox", { name: /电话.*必填/ })
    .fill("090 0000 0000");
}
try {
  await open();
  await step(
    "Profile default view / Contact read-only / Verified",
    async () => {
      await expect(profile().getByText("Yuki", { exact: true })).toBeVisible();
      assert.equal(await profile().locator("input,select").count(), 0);
      const summary = page.locator('section[aria-labelledby="contact-title"]');
      await expect(
        summary.getByText("yu***@gmail.com", { exact: false }),
      ).toBeVisible();
      assert.equal(
        await summary.getByText("✓ 已验证", { exact: true }).count(),
        2,
      );
      assert.equal(await summary.locator("input,select,button").count(), 0);
    },
  );
  await step("Profile edit / required error association / cancel", async () => {
    await editProfile();
    await nickname().fill("   ");
    await profile().getByRole("button", { name: "保存修改" }).click();
    await expect(page.getByText("请输入昵称", { exact: true })).toBeVisible();
    await expect(nickname()).toHaveAttribute("aria-invalid", "true");
    await expect(nickname()).toHaveAttribute(
      "aria-describedby",
      "profile-nickname-error",
    );
    await expect(nickname()).toBeFocused();
    await profile().getByRole("button", { name: "取消", exact: true }).click();
    await expect(profile().getByText("Yuki", { exact: true })).toBeVisible();
  });
  await step("Profile save / lightweight feedback", async () => {
    await editProfile();
    await nickname().fill("Yuki Test");
    await profile().getByRole("button", { name: "保存修改" }).click();
    await expect(profile().getByRole("status")).toHaveText("✓ 已保存");
    await expect(
      profile().getByText("Yuki Test", { exact: true }),
    ).toBeVisible();
    await expect(profile().locator('[role="status"]')).toHaveText("", {
      timeout: 3500,
    });
  });
  await step(
    "Avatar local preview / invalid file / delete / restore / cancel",
    async () => {
      await profile().getByRole("button", { name: "更换头像" }).click();
      await dialog()
        .locator('input[type="file"]')
        .setInputFiles({
          name: "invalid.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        });
      await expect(dialog().getByRole("alert")).toBeVisible();
      // In-memory screenshot fixture; never a personal file or network upload.
      const fixture = await page.screenshot();
      await dialog().locator('input[type="file"]').setInputFiles({
        name: "local-preview.png",
        mimeType: "image/png",
        buffer: fixture,
      });
      await expect(profile().getByAltText("个人头像本地预览")).toBeVisible();
      assert.match(
        await profile().getByAltText("个人头像本地预览").getAttribute("src"),
        /^blob:/,
      );
      await profile().getByRole("button", { name: "保存修改" }).click();
      await profile().getByRole("button", { name: "更换头像" }).click();
      await dialog()
        .getByRole("button", { name: "删除头像", exact: true })
        .click();
      await expect(
        profile().getByRole("img", { name: "未设置头像" }),
      ).toBeVisible();
      await profile()
        .getByRole("button", { name: "取消", exact: true })
        .click();
      await expect(profile().getByAltText("个人头像本地预览")).toBeVisible();
      await profile().getByRole("button", { name: "更换头像" }).click();
      await dialog().getByRole("button", { name: "恢复默认头像" }).click();
      await expect(profile().getByLabel("默认头像")).toBeVisible();
      await profile().getByRole("button", { name: "保存修改" }).click();
    },
  );
  await step(
    "Settings every field / region does not overwrite manual values / explicit suggestion",
    async () => {
      await settings().getByRole("button", { name: "编辑基本设置" }).click();
      for (const [id, value] of Object.entries({
        language: "English",
        timezone: "UTC",
        currency: "EUR €",
        distance: "mi",
        temperature: "°F",
        timeFormat: "12 小时",
      }))
        await page.locator("#settings-" + id).selectOption(value);
      await page.locator("#settings-region").selectOption("中国");
      for (const [id, value] of Object.entries({
        timezone: "UTC",
        currency: "EUR €",
        distance: "mi",
        temperature: "°F",
      }))
        await expect(page.locator("#settings-" + id)).toHaveValue(value);
      await settings().getByRole("button", { name: "使用这些建议" }).click();
      await expect(page.locator("#settings-timezone")).toHaveValue(
        "Asia/Shanghai",
      );
      await expect(page.locator("#settings-currency")).toHaveValue("CNY ¥");
      await expect(page.locator("#settings-language")).toHaveValue("English");
      await expect(page.locator("#settings-timeFormat")).toHaveValue("12 小时");
      await settings().getByRole("button", { name: "保存修改" }).click();
      await expect(settings().getByRole("status")).toHaveText("✓ 已保存");
      await settings().getByRole("button", { name: "编辑基本设置" }).click();
      await page.locator("#settings-currency").selectOption("USD $");
      await settings()
        .getByRole("button", { name: "取消", exact: true })
        .click();
      await expect(
        settings().getByText("CNY ¥", { exact: true }),
      ).toBeVisible();
    },
  );
  await step(
    "Emergency empty / validation / add multiple / edit / delete confirmation",
    async () => {
      await expect(emergency().getByText("还没有紧急联系人")).toBeVisible();
      await emergency()
        .getByRole("button", { name: "+ 添加紧急联系人", exact: true })
        .click();
      await dialog().getByRole("button", { name: "保存修改" }).click();
      assert.equal(await dialog().locator('[aria-invalid="true"]').count(), 4);
      await fillEmergency();
      await dialog().getByLabel("Email", { exact: true }).fill("wrong");
      await dialog().getByRole("button", { name: "保存修改" }).click();
      await expect(dialog().getByText("请输入有效的邮箱地址")).toBeVisible();
      await dialog()
        .getByLabel("Email", { exact: true })
        .fill("test@example.com");
      await dialog().getByRole("button", { name: "保存修改" }).click();
      await emergency()
        .getByRole("button", {
          name: "编辑紧急联系人 Test Contact",
          exact: true,
        })
        .click();
      await dialog()
        .getByRole("textbox", { name: /姓名.*必填/ })
        .fill("Edited Contact");
      await dialog().getByRole("button", { name: "保存修改" }).click();
      await emergency()
        .getByRole("button", { name: "+ 添加紧急联系人", exact: true })
        .click();
      await fillEmergency("Second Contact");
      await dialog().getByRole("button", { name: "保存修改" }).click();
      assert.equal(await emergency().locator("li").count(), 2);
      await emergency()
        .getByRole("button", {
          name: "删除紧急联系人 Edited Contact",
          exact: true,
        })
        .click();
      await expect(
        dialog().getByRole("heading", { name: "删除这位紧急联系人？" }),
      ).toBeVisible();
      await dialog().getByRole("button", { name: "取消", exact: true }).click();
      assert.equal(await emergency().locator("li").count(), 2);
      for (const name of ["Edited Contact", "Second Contact"]) {
        await emergency()
          .getByRole("button", { name: "删除紧急联系人 " + name, exact: true })
          .click();
        await dialog()
          .getByRole("button", { name: "删除", exact: true })
          .click();
      }
      await expect(emergency().getByText("还没有紧急联系人")).toBeVisible();
    },
  );
  await step("Unsaved Sidebar / continue / Escape / discard", async () => {
    await editProfile();
    await nickname().fill("Unsaved Sidebar");
    const sidebar = page.getByRole("complementary", { name: "个人中心侧栏" });
    await sidebar.getByRole("link", { name: "我的旅行", exact: true }).click();
    await expect(
      dialog().getByRole("heading", { name: "您有尚未保存的修改" }),
    ).toBeVisible();
    await dialog().getByRole("button", { name: "继续编辑" }).click();
    await expect(nickname()).toHaveValue("Unsaved Sidebar");
    await sidebar.getByRole("link", { name: "我的旅行", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(dialog()).toHaveCount(0);
    await sidebar.getByRole("link", { name: "我的旅行", exact: true }).click();
    await dialog().getByRole("button", { name: "放弃修改" }).click();
    await expect(page).toHaveURL(origin + "/personal-center/trips");
    await open();
  });
  await step("Unsaved Avatar Popover / continue / discard", async () => {
    await editProfile();
    await nickname().fill("Unsaved Avatar");
    await page.getByRole("button", { name: "打开账户菜单" }).click();
    await page
      .getByRole("navigation", { name: "账户快捷导航" })
      .getByRole("link", { name: "我的旅行", exact: true })
      .click();
    await expect(
      dialog().getByRole("heading", { name: "您有尚未保存的修改" }),
    ).toBeVisible();
    await dialog().getByRole("button", { name: "继续编辑" }).click();
    await expect(nickname()).toHaveValue("Unsaved Avatar");
    // Modal may dismiss a native popover. Observe the trigger state before reopening.
    const trigger = page.getByRole("button", { name: "打开账户菜单" });
    if ((await trigger.getAttribute("aria-expanded")) !== "true")
      await trigger.click();
    await page
      .getByRole("navigation", { name: "账户快捷导航" })
      .getByRole("link", { name: "我的旅行", exact: true })
      .click();
    await dialog().getByRole("button", { name: "放弃修改" }).click();
    await expect(page).toHaveURL(origin + "/personal-center/trips");
    await open();
  });
  await step("beforeunload / no persistence after reload", async () => {
    await editProfile();
    await nickname().fill("Reload Test");
    const unloading = new Promise((resolve) =>
      page.once("dialog", async (event) => {
        assert.equal(event.type(), "beforeunload");
        await event.accept();
        resolve();
      }),
    );
    await page.reload();
    await unloading;
    await expect(profile().getByText("Yuki", { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.equal((await context.cookies()).length, 0);
  });
  await step(
    "Three account entries / breadcrumbs / return navigation",
    async () => {
      for (const [slug, title] of [
        ["security", "登录与安全"],
        ["privacy", "数据与隐私"],
        ["booking-sync", "预订与账户同步"],
      ]) {
        await page
          .getByRole("navigation", { name: "账户管理" })
          .getByRole("link")
          .filter({
            has: page.getByRole("heading", { name: title, exact: true }),
          })
          .click();
        await expect(page).toHaveURL(
          origin + "/personal-center/account/" + slug,
        );
        await expect(
          page.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("navigation", { name: "面包屑" }),
        ).toBeVisible();
        await page.getByRole("link", { name: "← 返回账户" }).click();
      }
    },
  );
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await open();
    const metrics = await page.evaluate(() => {
      const main = document.querySelector("main");
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        mainWidth: main.clientWidth,
        mainScrollWidth: main.scrollWidth,
      };
    });
    assert.ok(
      metrics.documentWidth <= width &&
        metrics.mainScrollWidth <= metrics.mainWidth + 1,
      JSON.stringify(metrics),
    );
    const entries = await page
      .getByRole("navigation", { name: "账户管理" })
      .getByRole("link")
      .evaluateAll((elements) =>
        elements.map((el) => ({
          x: el.getBoundingClientRect().x,
          y: el.getBoundingClientRect().y,
        })),
      );
    if (width < 768)
      assert.ok(entries.every((entry) => entry.x === entries[0].x));
    await page.screenshot({
      path: output + `/account-${width}x${height}.png`,
      fullPage: true,
    });
    await editProfile();
    await nickname().fill("Keyboard Test");
    await nickname().press("Tab");
    const focus = await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      outline: getComputedStyle(document.activeElement).outlineStyle,
    }));
    assert.equal(focus.tag, "INPUT");
    assert.notEqual(focus.outline, "none");
    const editOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      return {
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        mainWidth: main.clientWidth,
        mainScrollWidth: main.scrollWidth,
      };
    });
    assert.ok(
      editOverflow.documentWidth <= width &&
        editOverflow.mainScrollWidth <= editOverflow.mainWidth + 1,
    );
    if (width === 1440 || width === 320) {
      await page.screenshot({
        path: output + `/edit-${width}x${height}.png`,
        fullPage: true,
      });
    }
    await profile().getByRole("button", { name: "取消", exact: true }).click();
    await emergency()
      .getByRole("button", { name: "+ 添加紧急联系人", exact: true })
      .click();
    const box = await dialog().boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width + 1 &&
        box.y + box.height <= height + 1,
    );
    // Native modal traps keyboard focus, including repeated forward/reverse Tab.
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press(index % 2 ? "Shift+Tab" : "Tab");
      assert.equal(
        await page.evaluate(() =>
          document
            .querySelector("dialog[open]")
            .contains(document.activeElement),
        ),
        true,
      );
    }
    await page.screenshot({
      path: output + `/dialog-${width}x${height}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(dialog()).toHaveCount(0);
    await expect(
      emergency().getByRole("button", {
        name: "+ 添加紧急联系人",
        exact: true,
      }),
    ).toBeFocused();
    viewports.push({ width, height, metrics, dialog: box, result: "Passed" });
    console.log("PASS viewport " + width + "x" + height);
  }
  await step(
    "No upload requests / console errors / hydration errors / React warnings",
    async () => {
      assert.equal(
        requests.filter((request) => request.method !== "GET").length,
        0,
      );
      assert.deepEqual(consoleErrors, []);
    },
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await open();
  await page
    .getByRole("navigation", { name: "账户管理" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/account-entries-1440x900.png" });
  await step("Keyboard submit / settings navigation guard", async () => {
    await profile().getByRole("button", { name: "编辑个人资料" }).focus();
    await page.keyboard.press("Enter");
    await nickname().focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Keyboard Saved");
    await nickname().press("Enter");
    await expect(
      profile().getByText("Keyboard Saved", { exact: true }),
    ).toBeVisible();
    await settings().getByRole("button", { name: "编辑基本设置" }).focus();
    await page.keyboard.press("Enter");
    await page.locator("#settings-language").focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Tab");
    await page
      .getByRole("complementary", { name: "个人中心侧栏" })
      .getByRole("link", { name: "我的旅行", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      dialog().getByRole("heading", { name: "您有尚未保存的修改" }),
    ).toBeVisible();
    await page.screenshot({ path: output + "/unsaved-guard-1440x900.png" });
    await dialog().getByRole("button", { name: "继续编辑" }).focus();
    await page.keyboard.press("Enter");
    await settings().getByRole("button", { name: "取消", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      settings().getByRole("button", { name: "编辑基本设置" }),
    ).toBeVisible();
  });
  await writeFile(
    output + "/browser-results.json",
    JSON.stringify(
      {
        browser: await browser.version(),
        persistence: "Mock / in-memory only",
        results,
        viewports,
        consoleErrors,
        baselineWarnings,
        nonGetRequests: requests.filter((request) => request.method !== "GET"),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("FAILED", error);
  await page.screenshot({ path: output + "/failure.png", fullPage: true });
  await writeFile(
    output + "/failure.json",
    JSON.stringify({ error: String(error), results, consoleErrors }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
