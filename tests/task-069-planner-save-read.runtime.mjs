// Real Local Supabase/Auth/HTTP/RLS/CAS acceptance for TASK-069-A.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import test from "node:test";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { snapshotFixture } from "./task-019-fixtures.mjs";
import { parseTripPlanSnapshot } from "../src/shared/contracts/trips/index.ts";
import * as schema from "../src/db/schema/trips.ts";

const ok = (result) => {
  assert.equal(
    result.error?.code ?? null,
    null,
    "Local Auth operation must pass",
  );
  return result.data;
};

test("TASK-069 real Local Planner Canonical read/save/RLS/CAS acceptance", async (t) => {
  const local = preferenceLocalRuntime();
  const users = [];
  const completed = [];
  let app;
  const accept = (name, run) =>
    t.test(name, async () => {
      await run();
      completed.push(name);
    });
  try {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "requires a clean Local Auth database",
    );
    local.env.DATABASE_URL = local.databaseUrl;
    for (const key of Object.keys(local.env))
      if (/SUPABASE.*(?:SERVICE|SECRET)|SERVICE.*SUPABASE/.test(key))
        delete local.env[key];
    app = await startApp(local);
    for (let index = 0; index < 2; index++) {
      const email = `task069-${randomUUID()}@example.test`;
      const password = `Local-${randomUUID()}!`;
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
      users.push({
        id: created.user.id,
        client,
        token: signed.session.access_token,
      });
    }
    const [a, b] = users;
    const repository = createTripRepository(a.client, () =>
      drizzle(local.db, { schema }),
    );
    let current = await repository.create(snapshotFixture());
    async function api(user, method, id, body, expected) {
      const response = await fetch(`${app.origin}/api/planner/trips/${id}`, {
        method,
        headers: {
          ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      assert.ok(
        [expected].flat().includes(response.status),
        `${method} expected ${[expected].flat().join("/")}`,
      );
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.match(response.headers.get("vary"), /Authorization/);
      assert.match(response.headers.get("vary"), /Cookie/);
      assert.doesNotMatch(
        JSON.stringify(result),
        /postgres|select |update |owner_user_id|access_token|sb_secret_/i,
      );
      return { response, result };
    }

    await accept(
      "authenticated owner read validates Canonical payload and revision",
      async () => {
        const result = await api(a, "GET", current.trip.id, undefined, 200);
        assert.equal(result.result.ok, true);
        assert.equal(
          result.response.headers.get("etag"),
          `\"${current.trip.revision}\"`,
        );
        assert.equal(parseTripPlanSnapshot(result.result.data).ok, true);
        assert.equal(result.result.data.trip.id, current.trip.id);
      },
    );
    await accept(
      "anonymous and foreign reads fail closed without existence leakage",
      async () => {
        assert.equal(
          (await api(null, "GET", current.trip.id, undefined, 401)).result.error
            .code,
          "AUTH_REQUIRED",
        );
        assert.equal(
          (await api(b, "GET", current.trip.id, undefined, 404)).result.error
            .code,
          "CANONICAL_TRIP_NOT_FOUND",
        );
      },
    );
    await accept(
      "explicit owner save uses Canonical revision CAS and returns actual tree",
      async () => {
        const candidate = structuredClone(current);
        candidate.trip.title = "TASK-069 Local saved title";
        const result = await api(
          a,
          "PUT",
          current.trip.id,
          { schemaVersion: "1.0", snapshot: candidate },
          200,
        );
        assert.equal(result.result.data.trip.title, candidate.trip.title);
        assert.equal(
          result.result.data.trip.revision,
          current.trip.revision + 1,
        );
        assert.equal(
          result.response.headers.get("etag"),
          `\"${current.trip.revision + 1}\"`,
        );
        current = result.result.data;
      },
    );
    await accept(
      "two writers at one revision yield exactly one success and preserve the loser",
      async () => {
        const left = structuredClone(current);
        const right = structuredClone(current);
        left.trip.title = "TASK-069 writer left";
        right.trip.title = "TASK-069 writer right";
        const results = await Promise.all([
          api(
            a,
            "PUT",
            current.trip.id,
            { schemaVersion: "1.0", snapshot: left },
            [200, 409],
          ),
          api(
            a,
            "PUT",
            current.trip.id,
            { schemaVersion: "1.0", snapshot: right },
            [200, 409],
          ),
        ]);
        const winner = results.find((result) => result.response.status === 200);
        const loser = results.find((result) => result.response.status === 409);
        assert.ok(winner);
        assert.equal(loser.result.error.code, "STALE_CANONICAL_REVISION");
        const read = await api(a, "GET", current.trip.id, undefined, 200);
        assert.equal(
          read.result.data.trip.title,
          winner.result.data.trip.title,
        );
        current = read.result.data;
      },
    );
    await accept(
      "malformed, mismatched and foreign saves fail without mutation",
      async () => {
        const before = structuredClone(current);
        assert.equal(
          (await api(a, "PUT", current.trip.id, { schemaVersion: "1.0" }, 400))
            .result.error.code,
          "INVALID_REQUEST",
        );
        const mismatch = structuredClone(current);
        mismatch.trip.id = randomUUID();
        assert.equal(
          (
            await api(
              a,
              "PUT",
              current.trip.id,
              { schemaVersion: "1.0", snapshot: mismatch },
              400,
            )
          ).result.error.code,
          "INVALID_CANONICAL_TRIP",
        );
        assert.equal(
          (
            await api(
              b,
              "PUT",
              current.trip.id,
              { schemaVersion: "1.0", snapshot: before },
              404,
            )
          ).result.error.code,
          "CANONICAL_TRIP_NOT_FOUND",
        );
        const read = await api(a, "GET", current.trip.id, undefined, 200);
        assert.deepEqual(read.result.data, before);
      },
    );
  } finally {
    if (app) await app.stop();
    for (const user of users) {
      await user.client.auth.signOut();
      ok(await local.admin.auth.admin.deleteUser(user.id));
    }
    const remaining = Number(
      (await local.db`select count(*) from auth.users`)[0].count,
    );
    assert.equal(remaining, 0, "temporary Local Auth users cleaned");
    await local.db.end({ timeout: 5 });
  }
  assert.deepEqual(completed, [
    "authenticated owner read validates Canonical payload and revision",
    "anonymous and foreign reads fail closed without existence leakage",
    "explicit owner save uses Canonical revision CAS and returns actual tree",
    "two writers at one revision yield exactly one success and preserve the loser",
    "malformed, mismatched and foreign saves fail without mutation",
  ]);
});
