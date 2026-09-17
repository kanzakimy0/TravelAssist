// Real local pages; faults live only in the browser harness, never in production code.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { minimalRailRouteFixture } from "../src/shared/contracts/routes/fixtures.ts";
const { chromium } = createRequire(import.meta.url)(
  process.env.CODEX_PLAYWRIGHT_PATH || "playwright",
);
const base = process.env.TASK067_URL || "http://127.0.0.1:3167";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const out = path.resolve(
  process.env.TASK067_OUT || ".artifacts/task067/browser",
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = {
  task: "TASK-067-B",
  base,
  mode: process.env.TASK067_MODE || "development-fixtures",
  startedAt: new Date().toISOString(),
  rows: [],
  screenshots: [],
  contrast: [],
  externalRequestsBlocked: 0,
  pageErrors: [],
};
const viewports = process.env.TASK067_ONE_SIZE
  ? [[1440, 900]]
  : [
      [1440, 900],
      [1024, 768],
      [390, 844],
      [320, 568],
    ];
const key = "travelassist.trip-wizard.v1";
const canary = "TASK067_RAW_SQL_AUTHORIZATION_COOKIE_CANARY";
const button = (p, name) => p.getByRole("button", { name, exact: true });
async function checkOverflow(p, label) {
  const v = await p.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(
    v.document <= 1 && v.body <= 1,
    label + " overflow " + JSON.stringify(v),
  );
}
async function contrast(locator, label) {
  const colors = await locator.evaluate((e) => {
    const c = getComputedStyle(e);
    return {
      text: c.color,
      background: c.backgroundColor,
      image: c.backgroundImage,
      outline: c.outlineColor,
    };
  });
  const rgb = (s) =>
    s
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number);
  const lum = (s) =>
    rgb(s)
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      })
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const a = lum(colors.text),
    b = lum(colors.background),
    ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.equal(
    colors.image,
    "none",
    "state action does not inherit a gradient",
  );
  assert(ratio >= 4.5, label + " text contrast " + ratio);
  report.contrast.push({ label, ...colors, ratio });
}
async function capture(p, name) {
  const file = path.join(out, name + ".png");
  await p.screenshot({ path: file });
  report.screenshots.push({
    name: name + ".png",
    sha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
  });
}
async function target(p, locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  assert(
    b && b.width >= 43.9 && b.height >= 43.9,
    "44px target " + JSON.stringify(b),
  );
  assert(
    b.x >= -1 && b.x + b.width <= p.viewportSize().width + 1,
    "target horizontally reachable",
  );
}
async function context(viewport, extra = {}) {
  const ctx = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    ...extra,
  });
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (
      ["http:", "https:"].includes(u.protocol) &&
      u.origin !== new URL(base).origin
    ) {
      report.externalRequestsBlocked++;
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  ctx.on("page", (p) =>
    p.on("pageerror", (e) => report.pageErrors.push(e.message)),
  );
  return ctx;
}
async function openRoute(p, width, height) {
  await p.goto(base + "/planner", { waitUntil: "networkidle" });
  if (width < 768 || height < 700) await button(p, "当天安排").click();
  await p.getByRole("tab", { name: "移动", exact: true }).click();
  const trigger = p.getByRole("button", {
    name: /修改交通：东京晴空塔 → 银座散步/,
  });
  await trigger.click();
  await p.locator("[data-route-query-status]").waitFor();
  return trigger;
}
try {
  for (const [width, height] of viewports) {
    const label = width + "x" + height,
      ctx = await context({ width, height }),
      p = await ctx.newPage();
    p.setDefaultTimeout(20000);
    const row = { viewport: label, checks: [] };
    report.rows.push(row);
    await p.goto(base + "/", { waitUntil: "networkidle" });
    await button(p, "打开 AI 助手").click();
    const ai = p.locator("#home-ai-conversation-panel");
    assert.match(await ai.innerText(), /AI 服务尚未接入/);
    assert(
      await ai
        .getByRole("button", { name: "发送（AI 服务尚未接入）" })
        .isDisabled(),
    );
    const close = ai.getByRole("button", { name: "关闭 AI 助手", exact: true });
    await target(p, close);
    assert.equal(
      await close.evaluate((e) => e === document.activeElement),
      true,
    );
    await ai.getByRole("textbox").fill("本地合成旅行需求");
    assert.equal(await ai.getAttribute("role"), "region");
    await checkOverflow(p, "Home " + label);
    await capture(p, label + "-home-ai");
    await p.keyboard.press("Escape");
    assert(
      await button(p, "打开 AI 助手").evaluate(
        (e) => e === document.activeElement,
      ),
    );
    row.checks.push(
      "Home public CTA retained; AI disabled; nonmodal close focus and 44px; no overflow",
    );

    if (report.mode === "production-disabled") {
      await openRoute(p, width, height);
      assert.equal(
        await p
          .locator("[data-route-query-status]")
          .getAttribute("data-route-query-status"),
        "disabled",
      );
      assert.equal(
        await p.locator("[data-route-query-status] button").count(),
        0,
      );
      await checkOverflow(p, "Route disabled " + label);
      await capture(p, label + "-route-disabled");
      row.checks.push("production Route disabled; no query/retry control");
      await ctx.close();
      continue;
    }

    await p.goto(base + "/start", { waitUntil: "networkidle" });
    await p.getByRole("radio", { name: /第一次去日本/ }).click();
    await button(p, "下一步").click();
    await button(p, "下一步").click();
    await button(p, "更多地区").click();
    const regions = p.getByRole("dialog", {
      name: "选择更多地区",
      exact: true,
    });
    await regions.getByRole("checkbox").first().check();
    const selected = await regions
      .locator('[class*="selectedSummary"]')
      .innerText();
    const search = regions.getByRole("searchbox");
    await search.fill("合成不存在地区测试");
    await regions
      .getByText("没有找到符合条件的结果", { exact: true })
      .waitFor();
    assert.equal(
      await regions.locator('[class*="selectedSummary"]').innerText(),
      selected,
    );
    const clearSearch = regions.getByRole("button", {
      name: "清除搜索",
      exact: true,
    });
    await target(p, clearSearch);
    await checkOverflow(p, "Start region Empty " + label);
    await capture(p, label + "-start-filter-empty");
    await clearSearch.focus();
    await p.keyboard.press("Enter");
    assert.equal(await search.inputValue(), "");
    assert(await search.evaluate((e) => e === document.activeElement));
    await regions
      .getByRole("button", { name: "确认选择", exact: true })
      .click();
    row.checks.push(
      "confirmed zero-result local filter; existing selections retained; 44px clear and keyboard focus recovery",
    );
    const before = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).draft,
      key,
    );
    await button(p, "生成方案").click();
    const pending = p.locator('[data-state-kind="loading"]');
    await pending.waitFor();
    assert.match(
      await p.locator("body").innerText(),
      /不代表真实 AI 或路线计算/,
    );
    assert.equal(await pending.locator("[data-state-skeleton]").count(), 1);
    assert.equal(await pending.locator("button,[tabindex]").count(), 0);
    assert.equal(await pending.locator('[role="status"]').count(), 1);
    const reduced = await pending.evaluate((e) =>
      [e, ...e.querySelectorAll("*")].every(
        (n) => getComputedStyle(n).animationName === "none",
      ),
    );
    assert(reduced, "static loading under reduced motion");
    await target(p, button(p, "返回修改需求"));
    await checkOverflow(p, "Start pending " + label);
    await capture(p, label + "-start-loading");
    await button(p, "返回修改需求").focus();
    await p.keyboard.press("Enter");
    await button(p, "生成方案").waitFor();
    const after = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).draft,
      key,
    );
    for (const k of [
      "familiarity",
      "likes",
      "destinations",
      "party",
      "anchors",
    ])
      assert.deepEqual(after[k], before[k]);
    row.checks.push(
      "Start genuine local pending; static skeleton; keyboard return; draft retained",
    );

    await p.evaluate(
      ({ key, canary }) => {
        const set = Storage.prototype.setItem;
        window.task067RestoreWrite = () => {
          Storage.prototype.setItem = set;
        };
        Storage.prototype.setItem = function (k, v) {
          if (k === key) throw new Error(canary);
          return set.call(this, k, v);
        };
      },
      { key, canary },
    );
    await button(p, "保存草稿").click();
    await p.getByText("暂时无法保存到此浏览器", { exact: true }).waitFor();
    assert(!(await p.locator("body").innerText()).includes(canary));
    await checkOverflow(p, "Start storage " + label);
    await capture(p, label + "-start-storage-error");
    await p.evaluate(() => window.task067RestoreWrite());
    await button(p, "保存草稿").click();
    await p.getByText("草稿已保存到此浏览器", { exact: true }).waitFor();
    row.checks.push(
      "real Storage write failure sanitized; input retained; existing save recovers",
    );
    await p.evaluate(() => localStorage.clear());

    let requests = 0,
      release = null;
    await p.route("**/api/routes/calculate", async (route) => {
      requests++;
      const result = await new Promise((resolve) => {
        release = resolve;
      });
      if (result === "abort") return route.abort("failed");
      let response;
      if (result === "ready") {
        const fixture = structuredClone(minimalRailRouteFixture);
        fixture.requestId = route.request().postDataJSON().requestId;
        response = { ok: true, value: fixture };
      } else
        response = {
          ok: false,
          error: {
            code: result === "none" ? "no_route" : "provider_timeout",
            retryable: result !== "none",
            category: result === "none" ? "no_result" : "availability",
            message: canary,
            diagnosticFingerprint: null,
            metadata: { reason: "timeout" },
          },
        };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
    const trigger = await openRoute(p, width, height),
      panel = p.locator("[data-route-query-status]");
    assert.equal(await panel.getAttribute("data-route-query-status"), "idle");
    const inputState = await p.locator("[data-planner]").evaluate((e) => ({
      mode: e.dataset.workspaceMode,
      map: e
        .querySelector("[data-map-workspace]")
        ?.getBoundingClientRect()
        .toJSON(),
    }));
    const mapHandle = await p.locator("[data-map-workspace]").elementHandle();
    const run = panel.getByRole("button", { name: "查询路线", exact: true });
    await target(p, run);
    await contrast(run, label + " default");
    await run.hover();
    await contrast(run, label + " hover");
    await run.focus();
    await contrast(run, label + " focus");
    await p.keyboard.press("Enter");
    await p.locator('[data-route-query-status="loading"]').waitFor();
    await panel
      .getByRole("button", { name: "正在查询…", exact: true })
      .evaluate((e) => {
        for (let i = 0; i < 16; i++) e.click();
      });
    assert.equal(requests, 1, "single in-flight query");
    await contrast(
      panel.getByRole("button", { name: "正在查询…", exact: true }),
      label + " pending",
    );
    assert.equal(await panel.locator('[role="status"]').count(), 1);
    assert.equal(
      await panel.locator("[data-state-skeleton]").getAttribute("aria-hidden"),
      "true",
    );
    assert(
      await panel
        .getByRole("button", { name: "正在查询…", exact: true })
        .evaluate((e) => e === document.activeElement),
    );
    release("error");
    await p.locator('[data-route-query-status="error"]').waitFor();
    assert(!(await panel.innerText()).includes(canary));
    const retry = panel.getByRole("button", { name: "重试路线", exact: true });
    await target(p, retry);
    await retry.focus();
    await p.keyboard.press("Space");
    await p.locator('[data-route-query-status="loading"]').waitFor();
    assert.equal(requests, 2);
    release("error");
    await p.locator('[data-route-query-status="error"]').waitFor();
    assert(await retry.evaluate((e) => e === document.activeElement));
    await capture(p, label + "-route-error");
    await retry.click();
    await p.locator('[data-route-query-status="loading"]').waitFor();
    assert.equal(requests, 3);
    release("ready");
    await p.locator('[data-route-query-status="ready"]').waitFor();
    assert(
      await panel
        .getByRole("button", { name: "重新查询", exact: true })
        .evaluate((e) => e === document.activeElement),
    );
    assert(
      await mapHandle.evaluate((e) => e.isConnected),
      "Map not remounted on query recovery",
    );
    const afterState = await p.locator("[data-planner]").evaluate((e) => ({
      mode: e.dataset.workspaceMode,
      map: e
        .querySelector("[data-map-workspace]")
        ?.getBoundingClientRect()
        .toJSON(),
    }));
    assert.deepEqual(afterState, inputState);
    const storage = await p.evaluate(() => JSON.stringify(localStorage));
    assert.doesNotMatch(storage, /request-fixture|ekiworld|minimal-rail/);
    await panel.getByRole("button", { name: "重新查询", exact: true }).click();
    await p.locator('[data-route-query-status="loading"]').waitFor();
    const late = release;
    await panel.getByRole("button", { name: "取消查询", exact: true }).click();
    await p.locator('[data-route-query-status="idle"]').waitFor();
    assert(
      await panel.locator("h3").evaluate((e) => e === document.activeElement),
      "cancel returns focus inside region",
    );
    late("ready");
    await panel.getByRole("button", { name: "查询路线", exact: true }).click();
    await p.locator('[data-route-query-status="loading"]').waitFor();
    release("none");
    row.checks.push(
      "cancel returns focus; late aborted result cannot overwrite next query",
    );
    await p.locator('[data-route-query-status="no_route"]').waitFor();
    assert.match(await panel.innerText(), /调整出发时间/);
    assert.equal(await panel.locator("button").count(), 0);
    await checkOverflow(p, "Route no result " + label);
    await capture(p, label + "-route-empty");
    await p.keyboard.press("Escape");
    assert(await trigger.evaluate((e) => e === document.activeElement));
    row.checks.push(
      "Route loading/error/retry failure/recovery/no_route; 16 repeated activations -> one request; same map and inputs; no persisted route; Escape focus",
    );

    // A valid saved local workspace is created through the existing confirmation UI.
    await p.goto(base + "/planner", { waitUntil: "networkidle" });
    if (width < 1200) await button(p, "旅行设置与方案").click();
    await p
      .getByRole("button", { name: "保存并细化 →", exact: true })
      .first()
      .click();
    await button(p, "保存到浏览器并进入详情").click();
    await p.waitForURL(/view=detail/);
    await button(p, "保存行程").waitFor();
    await p.goto(base + "/planner", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /浏览器草稿（0）/ }).click();
    await p.getByText("还没有另存的草稿", { exact: true }).waitFor();
    await checkOverflow(p, "Draft empty " + label);
    await capture(p, label + "-draft-empty");
    await p.keyboard.press("Escape");
    await p.locator("summary").filter({ hasText: "地图地点列表" }).click();
    assert.match(
      await p.getByRole("group", { name: "地图等价操作列表" }).innerText(),
      /示意图不代表真实道路/,
    );
    row.checks.push(
      "real empty archive modal; map fallback remains usable without provider",
    );
    await p.goto(base + "/planner?view=detail&day=1", {
      waitUntil: "networkidle",
    });
    await button(p, "保存行程").waitFor();
    const savedBefore = await p.evaluate(() =>
      localStorage.getItem("travelassist.saved-workspace.v1"),
    );
    await p.evaluate((canary) => {
      const original = Storage.prototype.setItem;
      window.task067RestoreWrite = () => {
        Storage.prototype.setItem = original;
      };
      Storage.prototype.setItem = function (k, v) {
        if (k === "travelassist.saved-workspace.v1") throw new Error(canary);
        return original.call(this, k, v);
      };
    }, canary);
    await button(p, "保存行程").click();
    await p
      .getByText(/暂时无法保存到此浏览器。当前修改仍在/)
      .first()
      .waitFor();
    assert(!(await p.locator("body").innerText()).includes(canary));
    assert.equal(
      await p.evaluate(() =>
        localStorage.getItem("travelassist.saved-workspace.v1"),
      ),
      savedBefore,
    );
    await checkOverflow(p, "Detail save error " + label);
    await capture(p, label + "-detail-save-error");
    await p.evaluate(() => window.task067RestoreWrite());
    await button(p, "保存行程").click();
    await p
      .getByText(/已保存到此浏览器 · 刷新可恢复/)
      .first()
      .waitFor();
    await p.goto(base + "/planner", { waitUntil: "networkidle" });
    await p.evaluate((canary) => {
      const original = Storage.prototype.getItem;
      window.task067RestoreRead = () => {
        Storage.prototype.getItem = original;
      };
      Storage.prototype.getItem = function (k) {
        if (k === "travelassist.saved-workspace.v1") throw new Error(canary);
        return original.call(this, k);
      };
    }, canary);
    await button(p, "打开已保存行程").click();
    await p
      .getByText("无法读取浏览器存储，当前行程未改变。", { exact: true })
      .waitFor();
    assert(!(await p.locator("body").innerText()).includes(canary));
    await p.evaluate(() => window.task067RestoreRead());
    row.checks.push(
      "Detail save/read faults sanitized; previous saved bytes unchanged; local recovery succeeds",
    );
    await ctx.close();

    const corrupt = await context({ width, height });
    await corrupt.addInitScript(
      ({ key, origin }) => {
        if (location.origin === origin)
          localStorage.setItem(key, "{invalid synthetic record");
      },
      { key, origin: new URL(base).origin },
    );
    const broken = await corrupt.newPage();
    await broken.goto(base + "/start", { waitUntil: "networkidle" });
    await broken
      .getByText("暂时无法读取此浏览器的草稿", { exact: true })
      .waitFor();
    await broken.getByRole("radio", { name: /第一次去日本/ }).click();
    assert.equal(
      await broken.evaluate((k) => localStorage.getItem(k), key),
      "{invalid synthetic record",
    );
    assert(await button(broken, "保存草稿").isDisabled());
    assert(!(await broken.locator("body").innerText()).includes(canary));
    await checkOverflow(broken, "Corrupt draft " + label);
    row.checks.push(
      "invalid local draft preserved byte-for-byte; editable memory; no fake saved result",
    );
    await corrupt.close();
  }
  assert.deepEqual(report.pageErrors, []);
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.failure = String(error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(out, "browser-evidence.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
console.log(
  JSON.stringify(
    {
      status: report.status,
      viewports: report.rows.length,
      checks: report.rows.reduce((n, r) => n + r.checks.length, 0),
      screenshots: report.screenshots.length,
    },
    null,
    2,
  ),
);
