import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import { readCurrentLongTermPreferenceForRequest } from "../src/server/preferences/public-read.ts";
import { parseLongTermPreferenceReadV1 } from "../src/shared/contracts/preferences/index.ts";
const require = createRequire(import.meta.url);
const ok = (r) => {
  assert.equal(r.error?.code ?? null, null, "Real Local SDK call succeeds");
  return r.data;
};
test("TASK-046 real Local public contract/Auth/API/browser acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    { db, admin } = local;
  const users = [],
    completed = [];
  let app, browser;
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "AUTH_SITE_URL",
  ];
  const prior = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  const run = async (name, fn) =>
    t.test(name, async () => {
      await fn();
      completed.push(name);
    });
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated reset Local DB required",
    );
    assert.ok(
      process.env.CODEX_PLAYWRIGHT_PATH,
      "Real browser runtime required; no skip",
    );
    const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
    app = await startApp(local);
    Object.assign(process.env, {
      NEXT_PUBLIC_SUPABASE_URL: local.api,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.key,
      AUTH_SITE_URL: app.origin,
    });
    for (let i = 0; i < 2; i++) {
      const email = "task046-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const user = {
        id: created.user.id,
        email,
        password,
        jar: new CookieJar(),
      };
      users.push(user);
      const client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      user.token = ok(
        await client.auth.signInWithPassword({ email, password }),
      ).session.access_token;
      assert.equal(
        (await authRequest(app, user.jar, "signin", { email, password }))
          .response.status,
        200,
      );
    }
    const [a, b] = users;
    async function read(
      user,
      cookie = false,
      extra = {},
      business = false,
      signal,
    ) {
      const targetOwner = user === a ? b.id : a.id;
      const body = JSON.stringify({
        owner: targetOwner,
        operation: "reset",
        tripId: "demo",
      });
      const request = new NextRequest(
        app.origin +
          (business
            ? "/api/example-consumer?tripId=demo&locale=zh&owner=" + targetOwner
            : "/api/preferences"),
        {
          ...(business
            ? business === "GET"
              ? { method: "GET" }
              : { method: "POST", body }
            : {}),
          signal,
          headers: {
            ...(user
              ? cookie
                ? { cookie: user.jar.header() }
                : { Authorization: "Bearer " + user.token }
              : {}),
            ...extra,
          },
        },
      );
      const originalUrl = request.url;
      const originalQuery = request.nextUrl.search;
      const originalHeaders = JSON.stringify([...request.headers]);
      const originalCookies = JSON.stringify(request.cookies.getAll());
      const { result, finish } =
        await readCurrentLongTermPreferenceForRequest(request);
      if (business) {
        assert.ok(
          request.url === originalUrl &&
            request.nextUrl.search === originalQuery,
          "Caller URL/query unchanged",
        );
        assert.ok(
          JSON.stringify([...request.headers]) === originalHeaders,
          "Caller headers unchanged",
        );
        assert.ok(
          JSON.stringify(request.cookies.getAll()) === originalCookies,
          "Caller cookies unchanged even during refresh",
        );
        assert.equal(request.bodyUsed, false);
        if (business === "GET") assert.equal(request.body, null);
        else {
          assert.equal(request.body.locked, false);
          assert.ok(
            (await request.text()) === body,
            "Caller body not consumed or changed",
          );
        }
      }
      const outer = finish(
        Response.json(result, {
          headers: {
            Vary: "Accept-Language",
            "Cache-Control": "public",
            "Set-Cookie": "consumer=kept; Path=/",
          },
        }),
      );
      assert.match(outer.headers.get("cache-control"), /private.*no-store/);
      assert.match(outer.headers.get("vary"), /Cookie/);
      assert.match(outer.headers.get("vary"), /Authorization/);
      assert.match(outer.headers.get("vary"), /Accept-Language/);
      assert.ok(outer.headers.getSetCookie().includes("consumer=kept; Path=/"));
      if (user && cookie) user.jar.absorb(outer.headers);
      if (result.ok) {
        assert.deepEqual(
          parseLongTermPreferenceReadV1(result.data),
          result.data,
        );
        assert.ok(Object.isFrozen(result.data.preference.values));
      }
      for (const secret of users.flatMap((u) => [u.id, u.token]))
        assert.ok(
          !JSON.stringify(result).includes(secret),
          "Public JSON excludes identity/credentials",
        );
      return { result, outer };
    }
    async function mutate(user, expectedRevision, values = {}, reset = false) {
      const response = await fetch(
        app.origin + "/api/preferences" + (reset ? "/reset" : ""),
        {
          method: reset ? "POST" : "PATCH",
          headers: {
            Authorization: "Bearer " + user.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            reset
              ? { expectedRevision }
              : {
                  expectedRevision,
                  patch: { schemaVersion: "1.0", set: values, unset: [] },
                },
          ),
        },
      );
      const body = await response.json();
      return { status: response.status, body };
    }
    await run(
      "public Cookie/Bearer missing reads and missing reset do not create rows",
      async () => {
        for (const user of users)
          for (const cookie of [false, true]) {
            const { result } = await read(user, cookie);
            assert.equal(result.ok, true);
            assert.equal(result.data.sourceRevision, 0);
            assert.equal(result.data.sourceUpdatedAt, null);
            assert.deepEqual(result.data.preference.values, {});
          }
        assert.equal((await mutate(a, 0, {}, true)).status, 200);
        assert.equal(
          Number(
            (await db`select count(*) from public.travel_preferences`)[0].count,
          ),
          0,
        );
      },
    );
    await run(
      "anon and invalid explicit Bearer stay failures without Cookie fallback",
      async () => {
        assert.deepEqual((await read(null)).result, {
          ok: false,
          code: "AUTH_REQUIRED",
        });
        for (const token of ["Basic invalid", "Bearer invalid"]) {
          assert.deepEqual(
            (await read(a, true, { Authorization: token })).result,
            { ok: false, code: "AUTH_REQUIRED" },
          );
        }
      },
    );
    const valuesA = {
      "mobility.noPublicTransit": true,
      "mobility.noBus": false,
      "style.planning": 3,
      "dining.localCuisine": "neutral",
      "interests.details": { photography: ["landscape"] },
    };
    const valuesB = {
      "mobility.noBus": true,
      "mobility.walkingTolerance": "veryHigh",
    };
    await run(
      "unchanged PATCH then public read preserves values/time/revision and isolates equal revisions",
      async () => {
        for (const [user, values] of [
          [a, valuesA],
          [b, valuesB],
        ]) {
          const write = await mutate(user, 0, values);
          assert.equal(write.status, 200);
          assert.equal(write.body.data.revision, 1);
          for (const cookie of [false, true]) {
            const { result } = await read(user, cookie);
            assert.equal(result.ok, true);
            assert.equal(result.data.sourceRevision, 1);
            assert.deepEqual(result.data.preference.values, values);
            assert.equal(
              result.data.sourceUpdatedAt,
              write.body.data.updatedAt,
            );
          }
        }
        const before =
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`;
        await Promise.all([read(a), read(b), read(a, true), read(b, true)]);
        assert.deepEqual(
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`,
          before,
        );
      },
    );
    await run(
      "R1 business Cookie/Bearer query is isolated, owner/body cannot switch account and read never writes",
      async () => {
        const before =
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`;
        for (const [user, values] of [
          [a, valuesA],
          [b, valuesB],
        ])
          for (const cookie of [true, false])
            for (const method of ["GET", "POST"]) {
              const { result } = await read(user, cookie, {}, method);
              assert.equal(
                result.ok,
                true,
                "Business query must not become PREFERENCE_UNAVAILABLE",
              );
              assert.equal(result.data.sourceRevision, 1);
              assert.deepEqual(result.data.preference.values, values);
            }
        assert.deepEqual(
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`,
          before,
        );
      },
    );
    await run(
      "R1 business invalid Bearer cannot fall back to Cookie; explicit valid Bearer owns identity",
      async () => {
        for (const authorization of ["Basic invalid", "Bearer invalid"])
          assert.deepEqual(
            (await read(a, true, { Authorization: authorization }, true))
              .result,
            { ok: false, code: "AUTH_REQUIRED" },
          );
        const { result } = await read(
          a,
          true,
          { Authorization: "Bearer " + b.token },
          true,
        );
        assert.equal(result.ok, true);
        assert.deepEqual(result.data.preference.values, valuesB);
      },
    );
    await run(
      "R1 direct external preference GET still rejects all query parameters",
      async () => {
        for (const user of users)
          for (const cookie of [true, false])
            for (const query of ["?owner=other", "?tripId=demo&locale=zh"]) {
              const response = await fetch(
                app.origin + "/api/preferences" + query,
                {
                  headers: cookie
                    ? { Cookie: user.jar.header() }
                    : { Authorization: "Bearer " + user.token },
                },
              );
              assert.equal(response.status, 400);
              assert.deepEqual(await response.json(), {
                ok: false,
                error: { code: "INVALID_REQUEST" },
              });
              assert.match(
                response.headers.get("cache-control"),
                /private.*no-store/,
              );
            }
      },
    );
    await run(
      "R1 business request cancellation remains a distinct failure",
      async () => {
        const controller = new AbortController();
        controller.abort();
        assert.deepEqual(
          (await read(a, true, {}, true, controller.signal)).result,
          { ok: false, code: "REQUEST_CANCELLED" },
        );
      },
    );
    await run(
      "real expired Cookie refresh forwarded by server finalizer and usable in next request",
      async () => {
        const session = a.jar.session();
        a.jar.replaceSession({ ...session, expires_at: 1 });
        const { result, outer } = await read(a, true, {}, true);
        assert.equal(result.ok, true);
        assert.ok(
          outer.headers.getSetCookie().some((v) => /^sb-.*auth-token/.test(v)),
          "Real Auth refresh emitted cookies",
        );
        assert.ok(a.jar.session().expires_at > Math.floor(Date.now() / 1000));
        assert.equal((await read(a, true)).result.ok, true);
      },
    );
    await run(
      "stale PATCH/reset remain 409 and reset reads positive-revision empty",
      async () => {
        assert.equal((await mutate(a, 0, {})).status, 409);
        assert.equal((await mutate(a, 0, {}, true)).status, 409);
        assert.equal((await mutate(a, 1, {}, true)).status, 200);
        const { result } = await read(a, true);
        assert.equal(result.data.sourceRevision, 2);
        assert.deepEqual(result.data.preference.values, {});
        assert.notEqual(result.data.sourceUpdatedAt, null);
      },
    );
    const bundle = await build({
      entryPoints: ["tests/fixtures/task-046-a-consumer.ts"],
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "Task046Consumer",
      write: false,
    });
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const pages = [],
      calls = [],
      errors = [];
    for (const user of users) {
      const context = await browser.newContext();
      const login = await context.request.post(app.origin + "/auth/signin", {
        headers: { Origin: app.origin },
        data: { email: user.email, password: user.password },
      });
      assert.equal(login.status(), 200);
      const page = await context.newPage();
      page.on("pageerror", () => errors.push("pageerror"));
      await page.goto(app.origin + "/personal-center/preferences");
      await page.waitForLoadState("networkidle");
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/api/preferences"))
          calls.push(request.method());
      });
      pages.push(page);
    }
    await run(
      "real A-like browser GET facade uses two Cookie accounts without cache or writes",
      async () => {
        const before =
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`;
        const first = await pages[0].evaluate(() =>
          Task046Consumer.readCurrentLongTermPreference(),
        );
        const second = await pages[1].evaluate(() =>
          Task046Consumer.readCurrentLongTermPreference(),
        );
        assert.equal(first.ok, true);
        assert.equal(first.data.sourceRevision, 2);
        assert.deepEqual(first.data.preference.values, {});
        assert.equal(second.ok, true);
        assert.equal(second.data.sourceRevision, 1);
        assert.deepEqual(second.data.preference.values, valuesB);
        assert.deepEqual(
          await db`select owner_user_id,payload,revision,updated_at from public.travel_preferences order by owner_user_id`,
          before,
        );
        assert.equal(
          (await mutate(a, 2, { "mobility.walkingTolerance": "low" })).status,
          200,
        );
        const again = await pages[0].evaluate(() =>
          Task046Consumer.readCurrentLongTermPreference(),
        );
        assert.equal(again.data.sourceRevision, 3);
        assert.deepEqual(again.data.preference.values, {
          "mobility.walkingTolerance": "low",
        });
      },
    );
    await run(
      "real browser cancellation/network rejection are distinct failures, never empty success",
      async () => {
        const page = pages[0];
        const cancelled = await page.evaluate(async () => {
          const c = new AbortController();
          const reading = Task046Consumer.readCurrentLongTermPreference({
            signal: c.signal,
          });
          c.abort();
          return reading;
        });
        assert.deepEqual(cancelled, { ok: false, code: "REQUEST_CANCELLED" });
        await page.route("**/api/preferences", (route) =>
          route.abort("failed"),
        );
        assert.deepEqual(
          await page.evaluate(() =>
            Task046Consumer.readCurrentLongTermPreference(),
          ),
          { ok: false, code: "PREFERENCE_UNAVAILABLE" },
        );
        await page.unroute("**/api/preferences");
        const restored = await page.evaluate(() =>
          Task046Consumer.readCurrentLongTermPreference(),
        );
        assert.equal(restored.ok, true);
        assert.equal(restored.data.sourceRevision, 3);
        assert.ok(calls.length >= 5);
        assert.ok(calls.every((method) => method === "GET"));
        assert.deepEqual(errors, []);
      },
    );
    await run("Auth delete cascade and complete fixture cleanup", async () => {
      ok(await admin.auth.admin.deleteUser(a.id));
      assert.equal(
        Number(
          (
            await db`select count(*) from public.travel_preferences where owner_user_id=${a.id}`
          )[0].count,
        ),
        0,
      );
      assert.equal((await read(b)).result.data.sourceRevision, 1);
      ok(await admin.auth.admin.deleteUser(b.id));
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
    });
    await mkdir(".artifacts/task046", { recursive: true });
    await writeFile(
      ".artifacts/task046/local-evidence.json",
      JSON.stringify(
        {
          realAuthUsers: 2,
          realBrowserCookieContexts: 2,
          browser: "headless msedge",
          expectedScenarios: 12,
          completedScenarios: completed,
          complete: completed.length === 12,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
    await db.end();
    if (app) await app.stop();
    for (const name of names)
      if (prior[name] === undefined) delete process.env[name];
      else process.env[name] = prior[name];
  }
});
