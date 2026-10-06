import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import {
  MAX_COMPANIONS_PER_USER,
  MAX_COMPANION_GROUPS,
  MAX_COMPANION_GROUP_MEMBERS,
} from "../src/features/companions/domain/companion-v1.ts";
const require = createRequire(import.meta.url);
const makeInput = (displayName = "旅伴") => ({
  displayName,
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
const groupInput = (name, memberIds = [], includesOwner = false) => ({
  name,
  memberIds,
  includesOwner,
});
const writable = (resource) =>
  Object.fromEntries(
    Object.entries(resource).filter(
      ([key]) => !["id", "revision", "createdAt", "updatedAt"].includes(key),
    ),
  );
const ok = (result) => {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local Auth/DB request succeeds (details withheld)",
  );
  return result.data;
};
test("TASK-047 real Local Auth/API/RLS/CAS/browser acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    completed = [],
    diagnostics = {
      pageErrors: [],
      consoleErrors: [],
      baselineNetworkErrors: [],
      expectedHttpErrors: [],
      unexpectedMutations: [],
      geometry: [],
      viewports: [],
    };
  let app, browser;
  async function acceptance(name, run) {
    await t.test(name, async () => {
      await run();
      completed.push(name);
    });
  }
  const artifact = ".artifacts/task047";
  await mkdir(artifact + "/browser", { recursive: true });
  try {
    assert.equal(
      Number(
        (await local.db.unsafe("select count(*) from auth.users"))[0].count,
      ),
      0,
      "Real acceptance requires clean reset",
    );
    app = await startApp(local);
    for (let i = 0; i < 2; i++) {
      const email = "task047-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = ok(
        await local.admin.auth.admin.createUser({
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
      assert.equal(
        (await authRequest(app, jar, "signin", { email, password })).response
          .status,
        200,
      );
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
    async function api(
      user,
      path,
      method = "GET",
      body,
      revision,
      status = 200,
      options = {},
    ) {
      const headers = {
        ...(user
          ? options.cookie
            ? { cookie: user.jar.header() }
            : { Authorization: "Bearer " + user.token }
          : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(revision === undefined ? {} : { "If-Match": '"' + revision + '"' }),
        ...(options.cookie && method !== "GET" ? { Origin: app.origin } : {}),
        ...options.headers,
      };
      const response = await fetch(app.origin + path, {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : options.raw
              ? body
              : JSON.stringify(body),
        redirect: "manual",
      });
      const result = response.status === 204 ? null : await response.json();
      if (user && options.cookie) user.jar.absorb(response.headers);
      assert.equal(
        response.status,
        status,
        path + " " + method + " " + JSON.stringify(result?.error ?? {}),
      );
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.match(response.headers.get("vary"), /Authorization/);
      assert.doesNotMatch(
        JSON.stringify(result),
        /owner_user_id|access_token|refresh_token|sb_secret_|postgres:\/\/|stack|constraint|23514/,
      );
      return result?.data ?? result;
    }
    const create = (user, name) =>
      api(user, "/api/companions", "POST", makeInput(name), undefined, 201);
    const createGroup = (user, input) =>
      api(user, "/api/companion-groups", "POST", input, undefined, 201);
    let c1, c2, foreign, g1;
    await acceptance(
      "real Cookie/Bearer auth, anon denial and invalid Bearer never falls back",
      async () => {
        for (const root of ["/api/companions", "/api/companion-groups"])
          for (const method of ["GET", "POST", "PUT", "DELETE"])
            await api(
              null,
              root +
                (["PUT", "DELETE"].includes(method) ? "/" + randomUUID() : ""),
              method,
              method === "POST" || method === "PUT" ? {} : undefined,
              1,
              401,
            );
        for (const value of [
          "Basic x",
          "Bearer",
          "Bearer invalid",
          "Bearer a b",
        ])
          await api(a, "/api/companions", "GET", undefined, undefined, 401, {
            cookie: true,
            headers: { Authorization: value },
          });
        assert.deepEqual((await api(a, "/api/companions")).companions, []);
        assert.deepEqual(
          (
            await api(
              a,
              "/api/companion-groups",
              "GET",
              undefined,
              undefined,
              200,
              { cookie: true },
            )
          ).groups,
          [],
        );
      },
    );
    await acceptance(
      "HTTP strict envelopes, unsafe fields, IDs, revisions, CSRF and bounded JSON",
      async () => {
        for (const extra of [
          { owner_user_id: b.id },
          { ownerUserId: b.id },
          { privateNote: "private" },
          { diningNote: "private" },
          { relationshipCode: "bad" },
          { birthDate: "2999-01-01", ageGroupFallback: null },
        ])
          await api(
            a,
            "/api/companions",
            "POST",
            { ...makeInput(), ...extra },
            undefined,
            400,
          );
        await api(
          a,
          "/api/companions?owner=" + b.id,
          "GET",
          undefined,
          undefined,
          400,
        );
        await api(a, "/api/companions/bad", "GET", undefined, undefined, 400);
        for (const header of ["", "1", 'W/"1"', '"0"', '"01"', '"2147483648"'])
          await api(
            a,
            "/api/companions/" + randomUUID(),
            "PUT",
            makeInput(),
            undefined,
            400,
            { headers: { "If-Match": header } },
          );
        await api(a, "/api/companions", "POST", "{", undefined, 400, {
          raw: true,
        });
        await api(
          a,
          "/api/companions",
          "POST",
          " ".repeat(81921),
          undefined,
          413,
          { raw: true },
        );
        await api(a, "/api/companions", "POST", makeInput(), undefined, 403, {
          cookie: true,
          headers: { Origin: "https://example.invalid" },
        });
        await api(a, "/api/companions", "POST", makeInput(), undefined, 403, {
          cookie: true,
          headers: { Origin: "" },
        });
        await api(a, "/api/companions", "POST", makeInput(), undefined, 400, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    );
    await acceptance(
      "Companion create/list/read/update with canonical DB timestamps and revision increments",
      async () => {
        c1 = await api(
          a,
          "/api/companions",
          "POST",
          makeInput("Alpha"),
          undefined,
          201,
          { cookie: true },
        );
        c2 = await create(a, "Beta");
        foreign = await create(b, "Foreign");
        assert.equal(c1.revision, 1);
        assert.ok(Date.parse(c1.createdAt));
        assert.equal((await api(a, "/api/companions")).companions.length, 2);
        assert.deepEqual(await api(a, "/api/companions/" + c1.id), c1);
        c1 = await api(
          a,
          "/api/companions/" + c1.id,
          "PUT",
          { ...writable(c1), displayName: "Alpha saved" },
          c1.revision,
        );
        assert.equal(c1.revision, 2);
      },
    );
    await acceptance(
      "cross-user Companion/Group IDs are indistinguishable from missing resources",
      async () => {
        g1 = await createGroup(a, groupInput("Ordered", [c1.id, c2.id], true));
        for (const [root, resource, payload] of [
          ["/api/companions/", c1, makeInput()],
          ["/api/companion-groups/", g1, groupInput("bad")],
        ]) {
          for (const user of [b])
            for (const id of [resource.id, randomUUID()]) {
              for (const method of ["GET", "PUT", "DELETE"])
                await api(
                  user,
                  root + id,
                  method,
                  method === "PUT" ? payload : undefined,
                  resource.revision,
                  404,
                );
            }
        }
        assert.equal((await api(b, "/api/companions")).companions.length, 1);
        assert.equal((await api(b, "/api/companion-groups")).groups.length, 0);
        const ownGroup = await createGroup(
          b,
          groupInput("B own", [foreign.id], true),
        );
        const changed = await api(
          b,
          "/api/companion-groups/" + ownGroup.id,
          "PUT",
          groupInput("B updated", [], false),
          ownGroup.revision,
        );
        await api(
          b,
          "/api/companion-groups/" + ownGroup.id,
          "DELETE",
          undefined,
          changed.revision,
          204,
        );
        const ownCompanion = await create(b, "B CRUD");
        const updated = await api(
          b,
          "/api/companions/" + ownCompanion.id,
          "PUT",
          makeInput("B updated"),
          ownCompanion.revision,
        );
        await api(
          b,
          "/api/companions/" + ownCompanion.id,
          "DELETE",
          undefined,
          updated.revision,
          204,
        );
      },
    );
    await acceptance(
      "Companion real concurrent CAS has exactly one commit; stale update/delete zero writes",
      async () => {
        const root = "/api/companions/" + c1.id,
          revision = c1.revision;
        const results = await Promise.all(
          ["winner-one", "winner-two"].map(async (displayName) => {
            const response = await fetch(app.origin + root, {
              method: "PUT",
              headers: {
                Authorization: "Bearer " + a.token,
                "Content-Type": "application/json",
                "If-Match": '"' + revision + '"',
              },
              body: JSON.stringify({ ...writable(c1), displayName }),
            });
            return { status: response.status, result: await response.json() };
          }),
        );
        assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
        c1 = results.find((x) => x.status === 200).result.data;
        assert.equal(c1.revision, revision + 1);
        assert.deepEqual(await api(a, root), c1);
        await api(a, root, "PUT", makeInput("stale"), revision, 409);
        await api(a, root, "DELETE", undefined, revision, 409);
        assert.deepEqual(await api(a, root), c1);
      },
    );
    await acceptance(
      "groups preserve includesOwner and order; duplicate/foreign/max members reject with zero writes",
      async () => {
        assert.deepEqual(g1.memberIds, [c1.id, c2.id]);
        assert.equal(g1.includesOwner, true);
        g1 = await api(
          a,
          "/api/companion-groups/" + g1.id,
          "PUT",
          groupInput("Reordered", [c2.id, c1.id], false),
          g1.revision,
        );
        assert.deepEqual(g1.memberIds, [c2.id, c1.id]);
        assert.equal(g1.includesOwner, false);
        await api(
          a,
          "/api/companion-groups",
          "POST",
          groupInput("dup", [c1.id, c1.id]),
          undefined,
          400,
        );
        await api(
          a,
          "/api/companion-groups",
          "POST",
          groupInput("foreign", [foreign.id]),
          undefined,
          409,
        );
        await api(
          a,
          "/api/companion-groups",
          "POST",
          groupInput(
            "max",
            Array.from({ length: MAX_COMPANION_GROUP_MEMBERS + 1 }, () =>
              randomUUID(),
            ),
          ),
          undefined,
          400,
        );
        await api(
          a,
          "/api/companion-groups/" + g1.id,
          "PUT",
          groupInput("foreign-update", [foreign.id]),
          g1.revision,
          409,
        );
        assert.deepEqual(await api(a, "/api/companion-groups/" + g1.id), g1);
        assert.equal((await api(a, "/api/companion-groups")).groups.length, 1);
        const empty = await createGroup(a, groupInput("empty", [], false));
        await api(
          a,
          "/api/companion-groups/" + empty.id,
          "DELETE",
          undefined,
          empty.revision,
          204,
        );
      },
    );
    await acceptance(
      "group CAS race returns one snapshot winner; stale update/delete preserve complete aggregate",
      async () => {
        const revision = g1.revision,
          root = "/api/companion-groups/" + g1.id;
        const results = await Promise.all(
          [
            groupInput("race-one", [c1.id], true),
            groupInput("race-two", [c2.id, c1.id], false),
          ].map(async (body) => {
            const response = await fetch(app.origin + root, {
              method: "PUT",
              headers: {
                Authorization: "Bearer " + a.token,
                "Content-Type": "application/json",
                "If-Match": '"' + revision + '"',
              },
              body: JSON.stringify(body),
            });
            return { status: response.status, result: await response.json() };
          }),
        );
        assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
        g1 = results.find((x) => x.status === 200).result.data;
        assert.deepEqual(await api(a, root), g1);
        await api(a, root, "PUT", groupInput("stale", [c2.id]), revision, 409);
        await api(a, root, "DELETE", undefined, revision, 409);
        assert.deepEqual(await api(a, root), g1);
      },
    );
    await acceptance(
      "real SQL failure during membership insertion rolls back both create and replacement",
      async () => {
        await local.db.unsafe(
          "create function public.task047_fail_member() returns trigger language plpgsql as $$ begin if new.companion_id = '" +
            c2.id +
            "'::uuid then raise exception 'TASK047_TEST_FAILURE'; end if; return new; end $$",
        );
        await local.db.unsafe(
          "create trigger task047_fail_member before insert on public.companion_group_members for each row execute function public.task047_fail_member()",
        );
        try {
          await api(
            a,
            "/api/companion-groups/" + g1.id,
            "PUT",
            groupInput("must rollback", [c1.id, c2.id], true),
            g1.revision,
            500,
          );
          assert.deepEqual(await api(a, "/api/companion-groups/" + g1.id), g1);
          const count = (await api(a, "/api/companion-groups")).groups.length;
          await api(
            a,
            "/api/companion-groups",
            "POST",
            groupInput("create rollback", [c1.id, c2.id]),
            undefined,
            500,
          );
          assert.equal(
            (await api(a, "/api/companion-groups")).groups.length,
            count,
          );
        } finally {
          await local.db.unsafe(
            "drop trigger task047_fail_member on public.companion_group_members",
          );
          await local.db.unsafe("drop function public.task047_fail_member()");
        }
      },
    );
    await acceptance(
      "direct real RLS denies foreign and anon CRUD; RPC security is invoker",
      async () => {
        for (const [table, idKey, id] of [
          ["companions", "id", c1.id],
          ["companion_groups", "id", g1.id],
          ["companion_group_members", "group_id", g1.id],
        ]) {
          assert.deepEqual(
            ok(await b.client.from(table).select("*").eq(idKey, id)),
            [],
          );
          assert.deepEqual(
            ok(await b.client.from(table).delete().eq(idKey, id).select()),
            [],
          );
          const anon = createClient(local.api, local.key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          assert.equal((await anon.from(table).select()).error?.code, "42501");
          assert.equal(
            (await anon.from(table).delete().eq(idKey, id)).error?.code,
            "42501",
          );
          assert.equal(
            (
              await anon
                .from(table)
                .update(
                  table === "companions"
                    ? { display_name: "x", revision: 99 }
                    : table === "companion_groups"
                      ? { name: "x", revision: 99 }
                      : { sort_order: 99 },
                )
                .eq(idKey, id)
            ).error?.code,
            "42501",
          );
        }
        assert.deepEqual(
          ok(
            await b.client
              .from("companions")
              .update({ display_name: "spoof", revision: c1.revision + 1 })
              .eq("id", c1.id)
              .select(),
          ),
          [],
        );
        assert.deepEqual(
          ok(
            await b.client
              .from("companion_groups")
              .update({ name: "spoof", revision: g1.revision + 1 })
              .eq("id", g1.id)
              .select(),
          ),
          [],
        );
        assert.equal(
          (
            await b.client.from("companions").insert({
              owner_user_id: a.id,
              display_name: "spoof",
              age_group_fallback: "adult",
            })
          ).error?.code,
          "42501",
        );
        assert.equal(
          (
            await b.client.from("companion_group_members").insert({
              owner_user_id: a.id,
              group_id: g1.id,
              companion_id: c1.id,
              sort_order: 9,
            })
          ).error?.code,
          "42501",
        );
        assert.equal(
          (
            await a.client.rpc("mutate_companion_group_v1", {
              p_action: "create",
              p_name: "foreign",
              p_includes_owner: false,
              p_member_ids: [foreign.id],
            })
          ).error?.message,
          "COMPANION_GROUP_MEMBER_INVALID",
        );
        const funcs = await local.db.unsafe(
          "select proname,prosecdef,proconfig from pg_proc where proname in ('mutate_companion_v1','mutate_companion_group_v1')",
        );
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        for (const [table, payload] of [
          [
            "companions",
            {
              owner_user_id: a.id,
              display_name: "Anon",
              age_group_fallback: "adult",
            },
          ],
          ["companion_groups", { owner_user_id: a.id, name: "Anon" }],
          [
            "companion_group_members",
            {
              owner_user_id: a.id,
              group_id: g1.id,
              companion_id: c1.id,
              sort_order: 99,
            },
          ],
        ])
          assert.equal(
            (await anon.from(table).insert(payload)).error?.code,
            "42501",
          );
        for (const rpc of ["mutate_companion_v1", "mutate_companion_group_v1"])
          assert.equal(
            (
              await anon.rpc(rpc, {
                p_action: "delete",
                p_id: c1.id,
                p_expected_revision: 1,
              })
            ).error?.code,
            "42501",
          );
        assert.equal(funcs.length, 2);
        assert.ok(
          funcs.every(
            (f) =>
              f.prosecdef === false &&
              f.proconfig.includes("search_path=pg_catalog"),
          ),
        );
      },
    );
    await acceptance(
      "count boundaries and concurrent create cannot exceed the per-owner caps",
      async () => {
        let list = (await api(a, "/api/companions")).companions;
        while (list.length < MAX_COMPANIONS_PER_USER - 1)
          list.push(await create(a, "Limit " + list.length));
        const race = await Promise.all(
          [0, 1].map(async (n) => {
            const r = await fetch(app.origin + "/api/companions", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + a.token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(makeInput("Limit race " + n)),
            });
            return r.status;
          }),
        );
        assert.deepEqual(race.sort(), [201, 409]);
        list = (await api(a, "/api/companions")).companions;
        assert.equal(list.length, MAX_COMPANIONS_PER_USER);
        const max = await createGroup(
          a,
          groupInput(
            "max members",
            list.slice(0, MAX_COMPANION_GROUP_MEMBERS).map((c) => c.id),
          ),
        );
        assert.equal(max.memberIds.length, MAX_COMPANION_GROUP_MEMBERS);
        let groups = (await api(a, "/api/companion-groups")).groups;
        while (groups.length < MAX_COMPANION_GROUPS - 1)
          groups.push(
            await createGroup(a, groupInput("Group limit " + groups.length)),
          );
        const groupRace = await Promise.all(
          [0, 1].map(async (n) => {
            const r = await fetch(app.origin + "/api/companion-groups", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + a.token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(groupInput("Group race " + n)),
            });
            return r.status;
          }),
        );
        assert.deepEqual(groupRace.sort(), [201, 409]);
        assert.equal(
          (await api(a, "/api/companion-groups")).groups.length,
          MAX_COMPANION_GROUPS,
        );
        for (const g of (await api(a, "/api/companion-groups")).groups)
          if (g.id !== g1.id)
            await api(
              a,
              "/api/companion-groups/" + g.id,
              "DELETE",
              undefined,
              g.revision,
              204,
            );
        for (const c of list)
          if (c.id !== c1.id && c.id !== c2.id)
            await api(
              a,
              "/api/companions/" + c.id,
              "DELETE",
              undefined,
              c.revision,
              204,
            );
      },
    );
    await acceptance(
      "hard delete cascades memberships, advances affected group CAS, and group delete preserves masters",
      async () => {
        const extra = await create(a, "Delete me");
        const group = await createGroup(
          a,
          groupInput("Cleanup", [extra.id, c1.id], true),
        );
        await api(
          a,
          "/api/companions/" + extra.id,
          "DELETE",
          undefined,
          extra.revision,
          204,
        );
        await api(
          a,
          "/api/companions/" + extra.id,
          "GET",
          undefined,
          undefined,
          404,
        );
        const updated = await api(a, "/api/companion-groups/" + group.id);
        assert.deepEqual(updated.memberIds, [c1.id]);
        assert.equal(updated.revision, group.revision + 1);
        await api(
          a,
          "/api/companion-groups/" + group.id,
          "PUT",
          groupInput("old", [c1.id]),
          group.revision,
          409,
        );
        await api(
          a,
          "/api/companion-groups/" + group.id,
          "DELETE",
          undefined,
          updated.revision,
          204,
        );
        assert.equal((await api(a, "/api/companions/" + c1.id)).id, c1.id);
      },
    );

    assert.ok(
      process.env.CODEX_PLAYWRIGHT_PATH,
      "Real browser acceptance requires Playwright",
    );
    browser = await require(process.env.CODEX_PLAYWRIGHT_PATH).chromium.launch({
      channel: "msedge",
      headless: true,
    });
    for (const g of (await api(a, "/api/companion-groups")).groups)
      await api(
        a,
        "/api/companion-groups/" + g.id,
        "DELETE",
        undefined,
        g.revision,
        204,
      );
    for (const c of (await api(a, "/api/companions")).companions)
      await api(
        a,
        "/api/companions/" + c.id,
        "DELETE",
        undefined,
        c.revision,
        204,
      );
    const seed1 = await create(a, "Haru"),
      seed2 = await create(a, "Sora");
    await create(a, "Aoi");
    await createGroup(a, groupInput("家庭出游", [seed1.id, seed2.id], true));
    await createGroup(a, groupInput("双人旅行", [seed1.id], true));
    const context = await browser.newContext();
    assert.equal(
      (
        await context.request.post(app.origin + "/auth/signin", {
          headers: { Origin: app.origin },
          data: { email: a.email, password: a.password },
        })
      ).status(),
      200,
    );
    const page = await context.newPage();
    let expectedHttp = false,
      uiMutationCount = 0;
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.name));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (message.location().url === app.origin + "/favicon.ico") {
        diagnostics.baselineNetworkErrors.push({
          url: "/favicon.ico",
          message: message.text(),
        });
        return;
      }
      if (
        expectedHttp &&
        /Failed to load resource.*(409|ERR_FAILED)/.test(message.text())
      )
        diagnostics.expectedHttpErrors.push(message.text());
      else diagnostics.consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
      if (
        ["POST", "PUT", "DELETE", "PATCH"].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith("/api/")
      ) {
        uiMutationCount++;
        if (
          !/^\/api\/(companions|companion-groups)(\/[^/]+)?$/.test(
            new URL(request.url()).pathname,
          )
        )
          diagnostics.unexpectedMutations.push(new URL(request.url()).pathname);
      }
    });
    const url = app.origin + "/personal-center/companions";
    async function load() {
      await page.goto(url, { waitUntil: "networkidle" });
      await page
        .getByRole("heading", { name: "我的同行人", exact: true })
        .waitFor();
    }
    async function save(name) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.locator("dialog[open]").waitFor({ state: "hidden" });
    }
    const baseline = JSON.parse(
      await readFile(artifact + "/baseline-browser/geometry.json", "utf8"),
    );
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1280, 720],
      [390, 844],
      [320, 740],
    ]) {
      await acceptance(
        "browser " +
          width +
          "x" +
          height +
          " load/create/edit/reload/group order/owner/delete",
        async () => {
          await page.setViewportSize({ width, height });
          const before = uiMutationCount;
          for (const route of ["/", "/start", "/planner", "/personal-center"]) {
            await page.goto(app.origin + route, { waitUntil: "networkidle" });
            const geometry = await page.evaluate(() =>
              Object.fromEntries(
                [
                  "header",
                  "main",
                  "h1",
                  "[data-companion-page]",
                  "[data-primary-page-title]",
                ].map((selector) => {
                  const e = document.querySelector(selector);
                  if (!e) return [selector, null];
                  const r = e.getBoundingClientRect();
                  return [
                    selector,
                    { x: r.x, y: r.y, width: r.width, height: r.height },
                  ];
                }),
              ),
            );
            const old = baseline.find(
              (x) =>
                x.width === width && x.height === height && x.route === route,
            );
            assert.deepEqual(
              geometry,
              old.geometry,
              "No unrelated page geometry drift: " + route + " " + width,
            );
            diagnostics.geometry.push({ width, height, route, match: true });
          }
          await load();
          assert.equal(
            uiMutationCount,
            before,
            "Hydration/navigation must not mutate data",
          );
          assert.ok(
            await page
              .getByRole("heading", { name: "Haru", exact: true })
              .count(),
          );
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          assert.ok(overflow <= 1, "No horizontal overflow");
          await page.screenshot({
            path:
              artifact + "/browser/" + width + "x" + height + "-overview.png",
            fullPage: true,
          });
          const name = "QA " + width,
            edited = name + " saved",
            groupName = "QA group " + width;
          await page
            .getByRole("button", { name: "添加同行人", exact: true })
            .click();
          await page.getByLabel("昵称 / 称呼 *", { exact: true }).fill(name);
          await page.getByLabel("少步行", { exact: true }).check();
          await page
            .getByLabel("其他饮食说明（仅本次草稿，不会保存）", { exact: true })
            .fill("UI draft only");
          await save("保存同行人");
          await page.reload({ waitUntil: "networkidle" });
          assert.equal(
            await page.getByRole("heading", { name, exact: true }).count(),
            1,
          );
          await page
            .getByRole("button", {
              name: "编辑 " + name + " 的同行人资料",
              exact: true,
            })
            .click();
          assert.equal(
            await page
              .getByLabel("其他饮食说明（仅本次草稿，不会保存）", {
                exact: true,
              })
              .inputValue(),
            "",
          );
          await page.getByLabel("昵称 / 称呼 *", { exact: true }).fill(edited);
          await save("保存同行人");
          await page.reload({ waitUntil: "networkidle" });
          assert.equal(
            await page
              .getByRole("heading", { name: edited, exact: true })
              .count(),
            1,
          );
          await page
            .getByRole("button", { name: "创建常用组合", exact: true })
            .click();
          await page.getByLabel("组合名称 *", { exact: true }).fill(groupName);
          const picker = page.locator("fieldset").filter({
            has: page.getByText("选择同行人（可留空）", { exact: true }),
          });
          await picker.getByRole("checkbox", { name: /Haru/ }).check();
          await picker.getByRole("checkbox", { name: /Sora/ }).check();
          await page
            .getByRole("button", { name: "上移成员 Sora", exact: true })
            .click();
          if ([1440, 390].includes(width)) {
            await page.screenshot({
              path: artifact + "/browser/" + width + "-group-order.png",
              fullPage: true,
            });
            const sizes = await page
              .locator("[data-member-order] button")
              .evaluateAll((buttons) =>
                buttons.map((b) => ({
                  width: b.getBoundingClientRect().width,
                  height: b.getBoundingClientRect().height,
                })),
              );
            assert.ok(
              sizes.every((size) => size.width >= 44 && size.height >= 44),
              "New ordering controls preserve 44px targets",
            );
          }
          await save("保存组合");
          await page.reload({ waitUntil: "networkidle" });
          let savedGroup = (await api(a, "/api/companion-groups")).groups.find(
            (g) => g.name === groupName,
          );
          assert.deepEqual(savedGroup.memberIds, [seed2.id, seed1.id]);
          assert.equal(savedGroup.includesOwner, true);
          await page
            .getByRole("button", {
              name: "编辑常用组合 " + groupName,
              exact: true,
            })
            .click();
          await picker.getByRole("checkbox", { name: /本人/ }).uncheck();
          await page
            .getByRole("button", { name: "下移成员 Sora", exact: true })
            .click();
          await save("保存组合");
          await page.reload({ waitUntil: "networkidle" });
          savedGroup = (await api(a, "/api/companion-groups")).groups.find(
            (g) => g.name === groupName,
          );
          assert.deepEqual(savedGroup.memberIds, [seed1.id, seed2.id]);
          assert.equal(savedGroup.includesOwner, false);
          await page
            .getByRole("button", {
              name: "编辑常用组合 " + groupName,
              exact: true,
            })
            .click();
          page.once("dialog", (dialog) => dialog.accept());
          await page
            .getByRole("button", { name: "删除组合", exact: true })
            .click();
          await page.locator("dialog[open]").waitFor({ state: "hidden" });
          await page
            .getByRole("button", { name: "删除同行人 " + edited, exact: true })
            .click();
          await page
            .getByRole("button", { name: "确认删除同行人", exact: true })
            .click();
          await page
            .getByRole("button", { name: "确认删除同行人", exact: true })
            .waitFor({ state: "hidden" });
          await page.reload({ waitUntil: "networkidle" });
          assert.equal(
            await page
              .getByRole("heading", { name: edited, exact: true })
              .count(),
            0,
          );
          assert.equal(
            await page
              .getByRole("heading", { name: groupName, exact: true })
              .count(),
            0,
          );
          assert.equal(
            uiMutationCount - before,
            6,
            "Exactly the six explicit Companion/Group mutations",
          );
          diagnostics.viewports.push({ width, height, overflow, crud: true });
        },
      );
    }
    await acceptance(
      "browser dirty guard, companion conflict preserves draft and explicit reload recovery",
      async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await load();
        await page
          .getByRole("button", { name: "编辑 Haru 的同行人资料", exact: true })
          .click();
        await page
          .getByLabel("昵称 / 称呼 *", { exact: true })
          .fill("Unsaved local");
        await page
          .getByRole("button", { name: "关闭编辑窗口", exact: true })
          .click();
        await page
          .getByRole("button", { name: "继续编辑", exact: true })
          .click();
        assert.equal(
          await page.getByLabel("昵称 / 称呼 *", { exact: true }).inputValue(),
          "Unsaved local",
        );
        const current = (await api(a, "/api/companions")).companions.find(
          (c) => c.id === seed1.id,
        );
        await api(
          a,
          "/api/companions/" + current.id,
          "PUT",
          { ...writable(current), displayName: "Remote Haru" },
          current.revision,
        );
        const before = uiMutationCount;
        expectedHttp = true;
        await page
          .getByRole("button", { name: "保存同行人", exact: true })
          .click();
        await page.getByRole("alert").filter({ hasText: "其他设备" }).waitFor();
        assert.equal(
          await page.getByLabel("昵称 / 称呼 *", { exact: true }).inputValue(),
          "Unsaved local",
        );
        assert.equal(
          await page
            .getByRole("button", { name: "保存同行人", exact: true })
            .isDisabled(),
          true,
        );
        assert.equal(uiMutationCount - before, 1);
        await page.screenshot({
          path: artifact + "/browser/companion-conflict.png",
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "放弃本地修改并重新读取", exact: true })
          .click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
        expectedHttp = false;
        assert.equal(
          await page
            .getByRole("heading", { name: "Remote Haru", exact: true })
            .count(),
          1,
        );
        const second = await browser.newContext();
        assert.equal(
          (
            await second.request.post(app.origin + "/auth/signin", {
              headers: { Origin: app.origin },
              data: { email: a.email, password: a.password },
            })
          ).status(),
          200,
        );
        const secondPage = await second.newPage();
        await secondPage.goto(url, { waitUntil: "networkidle" });
        assert.equal(
          await secondPage
            .getByRole("heading", { name: "Remote Haru", exact: true })
            .count(),
          1,
        );
        await second.close();
      },
    );
    await acceptance(
      "browser group conflict preserves full draft and reloads canonical ordered membership",
      async () => {
        await load();
        const current = (await api(a, "/api/companion-groups")).groups.find(
          (g) => g.name === "家庭出游",
        );
        await page
          .getByRole("button", { name: "编辑常用组合 家庭出游", exact: true })
          .click();
        await page
          .getByLabel("组合名称 *", { exact: true })
          .fill("Unsaved group");
        await api(
          a,
          "/api/companion-groups/" + current.id,
          "PUT",
          groupInput("Remote group", [seed2.id], false),
          current.revision,
        );
        expectedHttp = true;
        await page
          .getByRole("button", { name: "保存组合", exact: true })
          .click();
        await page.getByRole("alert").filter({ hasText: "其他设备" }).waitFor();
        assert.equal(
          await page.getByLabel("组合名称 *", { exact: true }).inputValue(),
          "Unsaved group",
        );
        assert.equal(
          await page
            .getByRole("button", { name: "保存组合", exact: true })
            .isDisabled(),
          true,
        );
        await page
          .getByRole("button", { name: "放弃本地修改并重新读取", exact: true })
          .click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
        expectedHttp = false;
        assert.deepEqual(
          (await api(a, "/api/companion-groups/" + current.id)).memberIds,
          [seed2.id],
        );
      },
    );
    await acceptance(
      "browser API loading/error/retry and unauthenticated navigation",
      async () => {
        await page.route(
          "**/api/companions",
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 350));
            await route.continue();
          },
          { times: 1 },
        );
        await page.goto(url);
        await page
          .getByRole("status")
          .filter({ hasText: "正在读取" })
          .waitFor();
        await page.waitForLoadState("networkidle");
        expectedHttp = true;
        await page.route("**/api/companions", (route) => route.abort(), {
          times: 1,
        });
        await page.reload({ waitUntil: "networkidle" });
        await page
          .getByRole("alert")
          .filter({ hasText: "读取或保存失败" })
          .waitFor();
        await page
          .getByRole("button", { name: "重新读取服务器资料", exact: true })
          .click();
        await page
          .locator("[data-companion-page] [role=alert]")
          .waitFor({ state: "hidden" });
        expectedHttp = false;
        const guest = await browser.newContext();
        const guestPage = await guest.newPage();
        await guestPage.goto(url);
        await guestPage.waitForURL(/\/login\?/);
        await guest.close();
      },
    );
    await acceptance(
      "browser diagnostics: zero JS/console errors and zero unexpected mutations",
      async () => {
        assert.deepEqual(diagnostics.pageErrors, []);
        assert.deepEqual(diagnostics.consoleErrors, []);
        assert.deepEqual(diagnostics.unexpectedMutations, []);
        assert.equal(diagnostics.geometry.length, 20);
        assert.equal(diagnostics.viewports.length, 5);
      },
    );
    await acceptance(
      "Auth user deletion cascades owned rows while other account remains",
      async () => {
        ok(await local.admin.auth.admin.deleteUser(a.id));
        users.splice(users.indexOf(a), 1);
        for (const table of [
          "companions",
          "companion_groups",
          "companion_group_members",
        ])
          assert.equal(
            Number(
              (
                await local.db.unsafe(
                  "select count(*) from public." +
                    table +
                    " where owner_user_id=$1",
                  [a.id],
                )
              )[0].count,
            ),
            0,
          );
        assert.equal(
          ok(await b.client.from("companions").select("*")).length,
          1,
        );
      },
    );
  } finally {
    await writeFile(
      artifact + "/real-acceptance.json",
      JSON.stringify(
        {
          completed,
          diagnostics,
          complete:
            diagnostics.viewports.length === 5 &&
            diagnostics.geometry.length === 20 &&
            completed.length === 21,
        },
        null,
        2,
      ),
    );
    await browser?.close();
    await app?.stop();
    for (const user of users) await local.admin.auth.admin.deleteUser(user.id);
    await local.db.end();
  }
});
