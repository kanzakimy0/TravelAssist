import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import { emptyPreference } from "../src/features/preferences/domain/preference-v1.ts";

const require = createRequire(import.meta.url);
const ok = (result) => {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local Auth/DB call must succeed",
  );
  return result.data;
};
const patch = (expectedRevision, set = {}, unset = []) => ({
  expectedRevision,
  patch: { schemaVersion: "1.0", set, unset },
});
test("TASK-045 real Local Auth/API/UI acceptance", async (t) => {
  const completedScenarios = [];
  async function acceptance(name, run) {
    await t.test(name, async () => {
      await run();
      completedScenarios.push(name);
    });
  }
  const local = preferenceLocalRuntime(),
    { db, admin } = local;
  const users = [];
  let app, browser;
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Requires clean reset Local DB",
    );
    const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
    assert.ok(
      playwrightPath,
      "CODEX_PLAYWRIGHT_PATH is required; UI acceptance cannot be skipped",
    );
    const { chromium } = require(playwrightPath);
    app = await startApp(local);
    for (let i = 0; i < 2; i++) {
      const email = "task045-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signed = ok(
        await client.auth.signInWithPassword({ email, password }),
      );
      const jar = new CookieJar();
      const login = await authRequest(app, jar, "signin", { email, password });
      assert.equal(login.response.status, 200);
      users.push({
        id: created.user.id,
        email,
        password,
        client,
        token: signed.session.access_token,
        jar,
      });
    }
    const [a, b] = users;
    async function api(user, method = "GET", body, options = {}) {
      const cookie = options.cookie ?? false;
      const headers = {
        ...(user
          ? cookie
            ? { cookie: user.jar.header() }
            : { Authorization: "Bearer " + user.token }
          : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(cookie && method !== "GET" ? { Origin: app.origin } : {}),
        ...options.headers,
      };
      const response = await fetch(
        app.origin +
          "/api/preferences" +
          (options.reset ? "/reset" : "") +
          (options.query ?? ""),
        {
          method,
          headers,
          body:
            body === undefined
              ? undefined
              : options.raw
                ? body
                : JSON.stringify(body),
          redirect: "manual",
        },
      );
      if (user && cookie) user.jar.absorb(response.headers);
      const result = await response.json();
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.match(response.headers.get("vary"), /Authorization/);
      assert.match(response.headers.get("vary"), /Cookie/);
      assert.doesNotMatch(
        JSON.stringify(result),
        /owner_user_id|access_token|refresh_token|sb_secret_|postgres:\/\/|stack|constraint|23514/,
      );
      if (options.status !== undefined)
        assert.equal(response.status, options.status);
      return { status: response.status, body: result, data: result.data };
    }
    await acceptance(
      "anon and malformed/invalid explicit Bearer rejected, including valid Cookie fallback",
      async () => {
        for (const [method, body, reset] of [
          ["GET", undefined, false],
          ["PATCH", patch(0), false],
          ["POST", { expectedRevision: 0 }, true],
        ])
          await api(null, method, body, { reset, status: 401 });
        for (const authorization of [
          "Basic x",
          "Bearer",
          "Bearer invalid",
          "Bearer a b",
        ]) {
          const result = await api(a, "GET", undefined, {
            cookie: true,
            headers: { Authorization: authorization },
            status: 401,
          });
          assert.equal(result.body.error.code, "AUTH_REQUIRED");
        }
      },
    );
    await acceptance(
      "GET missing rev 0 and missing Reset do not create rows; both auth paths",
      async () => {
        for (const user of users) {
          for (const cookie of [false, true]) {
            const missing = await api(user, "GET", undefined, {
              cookie,
              status: 200,
            });
            assert.deepEqual(missing.data, {
              preference: emptyPreference(),
              revision: 0,
              updatedAt: null,
            });
            assert.equal(
              (
                await api(
                  user,
                  "POST",
                  { expectedRevision: 0 },
                  { cookie, reset: true, status: 200 },
                )
              ).data.revision,
              0,
            );
          }
        }
        assert.equal(
          Number(
            (await db`select count(*) from public.travel_preferences`)[0].count,
          ),
          0,
        );
        await api(
          a,
          "POST",
          { expectedRevision: 1 },
          { reset: true, status: 409 },
        );
      },
    );
    await acceptance(
      "Cookie mutations reject foreign/missing Origin and non-JSON; explicit Bearer owns identity",
      async () => {
        for (const Origin of ["https://example.test", "null", ""]) {
          await api(a, "PATCH", patch(0), {
            cookie: true,
            headers: { Origin },
            status: 403,
          });
          await api(
            a,
            "POST",
            { expectedRevision: 0 },
            { cookie: true, reset: true, headers: { Origin }, status: 403 },
          );
        }
        await api(a, "PATCH", patch(0), {
          cookie: true,
          headers: { "content-type": "text/plain" },
          status: 400,
        });
        const both = await api(a, "GET", undefined, {
          cookie: true,
          headers: { Authorization: "Bearer " + b.token },
          status: 200,
        });
        assert.equal(both.data.revision, 0);
      },
    );
    await acceptance(
      "first Cookie PATCH 0→1; sequential Bearer PATCH; stale PATCH and owner injection rejected",
      async () => {
        const first = await api(
          a,
          "PATCH",
          patch(0, { "mobility.walkingTolerance": "low" }),
          { cookie: true, status: 200 },
        );
        assert.equal(first.data.revision, 1);
        assert.equal(
          first.data.preference.values["mobility.walkingTolerance"],
          "low",
        );
        assert.ok(Date.parse(first.data.updatedAt) > 0);
        const next = await api(a, "PATCH", patch(1, { "style.planning": 5 }), {
          status: 200,
        });
        assert.equal(next.data.revision, 2);
        const stale = await api(a, "PATCH", patch(1, { "style.planning": 1 }), {
          status: 409,
        });
        assert.equal(stale.body.error.code, "STALE_PREFERENCE_REVISION");
        await api(
          a,
          "PATCH",
          { ...patch(2), owner_user_id: b.id },
          { status: 400 },
        );
        await api(a, "GET", undefined, {
          query: "?owner=" + b.id,
          status: 400,
        });
        assert.equal(
          (await api(b, "GET", undefined, { status: 200 })).data.revision,
          0,
        );
        assert.equal(
          (await api(a, "GET", undefined, { cookie: true, status: 200 })).data
            .preference.values["style.planning"],
          5,
        );
      },
    );
    await acceptance(
      "concurrent first writes have one winner and one 409; existing same-revision race too",
      async () => {
        const results = await Promise.all([
          api(b, "PATCH", patch(0, { "style.pace": 1 })),
          api(b, "PATCH", patch(0, { "style.pace": 5 })),
        ]);
        assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
        assert.equal((await api(b, "GET")).data.revision, 1);
        const updates = await Promise.all([
          api(b, "PATCH", patch(1, { "style.pace": 2 })),
          api(b, "PATCH", patch(1, { "style.pace": 4 })),
        ]);
        assert.deepEqual(updates.map((x) => x.status).sort(), [200, 409]);
        assert.equal((await api(b, "GET")).data.revision, 2);
      },
    );
    await acceptance(
      "malformed/invalid Preference, oversized 80KiB and wrong revisions fail without writes",
      async () => {
        for (const request of [
          { ...patch(2), extra: 1 },
          { expectedRevision: -1, patch: patch(0).patch },
          { expectedRevision: 1.5, patch: patch(0).patch },
          patch(2, { "mobility.lessWalking": true }),
          patch(2, { "mobility.preset": "balanced" }),
          patch(2, { "attractions.nature": "like" }),
          patch(2, { "experience.photoExperience": true }),
          patch(2, { 少步行: true }),
          patch(2, { "style.pace": 6 }),
          patch(2, {
            "interests.preferences": { photography: "dislike" },
            "interests.details": { photography: ["landscape"] },
          }),
          patch(2, { "mobility.noBus": "false" }),
          {
            expectedRevision: 2,
            patch: { schemaVersion: "2.0", set: {}, unset: [] },
          },
        ])
          await api(a, "PATCH", request, { status: 400 });
        await api(a, "PATCH", "{", { raw: true, status: 400 });
        await api(a, "PATCH", JSON.stringify(patch(2)) + " ".repeat(81921), {
          raw: true,
          status: 413,
        });
        assert.equal((await api(a, "GET")).data.revision, 2);
      },
    );
    await acceptance(
      "whole map replacement and explicit unset preserve unrelated fields",
      async () => {
        let result = await api(
          a,
          "PATCH",
          patch(2, {
            "interests.preferences": { food: "like", photography: "like" },
            "interests.details": { photography: ["landscape"] },
          }),
          { status: 200 },
        );
        result = await api(
          a,
          "PATCH",
          patch(result.data.revision, {
            "interests.preferences": { nature_scenery: "like" },
            "interests.details": { nature_scenery: ["mountain"] },
          }),
          { status: 200 },
        );
        assert.deepEqual(
          result.data.preference.values["interests.preferences"],
          { nature_scenery: "like" },
        );
        assert.deepEqual(result.data.preference.values["interests.details"], {
          nature_scenery: ["mountain"],
        });
        assert.equal(result.data.preference.values["style.planning"], 5);
        result = await api(
          a,
          "PATCH",
          patch(result.data.revision, {}, ["mobility.walkingTolerance"]),
          { status: 200 },
        );
        assert.equal(
          result.data.preference.values["mobility.walkingTolerance"],
          undefined,
        );
      },
    );
    await acceptance(
      "real Reset, stale Reset, already-empty Reset and second Cookie session restore",
      async () => {
        const rev = (await api(a, "GET")).data.revision;
        const reset = await api(
          a,
          "POST",
          { expectedRevision: rev },
          { cookie: true, reset: true, status: 200 },
        );
        assert.deepEqual(reset.data.preference, emptyPreference());
        assert.equal(reset.data.revision, rev + 1);
        await api(
          a,
          "POST",
          { expectedRevision: rev },
          { reset: true, status: 409 },
        );
        const again = await api(
          a,
          "POST",
          { expectedRevision: rev + 1 },
          { reset: true, status: 200 },
        );
        assert.equal(again.data.revision, rev + 2);
        const jar = new CookieJar();
        assert.equal(
          (
            await authRequest(app, jar, "signin", {
              email: a.email,
              password: a.password,
            })
          ).response.status,
          200,
        );
        assert.deepEqual(
          (
            await api({ ...a, jar }, "GET", undefined, {
              cookie: true,
              status: 200,
            })
          ).data,
          again.data,
        );
      },
    );
    await acceptance(
      "real RLS and SQL trigger/validator still protect the API table",
      async () => {
        assert.deepEqual(
          ok(
            await b.client
              .from("travel_preferences")
              .select()
              .eq("owner_user_id", a.id),
          ),
          [],
        );
        assert.equal(
          (
            await b.client
              .from("travel_preferences")
              .insert({ owner_user_id: a.id })
          ).error?.code,
          "42501",
        );
        const current = (await api(a, "GET")).data.revision;
        assert.equal(
          (
            await a.client
              .from("travel_preferences")
              .update({ revision: current })
              .eq("owner_user_id", a.id)
          ).error?.code,
          "40001",
        );
        assert.equal(
          (
            await a.client
              .from("travel_preferences")
              .update({
                revision: current + 1,
                payload: {
                  schemaVersion: "1.0",
                  values: { "mobility.lessWalking": true },
                },
              })
              .eq("owner_user_id", a.id)
          ).error?.code,
          "23514",
        );
        assert.equal(
          (
            await a.client
              .from("travel_preferences")
              .update({ revision: current + 1, owner_user_id: b.id })
              .eq("owner_user_id", a.id)
          ).error?.code,
          "55000",
        );
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false },
        });
        assert.equal(
          (await anon.from("travel_preferences").select()).error?.code,
          "42501",
        );
      },
    );

    browser = await chromium.launch({ channel: "msedge", headless: true });
    const contextA = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const contextB = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    for (const context of [contextA, contextB]) {
      const response = await context.request.post(app.origin + "/auth/signin", {
        headers: { Origin: app.origin },
        data: { email: a.email, password: a.password },
      });
      assert.equal(
        response.status(),
        200,
        "Real browser-context Cookie signin",
      );
    }
    const pageA = await contextA.newPage(),
      pageB = await contextB.newPage();
    const pageErrors = [];
    for (const page of [pageA, pageB])
      page.on("pageerror", (error) => pageErrors.push(error.name));
    const mobility = app.origin + "/personal-center/preferences/mobility";
    async function loaded(page) {
      await page.locator("[data-preference-editor] > fieldset").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector("[data-preference-editor] > fieldset")
            ?.disabled === false,
      );
    }
    await acceptance(
      "UI explicit Save survives reload and a second real Cookie session",
      async () => {
        await pageA.goto(mobility);
        await loaded(pageA);
        assert.equal(
          await pageA.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "",
        );
        await pageA
          .getByLabel("步行容忍度", { exact: true })
          .selectOption("low");
        await pageA
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageA
          .getByRole("status")
          .filter({ hasText: "已保存长期偏好" })
          .waitFor();
        await pageA.reload();
        await loaded(pageA);
        assert.equal(
          await pageA.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "low",
        );
        await pageB.goto(mobility);
        await loaded(pageB);
        assert.equal(
          await pageB.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "low",
        );
      },
    );
    await acceptance(
      "UI stale session shows 409, preserves draft and requires explicit server reload",
      async () => {
        await pageA
          .getByLabel("步行容忍度", { exact: true })
          .selectOption("high");
        await pageA
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageA
          .getByRole("status")
          .filter({ hasText: "已保存长期偏好" })
          .waitFor();
        await pageB
          .getByLabel("步行容忍度", { exact: true })
          .selectOption("veryLow");
        await pageB
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageB
          .getByRole("alert")
          .filter({ hasText: "其他设备或页面中更新" })
          .waitFor();
        assert.equal(
          await pageB.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "veryLow",
        );
        assert.equal(
          await pageB
            .getByRole("button", { name: "保存偏好", exact: true })
            .isDisabled(),
          true,
        );
        await pageB.getByRole("button", { name: /重新加载服务器版本/ }).click();
        await loaded(pageB);
        await pageB.waitForFunction(
          () =>
            document.getElementById("mobility.walkingTolerance")?.value ===
            "high",
        );
      },
    );
    await acceptance(
      "network failure retains draft, Cancel restores saved and dirty navigation guard remains",
      async () => {
        await pageB
          .getByLabel("不乘坐公交", { exact: true })
          .selectOption("true");
        await pageB.route("**/api/preferences", (route) =>
          route.request().method() === "PATCH"
            ? route.abort("failed")
            : route.continue(),
        );
        await pageB
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageB
          .getByRole("alert")
          .filter({ hasText: "本地修改仍保留" })
          .waitFor();
        assert.equal(
          await pageB.getByLabel("不乘坐公交", { exact: true }).inputValue(),
          "true",
        );
        await pageB.unroute("**/api/preferences");
        await pageB.getByRole("button", { name: "取消", exact: true }).click();
        assert.equal(
          await pageB.getByLabel("不乘坐公交", { exact: true }).inputValue(),
          "",
        );
        await pageB
          .getByLabel("不乘坐公交", { exact: true })
          .selectOption("false");
        await pageB
          .getByRole("link", { name: "返回旅行偏好", exact: true })
          .click();
        await pageB
          .getByRole("dialog", { name: "您有尚未保存的修改" })
          .waitFor();
        await pageB
          .getByRole("button", { name: "继续编辑", exact: true })
          .click();
        assert.equal(
          await pageB.getByLabel("不乘坐公交", { exact: true }).inputValue(),
          "false",
        );
        await pageB.getByRole("button", { name: "取消", exact: true }).click();
      },
    );
    await acceptance(
      "real overview Reset reloads empty; guest and empty second account never write defaults",
      async () => {
        await pageB
          .getByRole("link", { name: "返回旅行偏好", exact: true })
          .click();
        await pageB
          .getByRole("heading", { name: "旅行偏好", exact: true })
          .waitFor();
        const reset = pageB
          .locator("header")
          .getByRole("button", { name: "重置偏好", exact: true });
        await reset.waitFor();
        await pageB.waitForFunction(() =>
          [...document.querySelectorAll("header button")].some(
            (x) => x.textContent.includes("重置偏好") && !x.disabled,
          ),
        );
        await reset.click();
        await pageB
          .getByRole("alertdialog")
          .getByRole("button", { name: "重置偏好", exact: true })
          .click();
        await pageB.getByRole("alertdialog").waitFor({ state: "hidden" });
        await pageB.reload();
        await pageB.getByText("0 项已设置", { exact: true }).waitFor();
        assert.deepEqual(
          (await api(a, "GET")).data.preference,
          emptyPreference(),
        );
        const guest = await browser.newContext({
          viewport: { width: 390, height: 844 },
        });
        const guestPage = await guest.newPage();
        let guestWrites = 0;
        guestPage.on("request", (r) => {
          if (r.url().includes("/api/preferences") && r.method() !== "GET")
            guestWrites++;
        });
        await guestPage.goto(mobility);
        await guestPage.waitForURL(/\/login\?/);
        assert.equal(
          await guestPage.locator("[data-preference-editor]").count(),
          0,
        );
        assert.equal(guestWrites, 0);
        await guest.close();
        // Delete only B's test-owned preference to establish a real empty account.
        await db`delete from public.travel_preferences where owner_user_id=${b.id}`;
        const empty = await browser.newContext();
        assert.equal(
          (
            await empty.request.post(app.origin + "/auth/signin", {
              headers: { Origin: app.origin },
              data: { email: b.email, password: b.password },
            })
          ).status(),
          200,
        );
        const page = await empty.newPage();
        let writes = 0;
        page.on("request", (r) => {
          if (r.url().includes("/api/preferences") && r.method() !== "GET")
            writes++;
        });
        await page.goto(mobility);
        await loaded(page);
        assert.equal(
          await page.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "",
        );
        assert.equal(
          await page
            .getByRole("button", { name: "保存偏好", exact: true })
            .isDisabled(),
          true,
        );
        assert.equal(writes, 0);
        assert.equal(
          Number(
            (
              await db`select count(*) from public.travel_preferences where owner_user_id=${b.id}`
            )[0].count,
          ),
          0,
        );
        await empty.close();
      },
    );
    await acceptance(
      "all category routes load canonical controls, mobile layout and no JS errors",
      async () => {
        for (const category of [
          "attractions",
          "dining",
          "accommodation",
          "budget",
          "experience",
          "advanced",
        ]) {
          await pageA.goto(
            app.origin + "/personal-center/preferences/" + category,
          );
          await loaded(pageA);
          assert.ok(
            (await pageA.locator('select,input[type="range"]').count()) > 0,
          );
        }
        await pageA.setViewportSize({ width: 390, height: 844 });
        await pageA.goto(mobility);
        await loaded(pageA);
        assert.equal(
          await pageA.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
          true,
        );
        await mkdir(".artifacts/task045", { recursive: true });
        await writeFile(
          ".artifacts/task045/mobile-layout.json",
          JSON.stringify(
            await pageA.evaluate(() =>
              [
                ...document.querySelectorAll(
                  "[data-preference-editor],fieldset,select,footer",
                ),
              ].map((el) => ({
                tag: el.tagName,
                id: el.id,
                cls: el.className,
                rect: el.getBoundingClientRect().toJSON(),
                display: getComputedStyle(el).display,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
              })),
            ),
            null,
            2,
          ),
        );
        await pageA
          .getByLabel("步行容忍度", { exact: true })
          .selectOption("standard");
        await pageA
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageA
          .getByRole("status")
          .filter({ hasText: "已保存长期偏好" })
          .waitFor();
        await pageA
          .getByLabel("步行容忍度", { exact: true })
          .scrollIntoViewIfNeeded();
        assert.equal(
          await pageA.getByLabel("步行容忍度", { exact: true }).inputValue(),
          "standard",
        );
        await pageA.screenshot({
          path: ".artifacts/task045/mobility-mobile.png",
          fullPage: true,
        });
        assert.deepEqual(pageErrors, []);
      },
    );
    await acceptance(
      "category adapters persist explicit neutral/false/style and whole interest maps",
      async () => {
        await pageA.setViewportSize({ width: 1440, height: 900 });
        for (const [category, label, value] of [
          ["dining", "当地料理", "neutral"],
          ["accommodation", "交通方便", "prioritize"],
          ["budget", "更愿意花在住宿", "false"],
        ]) {
          await pageA.goto(
            app.origin + "/personal-center/preferences/" + category,
          );
          await loaded(pageA);
          await pageA.getByLabel(label, { exact: true }).selectOption(value);
          await pageA
            .getByRole("button", { name: "保存偏好", exact: true })
            .click();
          await pageA
            .getByRole("status")
            .filter({ hasText: "已保存长期偏好" })
            .waitFor();
          await pageA.reload();
          await loaded(pageA);
          assert.equal(
            await pageA.getByLabel(label, { exact: true }).inputValue(),
            value,
          );
        }
        await pageA.goto(
          app.origin + "/personal-center/preferences/experience",
        );
        await loaded(pageA);
        await pageA
          .getByRole("button", {
            name: "将计划程度设为中间档（3）",
            exact: true,
          })
          .click();
        await pageA
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageA
          .getByRole("status")
          .filter({ hasText: "已保存长期偏好" })
          .waitFor();
        await pageA.goto(
          app.origin + "/personal-center/preferences/attractions",
        );
        await loaded(pageA);
        await pageA.getByLabel("摄影", { exact: true }).selectOption("like");
        await pageA.getByLabel("风景摄影", { exact: true }).check();
        await pageA
          .getByRole("button", { name: "保存偏好", exact: true })
          .click();
        await pageA
          .getByRole("status")
          .filter({ hasText: "已保存长期偏好" })
          .waitFor();
        await pageA.reload();
        await loaded(pageA);
        assert.equal(
          await pageA.getByLabel("摄影", { exact: true }).inputValue(),
          "like",
        );
        assert.equal(
          await pageA.getByLabel("风景摄影", { exact: true }).isChecked(),
          true,
        );
        const values = (await api(a, "GET")).data.preference.values;
        assert.equal(values["dining.localCuisine"], "neutral");
        assert.equal(values["budget.prioritizeAccommodation"], false);
        assert.equal(values["style.planning"], 3);
        assert.deepEqual(values["interests.details"], {
          photography: ["landscape"],
        });
        assert.equal(values["dining.smallShops"], undefined);
        assert.equal(values["mobility.fewerTransfers"], undefined);
      },
    );
    await acceptance(
      "real Auth deletion cascades A preference and preserves B; fixture cleanup",
      async () => {
        await api(b, "PATCH", patch(0, { "style.pace": 2 }), { status: 200 });
        ok(await admin.auth.admin.deleteUser(a.id));
        assert.equal(
          Number(
            (
              await db`select count(*) from public.travel_preferences where owner_user_id=${a.id}`
            )[0].count,
          ),
          0,
        );
        assert.equal(
          Number(
            (
              await db`select count(*) from public.travel_preferences where owner_user_id=${b.id}`
            )[0].count,
          ),
          1,
        );
      },
    );
    await writeFile(
      ".artifacts/task045/ui-evidence.json",
      JSON.stringify(
        {
          realAuthUsers: users.length,
          realBrowserCookieSessions: 2,
          browser: "headless msedge",
          expectedScenarios: 16,
          completedScenarios,
          complete: completedScenarios.length === 16,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.stop();
    for (const user of users) {
      if ((await db`select id from auth.users where id=${user.id}`).length)
        ok(await admin.auth.admin.deleteUser(user.id));
    }
    try {
      assert.equal(
        Number((await db`select count(*) from auth.users`)[0].count),
        0,
      );
      assert.equal(
        Number(
          (await db`select count(*) from public.travel_preferences`)[0].count,
        ),
        0,
      );
    } finally {
      await db.end({ timeout: 5 });
    }
  }
});
