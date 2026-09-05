// Run with Codex's bundled Playwright; no website dependency is added.
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
const output = "docs/tasks/evidence/WBS-5.4-B-assets";
const networkProblems = [];
const consoleProblems = [];
const results = [];
const viewports = [];

await mkdir(output, { recursive: true });
page.on("pageerror", (error) => consoleProblems.push(error.message));
page.on("console", (message) => {
  const location = message.location().url;
  if (location === `${origin}/favicon.ico` && message.text().includes("404")) {
    return;
  }
  if (["error", "warning"].includes(message.type())) {
    consoleProblems.push(message.text());
  }
});
page.on("response", (response) => {
  if (response.status() >= 400 && response.url() !== `${origin}/favicon.ico`) {
    networkProblems.push({ status: response.status(), url: response.url() });
  }
});
async function step(name, action) {
  await action();
  results.push({ name, result: "Passed" });
  console.log(`PASS ${name}`);
}

const runtimeAssets = [
  "/media/personal-center/hero-kyoto-sakura.webp",
  "/media/personal-center/trip-kyoto-gion.webp",
  "/media/personal-center/trip-osaka-castle.webp",
  "/media/personal-center/trip-hokkaido-winter.webp",
  "/media/personal-center/avatar-yuki.webp",
  "/media/personal-center/travelassist-logo-torii.png",
];

async function openHome() {
  await page.goto(`${origin}/personal-center`);
  await expect(
    page.getByRole("heading", { name: "我的首页", exact: true }),
  ).toBeVisible();
}

try {
  await openHome();
  await step("Six runtime assets return HTTP 200", async () => {
    for (const asset of runtimeAssets) {
      const response = await page.request.get(origin + asset);
      assert.equal(response.status(), 200, asset);
    }
  });
  await step("Kyoto Hero and three approved trip covers render", async () => {
    const hero = page.getByAltText("京都樱花街巷与八坂塔的旅行示例照片");
    await expect(hero).toBeVisible();
    assert.match(await hero.getAttribute("src"), /hero-kyoto-sakura/);
    for (const destination of ["京都", "大阪", "北海道"]) {
      await expect(
        page.getByRole("heading", { name: destination, exact: true }),
      ).toBeVisible();
    }
    const sources = await page
      .locator('a[aria-label*="Mock 行程"] img')
      .evaluateAll((images) => images.map((image) => image.currentSrc));
    assert.equal(sources.length, 3);
    for (const filename of [
      "trip-kyoto-gion",
      "trip-osaka-castle",
      "trip-hokkaido-winter",
    ]) {
      assert.ok(
        sources.some((source) => source.includes(filename)),
        filename,
      );
    }
    assert.equal(await page.locator('img[src*="home-hero-poster"]').count(), 0);
    await expect(
      page.getByRole("heading", { name: "更多功能模块", exact: true }),
    ).toBeVisible();
  });
  await step("Sidebar and top avatar use the Yuki demo image", async () => {
    const visibleAvatars = page.locator('img[src*="avatar-yuki"]:visible');
    await expect(visibleAvatars).toHaveCount(2);
    await expect(
      page.locator('img[src*="travelassist-logo-torii"]'),
    ).toBeVisible();
  });
  await step(
    "Avatar Popover toggle / outside / Escape / focus return",
    async () => {
      const trigger = page.getByRole("button", { name: /打开账户菜单/ });
      await trigger.click();
      await expect(
        page.getByRole("navigation", { name: "账户快捷导航" }),
      ).toBeVisible();
      assert.equal(
        await page.locator('img[src*="avatar-yuki"]:visible').count(),
        3,
      );
      await page.getByRole("button", { name: /关闭账户菜单/ }).click();
      await expect(
        page.getByRole("navigation", { name: "账户快捷导航" }),
      ).toBeHidden();
      await trigger.click();
      await page
        .getByRole("heading", { name: "我的首页", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "账户快捷导航" }),
      ).toBeHidden();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(
        page.getByRole("button", { name: /退出登录/ }),
      ).toBeDisabled();
    },
  );
  await step("Avatar Popover navigation reaches Account", async () => {
    await page
      .getByRole("navigation", { name: "账户快捷导航" })
      .getByRole("link", { name: "账户设置", exact: true })
      .click();
    await expect(page).toHaveURL(`${origin}/personal-center/account`);
    await expect(
      page.getByRole("heading", { name: "账户", exact: true }),
    ).toBeVisible();
    await expect(page.getByAltText("Yuki 的演示头像")).toBeVisible();
    await openHome();
  });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await openHome();
    await page
      .getByRole("heading", { name: "更多功能模块", exact: true })
      .scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('a[aria-label*="Mock 行程"] img')].every(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    );
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
    const cards = await page
      .locator('a[aria-label*="Mock 行程"]')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          width: element.getBoundingClientRect().width,
          y: element.getBoundingClientRect().y,
        })),
      );
    assert.equal(cards.length, 3);
    if (width >= 1280) {
      assert.ok(cards.every((card) => card.y === cards[0].y));
      assert.ok(
        cards.every((card) => Math.abs(card.width - cards[0].width) < 1),
      );
    }
    await page.screenshot({
      path: `${output}/personal-center-${width}x${height}.png`,
      fullPage: true,
    });
    viewports.push({ width, height, metrics, cards, result: "Passed" });
    console.log(`PASS viewport ${width}x${height}`);
  }
  await step(
    "No blocking console, hydration, decode or Image warnings",
    async () => {
      assert.deepEqual(consoleProblems, []);
    },
  );
  assert.deepEqual(networkProblems, []);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(
      { results, viewports, consoleProblems, networkProblems },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("FAILED", error);
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  await writeFile(
    `${output}/failure.json`,
    JSON.stringify({ error: String(error), results, consoleProblems }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
