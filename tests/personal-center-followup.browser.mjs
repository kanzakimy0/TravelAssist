import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
assert.ok(
  process.env.CODEX_PLAYWRIGHT_PATH,
  "Reuse CODEX_PLAYWRIGHT_PATH; do not install a project dependency",
);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const baseline = process.env.WBS_BASELINE === "1";
const evidence = path.resolve(
  process.env.WBS_EVIDENCE_DIR ?? "docs/evidence/WBS-5.10-B-FOLLOWUP-1",
);
const baseUrl = process.env.WBS_BASE_URL ?? "http://localhost:3001";
const browserName = process.env.WBS_BROWSER ?? "edge";
const screenshotDir = path.resolve(
  process.env.WBS_SCREENSHOT_DIR ??
    ".next/qa/WBS-5.10-B-FOLLOWUP-1/screenshots",
);
const browser = await chromium.launch(
  browserName === "edge" ? { channel: "msedge" } : {},
);
const viewports = [
  [2560, 1440],
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 740],
];
const routes = ["", "/trips", "/companions", "/account"];
const results = [];
const diagnostics = [];
const knownBaseline = [];
const functional = [];
const previous = baseline
  ? null
  : JSON.parse(
      await readFile(path.join(evidence, "before-edge-matrix.json"), "utf8"),
    );

function observe(page) {
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.location().url.endsWith("/favicon.ico"))
      knownBaseline.push("Missing favicon.ico (unchanged baseline)");
    else diagnostics.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    if (response.url().endsWith("/favicon.ico"))
      knownBaseline.push(`${response.status()} favicon.ico`);
    else diagnostics.push(`${response.status()} ${response.url()}`);
  });
}

async function visibleOnScreen(locator) {
  await locator.scrollIntoViewIfNeeded();
  assert.ok(
    await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < innerHeight;
    }),
  );
}

async function checkLibrary(page, label) {
  const hero = page.locator("[data-trip-hero]");
  await hero.waitFor();
  assert.ok(!(await hero.getAttribute("data-trip-hero")).startsWith("draft-"));
  assert.equal(
    await page.locator("#active-trip-heading").innerText(),
    "全部旅行",
  );
  assert.equal(await page.getByLabel("排序方式").inputValue(), "departureAsc");
  const cards = page.locator("#all-trip-cards > article");
  const first = await cards.evaluateAll((els) =>
    els.map((el) => el.dataset.testid),
  );
  assert.equal(first.length, 8);
  assert.ok(first.some((id) => id.startsWith("draft-card-")));
  assert.ok(first.some((id) => id.startsWith("trip-card-")));
  assert.ok(
    !first.includes(`trip-card-${await hero.getAttribute("data-trip-hero")}`),
  );
  assert.ok(
    first.every((id) => !id.includes("history-") && !id.includes("favorite-")),
  );
  assert.ok(
    (await page.locator("#all-trip-cards").innerText()).includes("规划完成度"),
  );
  assert.ok(
    (await page.locator("#all-trip-cards").innerText()).includes(
      "最后编辑时间",
    ),
  );
  const next = page.getByRole("button", { name: "下一页", exact: true });
  await visibleOnScreen(next);
  await next.focus();
  await page.keyboard.press("Enter");
  const second = await cards.evaluateAll((els) =>
    els.map((el) => el.dataset.testid),
  );
  assert.equal(second.length, 1);
  assert.equal(new Set([...first, ...second]).size, 9);
  await visibleOnScreen(cards.first().getByRole("link"));
  await page.screenshot({
    path: path.join(screenshotDir, `${label}-page2.jpg`),
    type: "jpeg",
    quality: 75,
  });
  await page.getByLabel("搜索行程名称或目的地").fill("不存在的旅行xyz");
  assert.equal(await hero.count(), 0);
  assert.equal(await cards.count(), 0);
  await page.getByLabel("搜索行程名称或目的地").fill("东京");
  assert.equal(
    await hero.count(),
    0,
    "dated Draft is not Hero even when it is the only result",
  );
  assert.equal(await cards.count(), 1);
  await page.getByRole("tab", { name: /^草稿/ }).click();
  const target = page.locator("article").filter({
    has: page.getByRole("heading", { name: "东京亲子周末", exact: true }),
  });
  await target.getByRole("button", { name: "删除", exact: true }).click();
  const dialog = page.locator("dialog[open]");
  assert.ok((await dialog.innerText()).includes("外部"));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  assert.equal(await target.count(), 1);
  await page.getByRole("tab", { name: /^全部/ }).click();
  assert.equal(await cards.count(), 8, "filter/tab resets pagination");
  await page.getByRole("tab", { name: /^历史/ }).click();
  assert.ok(
    (
      await page.locator('[data-library-section="history"]').innerText()
    ).includes("旅行足迹"),
  );
  await page.getByRole("tab", { name: /^收藏/ }).click();
  assert.ok(
    await page.locator('[data-library-section="favorites"]').isVisible(),
  );
  functional.push(
    `${label}: All/Draft/Hero/page2/search/reset/history/favorites PASS`,
  );
}

async function checkCompanion(page, width, label) {
  if (width >= 1440) {
    const grid = page.locator('[class*="companionGrid"]');
    const bounds = await grid.locator(":scope > *").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { y: r.y, width: r.width };
      }),
    );
    assert.equal(bounds[0].y, bounds[2].y);
    assert.ok(bounds[3].y > bounds[0].y, `${label}: three columns`);
    const groups = await page
      .locator('[aria-labelledby="groups-title"]')
      .boundingBox();
    const needs = await page
      .locator('[aria-labelledby="needs-title"]')
      .boundingBox();
    assert.equal(groups.y, needs.y);
    assert.ok(
      groups.width / needs.width > 1.4 && groups.width / needs.width < 1.6,
    );
  }
  const add = page.getByRole("button", { name: "添加同行人", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog", { name: "添加同行人", exact: true });
  await dialog.waitFor();
  await visibleOnScreen(dialog.getByRole("button", { name: "关闭编辑窗口" }));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "添加同行人",
  );
  assert.ok(await add.evaluate((el) => document.activeElement === el));
  if (width >= 768 && width < 1024) {
    const trigger = page.getByRole("button", { name: "打开个人中心导航" });
    await trigger.click();
    await page.locator('body[data-personal-drawer-open="true"]').waitFor();
    await page.keyboard.press("Escape");
    await page
      .locator('body[data-personal-drawer-open="true"]')
      .waitFor({ state: "detached" });
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "打开个人中心导航",
    );
    assert.ok(await trigger.evaluate((el) => document.activeElement === el));
  }
  functional.push(`${label}: Companion editor/Sheet/Escape/focus return PASS`);
}

async function checkAccount(page, width, label) {
  const profile = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "个人资料", exact: true }),
    })
    .last();
  const before = await profile.boundingBox();
  if (width >= 1440) {
    const contact = await page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "联系方式", exact: true }),
      })
      .last()
      .boundingBox();
    assert.ok(
      before.width / contact.width > 1.6 && before.width / contact.width < 2.2,
      `${label}: primary/secondary ratio`,
    );
  }
  await page.getByRole("button", { name: "编辑资料", exact: true }).click();
  const after = await profile.boundingBox();
  if (width >= 1440) {
    assert.ok(
      Math.abs(before.width - after.width) < 1 &&
        Math.abs(before.height - after.height) < 2,
      `${label}: edit layout stable`,
    );
    await page.screenshot({
      path: path.join(screenshotDir, `${label}-editing.jpg`),
      type: "jpeg",
      quality: 75,
    });
  }
  const nickname = page.getByLabel("昵称", { exact: false });
  await nickname.fill("Follow-up QA");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  assert.ok((await profile.innerText()).includes("Yuki"));
  assert.ok(!(await profile.innerText()).includes("Follow-up QA"));
  functional.push(`${label}: account edit/cancel/readonly PASS`);
}
await mkdir(evidence, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height },
      timezoneId: "Asia/Tokyo",
    });
    const page = await context.newPage();
    observe(page);
    for (const route of routes) {
      await page.goto(`${baseUrl}/personal-center${route}`, {
        waitUntil: "networkidle",
      });
      await page.locator("h1").waitFor({ state: "attached" });
      const metrics = await page.evaluate(() => {
        const root = document.querySelector(
          "[data-companion-page], [data-account-page]",
        );
        const rectangle = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          root: root ? rectangle(root) : null,
          sections: root
            ? [...root.querySelectorAll("section")]
                .filter((el) => !el.closest("dialog"))
                .map(rectangle)
            : [],
        };
      });
      assert.ok(
        metrics.overflow <= 1,
        `${route} ${width}: overflow ${metrics.overflow}`,
      );
      const label = `${browserName}-${route.slice(1) || "home"}-${width}x${height}`;
      await page.screenshot({
        path: path.join(
          screenshotDir,
          `${baseline ? "before-" : ""}${label}.jpg`,
        ),
        type: "jpeg",
        quality: 75,
        fullPage: true,
      });
      results.push({
        route: `/personal-center${route}`,
        width,
        height,
        ...metrics,
      });
      if (!baseline) {
        if (metrics.root && width >= 1440) {
          assert.ok(
            metrics.root.width <= 1240,
            `${label}: bounded wide content`,
          );
          const content = await page
            .locator('[class*="contentInner"]')
            .boundingBox();
          assert.ok(
            Math.abs(
              metrics.root.x +
                metrics.root.width / 2 -
                content.x -
                content.width / 2,
            ) < 1,
            `${label}: centered`,
          );
        }
        if (metrics.root && width < 1440) {
          const old = previous.results.find(
            (item) =>
              item.route === `/personal-center${route}` && item.width === width,
          );
          assert.equal(metrics.sections.length, old.sections.length);
          for (let i = 0; i < metrics.sections.length; i++)
            for (const key of ["x", "y", "width", "height"])
              assert.ok(
                Math.abs(metrics.sections[i][key] - old.sections[i][key]) < 1,
                `${label}: unchanged compact/tablet/mobile ${i} ${key}`,
              );
        }
        if (route === "/trips") await checkLibrary(page, label);
        if (route === "/companions") await checkCompanion(page, width, label);
        if (route === "/account") await checkAccount(page, width, label);
      }
    }
    await context.close();
  }
  if (!baseline) {
    // Clock scenarios are isolated to Home/Trips. Companion age rendering is deliberately untouched.
    for (const [today, status] of [
      ["2027-02-15", "next"],
      ["2027-02-16", "upcoming"],
      ["2027-03-16", "upcoming"],
      ["2027-03-17", "ongoing"],
      ["2027-03-18", "ongoing"],
      ["2027-03-20", "ongoing"],
      ["2027-03-23", "ongoing"],
      ["2027-03-24", "next"],
    ]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        timezoneId: "Asia/Tokyo",
      });
      const page = await context.newPage();
      observe(page);
      await page.clock.setFixedTime(new Date(`${today}T03:00:00Z`));
      let heroId;
      for (const route of ["", "/trips"]) {
        await page.goto(`${baseUrl}/personal-center${route}`, {
          waitUntil: "networkidle",
        });
        const hero = page.locator(
          route ? "[data-trip-hero]" : "[data-home-hero]",
        );
        await hero.waitFor();
        assert.equal(
          await hero.getAttribute("data-trip-status"),
          status,
          `${today} ${route}`,
        );
        const id = await hero.getAttribute(
          route ? "data-trip-hero" : "data-home-hero",
        );
        if (heroId) assert.equal(id, heroId, "Home and All use identical Hero");
        else heroId = id;
        if (!route) {
          assert.ok((await page.locator("[data-home-preview]").count()) <= 3);
          assert.equal(
            await page.locator(`[data-home-preview="${id}"]`).count(),
            0,
          );
        } else {
          await page.getByRole("tab", { name: /^即将出发/ }).click();
          if (status === "upcoming")
            assert.equal(
              await page
                .locator("[data-trip-hero]")
                .getAttribute("data-trip-status"),
              "upcoming",
            );
          else assert.equal(await page.locator("[data-trip-hero]").count(), 0);
        }
      }
      functional.push(
        `${today}: Home/Trips ${status}, identical Hero, strict Upcoming PASS`,
      );
      await context.close();
    }
  }
  await writeFile(
    path.join(
      evidence,
      `${baseline ? "before-" : ""}${browserName}-matrix.json`,
    ),
    JSON.stringify(
      { results, functional, diagnostics, knownBaseline },
      null,
      2,
    ),
  );
  if (!baseline) assert.deepEqual(diagnostics, []);
  console.log(
    `${baseline ? "BASELINE" : "PASS"}: ${browserName}, ${results.length} route/viewport checks`,
  );
} finally {
  await browser.close();
}
