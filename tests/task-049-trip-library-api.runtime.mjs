import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createClient } from "@supabase/supabase-js";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp, CookieJar, authRequest } from "./task-018-local-helpers.mjs";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import {
  patch,
  preference,
  planAtBytes,
  forbiddenPartyKeys,
} from "./task-048-trip-fixtures.mjs";
const require = createRequire(import.meta.url);
const createInput = () => ({
  schemaVersion: "1.0",
  creationKey: randomUUID(),
  draftFacts: fullDraftFixture(),
  wizardProgress: progressFixture(),
  partySelection: { includesOwner: true, companionIds: [] },
});
const putInput = (input) => ({
  draftFacts: structuredClone(input.draftFacts),
  wizardProgress: structuredClone(input.wizardProgress),
  preferenceOverridePatch: input.preferenceOverridePatch ?? patch(),
  partySelection: structuredClone(input.partySelection),
});
const plan = () => {
  const p = fullSnapshotFixture();
  p.trip.id = "canonical-trip-" + randomUUID();
  return p;
};
const comp = (name = "Synthetic companion") => ({
  displayName: name,
  birthDate: "2010-04-11",
  ageGroupFallback: null,
  relationshipCode: "family",
  relationshipLabel: "private label",
  genderCode: "female",
  avatarPath: "local/avatar.png",
  travelProfile: {
    schemaVersion: "1.0",
    mobilityNeeds: [],
    diningNeeds: [],
    activityInterests: [],
  },
});
const ok = (result) => {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local fixture request succeeds; raw details withheld",
  );
  return result.data;
};
test("TASK-049 real Local Auth/DB/HTTP/CAS/browser contract acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    users = [],
    completed = [],
    metrics = {};
  let app, browser;
  const accept = async (name, run) =>
    t.test(name, async () => {
      await run();
      completed.push(name);
    });
  const artifact = ".artifacts/task049";
  await mkdir(artifact, { recursive: true });
  try {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "requires clean Local Auth DB",
    );
    local.env.DATABASE_URL = local.databaseUrl;
    for (const key of Object.keys(local.env))
      if (/SUPABASE.*(?:SERVICE|SECRET)|SERVICE.*SUPABASE/.test(key))
        delete local.env[key];
    app = await startApp(local);
    for (let i = 0; i < 2; i++) {
      const email = "task049-" + randomUUID() + "@example.test",
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
      path = "",
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
      const response = await fetch(
        app.origin +
          (path.startsWith("/api/") ? path : "/api/trip-library" + path),
        {
          method,
          headers,
          body:
            body === undefined
              ? undefined
              : options.raw
                ? body
                : JSON.stringify(body),
        },
      );
      if (user && options.cookie) user.jar.absorb(response.headers);
      const result = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        status,
        method +
          " " +
          path.replace(/[0-9a-f-]{36}/g, "<record>") +
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
          /postgres|select |update |owner_user_id|sb_secret_|access_token|birth_date/i,
        );
        return result.error.code;
      }
      if (status === 204) {
        assert.equal(result, null);
        return null;
      }
      assert.equal(result.ok, true);
      if (!path.startsWith("/api/") && result.data?.id) {
        assert.equal(
          response.headers.get("etag"),
          '"' + result.data.storageRevision + '"',
        );
        assert.equal(Object.hasOwn(result.data, "ownerUserId"), false);
        assert.equal(Object.hasOwn(result.data, "creationIntentHash"), false);
      }
      return result.data;
    }
    const make = async (user, input = createInput(), cookie = false) =>
      api(user, "", "POST", input, undefined, 201, { cookie });
    const pref = async (user, expected, set) =>
      api(user, "/api/preferences", "PATCH", {
        expectedRevision: expected,
        patch: patch(set),
      });
    let primary, original, secondary, c1, c2, bComp, history, copied;
    await accept(
      "Bearer/Cookie verified; anonymous and malformed/invalid Bearer fail without Cookie fallback",
      async () => {
        assert.equal(
          await api(null, "", "GET", undefined, undefined, 401),
          "AUTH_REQUIRED",
        );
        for (const value of [
          "Basic abc",
          "Bearer invalid",
          "Bearer ",
          "Bearer invalid invalid",
        ])
          assert.equal(
            await api(a, "", "GET", undefined, undefined, 401, {
              cookie: true,
              headers: { Authorization: value },
            }),
            "AUTH_REQUIRED",
          );
        assert.deepEqual(
          (await api(a, "", "GET", undefined, undefined, 200, { cookie: true }))
            .items,
          [],
        );
      },
    );
    await accept("Cookie mutations require exact trusted Origin", async () => {
      for (const origin of ["", "https://example.invalid", app.origin + "/"])
        assert.equal(
          await api(a, "", "POST", createInput(), undefined, 403, {
            cookie: true,
            headers: { Origin: origin },
          }),
          "FORBIDDEN",
        );
    });
    await accept(
      "server captures current Preference and ordered owner Companions with minimized privacy",
      async () => {
        await pref(a, 0, { "mobility.noBus": true });
        c1 = await api(
          a,
          "/api/companions",
          "POST",
          comp("First"),
          undefined,
          201,
        );
        c2 = await api(
          a,
          "/api/companions",
          "POST",
          { ...comp("Second"), birthDate: null, ageGroupFallback: "senior" },
          undefined,
          201,
        );
        bComp = await api(
          b,
          "/api/companions",
          "POST",
          comp("Other owner"),
          undefined,
          201,
        );
        original = createInput();
        original.partySelection.companionIds = [c2.id, c1.id];
        original.preferenceOverridePatch = patch({ "mobility.noBus": false });
        primary = await make(a, original, true);
        assert.equal(primary.preferenceSourceRevision, 1);
        assert.deepEqual(
          primary.preferenceSnapshot,
          preference({ "mobility.noBus": true }),
        );
        assert.deepEqual(
          primary.effectivePreference,
          preference({ "mobility.noBus": false }),
        );
        assert.deepEqual(
          primary.partySnapshot.members.map((x) => x.sourceCompanionId),
          [c2.id, c1.id],
        );
        assert.deepEqual(
          primary.partySnapshot.members.map((x) => x.planningAgeGroup),
          ["senior", "child"],
        );
        assert.equal(primary.partySnapshot.ageReferenceDate, "2027-04-10");
        for (const member of primary.partySnapshot.members) {
          assert.deepEqual(Object.keys(member).sort(), [
            "displayName",
            "planningAgeGroup",
            "sourceCompanionId",
            "travelProfile",
          ]);
          for (const field of forbiddenPartyKeys)
            assert.equal(Object.hasOwn(member, field), false);
        }
      },
    );
    await accept(
      "Bearer create with missing Preference uses empty revision zero and distinct B identity",
      async () => {
        secondary = await make(b);
        assert.deepEqual(secondary.preferenceSnapshot, preference());
        assert.equal(secondary.preferenceSourceRevision, 0);
        assert.equal(secondary.storageRevision, 1);
        assert.equal(secondary.canonicalTripId, null);
        assert.equal(secondary.planSnapshot, null);
      },
    );
    await accept(
      "strict client owner/snapshot fields rejected before write",
      async () => {
        const before = (await api(a)).items.length;
        for (const key of [
          "ownerUserId",
          "owner_user_id",
          "id",
          "preferenceSnapshot",
          "preferenceSourceRevision",
          "partySnapshot",
          "planSnapshot",
          "canonicalTripId",
          "storageRevision",
          "frozenAt",
        ])
          await api(
            a,
            "",
            "POST",
            { ...createInput(), [key]: null },
            undefined,
            400,
          );
        assert.equal((await api(a)).items.length, before);
      },
    );
    await accept(
      "canonical draft/progress and selection errors have no partial insert",
      async () => {
        const input = createInput();
        input.draftFacts.selectedDay = 1;
        assert.equal(
          await api(a, "", "POST", input, undefined, 400),
          "INVALID_TRIP_DRAFT_INPUT",
        );
        for (const id of [bComp.id, randomUUID()]) {
          const body = createInput();
          body.partySelection.companionIds = [id];
          assert.equal(
            await api(a, "", "POST", body, undefined, 409),
            "COMPANION_SELECTION_INVALID",
          );
        }
        const dup = createInput();
        dup.partySelection.companionIds = [c1.id, c1.id];
        await api(a, "", "POST", dup, undefined, 400);
      },
    );
    await accept(
      "create idempotency compatible retries and incompatible key conflict, also concurrent first create",
      async () => {
        assert.equal((await api(a, "", "POST", original)).id, primary.id);
        const changed = structuredClone(original);
        changed.draftFacts.title = "incompatible";
        assert.equal(
          await api(a, "", "POST", changed, undefined, 409),
          "CREATION_KEY_CONFLICT",
        );
        const body = createInput();
        const results = await Promise.all(
          [0, 1].map(async () => {
            const r = await fetch(app.origin + "/api/trip-library", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + a.token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
            return { status: r.status, data: (await r.json()).data };
          }),
        );
        assert.deepEqual(results.map((x) => x.status).sort(), [200, 201]);
        assert.equal(results[0].data.id, results[1].data.id);
        assert.equal(results[0].data.storageRevision, 1);
      },
    );
    await accept(
      "owner-scoped creation key may independently exist for another owner",
      async () => {
        const body = structuredClone(original);
        body.partySelection.companionIds = [];
        const owned = await make(b, body);
        assert.notEqual(owned.id, primary.id);
      },
    );
    await accept(
      "owner list isolation and identical 404 for cross-owner or missing id on every operation",
      async () => {
        assert.ok((await api(a)).items.every((x) => x.id !== secondary.id));
        for (const id of [secondary.id, randomUUID()]) {
          assert.equal(
            await api(a, "/" + id, "GET", undefined, undefined, 404),
            "TRIP_LIBRARY_NOT_FOUND",
          );
          for (const [method, tail, body] of [
            ["PUT", "", putInput(original)],
            ["DELETE", "", undefined],
            ["POST", "/save", { schemaVersion: "1.0", planSnapshot: plan() }],
            ["POST", "/history", undefined],
            [
              "POST",
              "/copy",
              { schemaVersion: "1.0", creationKey: randomUUID() },
            ],
          ])
            assert.equal(
              await api(a, "/" + id + tail, method, body, 1, 404),
              "TRIP_LIBRARY_NOT_FOUND",
            );
        }
      },
    );
    await accept(
      "GET exact resource/ETag and query defaults remain isolated from older APIs",
      async () => {
        assert.deepEqual(await api(a, "/" + primary.id), primary);
        for (const path of [
          "?limit=0",
          "?limit=51",
          "?state=upcoming",
          "?state=draft&state=saved",
          "?owner=" + a.id,
          "?cursor=abc=",
          "/" + primary.id + "?limit=1",
        ])
          await api(a, path, "GET", undefined, undefined, 400);
        await api(
          a,
          "/api/preferences?state=all",
          "GET",
          undefined,
          undefined,
          400,
        );
        await api(
          a,
          "/api/companions?limit=1",
          "GET",
          undefined,
          undefined,
          400,
        );
      },
    );
    await accept(
      "Draft update snapshots current selected Companions but never replaces creation Preference",
      async () => {
        await pref(a, 1, { "mobility.noBus": false, "mobility.noFerry": true });
        c1 = await api(
          a,
          "/api/companions/" + c1.id,
          "PUT",
          comp("Changed source"),
          c1.revision,
        );
        const update = putInput(original);
        update.draftFacts.title = "Edited Draft";
        update.preferenceOverridePatch = patch({}, ["mobility.noBus"]);
        primary = await api(
          a,
          "/" + primary.id,
          "PUT",
          update,
          primary.storageRevision,
        );
        assert.equal(primary.storageRevision, 2);
        assert.equal(primary.preferenceSourceRevision, 1);
        assert.deepEqual(
          primary.preferenceSnapshot,
          preference({ "mobility.noBus": true }),
        );
        assert.deepEqual(primary.effectivePreference, preference());
        assert.equal(
          primary.partySnapshot.members[1].displayName,
          "Changed source",
        );
        assert.deepEqual(
          (await api(a, "/api/preferences")).preference,
          preference({ "mobility.noBus": false, "mobility.noFerry": true }),
        );
      },
    );
    await accept(
      "original create retry remains idempotent after draft edit and source Preference/Companion changes",
      async () => {
        const retry = await api(a, "", "POST", original);
        assert.equal(retry.id, primary.id);
        assert.equal(retry.storageRevision, 2);
        assert.equal(retry.draftFacts.title, "Edited Draft");
      },
    );
    await accept(
      "all non-create writes require exact If-Match; no weak, wildcard, malformed or absent tags",
      async () => {
        for (const header of [
          "",
          "1",
          'W/"2"',
          "*",
          '"2", "3"',
          '"0"',
          '"2147483648"',
        ])
          await api(
            a,
            "/" + primary.id,
            "PUT",
            putInput(original),
            undefined,
            400,
            { headers: { "If-Match": header } },
          );
        for (const [method, tail, body] of [
          ["DELETE", "", undefined],
          ["POST", "/save", { schemaVersion: "1.0", planSnapshot: plan() }],
          ["POST", "/history", undefined],
          [
            "POST",
            "/copy",
            { schemaVersion: "1.0", creationKey: randomUUID() },
          ],
        ])
          await api(a, "/" + primary.id + tail, method, body, undefined, 400);
        assert.equal((await api(a, "/" + primary.id)).storageRevision, 2);
      },
    );
    await accept(
      "two concurrent Draft CAS updates produce exactly one success and one 409",
      async () => {
        const outcomes = await Promise.all(
          ["First racer", "Second racer"].map(async (title) => {
            const input = putInput(original);
            input.draftFacts.title = title;
            const r = await fetch(
              app.origin + "/api/trip-library/" + primary.id,
              {
                method: "PUT",
                headers: {
                  Authorization: "Bearer " + a.token,
                  "Content-Type": "application/json",
                  "If-Match": '"2"',
                },
                body: JSON.stringify(input),
              },
            );
            return { status: r.status, body: await r.json() };
          }),
        );
        assert.deepEqual(outcomes.map((x) => x.status).sort(), [200, 409]);
        assert.equal(
          outcomes.find((x) => x.status === 409).body.error.code,
          "STALE_TRIP_LIBRARY_REVISION",
        );
        primary = outcomes.find((x) => x.status === 200).body.data;
        assert.equal(primary.storageRevision, 3);
        assert.deepEqual(await api(a, "/" + primary.id), primary);
      },
    );
    let savedPlan;
    await accept(
      "Draft to Saved keeps canonical non-UUID string ID and independent revisions",
      async () => {
        savedPlan = plan();
        primary = await api(
          a,
          "/" + primary.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: savedPlan },
          3,
        );
        assert.equal(primary.libraryState, "saved");
        assert.equal(primary.canonicalTripId, savedPlan.trip.id);
        assert.equal(primary.storageRevision, 4);
        assert.deepEqual(primary.planSnapshot, savedPlan);
        assert.notEqual(primary.id, primary.canonicalTripId);
      },
    );
    await accept(
      "Saved refresh uses CAS; established canonical ID cannot change",
      async () => {
        savedPlan.trip.revision += 10;
        primary = await api(
          a,
          "/" + primary.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: savedPlan },
          4,
        );
        assert.equal(primary.storageRevision, 5);
        assert.equal(
          primary.planSnapshot.trip.revision,
          savedPlan.trip.revision,
        );
        await api(
          a,
          "/" + primary.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: savedPlan },
          4,
          409,
        );
        assert.equal(
          await api(
            a,
            "/" + primary.id + "/save",
            "POST",
            { schemaVersion: "1.0", planSnapshot: plan() },
            5,
            409,
          ),
          "TRIP_LIBRARY_STATE_CONFLICT",
        );
        await api(a, "/" + primary.id, "PUT", putInput(original), 5, 409);
        await api(a, "/" + primary.id, "DELETE", undefined, 5, 409);
      },
    );
    await accept(
      "owner canonical ID uniqueness prevents a second aggregate claiming the same A trip",
      async () => {
        const draft = await make(a);
        assert.equal(
          await api(
            a,
            "/" + draft.id + "/save",
            "POST",
            { schemaVersion: "1.0", planSnapshot: savedPlan },
            1,
            409,
          ),
          "TRIP_LIBRARY_STATE_CONFLICT",
        );
        assert.equal((await api(a, "/" + draft.id)).libraryState, "draft");
      },
    );
    await accept(
      "summary excludes multi-MiB plans and all invented reservation/favorite fields",
      async () => {
        const page = await api(a, "?state=saved&limit=50");
        assert.equal(page.items.length, 1);
        const summary = page.items[0];
        assert.equal(summary.id, primary.id);
        assert.equal(summary.title, savedPlan.trip.title);
        assert.equal(summary.participantCount, 4);
        for (const key of [
          "planSnapshot",
          "draftFacts",
          "partySnapshot",
          "preferenceSnapshot",
          "reservation",
          "reservationCount",
          "favorites",
          "favorite",
          "cover",
          "payment",
        ])
          assert.equal(Object.hasOwn(summary, key), false);
        assert.ok(Buffer.byteLength(JSON.stringify(page)) < 2048);
      },
    );
    await accept(
      "valid exact 4MiB JSONB plan succeeds over real HTTP with ETag",
      async () => {
        const draft = await make(a);
        const large = planAtBytes(4194304);
        const body = { schemaVersion: "1.0", planSnapshot: large };
        metrics.nearLimitHttpBytes = Buffer.byteLength(JSON.stringify(body));
        const stored = await api(a, "/" + draft.id + "/save", "POST", body, 1);
        assert.equal(stored.storageRevision, 2);
        const [row] =
          await local.db`select octet_length(plan_snapshot::text) as bytes from public.trip_library_records where owner_user_id=${a.id} and id=${draft.id}`;
        assert.equal(row.bytes, 4194304);
        metrics.nearLimitJsonbBytes = row.bytes;
        assert.deepEqual((await api(a, "/" + draft.id)).planSnapshot, large);
      },
    );
    await accept(
      "over storage/HTTP caps and semantic-invalid payloads leave full aggregate unchanged",
      async () => {
        const before = await api(a, "/" + primary.id);
        const tooLarge = planAtBytes(4194305);
        await api(
          a,
          "/" + primary.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: tooLarge },
          5,
          413,
        );
        const overHttp = JSON.stringify({
          schemaVersion: "1.0",
          planSnapshot: { padding: "x".repeat(4608 * 1024) },
        });
        await api(a, "/" + primary.id + "/save", "POST", overHttp, 5, 413, {
          raw: true,
        });
        const invalid = structuredClone(savedPlan);
        invalid.trip.activePlanId = "missing";
        assert.equal(
          await api(
            a,
            "/" + primary.id + "/save",
            "POST",
            { schemaVersion: "1.0", planSnapshot: invalid },
            5,
            400,
          ),
          "INVALID_TRIP_PLAN_INPUT",
        );
        await api(
          a,
          "",
          "POST",
          JSON.stringify({ padding: "x".repeat(512 * 1024) }),
          undefined,
          413,
          { raw: true },
        );
        assert.deepEqual(await api(a, "/" + primary.id), before);
      },
    );
    await accept(
      "history/delete require empty body and invalid transitions do not mutate",
      async () => {
        await api(a, "/" + primary.id + "/history", "POST", {}, 5, 400);
        await api(b, "/" + secondary.id, "DELETE", {}, 1, 400);
        await api(
          b,
          "/" + secondary.id + "/history",
          "POST",
          undefined,
          1,
          409,
        );
        await api(
          b,
          "/" + secondary.id + "/copy",
          "POST",
          { schemaVersion: "1.0", creationKey: randomUUID() },
          1,
          409,
        );
      },
    );
    await accept(
      "Saved to History freezes at DB-owned timestamp, no date-driven archival",
      async () => {
        const [before] = await local.db`select clock_timestamp() as now`;
        history = await api(
          a,
          "/" + primary.id + "/history",
          "POST",
          undefined,
          5,
        );
        const [after] = await local.db`select clock_timestamp() as now`;
        assert.equal(history.libraryState, "history");
        assert.equal(history.storageRevision, 6);
        assert.equal(history.updatedAt, history.frozenAt);
        assert.ok(
          Date.parse(history.frozenAt) >= new Date(before.now).getTime(),
        );
        assert.ok(
          Date.parse(history.frozenAt) <= new Date(after.now).getTime(),
        );
        assert.deepEqual(history.planSnapshot, savedPlan);
      },
    );
    await accept(
      "History rejects every API mutation and direct privileged no-op update",
      async () => {
        for (const [method, tail, body] of [
          ["PUT", "", putInput(original)],
          ["DELETE", "", undefined],
          ["POST", "/save", { schemaVersion: "1.0", planSnapshot: savedPlan }],
          ["POST", "/history", undefined],
        ])
          assert.equal(
            await api(a, "/" + history.id + tail, method, body, 6, 409),
            "TRIP_LIBRARY_STATE_CONFLICT",
          );
        const result = await local.admin
          .from("trip_library_records")
          .update({ storage_revision: 7 })
          .eq("owner_user_id", a.id)
          .eq("id", history.id);
        assert.equal(result.error?.code, "55000");
        assert.deepEqual(await api(a, "/" + history.id), history);
      },
    );
    await accept(
      "source Companion deletion and long-term changes never rewrite History or create retry",
      async () => {
        await api(
          a,
          "/api/companions/" + c1.id,
          "DELETE",
          undefined,
          c1.revision,
          204,
        );
        await pref(a, 2, { "mobility.noFerry": false });
        assert.deepEqual(await api(a, "/" + history.id), history);
        const retry = await api(a, "", "POST", original);
        assert.equal(retry.id, history.id);
        assert.equal(retry.storageRevision, 6);
      },
    );
    let copyKey;
    await accept(
      "History copy creates new draft identity and current Preference, preserving original context",
      async () => {
        copyKey = randomUUID();
        copied = await api(
          a,
          "/" + history.id + "/copy",
          "POST",
          { schemaVersion: "1.0", creationKey: copyKey },
          6,
          201,
        );
        assert.notEqual(copied.id, history.id);
        assert.equal(copied.creationKey, copyKey);
        assert.equal(copied.libraryState, "draft");
        assert.equal(copied.storageRevision, 1);
        assert.equal(copied.planSnapshot, null);
        assert.equal(copied.canonicalTripId, null);
        assert.equal(copied.frozenAt, null);
        assert.deepEqual(copied.draftFacts, history.draftFacts);
        assert.deepEqual(copied.wizardProgress, history.wizardProgress);
        assert.deepEqual(copied.partySnapshot, history.partySnapshot);
        assert.equal(copied.preferenceSourceRevision, 3);
        assert.deepEqual(
          copied.preferenceSnapshot,
          preference({ "mobility.noBus": false, "mobility.noFerry": false }),
        );
        assert.deepEqual(copied.preferenceOverridePatch, patch());
        assert.deepEqual(await api(a, "/" + history.id), history);
      },
    );
    await accept(
      "copy retries ignore subsequent Preference edits, conflict with create intent or wrong source",
      async () => {
        await pref(a, 3, { "mobility.noBus": true });
        const retry = await api(
          a,
          "/" + history.id + "/copy",
          "POST",
          { schemaVersion: "1.0", creationKey: copyKey },
          6,
        );
        assert.deepEqual(retry, copied);
        const input = createInput();
        input.creationKey = copyKey;
        await api(a, "", "POST", input, undefined, 409);
        await api(
          a,
          "/" + history.id + "/copy",
          "POST",
          { schemaVersion: "1.0", creationKey: history.creationKey },
          6,
          409,
        );
        const fresh = await make(a),
          p = plan();
        await api(
          a,
          "/" + fresh.id + "/save",
          "POST",
          { schemaVersion: "1.0", planSnapshot: p },
          1,
        );
        await api(a, "/" + fresh.id + "/history", "POST", undefined, 2);
        assert.equal(
          await api(
            a,
            "/" + fresh.id + "/copy",
            "POST",
            { schemaVersion: "1.0", creationKey: copyKey },
            3,
            409,
          ),
          "CREATION_KEY_CONFLICT",
        );
      },
    );
    await accept(
      "concurrent copy with one key returns one new identity and existing retry",
      async () => {
        const key = randomUUID();
        const outcomes = await Promise.all(
          [0, 1].map(async () => {
            const r = await fetch(
              app.origin + "/api/trip-library/" + history.id + "/copy",
              {
                method: "POST",
                headers: {
                  Authorization: "Bearer " + a.token,
                  "Content-Type": "application/json",
                  "If-Match": '"6"',
                },
                body: JSON.stringify({
                  schemaVersion: "1.0",
                  creationKey: key,
                }),
              },
            );
            return { status: r.status, data: (await r.json()).data };
          }),
        );
        assert.deepEqual(outcomes.map((x) => x.status).sort(), [200, 201]);
        assert.equal(outcomes[0].data.id, outcomes[1].data.id);
      },
    );
    await accept(
      "stable owner keyset pagination preserves microsecond ordering without duplicates/omissions",
      async () => {
        for (let i = 0; i < 7; i++) await make(a);
        const expected =
          await local.db`select id from public.trip_library_records where owner_user_id=${a.id} order by updated_at desc,id desc`;
        const ids = [];
        let cursor = null;
        do {
          const page = await api(
            a,
            "?limit=3" + (cursor ? "&cursor=" + cursor : ""),
          );
          ids.push(...page.items.map((x) => x.id));
          cursor = page.nextCursor;
        } while (cursor);
        assert.deepEqual(
          ids,
          expected.map((x) => x.id),
        );
        assert.equal(new Set(ids).size, ids.length);
        const empty = await api(b, "?state=history&limit=1");
        assert.deepEqual(empty.items, []);
        assert.equal(empty.nextCursor, null);
      },
    );
    await accept(
      "timestamp ties and sub-millisecond pairs preserve all rows (controlled Local fixture)",
      async () => {
        const targets =
          await local.db`select id from public.trip_library_records where owner_user_id=${b.id} order by id`;
        // Fixture-only rollback-safe trigger bypass to seed exact timestamps; never a production request path.
        await local.db.begin(async (tx) => {
          await tx`set local session_replication_role = replica`;
          for (let i = 0; i < targets.length; i++)
            await tx`update public.trip_library_records set updated_at=${i === 0 ? "2026-09-12T00:00:00.123457Z" : "2026-09-12T00:00:00.123456Z"}::timestamptz where owner_user_id=${b.id} and id=${targets[i].id}`;
        });
        const expected =
          await local.db`select id from public.trip_library_records where owner_user_id=${b.id} order by updated_at desc,id desc`;
        let cursor = null;
        const ids = [];
        do {
          const page = await api(
            b,
            "?limit=1" + (cursor ? "&cursor=" + cursor : ""),
          );
          ids.push(...page.items.map((x) => x.id));
          cursor = page.nextCursor;
        } while (cursor);
        assert.deepEqual(
          ids,
          expected.map((x) => x.id),
        );
      },
    );
    await accept(
      "direct authenticated/anonymous INSERT UPDATE DELETE upsert stay denied; own SELECT RLS remains",
      async () => {
        const row = ok(
          await local.admin
            .from("trip_library_records")
            .select()
            .eq("owner_user_id", a.id)
            .eq("id", copied.id)
            .single(),
        );
        for (const client of [
          a.client,
          b.client,
          createClient(local.api, local.key, {
            auth: { persistSession: false, autoRefreshToken: false },
          }),
        ]) {
          for (const mutation of [
            () =>
              client.from("trip_library_records").insert({
                ...row,
                id: randomUUID(),
                creation_key: randomUUID(),
              }),
            () =>
              client
                .from("trip_library_records")
                .update({ storage_revision: 2 })
                .eq("id", row.id),
            () => client.from("trip_library_records").delete().eq("id", row.id),
            () => client.from("trip_library_records").upsert(row),
          ])
            assert.equal((await mutation()).error?.code, "42501");
        }
        assert.equal(
          ok(
            await b.client
              .from("trip_library_records")
              .select()
              .eq("id", row.id),
          ).length,
          0,
        );
        assert.equal(
          ok(
            await a.client
              .from("trip_library_records")
              .select()
              .eq("id", row.id),
          ).length,
          1,
        );
      },
    );
    await accept(
      "additive intent metadata is immutable and legacy NULL cannot falsely claim retry equivalence",
      async () => {
        const changed = await local.admin
          .from("trip_library_records")
          .update({ creation_intent_hash: "0".repeat(64), storage_revision: 2 })
          .eq("owner_user_id", a.id)
          .eq("id", copied.id);
        assert.equal(changed.error?.code, "55000");
        const row = ok(
          await local.admin
            .from("trip_library_records")
            .select()
            .eq("owner_user_id", a.id)
            .eq("id", copied.id)
            .single(),
        );
        assert.match(row.creation_intent_hash, /^[0-9a-f]{64}$/);
        const body = createInput();
        ok(
          await local.admin.from("trip_library_records").insert({
            ...row,
            id: randomUUID(),
            creation_key: body.creationKey,
            creation_intent_hash: null,
          }),
        );
        assert.equal(
          await api(a, "", "POST", body, undefined, 409),
          "CREATION_KEY_CONFLICT",
        );
        const fn =
          await local.db`select prosecdef,proconfig from pg_proc where proname='guard_trip_library_creation_intent_v1' and pronamespace='public'::regnamespace`;
        assert.equal(fn[0].prosecdef, false);
        assert.deepEqual(fn[0].proconfig, ["search_path=pg_catalog"]);
      },
    );
    await accept(
      "Draft delete is CAS protected and returns 204; stale revision cannot delete",
      async () => {
        await api(a, "/" + copied.id, "DELETE", undefined, 2, 409);
        await api(a, "/" + copied.id, "DELETE", undefined, 1, 204);
        await api(a, "/" + copied.id, "GET", undefined, undefined, 404);
      },
    );
    await accept(
      "production gateway has no service-role path; server ran with service credentials removed",
      async () => {
        for (const path of [
          "src/server/trip-library/http.ts",
          "src/server/trip-library/repository.ts",
          "src/server/trip-library/query.ts",
          "src/server/private-http.ts",
          "src/db/index.ts",
        ])
          assert.doesNotMatch(
            await readFile(path, "utf8"),
            /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY|service_role|createAdmin|SECURITY DEFINER/i,
          );
      },
    );
    await accept(
      "real browser Cookie fetch + public A save client + reload + read/history/copy/delete",
      async () => {
        browser = await require(
          process.env.CODEX_PLAYWRIGHT_PATH,
        ).chromium.launch({ channel: "msedge", headless: true });
        const context = await browser.newContext();
        await context.addCookies(
          a.jar.getAll().map((c) => ({
            name: c.name,
            value: c.value,
            domain: "127.0.0.1",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
          })),
        );
        const page = await context.newPage();
        await page.goto(app.origin + "/");
        const bundle = await build({
          entryPoints: ["src/shared/contracts/trip-library/client.ts"],
          bundle: true,
          platform: "browser",
          format: "iife",
          globalName: "Task049Client",
          write: false,
        });
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        const input = createInput(),
          snapshot = plan();
        const result = await page.evaluate(
          async ({ input, snapshot }) => {
            const created = await fetch("/api/trip-library", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const record = (await created.json()).data;
            const saved = await window.Task049Client.saveTripPlan(
              { recordId: record.id, storageRevision: record.storageRevision },
              { planSnapshot: snapshot },
            );
            return { created: created.status, saved };
          },
          { input, snapshot },
        );
        assert.equal(result.created, 201);
        assert.equal(result.saved.canonicalTripId, snapshot.trip.id);
        await page.reload();
        const statuses = await page.evaluate(async (id) => {
          const get = await fetch("/api/trip-library/" + id);
          const value = (await get.json()).data;
          const frozen = await fetch("/api/trip-library/" + id + "/history", {
            method: "POST",
            headers: { "If-Match": get.headers.get("etag") },
          });
          const history = (await frozen.json()).data;
          const copy = await fetch("/api/trip-library/" + id + "/copy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "If-Match": frozen.headers.get("etag"),
            },
            body: JSON.stringify({
              schemaVersion: "1.0",
              creationKey: crypto.randomUUID(),
            }),
          });
          const draft = (await copy.json()).data;
          const deleted = await fetch("/api/trip-library/" + draft.id, {
            method: "DELETE",
            headers: { "If-Match": copy.headers.get("etag") },
          });
          return {
            get: get.status,
            state: value.libraryState,
            freeze: frozen.status,
            frozenState: history.libraryState,
            copy: copy.status,
            delete: deleted.status,
          };
        }, result.saved.recordId);
        assert.deepEqual(statuses, {
          get: 200,
          state: "saved",
          freeze: 200,
          frozenState: "history",
          copy: 201,
          delete: 204,
        });
        metrics.browser = statuses;
        await context.close();
      },
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.stop();
    for (const user of users) {
      await user.client.auth.signOut();
      ok(await local.admin.auth.admin.deleteUser(user.id));
    }
    const count = Number(
      (await local.db`select count(*) from auth.users`)[0].count,
    );
    assert.equal(count, 0, "all temporary Auth users cleaned");
    const rows = Number(
      (await local.db`select count(*) from public.trip_library_records`)[0]
        .count,
    );
    assert.equal(rows, 0, "all temporary Trip records cleaned");
    await local.db.end({ timeout: 5 });
    await writeFile(
      artifact + "/runtime-acceptance.json",
      JSON.stringify(
        {
          completed,
          metrics,
          cleanup: { authUsers: count, tripRecords: rows },
          realLocal: true,
        },
        null,
        2,
      ) + "\n",
    );
  }
});
