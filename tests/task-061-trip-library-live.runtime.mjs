import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { emptyLocal } from "../tools/qa/personal-center-tests.mjs";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
const require = createRequire(import.meta.url);
test("TASK-061 real Local Trip Library browser acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    contexts = [],
    completed = [],
    cleanupErrors = [];
  let app,
    browser,
    stage = "preflight",
    externalBrowserRequests = 0,
    pageErrors = 0,
    cursorObserved = false;
  const ok = (result) => {
    assert.equal(
      result.error?.code ?? null,
      null,
      "Local fixture operation succeeds; details withheld",
    );
    return result.data;
  };
  async function gate(name, fn) {
    stage = name;
    let passed = false;
    await t.test(name, async () => {
      try {
        await fn();
        completed.push(name);
        passed = true;
      } catch (cause) {
        throw new Error(
          "TASK-061 failed: " +
            stage +
            " (private values withheld; " +
            cause.name +
            "; numeric actual=" +
            (typeof cause.actual === "number" ? cause.actual : "n/a") +
            "; expected=" +
            (typeof cause.expected === "number" ? cause.expected : "n/a") +
            ")",
          { cause: new Error(cause.name) },
        );
      }
    });
    if (!passed)
      throw new Error("Dependent Local browser gates stopped after: " + name);
  }
  try {
    await emptyLocal(local);
    local.env.DATABASE_URL = local.databaseUrl;
    for (const key of Object.keys(local.env))
      if (/SUPABASE.*(?:SERVICE|SECRET)|SERVICE.*SUPABASE/.test(key))
        delete local.env[key];
    app = await startApp(local);
    const playwright = require(
      process.env.CODEX_PLAYWRIGHT_PATH || "playwright",
    );
    browser = await playwright.chromium.launch({
      channel: "msedge",
      headless: true,
    });
    const button = (page, name) =>
      page.getByRole("button", { name, exact: true });
    const ready = (page) =>
      page.locator('[data-trip-library-page][aria-busy="false"]').waitFor();
    async function login(user) {
      const page = user.page;
      await page.goto(
        app.origin + "/login?returnTo=%2Fpersonal-center%2Ftrips",
      );
      await page.getByRole("tab", { name: "邮箱登录", exact: true }).click();
      await page.getByLabel("邮箱地址", { exact: true }).fill(user.email);
      await page.getByLabel("密码", { exact: true }).fill(user.password);
      await button(page, "登录").click();
      await page.waitForURL(app.origin + "/personal-center/trips");
      await ready(page);
    }
    async function api(
      user,
      path = "/api/trip-library?limit=50",
      method = "GET",
      body,
      status = 200,
      headers = {},
    ) {
      const response = await user.context.request.fetch(app.origin + path, {
        method,
        headers: { Origin: app.origin, ...headers },
        ...(body === undefined ? {} : { data: body }),
      });
      assert.equal(response.status(), status, "Expected Local Trip API status");
      const text = await response.text();
      return text ? JSON.parse(text).data : null;
    }
    async function create(user, title, state = "draft") {
      const facts = fullDraftFixture();
      facts.title = title;
      let trip = await api(
        user,
        "/api/trip-library",
        "POST",
        {
          schemaVersion: "1.0",
          creationKey: randomUUID(),
          draftFacts: facts,
          wizardProgress: progressFixture(),
          partySelection: { includesOwner: true, companionIds: [] },
        },
        201,
      );
      if (state !== "draft") {
        const snapshot = fullSnapshotFixture();
        snapshot.trip.id = "task061-" + randomUUID();
        snapshot.trip.title = title;
        trip = await api(
          user,
          "/api/trip-library/" + trip.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: snapshot },
          200,
          { "If-Match": '"' + trip.storageRevision + '"' },
        );
      }
      if (state === "history")
        trip = await api(
          user,
          "/api/trip-library/" + trip.id + "/history",
          "POST",
          undefined,
          200,
          { "If-Match": '"' + trip.storageRevision + '"' },
        );
      return trip;
    }
    async function reload(user) {
      await user.page.reload({ waitUntil: "networkidle" });
      await ready(user.page);
    }
    async function search(page, title) {
      await page.locator("#trip-tab-all").click();
      await page
        .getByRole("searchbox", { name: "搜索行程名称或目的地" })
        .fill(title);
    }
    function card(page, id) {
      return page.locator('[data-record-id="' + id + '"]');
    }
    for (let i = 0; i < 2; i++) {
      const email = "task061-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const data = ok(
        await local.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const user = { id: data.user.id, email, password };
      users.push(user);
      const context = await browser.newContext({
        viewport: i
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
      });
      contexts.push(context);
      user.context = context;
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (
          ["http:", "https:"].includes(url.protocol) &&
          !["127.0.0.1", "localhost"].includes(url.hostname)
        ) {
          externalBrowserRequests++;
          return route.abort();
        }
        return route.continue();
      });
      user.page = await context.newPage();
      user.page.on("pageerror", () => pageErrors++);
      user.page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          url.pathname === "/api/trip-library" &&
          url.searchParams.has("cursor")
        )
          cursorObserved = true;
      });
      await login(user);
    }
    const [a, b] = users,
      page = a.page;
    await gate(
      "empty authenticated library has no fixture trips or fabricated statistics",
      async () => {
        assert.equal((await api(a)).items.length, 0);
        assert.match(
          await page.locator("#personal-content").innerText(),
          /还没有旅行/,
        );
        assert.doesNotMatch(
          await page.locator("#personal-content").innerText(),
          /京都春日漫游|大阪秋日食旅|北海道雪原假期|72%|预订完成度/,
        );
      },
    );
    const aTrips = [],
      bTrips = [];
    for (const state of ["draft", "saved", "history"]) {
      aTrips.push(await create(a, "TASK061 A " + state, state));
      bTrips.push(await create(b, "TASK061 B " + state, state));
    }
    const extra = [];
    for (let i = 0; i < 48; i++)
      extra.push(
        await create(a, "TASK061 A page " + String(i).padStart(2, "0")),
      );
    const bBefore = await api(b);
    await gate(
      "51 actual records cross API cursor boundary; Draft Saved History render for both isolated owners",
      async () => {
        await reload(a);
        await reload(b);
        assert.equal(cursorObserved, true);
        stage = "51-row tab count";
        assert.match(
          await page.locator('nav[aria-label="旅行列表分页"]').innerText(),
          /共 51 条行程/,
        );
        for (const [user, prefix] of [
          [a, "A"],
          [b, "B"],
        ]) {
          for (const [tab, state] of [
            ["drafts", "draft"],
            ["all", "saved"],
            ["history", "history"],
          ]) {
            await user.page.locator("#trip-tab-" + tab).click();
            await user.page
              .getByRole("searchbox", { name: "搜索行程名称或目的地" })
              .fill("TASK061 " + prefix + " " + state);
            const owned = (prefix === "A" ? aTrips : bTrips).find(
              (trip) => trip.libraryState === state,
            );
            await card(user.page, owned.id).waitFor();
            stage = "owned title " + prefix + " " + state;
            await card(user.page, owned.id)
              .getByRole("heading", {
                name: "TASK061 " + prefix + " " + state,
                exact: true,
              })
              .waitFor();
            assert.ok(
              (
                await user.page.locator("#personal-content").innerText()
              ).includes("TASK061 " + prefix + " " + state),
            );
            await user.page
              .getByRole("searchbox", { name: "搜索行程名称或目的地" })
              .fill("");
          }
          assert.equal(
            (await user.page.locator("#personal-content").innerText()).includes(
              "TASK061 " + (prefix === "A" ? "B" : "A"),
            ),
            false,
          );
        }
        await search(page, "TASK061 A page");
        await page
          .locator('nav[aria-label="旅行列表分页"]')
          .getByText(/共 48 条行程/)
          .waitFor();
        assert.match(
          await page.locator('nav[aria-label="旅行列表分页"]').innerText(),
          /48/,
        );
        const first = await page
          .locator("[data-record-id]")
          .evaluateAll((nodes) => nodes.map((n) => n.dataset.recordId));
        await button(page, "下一页").click();
        await page
          .locator('nav[aria-label="旅行列表分页"]')
          .getByText(/第 2/)
          .waitFor();
        const second = await page
          .locator("[data-record-id]")
          .evaluateAll((nodes) => nodes.map((n) => n.dataset.recordId));
        assert.equal(
          new Set([...first, ...second]).size,
          first.length + second.length,
        );
        await reload(a);
        await reload(b);
        const launchBox = await page
          .getByRole("link", { name: "新建旅程", exact: true })
          .boundingBox();
        const avatarBox = await page
          .getByRole("button", { name: /^打开账户菜单/ })
          .boundingBox();
        assert.ok(
          launchBox.y >= avatarBox.y + avatarBox.height ||
            launchBox.x + launchBox.width <= avatarBox.x ||
            launchBox.x >= avatarBox.x + avatarBox.width,
          "Desktop new-trip and account controls do not overlap",
        );
        const mobileTargets = await b.page
          .locator("[data-record-id] button")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const r = node.getBoundingClientRect();
              return { width: r.width, height: r.height };
            }),
          );
        assert.ok(
          mobileTargets.length > 0 &&
            mobileTargets.every((r) => r.width >= 44 && r.height >= 44),
          "Mobile record actions retain 44px targets",
        );
        await mkdir(".artifacts/task061", { recursive: true });
        await page.screenshot({
          path: ".artifacts/task061/desktop.png",
          fullPage: true,
          mask: [page.getByText(a.email, { exact: true })],
        });
        await b.page.screenshot({
          path: ".artifacts/task061/mobile.png",
          fullPage: true,
          mask: [b.page.getByText(b.email, { exact: true })],
        });
        for (const [user, label] of [
          [a, "desktop"],
          [b, "mobile"],
        ]) {
          await user.page
            .getByText(/预订、收藏和封面资料暂未提供/)
            .scrollIntoViewIfNeeded();
          await user.page
            .locator('nav[aria-label="旅行列表分页"]')
            .scrollIntoViewIfNeeded();
          assert.equal(
            await user.page
              .locator('nav[aria-label="旅行列表分页"]')
              .isVisible(),
            true,
          );
          await user.page.screenshot({
            path: ".artifacts/task061/" + label + "-bottom.png",
            fullPage: true,
            mask: [user.page.getByText(user.email, { exact: true })],
          });
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          ),
          false,
        );
        assert.equal(
          await b.page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          ),
          false,
        );
      },
    );
    await gate(
      "read failure shows retry instead of fake empty state and recovers real rows",
      async () => {
        await page.route("**/api/trip-library?*", (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              ok: false,
              error: { code: "TRIP_LIBRARY_UNAVAILABLE" },
            }),
          }),
        );
        await reload(a);
        await page
          .getByRole("alert")
          .filter({ hasText: /读取旅行资料失败/ })
          .waitFor();
        assert.equal(await page.locator("[data-record-id]").count(), 0);
        assert.doesNotMatch(
          await page.locator("#personal-content").innerText(),
          /还没有旅行/,
        );
        await page.unroute("**/api/trip-library?*");
        await button(page, "重新读取列表").click();
        await page.waitForLoadState("networkidle");
        await ready(page);
        stage = "51-row tab count";
        assert.match(
          await page.locator('nav[aria-label="旅行列表分页"]').innerText(),
          /共 51 条行程/,
        );
      },
    );
    await gate(
      "failed delete retains row; confirmed browser delete persists after reload",
      async () => {
        const trip = aTrips[0];
        await search(page, trip.draftFacts.title);
        await button(card(page, trip.id), "删除草稿").click();
        await page.getByRole("dialog").waitFor();
        await page.route("**/api/trip-library/" + trip.id, (route) =>
          route.request().method() === "DELETE"
            ? route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({
                  ok: false,
                  error: { code: "TRIP_LIBRARY_UNAVAILABLE" },
                }),
              })
            : route.continue(),
        );
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "删除草稿", exact: true })
          .click();
        await page.getByRole("dialog").getByRole("alert").waitFor();
        assert.equal(
          (await api(a, "/api/trip-library/" + trip.id)).id,
          trip.id,
        );
        await page.unroute("**/api/trip-library/" + trip.id);
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "删除草稿", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await reload(a);
        await api(a, "/api/trip-library/" + trip.id, "GET", undefined, 404);
        assert.doesNotMatch(
          await page.locator("#personal-content").innerText(),
          /TASK061 A draft/,
        );
      },
    );
    await gate(
      "real stale revision rejects destructive action until explicit reload",
      async () => {
        const trip = extra[0];
        await search(page, trip.draftFacts.title);
        await button(card(page, trip.id), "删除草稿").click();
        const facts = fullDraftFixture();
        facts.title = "TASK061 A changed";
        const changed = await api(
          a,
          "/api/trip-library/" + trip.id,
          "PUT",
          {
            preferenceOverridePatch: trip.preferenceOverridePatch,
            draftFacts: facts,
            wizardProgress: progressFixture(),
            partySelection: { includesOwner: true, companionIds: [] },
          },
          200,
          { "If-Match": '"' + trip.storageRevision + '"' },
        );
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "删除草稿", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("alert")
          .filter({ hasText: /发生变化/ })
          .waitFor();
        assert.equal(
          (await api(a, "/api/trip-library/" + trip.id)).storageRevision,
          changed.storageRevision,
        );
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "重新读取列表", exact: true })
          .click();
        await page.waitForLoadState("networkidle");
        await ready(page);
        await search(page, facts.title);
        await card(page, trip.id).waitFor();
        assert.equal(await card(page, trip.id).count(), 1);
      },
    );
    await gate(
      "lost copy response retries same intent once, preserves history and other owner, survives relogin",
      async () => {
        const history = aTrips[2],
          before = await api(a, "/api/trip-library/" + history.id);
        await page
          .getByRole("searchbox", { name: "搜索行程名称或目的地" })
          .fill("");
        await page.locator("#trip-tab-history").click();
        const endpoint = "**/api/trip-library/" + history.id + "/copy";
        let reachedServer = false,
          originalCopyId;
        await page.route(endpoint, async (route) => {
          const r = await route.fetch();
          assert.equal(r.status(), 201);
          reachedServer = true;
          originalCopyId = (await r.json()).data.id;
          await route.abort();
        });
        await button(card(page, history.id), "复制为新草稿").click();
        await page
          .getByRole("alert")
          .filter({ hasText: /读取或操作失败/ })
          .waitFor();
        assert.equal(reachedServer, true);
        await page.unroute(endpoint);
        const response = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname.endsWith("/" + history.id + "/copy") &&
            r.request().method() === "POST",
        );
        await button(card(page, history.id), "复制为新草稿").click();
        const copyResponse = await response;
        assert.equal(
          copyResponse.status(),
          200,
          "Idempotent replay returns the already created copy",
        );
        const copied = (await copyResponse.json()).data;
        assert.equal(copied.id, originalCopyId);
        await page.waitForLoadState("networkidle");
        await ready(page);
        await page
          .getByRole("status")
          .filter({ hasText: /副本已保存/ })
          .waitFor();
        await search(page, history.draftFacts.title);
        await card(page, copied.id).waitFor();
        assert.equal(await card(page, copied.id).count(), 1);
        assert.deepEqual(
          await api(a, "/api/trip-library/" + history.id),
          before,
        );
        const total = Number(
          (
            await local.db`select count(*) from public.trip_library_records where owner_user_id=${a.id}`
          )[0].count,
        );
        assert.equal(
          total,
          51,
          "lost response plus retry creates exactly one copy",
        );
        await page.getByRole("button", { name: /^打开账户菜单/ }).click();
        await button(page, "退出登录").click();
        await page.waitForURL(app.origin + "/");
        await login(a);
        await search(page, history.draftFacts.title);
        await card(page, copied.id).waitFor();
        assert.equal(await card(page, copied.id).count(), 1);
        assert.deepEqual(await api(b), bBefore);
        await reload(b);
        assert.doesNotMatch(
          await b.page.locator("#personal-content").innerText(),
          /TASK061 A/,
        );
      },
    );
    assert.equal(externalBrowserRequests, 0);
    assert.equal(pageErrors, 0);
  } finally {
    for (const context of contexts)
      try {
        await context.close();
      } catch {
        cleanupErrors.push("context");
      }
    if (browser)
      try {
        await browser.close();
      } catch {
        cleanupErrors.push("browser");
      }
    if (app)
      try {
        await app.stop();
      } catch {
        cleanupErrors.push("server");
      }
    for (const user of users)
      try {
        ok(await local.admin.auth.admin.deleteUser(user.id));
      } catch {
        cleanupErrors.push("fixture-user");
      }
    let remaining;
    try {
      remaining = await emptyLocal(local);
    } catch {
      cleanupErrors.push("fixture-inventory");
    }
    await local.db.end();
    await mkdir(".artifacts/task061", { recursive: true });
    await writeFile(
      ".artifacts/task061/browser-evidence.json",
      JSON.stringify(
        {
          task: "TASK-061-B",
          completed,
          stage,
          cleanupErrors,
          remaining,
          localOnly: true,
          browser: "Edge",
          users: users.length,
          viewports: ["1440x900", "390x844"],
          cursorObserved,
          externalBrowserRequests,
          pageErrors,
          failureInjection: [
            "GET 500",
            "DELETE 500",
            "successful copy response lost before client receipt",
          ],
          realConcurrencyCheck:
            "stale revision 409 via actual separate API update",
        },
        null,
        2,
      ) + "\n",
    );
    assert.deepEqual(cleanupErrors, []);
  }
});
