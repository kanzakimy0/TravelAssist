import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import {
  preferencePresets,
  applyPreferencePreset,
} from "../src/features/preferences/presets/preference-presets.ts";
import { emptyPreference } from "../src/shared/contracts/preferences/core.ts";
import { readCurrentLongTermPreferenceForRequest } from "../src/server/preferences/public-read.ts";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
const require = createRequire(import.meta.url);
const ok = (r) => {
  assert.equal(r.error?.code ?? null, null, "Local SDK call succeeds");
  return r.data;
};
const noMetadata = (value) =>
  assert.doesNotMatch(
    JSON.stringify(value),
    /preset|mobility_easy|mobility_standard|dining_local|dining_flexible|accommodation_comfort|accommodation_neutral|budget_economical|budget_moderate|budget_flexible|轻松移动|当地饮食优先|舒适省心|预算灵活/,
  );
test("TASK-053 real Local Auth, browser draft templates and downstream contracts", async (t) => {
  const local = preferenceLocalRuntime(),
    { db, admin } = local,
    users = [],
    completed = [],
    pageErrors = [],
    writes = [];
  const names = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "AUTH_SITE_URL",
  ];
  const previous = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  let app, browser;
  const run = async (name, fn) => {
    await t.test(name, async () => {
      await fn();
      completed.push(name);
    });
  };
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated empty Local database required",
    );
    assert.ok(
      process.env.CODEX_PLAYWRIGHT_PATH,
      "Real browser cannot be skipped",
    );
    local.env.DATABASE_URL = local.databaseUrl;
    app = await startApp(local);
    Object.assign(process.env, {
      DATABASE_URL: local.databaseUrl,
      NEXT_PUBLIC_SUPABASE_URL: local.api,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.key,
      AUTH_SITE_URL: app.origin,
    });
    for (let i = 0; i < 2; i++) {
      const email = "task053-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const u = { id: created.user.id, jar: new CookieJar() };
      users.push(u);
      const client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      u.client = client;
      u.token = ok(
        await client.auth.signInWithPassword({ email, password }),
      ).session.access_token;
      assert.equal(
        (await authRequest(app, u.jar, "signin", { email, password })).response
          .status,
        200,
      );
    }
    const [a, b] = users;
    async function api(
      user,
      path = "/api/preferences",
      method = "GET",
      body,
      headers = {},
      status = 200,
    ) {
      const r = await fetch(app.origin + path, {
        method,
        headers: {
          ...(user ? { Authorization: "Bearer " + user.token } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(r.status, status, "Expected private API status");
      assert.match(r.headers.get("cache-control"), /private.*no-store/);
      const json = await r.json();
      noMetadata(json);
      return json.data;
    }
    async function rows(user) {
      return await db`select payload,revision from public.travel_preferences where owner_user_id=${user.id}`;
    }
    await run("fresh A/B GET has no row side effect; anon denied", async () => {
      for (const u of users) {
        assert.deepEqual((await api(u)).preference, emptyPreference());
        assert.equal((await rows(u)).length, 0);
      }
      await api(null, "/api/preferences", "GET", undefined, {}, 401);
      await api(
        null,
        "/api/preferences",
        "PATCH",
        { expectedRevision: 0, patch: preferencePresets[0].patch },
        {},
        401,
      );
    });
    await api(b, "/api/preferences", "PATCH", {
      expectedRevision: 0,
      patch: { schemaVersion: "1.0", set: { "style.pace": 4 }, unset: [] },
    });
    const bBefore = await rows(b);
    const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
    browser = await chromium.launch({ channel: "msedge", headless: true });
    async function context(user, width = 1440) {
      const c = await browser.newContext({ viewport: { width, height: 900 } });
      await c.addCookies(
        user.jar.getAll().map((v) => ({
          ...v,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: false,
          sameSite: "Lax",
        })),
      );
      return c;
    }
    const c1 = await context(a),
      c2 = await context(a),
      page = await c1.newPage(),
      stale = await c2.newPage();
    for (const p of [page, stale]) {
      p.on("pageerror", (e) => pageErrors.push(e.name));
      p.on("request", (r) => {
        if (
          new URL(r.url()).pathname.startsWith("/api/preferences") &&
          r.method() !== "GET"
        ) {
          const payload = r.postDataJSON();
          noMetadata(payload);
          writes.push({
            method: r.method(),
            path: new URL(r.url()).pathname,
            payload,
          });
        }
      });
    }
    const button = (p, name) => p.getByRole("button", { name, exact: true });
    async function loaded(p) {
      await p.locator("[data-preference-editor] > fieldset").waitFor();
      await p.waitForFunction(
        () =>
          document.querySelector("[data-preference-editor] > fieldset")
            ?.disabled === false,
      );
    }
    async function open(p, category) {
      await p.goto(app.origin + "/personal-center/preferences/" + category);
      await loaded(p);
    }
    async function save(p) {
      const response = p.waitForResponse(
        (r) =>
          r.url().endsWith("/api/preferences") &&
          r.request().method() === "PATCH",
      );
      await button(p, "保存偏好").click();
      assert.equal((await response).status(), 200);
      await p
        .getByRole("status")
        .filter({ hasText: "已保存长期偏好" })
        .waitFor();
    }
    await run(
      "page open, template click, cancel and unsaved reload cause zero mutation",
      async () => {
        await open(page, "mobility");
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
        assert.equal(writes.length, 0);
        await button(page, "轻松移动").click();
        assert.equal(
          await button(page, "轻松移动").getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(await button(page, "保存偏好").isEnabled(), true);
        assert.equal(writes.length, 0);
        assert.equal((await rows(a)).length, 0);
        await button(page, "取消").click();
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
        assert.equal(await button(page, "保存偏好").isDisabled(), true);
        await button(page, "标准移动").click();
        await page.reload();
        await loaded(page);
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
        assert.equal(writes.length, 0);
        assert.equal((await rows(a)).length, 0);
      },
    );
    for (const preset of preferencePresets) {
      await run(
        "real click/save/reload exact canonical round trip " + preset.id,
        async () => {
          await open(page, preset.category);
          const before = await api(a),
            n = writes.length;
          await button(page, preset.label).click();
          assert.equal(writes.length, n);
          assert.deepEqual(await api(a), before);
          await save(page);
          const after = await api(a);
          assert.equal(after.revision, before.revision + 1);
          assert.deepEqual(
            after.preference,
            applyPreferencePreset(before.preference, preset.id),
          );
          assert.deepEqual((await rows(a))[0].payload, after.preference);
          await page.reload();
          await loaded(page);
          assert.equal(
            await button(page, preset.label).getAttribute("aria-pressed"),
            "true",
          );
        },
      );
    }
    await run(
      "switch template and manual edit become exact custom; cancel restores server",
      async () => {
        await open(page, "mobility");
        const n = writes.length;
        await button(page, "轻松移动").click();
        await button(page, "标准移动").click();
        assert.equal(
          await button(page, "标准移动").getAttribute("aria-pressed"),
          "true",
        );
        await page
          .getByLabel("不乘坐公交", { exact: true })
          .selectOption("false");
        assert.equal(
          await page.locator("[data-preset-match]").textContent(),
          "自定义",
        );
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
        await button(page, "取消").click();
        assert.equal(writes.length, n);
        assert.equal(
          await button(page, "标准移动").getAttribute("aria-pressed"),
          "true",
        );
      },
    );
    await run(
      "category clear is draft-only then saves unset preserving every other category",
      async () => {
        const before = await api(a),
          n = writes.length;
        await button(page, "清空本页选择").click();
        assert.equal(writes.length, n);
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
        await save(page);
        const expected = structuredClone(before.preference);
        for (const key of Object.keys(expected.values))
          if (key.startsWith("mobility.")) delete expected.values[key];
        assert.deepEqual((await api(a)).preference, expected);
      },
    );
    await run(
      "two real Cookie sessions stale revision returns 409 without overwriting draft",
      async () => {
        await open(page, "mobility");
        await open(stale, "mobility");
        await button(page, "轻松移动").click();
        await save(page);
        await button(stale, "标准移动").click();
        const response = stale.waitForResponse(
          (r) =>
            r.url().endsWith("/api/preferences") &&
            r.request().method() === "PATCH",
        );
        await button(stale, "保存偏好").click();
        assert.equal((await response).status(), 409);
        await stale
          .getByRole("alert")
          .filter({ hasText: "其他设备或页面中更新" })
          .waitFor();
        assert.equal(
          await button(stale, "标准移动").getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(await button(stale, "保存偏好").isDisabled(), true);
        assert.equal(
          (await api(a)).preference.values["mobility.walkingTolerance"],
          "low",
        );
        await stale.getByRole("button", { name: /重新加载服务器版本/ }).click();
        await loaded(stale);
        assert.equal(
          await button(stale, "轻松移动").getAttribute("aria-pressed"),
          "true",
        );
      },
    );
    await run(
      "5.14 verified read carries canonical values and source revision without metadata",
      async () => {
        const resource = await api(a);
        const { result, finish } =
          await readCurrentLongTermPreferenceForRequest(
            new NextRequest(app.origin + "/api/consumer", {
              headers: { Authorization: "Bearer " + a.token },
            }),
          );
        assert.equal(result.ok, true);
        assert.deepEqual(result.data.preference, resource.preference);
        assert.equal(result.data.sourceRevision, resource.revision);
        noMetadata(result.data);
        const response = finish(Response.json({ ok: true }));
        assert.match(
          response.headers.get("cache-control"),
          /private.*no-store/,
        );
        assert.match(response.headers.get("vary"), /Cookie/);
      },
    );
    await run(
      "Trip Library draft and saved snapshots contain canonical preference and source revision only",
      async () => {
        const resource = await api(a);
        let trip = await api(
          a,
          "/api/trip-library",
          "POST",
          {
            schemaVersion: "1.0",
            creationKey: randomUUID(),
            draftFacts: fullDraftFixture(),
            wizardProgress: progressFixture(),
            partySelection: { includesOwner: true, companionIds: [] },
          },
          {},
          201,
        );
        assert.deepEqual(trip.preferenceSnapshot, resource.preference);
        assert.equal(trip.preferenceSourceRevision, resource.revision);
        const plan = fullSnapshotFixture();
        plan.trip.id = "canonical-trip-" + randomUUID();
        trip = await api(
          a,
          "/api/trip-library/" + trip.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: plan },
          { "If-Match": '"' + trip.storageRevision + '"' },
        );
        assert.deepEqual(trip.preferenceSnapshot, resource.preference);
        assert.equal(trip.preferenceSourceRevision, resource.revision);
        const stored =
          await db`select preference_snapshot,preference_source_revision from public.trip_library_records where owner_user_id=${a.id}`;
        assert.deepEqual(stored[0].preference_snapshot, resource.preference);
        noMetadata(stored);
      },
    );
    await run(
      "desktop and mobile templates render without overflow or script errors",
      async () => {
        await mkdir("docs/qa/TASK-053", { recursive: true });
        await mkdir(".artifacts/task053", { recursive: true });
        await open(page, "mobility");
        await page.screenshot({
          path: ".artifacts/task053/desktop.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await open(page, "budget");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: ".artifacts/task053/mobile.png",
          fullPage: true,
        });
        assert.deepEqual(pageErrors, []);
      },
    );
    await run(
      "global reset is empty/unset; no template auto-applied",
      async () => {
        await page.goto(app.origin + "/personal-center/preferences");
        const reset = page
          .locator("header")
          .getByRole("button", { name: "重置偏好", exact: true });
        await reset.waitFor();
        await page.waitForFunction(() =>
          [...document.querySelectorAll("header button")].some(
            (x) => x.textContent.includes("重置偏好") && !x.disabled,
          ),
        );
        await reset.click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "重置偏好", exact: true })
          .click();
        await page.getByRole("alertdialog").waitFor({ state: "hidden" });
        assert.deepEqual((await api(a)).preference, emptyPreference());
        await open(page, "mobility");
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 0);
      },
    );
    await run(
      "B remains unchanged; cross-user RLS and guest page denied",
      async () => {
        assert.deepEqual(await rows(b), bBefore);
        assert.deepEqual(
          ok(
            await b.client
              .from("travel_preferences")
              .select("payload")
              .eq("owner_user_id", a.id),
          ),
          [],
        );
        const guest = await browser.newContext();
        const p = await guest.newPage();
        let mutations = 0;
        p.on("request", (r) => {
          if (r.url().includes("/api/preferences") && r.method() !== "GET")
            mutations++;
        });
        await p.goto(app.origin + "/personal-center/preferences/mobility");
        await p.waitForURL(/\/login\?/);
        assert.equal(mutations, 0);
        await guest.close();
      },
    );
    await run(
      "production browser JS and HTML contain no DB, private Auth or server implementation",
      async () => {
        const forbidden =
          /readCurrentLongTermPreferenceForRequest|verifiedPrivateRequest|createPreferenceRepository|DATABASE_URL|SUPABASE_SECRET_KEY|from\s*["']server-only/;
        async function scan(dir) {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const p = dir + "/" + entry.name;
            if (entry.isDirectory()) await scan(p);
            else if (p.endsWith(".js"))
              assert.doesNotMatch(await readFile(p, "utf8"), forbidden);
          }
        }
        await scan(".next/static");
        assert.doesNotMatch(await page.content(), forbidden);
      },
    );
    assert.deepEqual(pageErrors, []);
    await writeFile(
      "docs/qa/TASK-053/local-evidence.json",
      JSON.stringify(
        {
          task: "TASK-053-B",
          runtime:
            "Local Supabase + real Auth + production Next + headless Edge",
          users: ["A", "B", "anon"],
          completedScenarios: completed,
          scenarioCount: completed.length,
          templateCount: preferencePresets.length,
          presetClickMutations: 0,
          preferenceMutationRequests: writes.length,
          bIsolation: true,
          presetMetadataInDBReadOrTrip: false,
          pageErrors,
          skipped: 0,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.stop();
    for (const u of users) ok(await admin.auth.admin.deleteUser(u.id, false));
    await db.end();
    for (const key of names) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
