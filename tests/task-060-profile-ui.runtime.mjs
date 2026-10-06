import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { emptyLocal } from "../tools/qa/personal-center-tests.mjs";
const require = createRequire(import.meta.url);
test("TASK-060 real Local browser Profile persistence", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    completed = [],
    cleanupErrors = [];
  let app,
    browser,
    stage = "preflight";
  const contextList = [];
  const ok = (result) => {
    assert.equal(
      result.error?.code ?? null,
      null,
      "Local fixture operation succeeds (details withheld)",
    );
    return result.data;
  };
  const gate = async (name, fn) => {
    stage = name;
    await t.test(name, async () => {
      try {
        await fn();
        completed.push(name);
      } catch (cause) {
        throw new Error(
          "TASK-060 failed at " + stage + " (private values withheld)",
          { cause: new Error(cause.name) },
        );
      }
    });
  };
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
    async function login(page, user) {
      await page.goto(
        app.origin + "/login?returnTo=%2Fpersonal-center%2Faccount",
      );
      await page.getByRole("tab", { name: "邮箱登录", exact: true }).click();
      await page.getByLabel("邮箱地址", { exact: true }).fill(user.email);
      await page.getByLabel("密码", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "登录", exact: true }).click();
      await page.waitForURL(app.origin + "/personal-center/account");
      await page
        .getByRole("button", { name: "编辑资料", exact: true })
        .waitFor();
    }
    async function reload(page) {
      await page.reload();
      await page
        .getByRole("button", { name: "编辑资料", exact: true })
        .waitFor();
    }
    async function read(context) {
      const r = await context.request.get(app.origin + "/api/profile");
      assert.equal(r.status(), 200);
      return (await r.json()).data;
    }
    const button = (page, name) =>
      page.getByRole("button", { name, exact: true });
    async function save(page) {
      await button(page, "保存修改").click();
      await button(page, "编辑资料").waitFor();
    }
    for (let i = 0; i < 2; i++) {
      const email = "task060-" + randomUUID() + "@example.test",
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
      contextList.push(context);
      user.context = context;
      user.page = await context.newPage();
      await login(user.page, user);
    }
    const [a, b] = users,
      page = a.page;
    await gate(
      "empty real account and verified Auth contact without demo data",
      async () => {
        const body = await page.locator("#personal-content").innerText();
        assert.doesNotMatch(body, /Yuki|山田|yu\*\*\*@gmail/);
        assert.ok(body.includes(a.email));
        assert.match(body, /还没有紧急联系人/);
        const actual = await read(a.context);
        assert.equal(actual.profile.displayName, null);
      },
    );
    await gate(
      "browser saves all Profile/Settings fields, navigation/reload/relogin retain canonical values",
      async () => {
        await button(page, "编辑资料").click();
        await button(page, "保存修改").click();
        await page
          .getByRole("alert")
          .filter({ hasText: "请输入昵称" })
          .waitFor();
        assert.equal((await read(a.context)).profile.displayName, null);
        for (const [id, value] of Object.entries({
          displayName: "TASK060 A",
          legalName: "Synthetic full name",
          birthday: "1990-01-02",
          city: "Tokyo",
        }))
          await page.locator("#profile-" + id).fill(value);
        await page.locator("#profile-gender").selectOption("女");
        await page.locator("#profile-countryRegion").selectOption("日本");
        for (const [id, value] of Object.entries({
          language: "English",
          region: "日本",
          timezone: "Asia/Tokyo",
          currency: "JPY (¥)",
          distanceUnit: "公里 (km)",
          temperatureUnit: "摄氏度 (°C)",
          timeFormat: "24 小时制 (13:00)",
        }))
          await page.locator("#setting-" + id).selectOption(value);
        await save(page);
        const actual = await read(a.context);
        assert.equal(actual.profile.displayName, "TASK060 A");
        assert.equal(actual.profile.fullName, "Synthetic full name");
        assert.equal(actual.profile.birthDate, "1990-01-02");
        assert.equal(actual.profile.genderCode, "female");
        assert.equal(actual.profile.residenceCountryCode, "JP");
        assert.equal(actual.profile.residenceCity, "Tokyo");
        assert.deepEqual(
          Object.fromEntries(
            Object.entries(actual.settings).filter(([k]) => !k.endsWith("At")),
          ),
          {
            locale: "en",
            regionCode: "JP",
            timezone: "Asia/Tokyo",
            currencyCode: "JPY",
            distanceUnit: "km",
            temperatureUnit: "celsius",
            timeFormat: "24h",
          },
        );
        await page.goto(app.origin + "/personal-center/preferences");
        await page.goto(app.origin + "/personal-center/account");
        await button(page, "编辑资料").waitFor();
        await reload(page);
        assert.match(
          await page.locator("#personal-content").innerText(),
          /TASK060 A/,
        );
        await page.getByRole("button", { name: /^打开账户菜单/ }).click();
        await button(page, "退出登录").click();
        await page.waitForURL(app.origin + "/");
        await login(page, a);
        assert.match(
          await page.locator("#personal-content").innerText(),
          /TASK060 A/,
        );
      },
    );
    await gate(
      "failed PATCH preserves draft, has no false success, cancel keeps server state",
      async () => {
        await button(page, "编辑资料").click();
        await page.locator("#profile-displayName").fill("UNSAVED");
        await page.route("**/api/profile", (route) =>
          route.request().method() === "PATCH"
            ? route.fulfill({
                status: 503,
                contentType: "application/json",
                body: JSON.stringify({
                  ok: false,
                  error: { code: "PROFILE_UNAVAILABLE" },
                }),
              })
            : route.continue(),
        );
        await button(page, "保存修改").click();
        await page
          .getByRole("alert")
          .filter({ hasText: /读取或保存失败/ })
          .waitFor();
        assert.equal(
          await page.locator("#profile-displayName").inputValue(),
          "UNSAVED",
        );
        assert.equal(await button(page, "编辑资料").count(), 0);
        assert.equal((await read(a.context)).profile.displayName, "TASK060 A");
        await page.unroute("**/api/profile");
        await button(page, "取消").click();
        assert.match(
          await page.locator("#personal-content").innerText(),
          /TASK060 A/,
        );
      },
    );
    await gate(
      "contact create/update/delete persists independently of unsaved Profile edits",
      async () => {
        await button(page, "编辑资料").click();
        await page.locator("#profile-city").fill("UNSAVED CITY");
        await button(page, "添加紧急联系人").click();
        for (const [id, value] of Object.entries({
          name: "TASK060 Contact",
          relationship: "friend",
          countryCode: "JP",
          phone: "+819012345678",
          email: "contact@example.test",
          note: "Synthetic note",
        }))
          await page.locator("#contact-" + id).fill(value);
        await button(page, "保存联系人").click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
        assert.equal(
          await page.locator("#profile-city").inputValue(),
          "UNSAVED CITY",
        );
        await button(page, "取消").click();
        await reload(page);
        let actual = await read(a.context);
        assert.equal(actual.profile.residenceCity, "Tokyo");
        assert.equal(actual.emergencyContacts.length, 1);
        assert.equal(actual.emergencyContacts[0].countryCode, "JP");
        assert.equal(actual.emergencyContacts[0].phoneE164, "+819012345678");
        const card = page.locator("article").filter({
          has: page.getByRole("heading", {
            name: "TASK060 Contact",
            exact: true,
          }),
        });
        await button(card, "编辑").click();
        await page.locator("#contact-name").fill("TASK060 Updated");
        await button(page, "保存联系人").click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
        await reload(page);
        assert.equal(
          (await read(a.context)).emergencyContacts[0].name,
          "TASK060 Updated",
        );
        await page
          .locator("article")
          .filter({ hasText: "TASK060 Updated" })
          .getByRole("button", { name: "删除", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "删除", exact: true })
          .click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
        await reload(page);
        assert.equal((await read(a.context)).emergencyContacts.length, 0);
      },
    );
    await gate(
      "second mobile user stays isolated and can save its own Profile",
      async () => {
        await reload(b.page);
        assert.doesNotMatch(
          await b.page.locator("#personal-content").innerText(),
          /TASK060 A|TASK060 Contact|Synthetic full name/,
        );
        assert.equal((await read(b.context)).profile.displayName, null);
        await button(b.page, "编辑资料").click();
        await b.page.locator("#profile-displayName").fill("TASK060 B");
        await save(b.page);
        await reload(b.page);
        assert.equal((await read(b.context)).profile.displayName, "TASK060 B");
        assert.equal((await read(a.context)).profile.displayName, "TASK060 A");
      },
    );
  } finally {
    for (const context of contextList)
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
    await mkdir(".artifacts/task060", { recursive: true });
    await writeFile(
      ".artifacts/task060/browser-evidence.json",
      JSON.stringify(
        {
          task: "TASK-060-B",
          completed,
          stage,
          cleanupErrors,
          remaining,
          localOnly: true,
          browser: "Edge",
          users: users.length,
          viewports: ["1440x900", "390x844"],
          failureInjection:
            "one explicit PATCH 503; all persistence assertions use real Local API/Auth/DB",
        },
        null,
        2,
      ) + "\n",
    );
    assert.deepEqual(cleanupErrors, []);
  }
});
