import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import {
  localDeletionSecret,
  ownerColumns,
  inventory,
  counts,
} from "./task-052-local-helpers.mjs";
import {
  validDeletion,
  invalidDeletions,
} from "./task-052-account-deletion-fixtures.mjs";
import {
  fullProfilePatch,
  contactInput,
} from "./task-050-profile-fixtures.mjs";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { patch } from "./task-048-trip-fixtures.mjs";
const require = createRequire(import.meta.url);
const safeOk = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local fixture succeeds; raw output withheld",
  );
  return r.data;
};
const companion = () => ({
  displayName: "Synthetic traveller",
  relationshipCode: null,
  relationshipLabel: null,
  birthDate: null,
  ageGroupFallback: "adult",
  genderCode: null,
  avatarPath: null,
  travelProfile: {
    schemaVersion: "1.0",
    mobilityNeeds: [],
    diningNeeds: [],
    activityInterests: [],
  },
});
const deletePath = "/personal-center/account/privacy/delete";
const roots = [
  "/api/profile",
  "/api/emergency-contacts",
  "/api/preferences",
  "/api/companions",
  "/api/companion-groups",
  "/api/trip-library",
];

test("TASK-052 real Local cascade/Auth/Storage/browser acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    completed = [],
    metrics = {};
  let app,
    browser,
    storageBucket = false,
    storagePolicy = false;
  const artifact = ".artifacts/task052";
  await mkdir(artifact, { recursive: true });
  const accept = async (name, run) => {
    let passed = false;
    await t.test(name, async () => {
      await run();
      completed.push(name);
      passed = true;
    });
    assert.ok(passed, "Stop dependent acceptance after failed precondition");
  };
  const secret = localDeletionSecret(local);
  local.env.DATABASE_URL = local.databaseUrl;
  local.env.NODE_OPTIONS =
    "--import=" +
    pathToFileURL(resolve("tests/task-052-network-guard.mjs")).href;
  local.env.TASK052_NETWORK_EVIDENCE = resolve(artifact, "network.json");
  const networkRuns = [];
  async function restart(key) {
    if (app) {
      await app.stop();
      networkRuns.push(
        JSON.parse(await readFile(local.env.TASK052_NETWORK_EVIDENCE, "utf8")),
      );
    }
    if (key === undefined) delete local.env.SUPABASE_SECRET_KEY;
    else local.env.SUPABASE_SECRET_KEY = key;
    app = await startApp(local);
  }
  async function api(
    user,
    path,
    method = "GET",
    body,
    status = 200,
    options = {},
  ) {
    const headers = {
      ...(user
        ? options.cookie
          ? { Cookie: options.oldCookie ?? user.jar.header() }
          : { Authorization: "Bearer " + user.token }
        : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.cookie && method !== "GET" ? { Origin: app.origin } : {}),
      ...options.headers,
    };
    if (headers.Origin === "") delete headers.Origin;
    const response = await fetch(app.origin + path, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : options.raw
            ? body
            : JSON.stringify(body),
    });
    const text = await response.text();
    assert.equal(
      text.includes(secret),
      false,
      "No response credential leakage",
    );
    const value = text ? JSON.parse(text) : null;
    assert.equal(
      response.status,
      status,
      method +
        " " +
        path.replace(/[0-9a-f-]{36}/g, "<record>") +
        " " +
        (value?.error?.code ?? ""),
    );
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    assert.match(response.headers.get("vary"), /Authorization/);
    assert.match(response.headers.get("vary"), /Cookie/);
    if (status >= 400) {
      assert.deepEqual(Object.keys(value), ["ok", "error"]);
      assert.deepEqual(Object.keys(value.error), ["code"]);
      assert.equal(value.ok, false);
      assert.doesNotMatch(
        text,
        /postgres|sb_secret_|access_token|owner_user_id|example.test/i,
      );
      return value.error.code;
    }
    if (status === 204) {
      assert.equal(text, "");
      return null;
    }
    return value.data;
  }
  const remove = (u, status = 204, options = {}, body = validDeletion()) =>
    api(u, "/api/account", "DELETE", body, status, options);
  async function fill(u) {
    await api(u, "/api/profile", "PATCH", fullProfilePatch());
    const contact = await api(
      u,
      "/api/emergency-contacts",
      "POST",
      contactInput(),
      201,
    );
    await api(u, "/api/preferences", "PATCH", {
      expectedRevision: 0,
      patch: patch({ "mobility.noBus": true }),
    });
    const companions = [];
    for (let i = 0; i < 2; i++)
      companions.push(
        await api(u, "/api/companions", "POST", companion(), 201),
      );
    const group = await api(
      u,
      "/api/companion-groups",
      "POST",
      {
        name: "Synthetic party",
        memberIds: companions.map((x) => x.id),
        includesOwner: true,
      },
      201,
    );
    const trips = [];
    for (const state of ["draft", "saved", "history"]) {
      let trip = await api(
        u,
        "/api/trip-library",
        "POST",
        {
          schemaVersion: "1.0",
          creationKey: randomUUID(),
          draftFacts: fullDraftFixture(),
          wizardProgress: progressFixture(),
          partySelection: {
            includesOwner: true,
            companionIds: companions.map((x) => x.id),
          },
        },
        201,
      );
      if (state !== "draft") {
        const snapshot = fullSnapshotFixture();
        snapshot.trip.id = "canonical-" + randomUUID();
        trip = await api(
          u,
          "/api/trip-library/" + trip.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: snapshot },
          200,
          { headers: { "If-Match": '"1"' } },
        );
      }
      if (state === "history")
        trip = await api(
          u,
          "/api/trip-library/" + trip.id + "/history",
          "POST",
          undefined,
          200,
          { headers: { "If-Match": '"2"' } },
        );
      trips.push(trip);
    }
    Object.assign(u, { contact, companions, group, trips });
  }
  async function browserContext(u) {
    const context = await browser.newContext();
    if (u)
      await context.addCookies(
        u.jar.getAll().map((c) => ({
          ...c,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: false,
          sameSite: "Lax",
        })),
      );
    return context;
  }
  async function prepare(page) {
    await page.goto(app.origin + deletePath);
    await page.getByPlaceholder("删除账户", { exact: true }).waitFor();
  }
  async function unlock(page) {
    await page.getByRole("checkbox").check();
    await page.getByPlaceholder("删除账户", { exact: true }).fill("删除账户");
  }
  try {
    await accept(
      "execution-time catalog: eight product tables, seven Auth cascades, both member parent cascades",
      async () => {
        assert.equal(
          Number((await local.db`select count(*) from auth.users`)[0].count),
          0,
          "requires clean Local fixture database",
        );
        const tables =
          await local.db`select tablename from pg_tables where schemaname='public' order by tablename`;
        assert.deepEqual(
          tables.map((x) => x.tablename),
          Object.keys(ownerColumns).sort(),
        );
        const fks =
          await local.db`select conrelid::regclass::text as source,confrelid::regclass::text as target,confdeltype,pg_get_constraintdef(oid) as definition from pg_constraint where contype='f' and connamespace='public'::regnamespace order by source,definition`;
        assert.equal(fks.filter((x) => x.target === "auth.users").length, 7);
        assert.equal(
          fks.filter((x) => x.source === "companion_group_members").length,
          2,
        );
        assert.ok(fks.every((x) => x.confdeltype === "c"));
        metrics.catalog = {
          tables: tables.map((x) => x.tablename),
          foreignKeys: Array.from(fks),
        };
        metrics.initialStorage = (
          await local.db`select (select count(*)::int from storage.objects) as objects,(select count(*)::int from storage.buckets) as buckets`
        )[0];
        assert.deepEqual(metrics.initialStorage, { objects: 0, buckets: 0 });
      },
    );
    await restart(undefined);
    for (let i = 0; i < 3; i++) {
      const email = "task052-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = safeOk(
        await local.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const u = { id: created.user.id, email, password };
      users.push(u);
      u.client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signed = safeOk(
        await u.client.auth.signInWithPassword({ email, password }),
      );
      u.token = signed.session.access_token;
      u.refresh = signed.session.refresh_token;
      u.jar = new CookieJar();
      assert.equal(
        (await authRequest(app, u.jar, "signin", { email, password })).response
          .status,
        200,
      );
    }
    const [a, b, c] = users;
    await accept(
      "A and B each populate every product table and Draft/Saved/History through accepted private APIs",
      async () => {
        await fill(a);
        await fill(b);
        metrics.beforeA = counts(await inventory(local.db, a.id));
        metrics.beforeB = counts(await inventory(local.db, b.id));
        for (const v of Object.values(metrics.beforeA)) assert.ok(v > 0);
        assert.equal(metrics.beforeA.companions, 2);
        assert.equal(metrics.beforeA.companion_group_members, 2);
        assert.equal(metrics.beforeA.trip_library_records, 3);
        assert.deepEqual(
          a.trips.map((x) => x.libraryState),
          ["draft", "saved", "history"],
        );
      },
    );
    const initialA = await inventory(local.db, a.id),
      initialB = await inventory(local.db, b.id);
    browser = await require(process.env.CODEX_PLAYWRIGHT_PATH).chromium.launch({
      channel: "msedge",
      headless: true,
    });
    const errors = [],
      external = [];
    browser.on("disconnected", () => {});
    const contextA = await browserContext(a),
      contextB = await browserContext(b),
      guest = await browserContext();
    for (const context of [contextA, contextB, guest]) {
      context.on("page", (p) => {
        p.on("pageerror", () => errors.push("pageerror"));
        p.on("console", (message) => {
          if (
            message.location().url === app.origin + "/favicon.ico" &&
            /404/.test(message.text())
          ) {
            metrics.knownBaselineFavicon404 =
              (metrics.knownBaselineFavicon404 ?? 0) + 1;
            return;
          }
          if (
            message.type() === "error" &&
            !/Failed to load resource: the server responded with a status of (401|403|503)/.test(
              message.text(),
            )
          )
            errors.push("consoleerror");
        });
        p.on("request", (r) => {
          if (!["127.0.0.1", "localhost"].includes(new URL(r.url()).hostname))
            external.push("external");
        });
      });
    }
    const page = await contextA.newPage(),
      pageB = await contextB.newPage();
    await accept(
      "signed-out deletion page guard, exact phrase plus checkbox, cancel and unavailable export",
      async () => {
        const g = await guest.newPage();
        await g.goto(app.origin + deletePath);
        await g.waitForURL(
          (url) => !url.pathname.startsWith("/personal-center"),
        );
        assert.equal(
          await g
            .getByRole("button", { name: "永久删除账户", exact: true })
            .count(),
          0,
        );
        await prepare(page);
        const button = page.getByRole("button", {
          name: "永久删除账户",
          exact: true,
        });
        assert.ok(await button.isDisabled());
        await page
          .getByPlaceholder("删除账户", { exact: true })
          .fill("删除账户");
        assert.ok(await button.isDisabled());
        await page.getByRole("checkbox").check();
        assert.ok(await button.isEnabled());
        await page
          .getByPlaceholder("删除账户", { exact: true })
          .fill("删除账户 ");
        assert.ok(await button.isDisabled());
        const html = await page.content();
        assert.equal(html.includes(secret), false);
        assert.doesNotMatch(
          html,
          /2 次未来旅行|6 个有效外部预订|Mock 数据导出申请已记录/,
        );
        assert.ok(
          await page
            .getByRole("button", { name: "数据导出暂不可用" })
            .isDisabled(),
        );
        await page.getByRole("link", { name: "取消", exact: true }).click();
        await page.waitForURL("**/personal-center/account/privacy");
        await prepare(page);
      },
    );
    await accept(
      "missing server credential: actual browser sanitized 503, account remains intact",
      async () => {
        await unlock(page);
        const pending = page.waitForResponse((r) =>
          r.url().endsWith("/api/account"),
        );
        await page
          .getByRole("button", { name: "永久删除账户", exact: true })
          .click();
        assert.equal((await pending).status(), 503);
        await page
          .locator('[data-account-kind="deleteAccount"] p[role="alert"]')
          .waitFor();
        assert.doesNotMatch(
          await page
            .locator('[data-account-kind="deleteAccount"] p[role="alert"]')
            .textContent(),
          /sb_secret|postgres|Supabase/i,
        );
        assert.deepEqual(await inventory(local.db, a.id), initialA);
      },
    );
    await accept(
      "malformed execution credential: actual HTTP 503, no product/Auth changes",
      async () => {
        await restart("malformed-local-fixture");
        assert.equal(await remove(a, 503), "ACCOUNT_DELETION_UNAVAILABLE");
        assert.deepEqual(await inventory(local.db, a.id), initialA);
      },
    );
    await restart(secret);
    await accept(
      "anon, missing/wrong Cookie Origin, explicit malformed/invalid Bearer plus valid Cookie fail closed",
      async () => {
        assert.equal(await remove(null, 401), "AUTH_REQUIRED");
        for (const Origin of ["", "https://untrusted.example"])
          assert.equal(
            await remove(a, 403, { cookie: true, headers: { Origin } }),
            "FORBIDDEN",
          );
        for (const Authorization of [
          "Basic bad",
          "Bearer malformed",
          "Bearer ",
        ])
          assert.equal(
            await remove(a, 401, { cookie: true, headers: { Authorization } }),
            "AUTH_REQUIRED",
          );
        assert.deepEqual(await inventory(local.db, a.id), initialA);
        assert.deepEqual(await inventory(local.db, b.id), initialB);
      },
    );
    await accept(
      "strict unknown/missing/wrong payloads and target injection never reach deletion",
      async () => {
        for (const [, body] of invalidDeletions())
          assert.equal(await remove(a, 400, {}, body), "INVALID_REQUEST");
        assert.equal(
          await remove(a, 400, {}, { ...validDeletion(), userId: b.id }),
          "INVALID_REQUEST",
        );
        assert.equal(
          await api(
            a,
            "/api/account?userId=" + b.id,
            "DELETE",
            validDeletion(),
            400,
          ),
          "INVALID_REQUEST",
        );
        assert.equal(
          await remove(a, 400, { raw: true }, "{"),
          "INVALID_REQUEST",
        );
        assert.deepEqual(await inventory(local.db, a.id), initialA);
        assert.deepEqual(await inventory(local.db, b.id), initialB);
        metrics.rejectedPayloads = invalidDeletions().length + 3;
      },
    );
    await accept(
      "bounded request body rejects 4097 bytes without mutation",
      async () => {
        assert.equal(
          await remove(a, 413, { raw: true }, " ".repeat(4097)),
          "PAYLOAD_TOO_LARGE",
        );
        assert.deepEqual(await inventory(local.db, a.id), initialA);
      },
    );
    await accept(
      "real owned Storage object blocks deletion, no object name disclosure or removal",
      async () => {
        safeOk(
          await local.admin.storage.createBucket("task052-fixture", {
            public: false,
          }),
        );
        storageBucket = true;
        await local.db`create policy task052_fixture_upload on storage.objects for insert to authenticated with check (bucket_id='task052-fixture')`;
        storagePolicy = true;
        safeOk(
          await a.client.storage
            .from("task052-fixture")
            .upload("owned-a.txt", "synthetic", { contentType: "text/plain" }),
        );
        const owned =
          await local.db`select count(*)::int as count from storage.objects where bucket_id='task052-fixture' and name='owned-a.txt' and owner_id=${a.id}`;
        assert.equal(owned[0].count, 1);
        assert.equal(await remove(a, 409), "ACCOUNT_DELETION_BLOCKED");
        assert.deepEqual(await inventory(local.db, a.id), initialA);
        assert.equal(
          (
            await local.db`select count(*)::int as count from storage.objects where bucket_id='task052-fixture'`
          )[0].count,
          1,
        );
        safeOk(
          await local.admin.storage
            .from("task052-fixture")
            .remove(["owned-a.txt"]),
        );
        // Unrelated B-owned storage must neither block A nor be deleted with A.
        safeOk(
          await b.client.storage
            .from("task052-fixture")
            .upload("owned-b.txt", "synthetic", { contentType: "text/plain" }),
        );
        metrics.storageBlocker = {
          realObject: true,
          blockedStatus: 409,
          objectPreserved: true,
        };
      },
    );
    const oldCookie = a.jar.header();
    const beforeDeleteA = await inventory(local.db, a.id),
      beforeDeleteB = await inventory(local.db, b.id);
    await accept(
      "browser double-click dispatches one real Cookie DELETE; pending disables controls and success leaves private page",
      async () => {
        await prepare(page);
        await unlock(page);
        let count = 0,
          release;
        const held = new Promise((r) => (release = r));
        await page.route("**/api/account", async (route) => {
          if (route.request().method() === "DELETE") {
            count++;
            assert.deepEqual(route.request().postDataJSON(), validDeletion());
            await held;
          }
          await route.continue();
        });
        const pending = page.waitForRequest(
          (r) => r.url().endsWith("/api/account") && r.method() === "DELETE",
        );
        await page
          .getByRole("button", { name: "永久删除账户", exact: true })
          .evaluate((button) => {
            button.click();
            button.click();
          });
        await pending;
        const busy = page.getByRole("button", {
          name: "正在删除…",
          exact: true,
        });
        assert.ok(await busy.isDisabled());
        assert.ok(await page.getByRole("checkbox").isDisabled());
        assert.ok(
          await page.getByPlaceholder("删除账户", { exact: true }).isDisabled(),
        );
        assert.ok(
          await page
            .getByRole("button", { name: "取消", exact: true })
            .isDisabled(),
        );
        await busy.evaluate((button) => button.click());
        const response = page.waitForResponse((r) =>
          r.url().endsWith("/api/account"),
        );
        release();
        assert.equal((await response).status(), 204);
        await page.waitForURL(app.origin + "/", { timeout: 15000 });
        assert.equal(count, 1);
        metrics.browserMutationCount = count;
        await page.goto(app.origin + deletePath);
        await page.waitForURL(
          (url) => !url.pathname.startsWith("/personal-center"),
        );
        await page.reload();
        assert.equal(
          new URL(page.url()).pathname.startsWith("/personal-center"),
          false,
        );
      },
    );
    await accept(
      "Auth hard-delete cascades every A product row, including immutable history; B exact rows unchanged",
      async () => {
        const afterA = await inventory(local.db, a.id),
          afterB = await inventory(local.db, b.id);
        assert.ok(Object.values(afterA).every((x) => x.length === 0));
        assert.deepEqual(afterB, beforeDeleteB);
        assert.deepEqual(beforeDeleteA, initialA);
        metrics.afterA = counts(afterA);
        metrics.afterB = counts(afterB);
        metrics.userBExactRowsUnchanged = true;
        assert.equal(
          (
            await local.db`select count(*)::int as count from storage.objects where bucket_id='task052-fixture' and owner_id=${b.id}`
          )[0].count,
          1,
        );
        metrics.unrelatedStoragePreserved = true;
      },
    );
    await accept(
      "retained A Cookie and Bearer denied across all current B private resource endpoints",
      async () => {
        const paths = [
          ...roots,
          "/api/companions/" + a.companions[0].id,
          "/api/companion-groups/" + a.group.id,
          "/api/trip-library/" + a.trips[0].id,
        ];
        for (const cookie of [false, true]) {
          for (const path of paths)
            assert.equal(
              await api(a, path, "GET", undefined, 401, { cookie, oldCookie }),
              "AUTH_REQUIRED",
            );
          assert.equal(
            await remove(a, 401, { cookie, oldCookie }),
            "AUTH_REQUIRED",
          );
        }
        for (const path of roots) await api(b, path);
        const mutations = [
          ["PATCH", "/api/profile"],
          ["POST", "/api/emergency-contacts"],
          ["PATCH", "/api/emergency-contacts/" + a.contact.id],
          ["DELETE", "/api/emergency-contacts/" + a.contact.id],
          ["PATCH", "/api/preferences"],
          ["POST", "/api/preferences/reset"],
          ["POST", "/api/companions"],
          ["PUT", "/api/companions/" + a.companions[0].id],
          ["DELETE", "/api/companions/" + a.companions[0].id],
          ["POST", "/api/companion-groups"],
          ["PUT", "/api/companion-groups/" + a.group.id],
          ["DELETE", "/api/companion-groups/" + a.group.id],
          ["POST", "/api/trip-library"],
          ["PUT", "/api/trip-library/" + a.trips[0].id],
          ["DELETE", "/api/trip-library/" + a.trips[0].id],
          ...["save", "history", "copy"].map((suffix) => [
            "POST",
            "/api/trip-library/" + a.trips[0].id + "/" + suffix,
          ]),
        ];
        for (const cookie of [false, true])
          for (const [method, path] of mutations)
            assert.equal(
              await api(
                a,
                path,
                method,
                method === "DELETE" || path.endsWith("/history")
                  ? undefined
                  : {},
                401,
                { cookie, oldCookie },
              ),
              "AUTH_REQUIRED",
            );
        metrics.oldCredentialDenials =
          (paths.length + mutations.length) * 2 + 2;
        metrics.privateRoutes = paths.map((p) =>
          p.replace(/[0-9a-f-]{36}/g, "[id]"),
        );
      },
    );
    await accept(
      "deleted identity cannot refresh, getUser or sign in; B separate browser remains usable",
      async () => {
        assert.ok((await a.client.auth.getUser(a.token)).error);
        assert.ok(
          (await a.client.auth.refreshSession({ refresh_token: a.refresh }))
            .error,
        );
        assert.ok(
          (
            await a.client.auth.signInWithPassword({
              email: a.email,
              password: a.password,
            })
          ).error,
        );
        await prepare(pageB);
        assert.equal(new URL(pageB.url()).pathname, deletePath);
        const statuses = await pageB.evaluate(
          async (paths) =>
            Promise.all(paths.map(async (p) => (await fetch(p)).status)),
          roots,
        );
        assert.deepEqual(
          statuses,
          roots.map(() => 200),
        );
        const oldSession = await fetch(app.origin + "/auth/session", {
          headers: { Cookie: oldCookie },
        });
        assert.equal(oldSession.status, 200);
        assert.deepEqual(await oldSession.json(), {
          ok: true,
          data: { status: "unauthenticated" },
        });
        metrics.deletedIdentityRefreshDenied = true;
      },
    );
    await accept(
      "explicit valid Bearer deletes only its verified owner despite a different valid Cookie",
      async () => {
        assert.equal(
          await remove(c, 204, { headers: { Cookie: b.jar.header() } }),
          null,
        );
        assert.equal((await inventory(local.db, c.id)).auth_users.length, 0);
        assert.deepEqual(await inventory(local.db, b.id), beforeDeleteB);
        metrics.bearerOwnerPriority = true;
      },
    );
    await accept(
      "production browser HTML/chunks have no execution credential or Account Admin implementation",
      async () => {
        let scanned = 0;
        async function scan(dir) {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const p = dir + "/" + entry.name;
            if (entry.isDirectory()) await scan(p);
            else if (/\.(?:js|html|map)$/.test(p)) {
              const text = await readFile(p, "utf8");
              assert.equal(
                text.includes(secret),
                false,
                "No actual execution credential in production outputs",
              );
              if (p.includes("/static/"))
                assert.equal(
                  /deleteVerifiedAuthUser|requireNoOwnedStorage|src\/server\/account-deletion/.test(
                    text,
                  ),
                  false,
                  "No Account Admin implementation in browser outputs",
                );
              scanned++;
            }
          }
        }
        await scan(".next");
        metrics.productionFilesScanned = scanned;
        for (const p of [page, pageB])
          assert.equal((await p.content()).includes(secret), false);
        assert.equal(errors.length, 0, "No new browser console/page errors");
        assert.equal(external.length, 0);
        metrics.browserPageErrors = errors.length;
        metrics.browserExternalRequests = external.length;
      },
    );
  } finally {
    if (browser) await browser.close();
    if (app) {
      await app.stop();
      networkRuns.push(
        JSON.parse(await readFile(local.env.TASK052_NETWORK_EVIDENCE, "utf8")),
      );
    }
    if (storageBucket) {
      safeOk(
        await local.admin.storage
          .from("task052-fixture")
          .remove(["owned-a.txt", "owned-b.txt"]),
      );
      safeOk(await local.admin.storage.deleteBucket("task052-fixture"));
    }
    if (storagePolicy)
      await local.db`drop policy task052_fixture_upload on storage.objects`;
    for (const u of users) {
      const present =
        await local.db`select count(*)::int as count from auth.users where id=${u.id}`;
      if (present[0].count)
        safeOk(await local.admin.auth.admin.deleteUser(u.id, false));
    }
    metrics.cleanup = {
      authUsers: Number(
        (await local.db`select count(*) from auth.users`)[0].count,
      ),
      storageObjects: Number(
        (await local.db`select count(*) from storage.objects`)[0].count,
      ),
      storageBuckets: Number(
        (await local.db`select count(*) from storage.buckets`)[0].count,
      ),
    };
    await local.db.end();
    metrics.serverNetwork = networkRuns;
    assert.ok(networkRuns.every((x) => x.externalRequests === 0));
    assert.deepEqual(metrics.cleanup, {
      authUsers: 0,
      storageObjects: 0,
      storageBuckets: 0,
    });
    await writeFile(
      artifact + "/local-acceptance.json",
      JSON.stringify({ task: "TASK-052-B", completed, metrics }, null, 2) +
        "\n",
    );
  }
});
