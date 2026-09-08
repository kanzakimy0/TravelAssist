// Explicit: node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-018-authentication.runtime.mjs
// Requires a built app and verified zero-data TravelAssist Local stack. No remote input.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../src/lib/supabase/server.ts";
import { requireAuthUser } from "../src/lib/auth/server-user.ts";
import {
  localRuntime,
  startApp,
  CookieJar,
  authRequest,
  followMail,
  latestMail,
} from "./task-018-local-helpers.mjs";

test("TASK-018 actual Local Auth + production Next HTTP + real-session RLS", async (t) => {
  const local = localRuntime();
  const apps = [];
  const prefix = "task018-" + randomUUID();
  const emails = ["a", "b"].map((v) => prefix + "-" + v + "@example.test");
  const phone = "+12025550180";
  const fixtures = new Set();
  let verifiedEmpty = false;
  const password = "Task018-" + randomUUID();
  const jars = [new CookieJar(), new CookieJar()];
  const users = [];
  const count = async () =>
    Number((await local.db`select count(*) from auth.users`)[0].count);
  const client = (jar) =>
    createServerSupabaseClient(
      { getAll: () => jar.getAll(), setAll: (values) => jar.setAll(values) },
      false,
    );
  try {
    assert.equal(
      await count(),
      0,
      "Acceptance refuses a nonempty/valuable Auth database",
    );
    for (const table of ["profiles", "profile_settings", "emergency_contacts"])
      assert.equal(
        Number(
          (await local.db.unsafe("select count(*) from public." + table))[0]
            .count,
        ),
        0,
      );
    process.env.NEXT_PUBLIC_SUPABASE_URL = local.api;
    verifiedEmpty = true;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local.key;
    process.env.AUTH_SITE_URL = "http://127.0.0.1:3000";
    await t.test(
      "Missing runtime config fails safely; ordinary pages still render",
      async () => {
        const app = await startApp(local, false);
        apps.push(app);
        const response = await authRequest(app, new CookieJar(), "session");
        assert.equal(response.response.status, 503);
        assert.equal(response.body.code, "configuration_error");
        assert.equal((await fetch(app.origin + "/")).status, 200);
        await app.stop();
      },
    );
    const app = await startApp(local);
    apps.push(app);

    await t.test(
      "Technical POST rejects cross-origin, missing Origin, malformed and oversized JSON",
      async () => {
        const jar = new CookieJar();
        assert.equal(
          (
            await authRequest(
              app,
              jar,
              "signin",
              {},
              { origin: "https://evil.test" },
            )
          ).response.status,
          403,
        );
        assert.equal(
          (await authRequest(app, jar, "signin", {}, { origin: "" })).response
            .status,
          403,
        );
        assert.equal(
          (await authRequest(app, jar, "signin", [], {})).body.code,
          "invalid_input",
        );
        assert.equal(
          (
            await authRequest(app, jar, "signin", {
              oversized: "x".repeat(9000),
            })
          ).body.code,
          "invalid_input",
        );
        assert.equal(
          (await authRequest(app, jar, "password", { password })).body.code,
          "unauthenticated",
        );
      },
    );

    for (let i = 0; i < 2; i++)
      await t.test(
        "Explicit signup and real Local email confirmation for user " +
          (i ? "B" : "A"),
        async () => {
          const weak = await authRequest(app, jars[i], "signup", {
            email: emails[i],
            password: "short1",
          });
          assert.equal(weak.body.code, "weak_password");
          const signup = await authRequest(app, jars[i], "signup", {
            email: emails[i],
            password,
            returnTo: "/planner?intent=save",
          });
          assert.equal(signup.body.data?.state, "verification_required");
          const rows =
            await local.db`select id from auth.users where email=${emails[i]}`;
          assert.equal(rows.length, 1);
          users[i] = rows[0].id;
          fixtures.add(rows[0].id);
          const callback = await followMail(
            local,
            app,
            jars[i],
            emails[i],
            /Confirm|confirmation/i,
          );
          assert.equal(callback.status, 303);
          assert.equal(
            callback.headers.get("location"),
            "/planner?intent=save",
          );
          assert.match(callback.headers.get("cache-control"), /no-store/);
          const session = await authRequest(app, jars[i], "session");
          assert.equal(session.body.data?.userId, users[i]);
          for (const table of [
            "profiles",
            "profile_settings",
            "emergency_contacts",
          ])
            assert.equal(
              Number(
                (
                  await local.db.unsafe("select count(*) from public." + table)
                )[0].count,
              ),
              0,
            );
        },
      );
    assert.equal(users.length, 2, "Both real signup prerequisites completed");

    await t.test(
      "Email/password login succeeds; wrong password has normalized safe error",
      async () => {
        assert.equal(
          (await authRequest(app, jars[0], "signout", {})).body.data?.state,
          "signed_out",
        );
        assert.equal(
          (
            await authRequest(app, jars[0], "signin", {
              email: emails[0],
              password: "WrongPassword018",
            })
          ).body.code,
          "invalid_credentials",
        );
        assert.equal(
          (
            await authRequest(app, jars[0], "signin", {
              email: emails[0],
              password,
            })
          ).body.data?.userId,
          users[0],
        );
      },
    );

    await t.test(
      "Forged cookie user payload cannot impersonate user B; invalid JWT fails closed",
      async () => {
        const forged = new CookieJar(jars[0]);
        const session = forged.session();
        session.user.id = users[1];
        forged.replaceSession(session);
        assert.equal(
          (await authRequest(app, forged, "session")).body.data?.userId,
          users[0],
        );
        assert.equal(
          (await requireAuthUser(client(forged))).data?.userId,
          users[0],
        );
        session.access_token = "not-a-valid-jwt";
        session.expires_at = Math.floor(Date.now() / 1000) + 3600;
        forged.replaceSession(session);
        const result = await authRequest(app, forged, "session");
        assert.equal(result.body.data?.status, "unauthenticated");
      },
    );

    await t.test(
      "Expired cookie triggers real Proxy refresh, rotation, no-store and persistent next request",
      async () => {
        const before = jars[0].session();
        jars[0].replaceSession({ ...before, expires_at: 1 });
        const response = await fetch(app.origin + "/planner", {
          headers: { cookie: jars[0].header() },
        });
        assert.equal(response.status, 200);
        assert.ok(
          response.headers.getSetCookie().length > 0,
          "Proxy emits refreshed cookies",
        );
        for (const cookie of response.headers.getSetCookie()) {
          assert.match(cookie, /path=\//i);
          assert.match(cookie, /samesite=lax/i);
        }
        assert.match(response.headers.get("cache-control"), /no-store/);
        jars[0].absorb(response.headers);
        const after = jars[0].session();
        assert.ok(
          after.refresh_token !== before.refresh_token,
          "Auth rotated the refresh token",
        );
        assert.ok(after.expires_at > Math.floor(Date.now() / 1000));
        assert.equal(
          (await authRequest(app, jars[0], "session")).body.data?.userId,
          users[0],
        );
      },
    );

    await t.test(
      "Real A/B JWTs enforce TASK-016 own CRUD and bilateral cross-user denial on all tables",
      async () => {
        for (let i = 0; i < 2; i++) {
          const sdk = client(jars[i]);
          for (const [table, row] of [
            ["profiles", { id: users[i] }],
            ["profile_settings", { user_id: users[i] }],
            [
              "emergency_contacts",
              {
                user_id: users[i],
                name: "Local test",
                relationship: "friend",
                phone_e164: "+12025550181",
              },
            ],
          ]) {
            const inserted = await sdk.from(table).insert(row).select();
            assert.equal(inserted.error, null);
            assert.equal(inserted.data.length, 1);
          }
        }
        for (let i = 0; i < 2; i++) {
          const sdk = client(jars[i]);
          for (const table of [
            "profiles",
            "profile_settings",
            "emergency_contacts",
          ]) {
            const owner = table === "profiles" ? "id" : "user_id";
            const field =
              table === "profiles"
                ? "display_name"
                : table === "profile_settings"
                  ? "locale"
                  : "name";
            const own = await sdk.from(table).select().eq(owner, users[i]);
            assert.equal(own.error, null);
            assert.equal(own.data.length, 1);
            const cross = await sdk
              .from(table)
              .select()
              .eq(owner, users[1 - i]);
            assert.equal(cross.error, null);
            assert.equal(cross.data.length, 0);
            const updated = await sdk
              .from(table)
              .update({
                [field]: field === "locale" ? "en-US" : "Owner updated",
              })
              .eq(owner, users[i])
              .select();
            assert.equal(updated.error, null);
            assert.equal(updated.data.length, 1);
            const deniedUpdate = await sdk
              .from(table)
              .update({ [field]: field === "locale" ? "ja-JP" : "Forbidden" })
              .eq(owner, users[1 - i])
              .select();
            assert.equal(deniedUpdate.error, null);
            assert.equal(deniedUpdate.data.length, 0);
            const reassign = await sdk
              .from(table)
              .update({ [owner]: users[1 - i] })
              .eq(owner, users[i]);
            assert.ok(reassign.error);
            const insert = await sdk.from(table).insert({
              [owner]: users[1 - i],
              ...(table === "emergency_contacts"
                ? {
                    name: "Denied",
                    relationship: "friend",
                    phone_e164: "+12025550181",
                  }
                : {}),
            });
            assert.ok(insert.error);
            const remove = await sdk
              .from(table)
              .delete()
              .eq(owner, users[1 - i])
              .select();
            if (table === "emergency_contacts") {
              assert.equal(remove.error, null);
              assert.equal(remove.data.length, 0);
            } else assert.ok(remove.error);
          }
        }
        for (let i = 0; i < 2; i++) {
          const sdk = client(jars[i]);
          for (const table of ["profiles", "profile_settings"])
            assert.ok(
              (
                await sdk
                  .from(table)
                  .delete()
                  .eq(table === "profiles" ? "id" : "user_id", users[i])
              ).error,
            );
          const deleted = await sdk
            .from("emergency_contacts")
            .delete()
            .eq("user_id", users[i])
            .select();
          assert.equal(deleted.error, null);
          assert.equal(deleted.data.length, 1);
        }
      },
    );

    await t.test(
      "Anonymous public-key client cannot SELECT/INSERT/UPDATE/DELETE private tables",
      async () => {
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        for (const table of [
          "profiles",
          "profile_settings",
          "emergency_contacts",
        ]) {
          const owner = table === "profiles" ? "id" : "user_id";
          for (const query of [
            anon.from(table).select(),
            anon.from(table).insert({ [owner]: users[0] }),
            anon
              .from(table)
              .update({ [owner]: users[0] })
              .eq(owner, users[0]),
            anon.from(table).delete().eq(owner, users[0]),
          ])
            assert.ok(
              (await query).error,
              table + " anonymous operation denied",
            );
        }
      },
    );

    await t.test(
      "Unregistered email OTP explicitly offers signup and leaves Auth user count unchanged",
      async () => {
        const before = await count();
        const result = await authRequest(app, new CookieJar(), "email-otp", {
          email: prefix + "-missing@example.test",
        });
        assert.equal(result.body.code, "email_not_registered");
        assert.equal(await count(), before);
      },
    );

    await t.test(
      "Registered email OTP signs in using a real Local capture code",
      async () => {
        const jar = new CookieJar();
        assert.equal(
          (await authRequest(app, jar, "email-otp", { email: emails[0] })).body
            .data?.state,
          "otp_sent",
        );
        const mail = await latestMail(local, emails[0], /Local sign-in code/i);
        const code = (mail.Text ?? mail.HTML).match(/\b[0-9]{6}\b/)?.[0];
        assert.ok(code, "Local email contains a six-digit OTP");
        assert.equal(
          (
            await authRequest(app, jar, "verify-email-otp", {
              email: emails[0],
              token: "000000",
            })
          ).body.code,
          "invalid_otp",
        );
        assert.equal(
          (
            await authRequest(app, jar, "verify-email-otp", {
              email: emails[0],
              token: code,
            })
          ).body.data?.userId,
          users[0],
        );
        await authRequest(app, jar, "signout", {});
      },
    );

    await t.test(
      "Fictional phone OTP creates one minimal user; repeat login never duplicates it",
      async () => {
        const before = await count();
        const jar = new CookieJar();
        assert.equal(
          (await authRequest(app, jar, "phone-otp", { phone })).body.data
            ?.state,
          "otp_sent",
        );
        const rows =
          await local.db`select id from auth.users where phone=${phone.slice(1)}`;
        for (const row of rows) fixtures.add(row.id);
        const signed = await authRequest(app, jar, "verify-phone-otp", {
          phone,
          token: "180180",
        });
        assert.equal(signed.body.data?.state, "signed_in");
        const phoneId = signed.body.data.userId;
        fixtures.add(phoneId);
        assert.equal(await count(), before + 1);
        assert.equal(
          (
            await local.db`select count(*) from public.profiles where id=${phoneId}`
          )[0].count,
          "0",
        );
        await authRequest(app, jar, "signout", {});
        await delay(5100);
        assert.equal(
          (await authRequest(app, jar, "phone-otp", { phone })).body.data
            ?.state,
          "otp_sent",
        );
        assert.equal(
          (
            await authRequest(app, jar, "verify-phone-otp", {
              phone,
              token: "180180",
            })
          ).body.data?.userId,
          phoneId,
        );
        assert.equal(await count(), before + 1);
      },
    );

    await t.test(
      "Recovery email -> real PKCE callback -> validated update -> new password login",
      async () => {
        // Respect the existing Local 1s per-user mail limit after email OTP.
        await delay(1100);
        const jar = new CookieJar();
        const requested = await authRequest(app, jar, "recovery", {
          email: emails[0],
          returnTo: "/personal-center",
        });
        assert.equal(requested.body.data?.state, "recovery_sent");
        const response = await followMail(
          local,
          app,
          jar,
          emails[0],
          /Reset|Recovery/i,
        );
        assert.equal(response.status, 303);
        assert.equal(response.headers.get("location"), "/personal-center");
        assert.equal(
          (await authRequest(app, jar, "session")).body.data?.userId,
          users[0],
        );
        assert.equal(
          (await authRequest(app, jar, "password", { password: "lettersOnly" }))
            .body.code,
          "weak_password",
        );
        const replacement = "Recovered018-" + randomUUID();
        assert.equal(
          (await authRequest(app, jar, "password", { password: replacement }))
            .body.data?.state,
          "password_updated",
        );
        await authRequest(app, jar, "signout", {});
        assert.equal(
          (
            await authRequest(app, jar, "signin", {
              email: emails[0],
              password: replacement,
            })
          ).body.data?.userId,
          users[0],
        );
        assert.equal(
          (
            await authRequest(app, new CookieJar(), "signin", {
              email: emails[0],
              password,
            })
          ).body.code,
          "invalid_credentials",
        );
      },
    );

    await t.test(
      "Google/Apple real SDK PKCE initiation and hostile/missing callback contract",
      async () => {
        for (const provider of ["google", "apple"]) {
          const jar = new CookieJar();
          const result = await authRequest(app, jar, "oauth", {
            provider,
            returnTo: "/planner?intent=save",
          });
          assert.equal(result.body.data?.state, "oauth_redirect");
          const url = new URL(result.body.data.url);
          assert.equal(url.origin, local.api);
          assert.equal(url.searchParams.get("provider"), provider);
          assert.equal(
            url.searchParams.get("redirect_to"),
            app.origin + "/auth/callback",
          );
          assert.equal(
            url.searchParams.get("code_challenge_method")?.toLowerCase(),
            "s256",
          );
          assert.ok(url.searchParams.get("code_challenge"));
          assert.equal(
            jar.values.get("ta-auth-return-to"),
            "/planner?intent=save",
          );
          assert.ok(
            jar.getAll().some(({ name }) => name.includes("code-verifier")),
          );
          jar.values.set("ta-auth-return-to", "//evil.test");
          const response = await fetch(
            app.origin +
              "/auth/callback?code=invalid-unit-code&returnTo=https://evil.test",
            { headers: { cookie: jar.header() }, redirect: "manual" },
          );
          assert.equal(response.status, 401);
          assert.equal(response.headers.get("location"), null);
        }
        const denied = await fetch(
          app.origin +
            "/auth/callback?error=access_denied&error_description=do-not-echo",
          { redirect: "manual" },
        );
        assert.equal(denied.status, 401);
        assert.doesNotMatch(await denied.text(), /do-not-echo/);
      },
    );

    await t.test(
      "Current-session logout clears SDK cookies and revokes refresh without logging out another session",
      async () => {
        const first = new CookieJar();
        const second = new CookieJar();
        for (const jar of [first, second])
          assert.equal(
            (
              await authRequest(app, jar, "signin", {
                email: emails[1],
                password,
              })
            ).body.data?.userId,
            users[1],
          );
        const previous = first.session();
        assert.equal(
          (await authRequest(app, first, "signout", {})).body.data?.state,
          "signed_out",
        );
        assert.equal(first.authEntries().length, 0);
        assert.equal(
          (await authRequest(app, first, "session")).body.data?.status,
          "unauthenticated",
        );
        assert.equal(
          (await authRequest(app, second, "session")).body.data?.userId,
          users[1],
        );
        const signedOutClient = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        assert.ok(
          (
            await signedOutClient.auth.refreshSession({
              refresh_token: previous.refresh_token,
            })
          ).error,
          "Revoked session cannot refresh",
        );
      },
    );
  } finally {
    try {
      for (const app of apps) await app.stop();
      // Only identities created by this run; never reset or sweep another user's DB.
      if (verifiedEmpty) {
        const own =
          await local.db`select id from auth.users where email = any(${emails})`;
        for (const row of own) fixtures.add(row.id);
        for (const id of fixtures) {
          const result = await local.admin.auth.admin.deleteUser(id);
          assert.ok(!result.error, "Controlled test-identity cleanup succeeds");
        }
        assert.equal(
          await count(),
          0,
          "All task-owned temporary Auth users removed",
        );
        for (const table of [
          "profiles",
          "profile_settings",
          "emergency_contacts",
        ])
          assert.equal(
            Number(
              (await local.db.unsafe("select count(*) from public." + table))[0]
                .count,
            ),
            0,
          );
      }
    } finally {
      await local.db.end({ timeout: 5 });
    }
  }
});
