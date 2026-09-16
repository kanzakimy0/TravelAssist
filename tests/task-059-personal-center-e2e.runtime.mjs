// Explicit Local-only browser journeys. No storageState, HAR, credentials or user IDs in public evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import {
  localDeletionSecret,
  inventory,
  counts,
} from "./task-052-local-helpers.mjs";
import {
  fullProfilePatch,
  contactInput,
} from "./task-050-profile-fixtures.mjs";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { applyPreferencePreset } from "../src/features/preferences/presets/preference-presets.ts";
const require = createRequire(import.meta.url);
const browserName = process.env.WBS_BROWSER ?? "edge";
const evidence = process.env.TASK059_EVIDENCE_DIR;
assert.ok(evidence, "Use the Local aggregate to own startup and cleanup");
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const routes = [
  "/personal-center",
  "/personal-center/account",
  "/personal-center/preferences",
  "/personal-center/preferences/mobility",
  "/personal-center/preferences/attractions",
  "/personal-center/preferences/dining",
  "/personal-center/preferences/accommodation",
  "/personal-center/preferences/budget",
  "/personal-center/preferences/experience",
  "/personal-center/preferences/advanced",
  "/personal-center/companions",
  "/personal-center/trips",
  "/personal-center/account/security",
  "/personal-center/account/privacy",
  "/personal-center/account/privacy/delete",
  "/personal-center/account/booking-sync",
];
const button = (p, name) => p.getByRole("button", { name, exact: true });
const field = (p, name) => p.getByLabel(name, { exact: true });
const safeOk = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local synthetic fixture operation succeeds",
  );
  return r.data;
};
const companionInput = (name) => ({
  displayName: name,
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

test(
  "TASK-059 complete Personal Center browser journeys",
  { timeout: 600000 },
  async (t) => {
    const local = preferenceLocalRuntime(),
      users = [],
      sessions = [],
      responses = [];
    let app,
      browser,
      current,
      stage = "setup";
    const secret = localDeletionSecret(local);
    const metrics = {
      externalBrowserRequests: 0,
      pageErrors: 0,
      unexpectedConsoleErrors: 0,
      knownFavicon404: 0,
      expectedAuthErrors: 0,
      secretLeaks: 0,
    };
    const report = {
      task: "TASK-059-B",
      browser: browserName,
      viewports,
      journeys: [],
      metrics,
      usersCreated: 0,
    };
    const playwright = require(process.env.CODEX_PLAYWRIGHT_PATH);
    const engine =
      browserName === "edge" ? playwright.chromium : playwright[browserName];
    const options =
      browserName === "edge"
        ? { channel: "msedge", headless: true }
        : { headless: true };
    async function record(id, name, fn) {
      current = { id, name, status: "FAIL", checks: [], observations: {} };
      report.journeys.push(current);
      await t.test(id + " " + name, async () => {
        try {
          await fn();
          current.status = "PASS";
        } catch (error) {
          const privateValues = [
            secret,
            local.databaseUrl,
            ...users.flatMap((u) => [u.id, u.email, u.password]),
          ].filter(Boolean);
          let detail = String(error.message);
          for (const value of privateValues)
            detail = detail.replaceAll(value, "<redacted>");
          detail = detail.replace(/https?:\/\/[^\s"']+/g, "<local-url>");
          current.failureDetail = detail.slice(0, 1800);
          current.failedStage = stage;
          throw Error(
            id + " failed at " + stage + "; sanitized observations retained",
          );
        }
      });
    }
    async function check(name, fn) {
      stage = name;
      await fn();
      current.checks.push(name);
    }
    async function go(page, path) {
      await page.goto(app.origin + path, { waitUntil: "networkidle" });
    }
    async function newSession(viewport = viewports[0]) {
      const context = await browser.newContext({ viewport });
      sessions.push(context);
      await context.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (!["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)) {
          metrics.externalBrowserRequests++;
          await route.abort();
        } else await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      page.on("pageerror", () => metrics.pageErrors++);
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        let pathname = "";
        try {
          pathname = new URL(m.location().url).pathname;
        } catch {}
        if (pathname === "/favicon.ico" && /404/.test(m.text())) {
          metrics.knownFavicon404++;
          return;
        }
        if (pathname === "/auth/signin" && /40[01]/.test(m.text())) {
          metrics.expectedAuthErrors++;
          return;
        }
        metrics.unexpectedConsoleErrors++;
      });
      page.on("response", (r) => {
        if (
          r.url().startsWith(app.origin) &&
          /javascript|text\/html/.test(r.headers()["content-type"] ?? "")
        ) {
          responses.push(
            r
              .text()
              .then((s) => {
                if (
                  s.includes(secret) ||
                  s.includes(local.databaseUrl) ||
                  s.includes("SUPABASE_SECRET_KEY")
                )
                  metrics.secretLeaks++;
              })
              .catch(() => {}),
          );
        }
      });
      return { context, page };
    }
    async function signIn(session, user, target = "/personal-center") {
      await go(session.page, "/login?returnTo=" + encodeURIComponent(target));
      await session.page
        .getByRole("tab", { name: "邮箱登录", exact: true })
        .click();
      await field(session.page, "邮箱地址").fill(user.email);
      await field(session.page, "密码").fill(user.password);
      await button(session.page, "登录").click();
      await session.page.waitForURL(app.origin + target);
      await session.page.waitForLoadState("networkidle");
    }
    async function logout(session) {
      await session.page.getByRole("button", { name: /^打开账户菜单/ }).click();
      await button(session.page, "退出登录").click();
      await session.page.waitForURL(app.origin + "/");
    }
    async function sessionStatus(session) {
      const r = await session.context.request.get(app.origin + "/auth/session");
      assert.equal(r.status(), 200);
      return (await r.json()).data.status;
    }
    async function api(
      session,
      path,
      method = "GET",
      body,
      status = 200,
      headers = {},
    ) {
      const r = await session.context.request.fetch(app.origin + path, {
        method,
        headers: { Origin: app.origin, ...headers },
        ...(body === undefined ? {} : { data: body }),
      });
      assert.equal(
        r.status(),
        status,
        "Expected Local API status for " +
          method +
          " " +
          path.replace(/[0-9a-f-]{36}/g, "<record>"),
      );
      const s = await r.text();
      assert.equal(
        s.includes(secret),
        false,
        "No server secret in browser response",
      );
      return s ? JSON.parse(s).data : null;
    }
    async function createUser(label) {
      const user = {
        email: "task059-" + label + "-" + randomUUID() + "@example.test",
        password: "Local-" + randomUUID() + "!",
        id: null,
      };
      users.push(user);
      user.id = safeOk(
        await local.admin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        }),
      ).user.id;
      report.usersCreated++;
      return user;
    }
    async function register(session, label) {
      const user = {
        email: "task059-" + label + "-" + randomUUID() + "@example.test",
        password: "Local-" + randomUUID() + "!",
        id: null,
      };
      users.push(user);
      await go(session.page, "/register");
      await field(session.page, "邮箱地址").fill(user.email);
      await field(session.page, "密码").fill(user.password);
      await field(session.page, "确认密码").fill(user.password);
      await session.page.getByRole("checkbox").check();
      await button(session.page, "创建账户").click();
      await session.page
        .getByRole("heading", { name: "请检查邮箱", exact: true })
        .waitFor();
      assert.equal(await sessionStatus(session), "unauthenticated");
      let mail;
      for (let i = 0; i < 80; i++) {
        const data = await (
          await fetch(local.mail + "/api/v1/messages")
        ).json();
        const item = data.messages?.find(
          (m) =>
            m.To?.some((x) => x.Address === user.email) &&
            /Confirm/i.test(m.Subject),
        );
        if (item) {
          mail = await (
            await fetch(local.mail + "/api/v1/message/" + item.ID)
          ).json();
          break;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      assert.ok(mail, "Real Local confirmation mail was captured");
      const links = [
        ...(mail.HTML ?? "")
          .replaceAll("&amp;", "&")
          .matchAll(/href=["']([^"']+)["']/g),
      ].map((m) => new URL(m[1]));
      const link = links.find((u) => u.pathname === "/auth/v1/verify");
      assert.equal(link?.origin, local.api);
      await session.page.goto(link.href, { waitUntil: "networkidle" });
      await session.page
        .getByRole("heading", { name: "账户创建成功 ✓", exact: true })
        .waitFor();
      const rows =
        await local.db`select id from auth.users where email=${user.email}`;
      assert.equal(rows.length, 1);
      user.id = rows[0].id;
      report.usersCreated++;
      assert.equal(await sessionStatus(session), "authenticated");
      return user;
    }
    async function loadedPreference(page) {
      await page.locator("[data-preference-editor] > fieldset").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector("[data-preference-editor] > fieldset")
            ?.disabled === false,
      );
    }
    async function openPreference(session, category) {
      await go(session.page, "/personal-center/preferences/" + category);
      await loadedPreference(session.page);
    }
    async function savePreference(session) {
      const waiting = session.page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/preferences") &&
          r.request().method() === "PATCH",
      );
      await button(session.page, "保存偏好").click();
      assert.equal((await waiting).status(), 200);
      await session.page
        .getByRole("status")
        .filter({ hasText: "已保存长期偏好" })
        .waitFor();
    }
    async function seedTrips(session, label) {
      const trips = [];
      for (const state of ["draft", "saved", "history"]) {
        const facts = fullDraftFixture();
        facts.title = "TASK059 " + label + " " + state;
        let trip = await api(
          session,
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
          snapshot.trip.id = "task059-" + randomUUID();
          snapshot.trip.title = facts.title;
          trip = await api(
            session,
            "/api/trip-library/" + trip.id + "/save",
            "POST",
            { schemaVersion: "1.0", planSnapshot: snapshot },
            200,
            { "If-Match": '"' + trip.storageRevision + '"' },
          );
        }
        if (state === "history")
          trip = await api(
            session,
            "/api/trip-library/" + trip.id + "/history",
            "POST",
            undefined,
            200,
            { "If-Match": '"' + trip.storageRevision + '"' },
          );
        trips.push(trip);
      }
      return trips;
    }
    let a, b, c, sa, sb, sc;
    try {
      local.env.DATABASE_URL = local.databaseUrl;
      local.env.SUPABASE_SECRET_KEY = secret;
      local.env.NODE_OPTIONS =
        "--import=" +
        pathToFileURL(resolve("tests/task-052-network-guard.mjs")).href;
      local.env.TASK052_NETWORK_EVIDENCE = resolve(
        evidence,
        "server-network.json",
      );
      app = await startApp(local);
      browser = await engine.launch(options);
      report.browserVersion = browser.version();
      b = await createUser("control");
      sb = await newSession();
      await signIn(sb, b);
      const profile = fullProfilePatch();
      profile.profile.displayName = "TASK059 Control Profile";
      await api(sb, "/api/profile", "PATCH", profile);
      await api(sb, "/api/preferences", "PATCH", {
        expectedRevision: 0,
        patch: {
          schemaVersion: "1.0",
          set: { "mobility.walkingTolerance": "veryHigh" },
          unset: [],
        },
      });
      await api(
        sb,
        "/api/companions",
        "POST",
        companionInput("TASK059 Control Companion"),
        201,
      );
      await seedTrips(sb, "CONTROL");
      await record(
        "J1",
        "anonymous guard, return flow and client boundary",
        async () => {
          const guest = await newSession();
          await guest.context.addInitScript(() => {
            window.__task059PrivateFlash = false;
            new MutationObserver(() => {
              if (document.querySelector("#personal-content"))
                window.__task059PrivateFlash = true;
            }).observe(document, { childList: true, subtree: true });
          });
          await check(
            "all protected routes reject anonymous owner injection without private DOM",
            async () => {
              for (const path of routes) {
                await go(guest.page, path + "?ownerUserId=" + b.id);
                assert.equal(new URL(guest.page.url()).pathname, "/login");
                assert.equal(
                  await guest.page.locator("#personal-content").count(),
                  0,
                );
                assert.equal(
                  await guest.page.evaluate(() => window.__task059PrivateFlash),
                  false,
                );
                assert.ok(
                  new URL(guest.page.url()).searchParams
                    .get("returnTo")
                    ?.startsWith(path),
                );
              }
            },
          );
          await check(
            "guest public payload and built client bundles contain no admin secret",
            async () => {
              await Promise.all(responses);
              assert.equal(metrics.secretLeaks, 0);
              for (const file of await readdir(".next/static/chunks", {
                recursive: true,
              })) {
                if (file.endsWith(".js")) {
                  const content = await readFile(
                    resolve(".next/static/chunks", file),
                    "utf8",
                  );
                  assert.equal(
                    content.includes(secret) ||
                      content.includes(local.databaseUrl),
                    false,
                  );
                }
              }
            },
          );
          await guest.context.close();
        },
      );
      await record(
        "J2",
        "registration, multipage use, logout and relogin",
        async () => {
          sa = await newSession();
          await check(
            "real browser registration and Local email confirmation",
            async () => {
              a = await register(sa, "journey");
            },
          );
          await check(
            "authenticated multipage navigation retains the same Local account",
            async () => {
              for (const path of [
                "/personal-center",
                "/personal-center/account",
                "/personal-center/companions",
                "/personal-center/preferences",
              ]) {
                await go(sa.page, path);
                assert.equal(new URL(sa.page.url()).pathname, path);
                assert.equal(await sessionStatus(sa), "authenticated");
              }
            },
          );
          await check(
            "explicit preference save survives logout, protected redirect and browser login",
            async () => {
              await openPreference(sa, "mobility");
              await field(sa.page, "步行容忍度").selectOption("veryLow");
              await savePreference(sa);
              await logout(sa);
              assert.equal(await sessionStatus(sa), "unauthenticated");
              await go(sa.page, "/personal-center/account");
              assert.equal(new URL(sa.page.url()).pathname, "/login");
              await signIn(sa, a, "/personal-center/preferences/mobility");
              await loadedPreference(sa.page);
              assert.equal(
                await field(sa.page, "步行容忍度").inputValue(),
                "veryLow",
              );
            },
          );
        },
      );
      await record(
        "J3",
        "Profile explicit save and cross-session persistence",
        async () => {
          assert.ok(a && sa, "J2 account required");
          await sa.page
            .getByRole("navigation", { name: "个人中心", exact: true })
            .locator('a[href="/personal-center/account"]')
            .click();
          await sa.page.waitForURL(app.origin + "/personal-center/account");
          await check(
            "representative invalid nickname has deterministic validation",
            async () => {
              await button(sa.page, "编辑资料").click();
              await field(sa.page, /^昵称/).fill("");
              await button(sa.page, "保存修改").click();
              await sa.page
                .getByRole("alert")
                .filter({ hasText: "请输入昵称" })
                .waitFor();
            },
          );
          await check(
            "valid UI edit and explicit save are observable",
            async () => {
              await field(sa.page, /^昵称/).fill("TASK059 Journey Profile");
              await button(sa.page, "保存修改").click();
              await button(sa.page, "编辑资料").waitFor({ state: "visible" });
              assert.equal(await button(sa.page, "编辑资料").isVisible(), true);
              assert.ok(
                (
                  await sa.page.locator("#personal-content").innerText()
                ).includes("TASK059 Journey Profile"),
              );
            },
          );
          const observed = current.observations;
          await go(sa.page, "/personal-center/preferences");
          await go(sa.page, "/personal-center/account");
          observed.afterNavigation = (
            await sa.page.locator("#personal-content").innerText()
          ).includes("TASK059 Journey Profile");
          await sa.page.reload({ waitUntil: "networkidle" });
          observed.afterHardReload = (
            await sa.page.locator("#personal-content").innerText()
          ).includes("TASK059 Journey Profile");
          await logout(sa);
          await signIn(sa, a, "/personal-center/account");
          observed.afterRelogin = (
            await sa.page.locator("#personal-content").innerText()
          ).includes("TASK059 Journey Profile");
          const rows =
            await local.db`select display_name from public.profiles where id=${a.id}`;
          observed.realOwnedRowSaved = rows.some(
            (r) => r.display_name === "TASK059 Journey Profile",
          );
          await go(sb.page, "/personal-center/account");
          observed.controlOwnProfileRendered = (
            await sb.page.locator("#personal-content").innerText()
          ).includes("TASK059 Control Profile");
          observed.noCrossUserName = !(
            await sb.page.locator("#personal-content").innerText()
          ).includes("TASK059 Journey Profile");
          await check(
            "mandatory Profile UI persists and renders the verified owner record",
            async () => {
              assert.ok(
                Object.values(observed).every((v) => v === true),
                "Profile UI must render and persist real owned records",
              );
            },
          );
        },
      );
      await record(
        "J4",
        "Preference categories, explicit preset save and unset reset",
        async () => {
          assert.ok(a && sa, "J2 account required");
          const choices = [
            ["mobility", "步行容忍度", "high"],
            ["attractions", "自然风景", "like"],
            ["dining", "当地料理", "prioritize"],
            ["accommodation", "住宿舒适度", "prioritize"],
            ["budget", "消费倾向", "flexible"],
            ["experience", "计划程度", "5"],
          ];
          await check(
            "all exposed representative categories persist after save, navigation and reload",
            async () => {
              for (const [category, label, value] of choices) {
                await openPreference(sa, category);
                if (category === "experience")
                  await field(sa.page, label).press("End");
                else await field(sa.page, label).selectOption(value);
                await savePreference(sa);
                await go(sa.page, "/personal-center/account");
                await openPreference(sa, category);
                assert.equal(await field(sa.page, label).inputValue(), value);
                await sa.page.reload({ waitUntil: "networkidle" });
                await loadedPreference(sa.page);
                assert.equal(await field(sa.page, label).inputValue(), value);
              }
              await logout(sa);
              await signIn(sa, a);
              for (const [category, label, value] of choices) {
                await openPreference(sa, category);
                assert.equal(await field(sa.page, label).inputValue(), value);
              }
            },
          );
          await check(
            "preset selection and cancellation do not persist; explicit save preserves unrelated keys",
            async () => {
              await openPreference(sa, "mobility");
              const before = await api(sa, "/api/preferences");
              await button(sa.page, "轻松移动").click();
              assert.deepEqual(await api(sa, "/api/preferences"), before);
              await button(sa.page, "取消").click();
              assert.equal(
                await field(sa.page, "步行容忍度").inputValue(),
                "high",
              );
              await button(sa.page, "轻松移动").click();
              await savePreference(sa);
              const after = await api(sa, "/api/preferences");
              assert.deepEqual(
                after.preference,
                applyPreferencePreset(before.preference, "mobility_easy"),
              );
              assert.equal(after.preference.values["style.planning"], 5);
              assert.equal(
                after.preference.values["interests.preferences"].nature_scenery,
                "like",
              );
              await sa.page.reload({ waitUntil: "networkidle" });
              await loadedPreference(sa.page);
              assert.equal(
                await button(sa.page, "轻松移动").getAttribute("aria-pressed"),
                "true",
              );
            },
          );
          await check(
            "browser owners see distinct preferences; reset persists unset without preset",
            async () => {
              await openPreference(sb, "mobility");
              assert.equal(
                await field(sb.page, "步行容忍度").inputValue(),
                "veryHigh",
              );
              assert.notEqual(
                await field(sa.page, "步行容忍度").inputValue(),
                "veryHigh",
              );
              await go(sa.page, "/personal-center/preferences");
              await button(sa.page, "重置偏好").click();
              const dialog = sa.page.getByRole("alertdialog");
              await dialog
                .getByRole("button", { name: "重置偏好", exact: true })
                .click();
              await dialog.waitFor({ state: "hidden" });
              assert.deepEqual(
                (await api(sa, "/api/preferences")).preference.values,
                {},
              );
              await logout(sa);
              await signIn(sa, a, "/personal-center/preferences/mobility");
              await loadedPreference(sa.page);
              assert.equal(await field(sa.page, "步行容忍度").inputValue(), "");
              assert.equal(
                await sa.page.locator('[aria-pressed="true"]').count(),
                0,
              );
              await sb.page.reload({ waitUntil: "networkidle" });
              await loadedPreference(sb.page);
              assert.equal(
                await field(sb.page, "步行容忍度").inputValue(),
                "veryHigh",
              );
            },
          );
        },
      );
      await record(
        "J5",
        "Companion and group browser lifecycle with separate owners",
        async () => {
          assert.ok(a && sa, "J2 account required");
          const name = "TASK059 Journey Companion",
            edited = name + " Edited",
            groupName = "TASK059 Journey Group";
          const save = async (label) => {
            await button(sa.page, label).click();
            await sa.page.locator("dialog[open]").waitFor({ state: "hidden" });
          };
          await check(
            "create and edit companion through accepted browser UI",
            async () => {
              await go(sa.page, "/personal-center/companions");
              await button(sa.page, "添加同行人").click();
              await field(sa.page, "昵称 / 称呼 *").fill(name);
              await field(sa.page, "少步行").check();
              await save("保存同行人");
              await button(sa.page, "编辑 " + name + " 的同行人资料").click();
              await field(sa.page, "昵称 / 称呼 *").fill(edited);
              await save("保存同行人");
            },
          );
          await check(
            "group membership and companion survive navigation, reload and relogin",
            async () => {
              await button(sa.page, "创建常用组合").click();
              await field(sa.page, "组合名称 *").fill(groupName);
              const picker = sa.page.locator("fieldset").filter({
                has: sa.page.getByText("选择同行人（可留空）", {
                  exact: true,
                }),
              });
              await picker
                .getByRole("checkbox", { name: new RegExp(edited) })
                .check();
              await save("保存组合");
              await go(sa.page, "/personal-center/account");
              await go(sa.page, "/personal-center/companions");
              await sa.page.reload({ waitUntil: "networkidle" });
              await sa.page
                .getByRole("heading", { name: edited, exact: true })
                .waitFor();
              await sa.page
                .getByRole("heading", { name: groupName, exact: true })
                .waitFor();
              await logout(sa);
              await signIn(sa, a, "/personal-center/companions");
              await sa.page
                .getByRole("heading", { name: edited, exact: true })
                .waitFor();
              await sa.page
                .getByRole("heading", { name: groupName, exact: true })
                .waitFor();
            },
          );
          await check(
            "different browsers never render another owner's companions or groups",
            async () => {
              await go(sb.page, "/personal-center/companions");
              await sb.page
                .getByRole("heading", {
                  name: "TASK059 Control Companion",
                  exact: true,
                })
                .waitFor();
              assert.equal(
                (
                  await sb.page.locator("#personal-content").innerText()
                ).includes("TASK059 Journey"),
                false,
              );
              assert.equal(
                (
                  await sa.page.locator("#personal-content").innerText()
                ).includes("TASK059 Control Companion"),
                false,
              );
            },
          );
          await check(
            "delete group and companion through browser; removal survives relogin",
            async () => {
              await button(sa.page, "编辑常用组合 " + groupName).click();
              sa.page.once("dialog", (d) => d.accept());
              await button(sa.page, "删除组合").click();
              await sa.page
                .locator("dialog[open]")
                .waitFor({ state: "hidden" });
              await button(sa.page, "删除同行人 " + edited).click();
              await button(sa.page, "确认删除同行人").click();
              await button(sa.page, "确认删除同行人").waitFor({
                state: "hidden",
              });
              await sa.page.reload({ waitUntil: "networkidle" });
              await logout(sa);
              await signIn(sa, a, "/personal-center/companions");
              assert.equal(
                await sa.page
                  .getByRole("heading", { name: edited, exact: true })
                  .count(),
                0,
              );
              assert.equal(
                await sa.page
                  .getByRole("heading", { name: groupName, exact: true })
                  .count(),
                0,
              );
              await sb.page.reload({ waitUntil: "networkidle" });
              await sb.page
                .getByRole("heading", {
                  name: "TASK059 Control Companion",
                  exact: true,
                })
                .waitFor();
            },
          );
        },
      );
      await record(
        "J6",
        "Real B Trip Library Draft/Saved/History render and isolation",
        async () => {
          assert.ok(a && sa, "J2 account required");
          let trips;
          await check(
            "seed real owned B contracts without A Planner or A 8.5",
            async () => {
              trips = await seedTrips(sa, "JOURNEY");
              assert.deepEqual(
                trips.map((x) => x.libraryState),
                ["draft", "saved", "history"],
              );
              assert.equal(
                (await api(sa, "/api/trip-library")).items.length,
                3,
              );
            },
          );
          const observed = current.observations;
          stage = "render owned Draft/Saved/History in browser";
          await go(sa.page, "/personal-center/trips");
          for (const [i, tab] of [
            [0, "drafts"],
            [1, "all"],
            [2, "history"],
          ]) {
            await sa.page.locator("#trip-tab-" + tab).click();
            await sa.page.waitForFunction(
              (id) =>
                document.getElementById(id)?.getAttribute("aria-selected") ===
                "true",
              "trip-tab-" + tab,
            );
            observed[trips[i].libraryState + "OwnedRecordVisible"] = (
              await sa.page.locator("#personal-content").innerText()
            ).includes(trips[i].draftFacts.title);
          }
          await sa.page.locator("#trip-tab-all").click();
          await sa.page.reload({ waitUntil: "networkidle" });
          observed.afterHardReload = (
            await sa.page.locator("#personal-content").innerText()
          ).includes("TASK059 JOURNEY");
          observed.noControlTripsInJourneyBrowser = !(
            await sa.page.locator("#personal-content").innerText()
          ).includes("TASK059 CONTROL");
          await go(sb.page, "/personal-center/trips");
          observed.controlOwnedRecordsVisible = (
            await sb.page.locator("#personal-content").innerText()
          ).includes("TASK059 CONTROL");
          observed.noJourneyTripsInControlBrowser = !(
            await sb.page.locator("#personal-content").innerText()
          ).includes("TASK059 JOURNEY");
          await check(
            "mandatory owned persisted records render correctly for both browser owners",
            async () => {
              assert.ok(
                Object.values(observed).every((v) => v === true),
                "Mock UI records cannot prove B record persistence or isolation",
              );
            },
          );
        },
      );
      await record(
        "J7",
        "Complete canonical desktop and mobile Personal Center navigation",
        async () => {
          assert.ok(a, "J2 account required");
          current.observations.completedViewports = [];
          for (const viewport of viewports) {
            await check(
              viewport.width +
                "x" +
                viewport.height +
                " avatar, full navigation, history and user switch",
              async () => {
                const s = await newSession(viewport);
                await signIn(s, a, "/");
                const entry = s.page
                  .locator('a[href="/personal-center"]:visible')
                  .first();
                await entry.click();
                await s.page.waitForURL(app.origin + "/personal-center");
                await s.page
                  .getByRole("button", { name: /^打开账户菜单/ })
                  .click();
                await s.page
                  .getByRole("link", { name: "查看个人中心", exact: true })
                  .click();
                for (const path of [
                  "account",
                  "preferences",
                  "companions",
                  "trips",
                ]) {
                  const nav = s.page.getByRole("navigation", {
                    name: "个人中心",
                    exact: true,
                  });
                  await nav
                    .locator('a[href="/personal-center/' + path + '"]')
                    .click();
                  await s.page.waitForURL(
                    app.origin + "/personal-center/" + path,
                  );
                  assert.equal(await sessionStatus(s), "authenticated");
                }
                for (const tab of ["drafts", "history", "all"]) {
                  stage = "navigation " + viewport.width + " trip tab " + tab;
                  const control = s.page.locator("#trip-tab-" + tab);
                  await control.waitFor({ state: "visible" });
                  await control.click();
                  await s.page.waitForFunction(
                    (id) =>
                      document
                        .getElementById(id)
                        ?.getAttribute("aria-selected") === "true",
                    "trip-tab-" + tab,
                  );
                  assert.equal(
                    await control.getAttribute("aria-selected"),
                    "true",
                  );
                }
                await s.page
                  .getByRole("navigation", { name: "个人中心", exact: true })
                  .locator('a[href="/personal-center/account"]')
                  .click();
                await s.page.getByRole("link", { name: /数据与隐私/ }).click();
                await s.page.waitForURL(
                  app.origin + "/personal-center/account/privacy",
                );
                await s.page.getByRole("link", { name: /删除账户/ }).click();
                await button(s.page, "永久删除账户").waitFor();
                await s.page.goBack({ waitUntil: "networkidle" });
                await s.page.goForward({ waitUntil: "networkidle" });
                assert.equal(await sessionStatus(s), "authenticated");
                await logout(s);
                await signIn(s, b, "/personal-center/preferences/mobility");
                await loadedPreference(s.page);
                assert.equal(
                  await field(s.page, "步行容忍度").inputValue(),
                  "veryHigh",
                );
                await go(s.page, "/personal-center/companions");
                await s.page.goBack({ waitUntil: "networkidle" });
                await s.page.goForward({ waitUntil: "networkidle" });
                await s.page
                  .getByRole("heading", {
                    name: "TASK059 Control Companion",
                    exact: true,
                  })
                  .waitFor();
                assert.equal(
                  (
                    await s.page.locator("#personal-content").innerText()
                  ).includes("TASK059 Journey"),
                  false,
                );
                await s.context.close();
                current.observations.completedViewports.push(viewport);
              },
            );
          }
          await check(
            "no page errors, unexpected console errors or external requests",
            async () => {
              assert.equal(metrics.pageErrors, 0);
              assert.equal(metrics.unexpectedConsoleErrors, 0);
              assert.equal(metrics.externalBrowserRequests, 0);
            },
          );
        },
      );
      await record(
        "J8",
        "Disposable real browser registration through complete account deletion",
        async () => {
          sc = await newSession();
          await check(
            "disposable user is registered and confirmed by Local browser flow",
            async () => {
              c = await register(sc, "disposable");
              assert.notEqual(c.id, a.id);
              assert.notEqual(c.id, b.id);
            },
          );
          let beforeB;
          await check(
            "meaningful owned data exists across all accepted B tables before deletion",
            async () => {
              const p = fullProfilePatch();
              p.profile.displayName = "TASK059 Disposable Profile";
              await api(sc, "/api/profile", "PATCH", p);
              await api(
                sc,
                "/api/emergency-contacts",
                "POST",
                contactInput(),
                201,
              );
              await openPreference(sc, "mobility");
              await field(sc.page, "步行容忍度").selectOption("low");
              await savePreference(sc);
              const companion = await api(
                sc,
                "/api/companions",
                "POST",
                companionInput("TASK059 Disposable Companion"),
                201,
              );
              await api(
                sc,
                "/api/companion-groups",
                "POST",
                {
                  name: "TASK059 Disposable Group",
                  includesOwner: true,
                  memberIds: [companion.id],
                },
                201,
              );
              await seedTrips(sc, "DISPOSABLE");
              current.observations.beforeDeletion = counts(
                await inventory(local.db, c.id),
              );
              assert.ok(
                Object.values(current.observations.beforeDeletion).every(
                  (n) => n > 0,
                ),
              );
              beforeB = await inventory(local.db, b.id);
            },
          );
          await check(
            "real UI enforces exact confirmation and deletes verified current user only",
            async () => {
              await go(
                sc.page,
                "/personal-center/account/privacy/delete?ownerUserId=" + b.id,
              );
              const submit = button(sc.page, "永久删除账户");
              assert.equal(
                await sc.page
                  .locator('input[name="ownerUserId"],input[name="userId"]')
                  .count(),
                0,
              );
              assert.equal(await submit.isDisabled(), true);
              await sc.page.getByRole("checkbox").check();
              assert.equal(await submit.isDisabled(), true);
              const confirmation = sc.page.getByPlaceholder("删除账户", {
                exact: true,
              });
              await confirmation.fill("删除账户 ");
              assert.equal(await submit.isDisabled(), true);
              await confirmation.fill("删除账户");
              assert.equal(await submit.isEnabled(), true);
              const pending = sc.page.waitForResponse(
                (r) =>
                  r.url().endsWith("/api/account") &&
                  r.request().method() === "DELETE",
              );
              await submit.click();
              const r = await pending;
              assert.equal(r.status(), 204);
              assert.deepEqual(r.request().postDataJSON(), {
                schemaVersion: "1.0",
                confirmation: "DELETE_ACCOUNT",
                externalBookingsAcknowledged: true,
              });
              await sc.page.waitForURL(app.origin + "/");
              assert.equal(await sessionStatus(sc), "unauthenticated");
            },
          );
          await check(
            "deleted user cannot reload private routes or log in again",
            async () => {
              await go(sc.page, "/personal-center/account");
              assert.equal(new URL(sc.page.url()).pathname, "/login");
              await sc.page.reload({ waitUntil: "networkidle" });
              assert.equal(new URL(sc.page.url()).pathname, "/login");
              await sc.page
                .getByRole("tab", { name: "邮箱登录", exact: true })
                .click();
              await field(sc.page, "邮箱地址").fill(c.email);
              await field(sc.page, "密码").fill(c.password);
              await button(sc.page, "登录").click();
              await sc.page
                .getByRole("alert")
                .filter({ hasText: /邮箱或密码/ })
                .waitFor();
              assert.equal(await sessionStatus(sc), "unauthenticated");
            },
          );
          await check(
            "Auth plus B-owned rows are gone; control account exact data and browser remain intact",
            async () => {
              current.observations.afterDeletion = counts(
                await inventory(local.db, c.id),
              );
              assert.ok(
                Object.values(current.observations.afterDeletion).every(
                  (n) => n === 0,
                ),
              );
              assert.deepEqual(await inventory(local.db, b.id), beforeB);
              current.observations.controlExactRowsUnchanged = true;
              assert.equal(await sessionStatus(sb), "authenticated");
              await go(sb.page, "/personal-center/companions");
              await sb.page
                .getByRole("heading", {
                  name: "TASK059 Control Companion",
                  exact: true,
                })
                .waitFor();
            },
          );
        },
      );
    } finally {
      const contextStops = await Promise.allSettled(
        sessions.map((s) => s.close()),
      );
      const stops = await Promise.allSettled([browser?.close(), app?.stop()]);
      await Promise.all(responses);
      report.cleanup = {
        browserClosed: browser ? !browser.isConnected() : true,
        serverStopped: stops[1].status === "fulfilled",
        errors: [],
        users: [],
      };
      if (contextStops.some((x) => x.status === "rejected"))
        report.cleanup.errors.push("context-close");
      if (stops[0].status === "rejected")
        report.cleanup.errors.push("browser-close");
      if (stops[1].status === "rejected")
        report.cleanup.errors.push("server-stop");
      for (const [i, user] of users.entries()) {
        try {
          if (!user.id) {
            const rows =
              await local.db`select id from auth.users where email=${user.email}`;
            user.id = rows[0]?.id;
          }
          if (user.id) {
            const data = await inventory(local.db, user.id);
            if (data.auth_users.length)
              safeOk(await local.admin.auth.admin.deleteUser(user.id));
            report.cleanup.users.push({
              alias: "synthetic-" + i,
              remaining: counts(await inventory(local.db, user.id)),
            });
          } else
            report.cleanup.users.push({
              alias: "synthetic-" + i,
              neverCreated: true,
              remaining: { auth_users: 0 },
            });
        } catch {
          report.cleanup.errors.push("synthetic-" + i + "-cleanup");
        }
      }
      try {
        await local.db.end({ timeout: 5 });
      } catch {
        report.cleanup.errors.push("db-client-close");
      }
      report.serverNetwork = await readFile(
        resolve(evidence, "server-network.json"),
        "utf8",
      )
        .then(JSON.parse)
        .catch(() => ({ unavailable: true }));
      report.finishedAt = new Date().toISOString();
      await writeFile(
        resolve(evidence, "journeys.json"),
        JSON.stringify(report, null, 2) + "\n",
      );
    }
    assert.deepEqual(
      report.cleanup.errors,
      [],
      "All cleanup operations must succeed",
    );
    assert.ok(
      report.cleanup.users.every((u) =>
        Object.values(u.remaining).every((n) => n === 0),
      ),
      "Synthetic user/data cleanup must complete",
    );
    assert.equal(metrics.secretLeaks, 0);
    assert.equal(metrics.pageErrors, 0);
    assert.equal(metrics.unexpectedConsoleErrors, 0);
    assert.equal(metrics.externalBrowserRequests, 0);
    assert.equal(report.serverNetwork.externalRequests, 0);
  },
);
