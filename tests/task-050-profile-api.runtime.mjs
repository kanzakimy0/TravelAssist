import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import {
  fullProfilePatch,
  contactInput,
  emptyProfileView,
  invalidProfilePatches,
  invalidContactPatches,
} from "./task-050-profile-fixtures.mjs";
import {
  parseProfileAccountViewV1,
  parseEmergencyContactViewV1,
} from "../src/features/profile/domain/profile-account-v1.ts";
import {
  fullDraftFixture,
  progressFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { checkClientBundle } from "./task-016-client-bundle.mjs";
const require = createRequire(import.meta.url);
const ok = (result) => {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local fixture succeeds; raw details withheld",
  );
  return result.data;
};
test("TASK-050 real Local Supabase/Auth/RLS/Profile HTTP acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    completed = [],
    metrics = {};
  let app,
    browser,
    trigger = false;
  const accept = (name, run) =>
    t.test(name, async () => {
      await run();
      completed.push(name);
    });
  try {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "requires clean local fixtures",
    );
    local.env.DATABASE_URL = local.databaseUrl;
    for (const key of Object.keys(local.env))
      if (/SUPABASE.*(?:SERVICE|SECRET)|SERVICE.*SUPABASE/.test(key))
        delete local.env[key];
    app = await startApp(local);
    for (let i = 0; i < 2; i++) {
      const email = "task050-" + randomUUID() + "@example.test",
        password = "Local-" + randomUUID() + "!";
      const created = ok(
        await local.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          phone: i === 0 ? "19995550101" : undefined,
          phone_confirm: i === 0,
          user_metadata: {
            email: "spoof@example.test",
            email_verified: false,
            phone: "19995550999",
            phone_verified: false,
          },
        }),
      );
      // Register cleanup immediately, including failures during sign-in.
      const user = { id: created.user.id, email, password };
      users.push(user);
      user.client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signed = ok(
        await user.client.auth.signInWithPassword({ email, password }),
      );
      user.token = signed.session.access_token;
      user.jar = new CookieJar();
      assert.equal(
        (await authRequest(app, user.jar, "signin", { email, password }))
          .response.status,
        200,
      );
    }
    const [a, b] = users;
    const anon = createClient(local.api, local.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    async function api(
      user,
      path = "/api/profile",
      method = "GET",
      body,
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
      });
      if (user && options.cookie) user.jar.absorb(response.headers);
      const result = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        status,
        method +
          " " +
          path.replace(/[0-9a-f-]{36}/g, "<id>") +
          " " +
          (result?.error?.code ?? ""),
      );
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.match(response.headers.get("vary"), /Authorization/);
      assert.match(response.headers.get("vary"), /Cookie/);
      if (status >= 400) {
        assert.deepEqual(Object.keys(result), ["ok", "error"]);
        assert.deepEqual(Object.keys(result.error), ["code"]);
        assert.equal(result.ok, false);
        assert.doesNotMatch(
          JSON.stringify(result),
          /postgres|SQL|task050|example.test|access_token|secret/i,
        );
        return result.error.code;
      }
      if (status === 204) return null;
      assert.equal(result.ok, true);
      assert.deepEqual(Object.keys(result), ["ok", "data"]);
      return result.data;
    }
    const patch = (user, value, status = 200, options = {}) =>
      api(user, "/api/profile", "PATCH", value, status, options);
    const counts = async (user) =>
      (
        await local.db`select (select count(*)::int from public.profiles where id=${user.id}) as profiles,(select count(*)::int from public.profile_settings where user_id=${user.id}) as settings,(select count(*)::int from public.emergency_contacts where user_id=${user.id}) as contacts`
      )[0];
    await accept(
      "anonymous reads and mutations denied on all six routes",
      async () => {
        for (const [path, method, body] of [
          ["/api/profile", "GET"],
          ["/api/profile", "PATCH", fullProfilePatch()],
          ["/api/emergency-contacts", "GET"],
          ["/api/emergency-contacts", "POST", contactInput()],
          ["/api/emergency-contacts/" + randomUUID(), "PATCH", contactInput()],
          ["/api/emergency-contacts/" + randomUUID(), "DELETE"],
        ])
          assert.equal(
            await api(null, path, method, body, 401),
            "AUTH_REQUIRED",
          );
      },
    );
    await accept(
      "first GET is nullable, read-only, and verified Auth projection ignores metadata",
      async () => {
        for (const user of users) {
          const v = await api(user);
          parseProfileAccountViewV1(v);
          const trusted = ok(await user.client.auth.getUser()).user;
          const expected = emptyProfileView();
          expected.authContact = {
            email: trusted.email || null,
            emailVerified: !!trusted.email && !!trusted.email_confirmed_at,
            phone: trusted.phone || null,
            phoneVerified: !!trusted.phone && !!trusted.phone_confirmed_at,
          };
          assert.deepEqual(v, expected);
          assert.deepEqual(await counts(user), {
            profiles: 0,
            settings: 0,
            contacts: 0,
          });
        }
        const v = await api(a);
        assert.equal(v.authContact.phoneVerified, true);
        assert.notEqual(v.authContact.phone, "19995550999");
      },
    );
    await accept(
      "cookie GET and same-origin save work; wrong/missing Origin denied",
      async () => {
        assert.equal(
          (
            await api(a, "/api/profile", "GET", undefined, 200, {
              cookie: true,
            })
          ).schemaVersion,
          "1.0",
        );
        for (const Origin of ["", "https://attacker.example", "null"])
          assert.equal(
            await patch(a, fullProfilePatch(), 403, {
              cookie: true,
              headers: { Origin },
            }),
            "FORBIDDEN",
          );
        assert.deepEqual(await counts(a), {
          profiles: 0,
          settings: 0,
          contacts: 0,
        });
      },
    );
    await accept(
      "explicit malformed/invalid Bearer never falls back to valid cookie; valid Bearer wins",
      async () => {
        for (const Authorization of [
          "",
          "Basic x",
          "Bearer broken",
          "Bearer token extra",
        ])
          assert.equal(
            await api(a, "/api/profile", "GET", undefined, 401, {
              cookie: true,
              headers: { Authorization },
            }),
            "AUTH_REQUIRED",
          );
        assert.equal(
          (
            await api(a, "/api/profile", "GET", undefined, 200, {
              cookie: true,
              headers: { Authorization: "Bearer " + b.token },
            })
          ).authContact.email,
          b.email,
        );
        const v = await patch(
          b,
          { schemaVersion: "1.0", profile: { displayName: "User B" } },
          200,
          { headers: { Origin: "https://attacker.example" } },
        );
        assert.equal(v.profile.displayName, "User B");
      },
    );
    await accept(
      "owner spoof via root/nested/query/path rejected",
      async () => {
        for (const value of [
          { ...fullProfilePatch(), ownerUserId: b.id },
          { schemaVersion: "1.0", profile: { id: b.id } },
          { schemaVersion: "1.0", settings: { userId: b.id } },
        ])
          assert.equal(await patch(a, value, 400), "INVALID_REQUEST");
        for (const path of [
          "/api/profile?userId=" + b.id,
          "/api/emergency-contacts?ownerUserId=" + b.id,
        ])
          assert.equal(
            await api(a, path, "GET", undefined, 400),
            "INVALID_REQUEST",
          );
        const response = await fetch(app.origin + "/api/profile/" + b.id, {
          headers: { Authorization: "Bearer " + a.token },
        });
        assert.equal(response.status, 404);
      },
    );
    await accept(
      "actual SQL writes execute as authenticated with exact verified auth.uid",
      async () => {
        // Local-only fault/role fixture. Dropped in finally; never a migration or product function.
        await local.db.unsafe(
          `create function public.task050_assert_request_role() returns trigger language plpgsql security invoker set search_path=pg_catalog as $fn$ begin if current_user <> 'authenticated' or auth.uid()::text <> coalesce(to_jsonb(new)->>'user_id',to_jsonb(new)->>'id') then raise exception 'TASK050_ROLE_FAILURE'; end if; if tg_table_name='profile_settings' and to_jsonb(new)->>'timezone'='Etc/GMT+1' then raise exception 'TASK050_PRIVATE_FAILURE'; end if; return new; end $fn$`,
        );
        trigger = true;
        for (const table of [
          "profiles",
          "profile_settings",
          "emergency_contacts",
        ])
          await local.db.unsafe(
            `create trigger task050_role_guard before insert or update on public.${table} for each row execute function public.task050_assert_request_role()`,
          );
        const v = await patch(a, fullProfilePatch(), 200, { cookie: true });
        assert.equal(v.profile.displayName, "Synthetic traveller");
        assert.deepEqual(await counts(a), {
          profiles: 1,
          settings: 1,
          contacts: 0,
        });
      },
    );
    let saved;
    await accept(
      "profile/settings round-trip, independent defaults and DB-owned audits",
      async () => {
        saved = await api(a);
        assert.deepEqual(parseProfileAccountViewV1(saved), saved);
        for (const group of ["profile", "settings"])
          for (const [key, value] of Object.entries(fullProfilePatch()[group]))
            assert.equal(saved[group][key], value);
        assert.ok(saved.profile.createdAt);
        assert.ok(saved.settings.createdAt);
        const v = await patch(a, {
          schemaVersion: "1.0",
          settings: { regionCode: "US" },
        });
        assert.equal(v.settings.regionCode, "US");
        assert.equal(v.settings.currencyCode, "JPY");
        assert.equal(v.settings.timezone, "Asia/Tokyo");
        assert.equal(v.profile.createdAt, saved.profile.createdAt);
      },
    );
    await accept(
      "missing unchanged, null clears all nullable fields; empty save rejected",
      async () => {
        const v = await patch(a, {
          schemaVersion: "1.0",
          profile: { fullName: null },
          settings: { currencyCode: null },
        });
        assert.equal(v.profile.fullName, null);
        assert.equal(v.profile.birthDate, saved.profile.birthDate);
        assert.equal(v.settings.currencyCode, null);
        assert.equal(v.settings.timeFormat, "24h");
        const clear = fullProfilePatch();
        for (const group of [clear.profile, clear.settings])
          for (const key of Object.keys(group)) group[key] = null;
        const empty = await patch(a, clear);
        for (const group of ["profile", "settings"])
          for (const key of Object.keys(clear[group]))
            assert.equal(empty[group][key], null);
        await patch(a, fullProfilePatch());
      },
    );
    await accept(
      "all invalid/future/locale/timezone/currency/units/unknown payloads fail closed without writes",
      async () => {
        const before = await api(a);
        for (const input of invalidProfilePatches())
          assert.equal(await patch(a, input, 400), "INVALID_REQUEST");
        assert.deepEqual(await api(a), before);
        metrics.invalidProfilePayloads = invalidProfilePatches().length;
      },
    );
    await accept(
      "Auth contact readonly; unverified Auth state comes from fresh Auth user",
      async () => {
        for (const field of [
          "email",
          "phone",
          "emailVerified",
          "phoneVerified",
        ]) {
          assert.equal(
            await patch(
              a,
              { schemaVersion: "1.0", profile: { [field]: "spoof" } },
              400,
            ),
            "INVALID_REQUEST",
          );
        }
        await local.db`update auth.users set email_confirmed_at=null where id=${b.id}`;
        const trusted = ok(await b.client.auth.getUser()).user;
        const view = await api(b);
        assert.equal(trusted.email_confirmed_at, undefined);
        assert.equal(view.authContact.emailVerified, false);
        assert.equal(view.authContact.email, b.email);
      },
    );
    await accept(
      "profile/settings pair rolls back after second table SQL failure",
      async () => {
        const before = await api(a);
        assert.equal(
          await patch(
            a,
            {
              schemaVersion: "1.0",
              profile: { displayName: "Must roll back" },
              settings: { timezone: "Etc/GMT+1" },
            },
            503,
          ),
          "PROFILE_UNAVAILABLE",
        );
        assert.deepEqual(await api(a), before);
        assert.equal(
          await patch(
            b,
            {
              schemaVersion: "1.0",
              profile: { displayName: "Must roll back" },
              settings: { timezone: "Etc/GMT+1" },
            },
            503,
          ),
          "PROFILE_UNAVAILABLE",
        );
        assert.equal((await counts(b)).settings, 0);
        assert.equal((await api(b)).profile.displayName, "User B");
      },
    );
    await accept(
      "concurrent disjoint PATCH fields preserve each other without adding revision/CAS",
      async () => {
        await Promise.all([
          patch(a, {
            schemaVersion: "1.0",
            profile: { displayName: "Concurrent name" },
          }),
          patch(a, {
            schemaVersion: "1.0",
            profile: { residenceCity: "Concurrent city" },
          }),
          patch(a, { schemaVersion: "1.0", settings: { timeFormat: "12h" } }),
          patch(b, {
            schemaVersion: "1.0",
            profile: { displayName: "B concurrent" },
          }),
        ]);
        const v = await api(a);
        assert.equal(v.profile.displayName, "Concurrent name");
        assert.equal(v.profile.residenceCity, "Concurrent city");
        assert.equal(v.settings.timeFormat, "12h");
        assert.equal((await api(b)).profile.displayName, "B concurrent");
        assert.equal("revision" in v, false);
      },
    );
    await accept(
      "existing owner-only RLS through real user clients and anon denies direct cross-user writes",
      async () => {
        for (const [table, key] of [
          ["profiles", "id"],
          ["profile_settings", "user_id"],
        ]) {
          assert.deepEqual(
            ok(await b.client.from(table).select("*").eq(key, a.id)),
            [],
          );
          assert.deepEqual(
            ok(
              await b.client
                .from(table)
                .update(
                  table === "profiles"
                    ? { display_name: "spoof" }
                    : { locale: "en" },
                )
                .eq(key, a.id)
                .select(),
            ),
            [],
          );
          assert.ok((await b.client.from(table).insert({ [key]: a.id })).error);
          assert.ok((await anon.from(table).select("*")).error);
        }
      },
    );
    let c1, c2, bContact;
    await accept(
      "emergency contact create/list and stable ordering with equal created_at",
      async () => {
        assert.deepEqual(await api(a, "/api/emergency-contacts"), []);
        c1 = await api(
          a,
          "/api/emergency-contacts",
          "POST",
          contactInput(),
          201,
        );
        parseEmergencyContactViewV1(c1);
        assert.equal(c1.email, "Contact@example.test");
        c2 = await api(
          a,
          "/api/emergency-contacts",
          "POST",
          {
            schemaVersion: "1.0",
            name: "Second",
            relationship: "friend",
            phoneE164: "+123456789012345",
          },
          201,
          { cookie: true },
        );
        bContact = await api(
          b,
          "/api/emergency-contacts",
          "POST",
          contactInput(),
          201,
        );
        assert.equal(c2.email, null);
        assert.equal(c2.note, null);
        assert.equal(c2.countryCode, null);
        const rows = await api(a, "/api/emergency-contacts");
        assert.deepEqual(
          rows.map((r) => r.id),
          [c1.id, c2.id],
        );
        assert.deepEqual((await api(a)).emergencyContacts, rows);
        // The production audit trigger owns timestamps; use replica mode only for this ordering fixture.
        await local.db.begin(async (tx) => {
          await tx`set local session_replication_role=replica`;
          await tx`update public.emergency_contacts set created_at='2026-01-01T00:00:00Z' where user_id=${a.id}`;
        });
        assert.deepEqual(
          (await api(a, "/api/emergency-contacts")).map((r) => r.id),
          [c1.id, c2.id].sort(),
        );
      },
    );
    await accept(
      "contact patch missing/null semantics and audit preservation",
      async () => {
        const original = (await api(a, "/api/emergency-contacts")).find(
          (r) => r.id === c1.id,
        );
        const updated = await api(
          a,
          "/api/emergency-contacts/" + c1.id,
          "PATCH",
          { schemaVersion: "1.0", name: " Edited ", email: null, note: null },
        );
        assert.equal(updated.name, "Edited");
        assert.equal(updated.relationship, original.relationship);
        assert.equal(updated.phoneE164, original.phoneE164);
        assert.equal(updated.email, null);
        assert.equal(updated.createdAt, original.createdAt);
      },
    );
    await accept(
      "invalid contact required/null/email/E164/length payloads reject without writes",
      async () => {
        const before = await api(a, "/api/emergency-contacts");
        for (const input of invalidContactPatches())
          assert.equal(
            await api(
              a,
              "/api/emergency-contacts/" + c1.id,
              "PATCH",
              input,
              400,
            ),
            "INVALID_REQUEST",
          );
        for (const key of ["name", "relationship", "phoneE164"]) {
          const input = contactInput();
          delete input[key];
          assert.equal(
            await api(a, "/api/emergency-contacts", "POST", input, 400),
            "INVALID_REQUEST",
          );
        }
        assert.deepEqual(await api(a, "/api/emergency-contacts"), before);
        metrics.invalidContactPayloads = invalidContactPatches().length + 3;
      },
    );
    await accept(
      "contact UUID rejected before DB SQL; cross-user/nonexistent mutation same 404",
      async () => {
        for (const method of ["PATCH", "DELETE"]) {
          const body =
            method === "PATCH"
              ? { schemaVersion: "1.0", name: "spoof" }
              : undefined;
          assert.equal(
            await api(
              a,
              "/api/emergency-contacts/not-a-uuid",
              method,
              body,
              400,
            ),
            "INVALID_REQUEST",
          );
          for (const id of [bContact.id, randomUUID()])
            assert.equal(
              await api(a, "/api/emergency-contacts/" + id, method, body, 404),
              "EMERGENCY_CONTACT_NOT_FOUND",
            );
        }
        assert.deepEqual(
          ok(
            await a.client
              .from("emergency_contacts")
              .select("*")
              .eq("id", bContact.id),
          ),
          [],
        );
        assert.deepEqual(
          ok(
            await a.client
              .from("emergency_contacts")
              .delete()
              .eq("id", bContact.id)
              .select(),
          ),
          [],
        );
        assert.ok((await anon.from("emergency_contacts").select("*")).error);
        assert.ok(
          (
            await a.client.from("emergency_contacts").insert({
              user_id: b.id,
              name: "spoof",
              relationship: "friend",
              phone_e164: "+1234",
            })
          ).error,
        );
        const response = await fetch(
          app.origin + "/api/emergency-contacts/" + bContact.id,
          { headers: { Authorization: "Bearer " + a.token } },
        );
        assert.equal(response.status, 405);
      },
    );
    await accept(
      "cookie Origin protection also guards contact POST/PATCH/DELETE; query/body spoof denied",
      async () => {
        for (const [path, method, body] of [
          ["/api/emergency-contacts", "POST", contactInput()],
          [
            "/api/emergency-contacts/" + c1.id,
            "PATCH",
            { schemaVersion: "1.0", name: "spoof" },
          ],
          ["/api/emergency-contacts/" + c1.id, "DELETE"],
        ])
          for (const Origin of ["", "https://attacker.example"])
            assert.equal(
              await api(a, path, method, body, 403, {
                cookie: true,
                headers: { Origin },
              }),
              "FORBIDDEN",
            );
        assert.equal(
          await api(
            a,
            "/api/emergency-contacts",
            "POST",
            { ...contactInput(), userId: b.id },
            400,
          ),
          "INVALID_REQUEST",
        );
        assert.equal(
          await api(
            a,
            "/api/emergency-contacts/" + c1.id + "?ownerUserId=" + b.id,
            "DELETE",
            undefined,
            400,
          ),
          "INVALID_REQUEST",
        );
        assert.equal(
          await api(
            a,
            "/api/emergency-contacts/" + c1.id,
            "DELETE",
            { ownerUserId: b.id },
            400,
          ),
          "INVALID_REQUEST",
        );
      },
    );
    await accept(
      "bounded JSON rejects wrong content type, malformed JSON, excess and invalid UTF8",
      async () => {
        assert.equal(
          await patch(a, "{", 400, { raw: true }),
          "INVALID_REQUEST",
        );
        assert.equal(
          await patch(a, fullProfilePatch(), 400, {
            headers: { "Content-Type": "text/plain" },
          }),
          "INVALID_REQUEST",
        );
        assert.equal(
          await patch(a, "x".repeat(81921), 413, { raw: true }),
          "PAYLOAD_TOO_LARGE",
        );
        assert.equal(
          await patch(a, new Uint8Array([0xff]), 400, { raw: true }),
          "INVALID_REQUEST",
        );
      },
    );
    await accept(
      "real browser cookies persist profile and contact operations; unauthenticated browser denied",
      async () => {
        const playwright = require(
          process.env.CODEX_PLAYWRIGHT_PATH || "playwright",
        );
        browser = await playwright.chromium.launch({
          channel: "msedge",
          headless: true,
        });
        const context = await browser.newContext();
        await context.addCookies(
          a.jar.getAll().map(({ name, value }) => ({
            name,
            value,
            domain: "127.0.0.1",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
          })),
        );
        const page = await context.newPage();
        await page.goto(app.origin + "/");
        const results = await page.evaluate(async (input) => {
          const result = [];
          for (const [path, method, body] of [
            [
              "/api/profile",
              "PATCH",
              {
                schemaVersion: "1.0",
                profile: { displayName: "Browser saved" },
              },
            ],
            ["/api/profile", "GET"],
            ["/api/emergency-contacts", "POST", input],
          ]) {
            const r = await fetch(path, {
              method,
              headers: body ? { "Content-Type": "application/json" } : {},
              body: body ? JSON.stringify(body) : undefined,
            });
            result.push({ status: r.status, body: await r.json() });
          }
          return result;
        }, contactInput());
        assert.deepEqual(
          results.map((r) => r.status),
          [200, 200, 201],
        );
        assert.equal(results[1].body.data.profile.displayName, "Browser saved");
        const newContext = await browser.newContext();
        const newPage = await newContext.newPage();
        await newPage.goto(app.origin + "/");
        assert.equal(
          await newPage.evaluate(
            async () => (await fetch("/api/profile")).status,
          ),
          401,
        );
        await newContext.close();
        await context.close();
        metrics.browser = "Microsoft Edge / real cookie session / native fetch";
      },
    );
    await accept(
      "deleting one contact preserves populated Profile/Preference/Companion/Trip and Auth",
      async () => {
        await api(a, "/api/preferences", "PATCH", {
          expectedRevision: 0,
          patch: {
            schemaVersion: "1.0",
            set: { "style.planning": 3 },
            unset: [],
          },
        });
        await api(
          a,
          "/api/companions",
          "POST",
          {
            displayName: "Synthetic companion",
            birthDate: null,
            ageGroupFallback: "adult",
            relationshipCode: "friend",
            relationshipLabel: null,
            genderCode: null,
            avatarPath: null,
            travelProfile: {
              schemaVersion: "1.0",
              mobilityNeeds: [],
              diningNeeds: [],
              activityInterests: [],
            },
          },
          201,
        );
        await api(
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
          201,
        );
        const state = async () => ({
          profile: await api(a),
          preference: await api(a, "/api/preferences"),
          companions: await api(a, "/api/companions"),
          trips: await api(a, "/api/trip-library"),
        });
        const before = await state();
        await api(
          a,
          "/api/emergency-contacts/" + c1.id,
          "DELETE",
          undefined,
          204,
          { cookie: true },
        );
        const after = await state();
        assert.deepEqual(after, {
          ...before,
          profile: {
            ...before.profile,
            emergencyContacts: before.profile.emergencyContacts.filter(
              (r) => r.id !== c1.id,
            ),
          },
        });
        assert.equal(ok(await a.client.auth.getUser()).user.id, a.id);
      },
    );
    await accept(
      "production client chunks exclude server DB/Auth implementation",
      async () => {
        metrics.clientChunks = checkClientBundle(".next/static");
      },
    );
    await accept(
      "backend unavailable returns sanitized 503; malformed contact id still rejects before DB lookup",
      async () => {
        await app.stop();
        app = undefined;
        local.env.DATABASE_URL = "invalid-local-test-configuration";
        app = await startApp(local);
        assert.equal(
          await api(a, "/api/profile", "GET", undefined, 503),
          "PROFILE_UNAVAILABLE",
        );
        assert.equal(
          await api(
            a,
            "/api/emergency-contacts/not-a-uuid",
            "PATCH",
            { schemaVersion: "1.0", name: "Valid" },
            400,
          ),
          "INVALID_REQUEST",
        );
        assert.equal(
          await api(
            a,
            "/api/emergency-contacts/" + c2.id,
            "PATCH",
            { schemaVersion: "1.0", name: "Valid" },
            503,
          ),
          "PROFILE_UNAVAILABLE",
        );
      },
    );
    await accept(
      "clean fixture Auth user deletion exercises existing FK cascades only",
      async () => {
        // This is fixture teardown through the Local admin, never a product API.
        for (const user of users)
          ok(await local.admin.auth.admin.deleteUser(user.id));
        for (const user of users)
          assert.deepEqual(await counts(user), {
            profiles: 0,
            settings: 0,
            contacts: 0,
          });
      },
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.stop();
    if (trigger) {
      for (const table of [
        "profiles",
        "profile_settings",
        "emergency_contacts",
      ])
        await local.db.unsafe(
          `drop trigger if exists task050_role_guard on public.${table}`,
        );
      await local.db`drop function if exists public.task050_assert_request_role()`;
    }
    for (const user of users) await local.admin.auth.admin.deleteUser(user.id);
    const remaining = Number(
      (await local.db`select count(*) from auth.users`)[0].count,
    );
    assert.equal(remaining, 0);
    await local.db.end();
    await mkdir(".artifacts/task050", { recursive: true });
    await writeFile(
      ".artifacts/task050/runtime-summary.json",
      JSON.stringify(
        {
          task: "TASK-050-B",
          completed,
          metrics,
          fixtureUsersRemaining: remaining,
          localOnly: true,
          testTriggersRemoved: true,
        },
        null,
        2,
      ) + "\n",
    );
  }
});
