import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { localConnection } from "./task-017-local-db.mjs";
import { POST } from "../src/app/api/travel-persistence/route.ts";
import { closeDb } from "../src/db/index.ts";
import {
  fullDraftFixture,
  progressFixture,
} from "../src/shared/contracts/trips/fixtures.ts";

test("Local verified Supabase identities exercise the real browser API and concurrent autosave", async () => {
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
  const { admin, session } = localConnection(true);
  const ids = [];
  const db = localConnection();
  const call = async (token, operation, input) => {
    const response = await POST(
      new Request("http://127.0.0.1/api/travel-persistence", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation, input }),
      }),
    );
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
    );
    const tokens = [];
    for (let i = 0; i < 2; i++) {
      const email = randomUUID() + "@example.test",
        password = randomUUID() + randomUUID();
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(
        created.error,
        null,
        "Local fixture user creation must succeed",
      );
      ids.push(created.data.user.id);
      const login = await session().auth.signInWithPassword({
        email,
        password,
      });
      assert.equal(
        login.error,
        null,
        "Local fixture authentication must succeed",
      );
      tokens.push(login.data.session.access_token);
    }
    const bad = await call("invalid-token", "getPreference", {});
    assert.equal(bad.status, 401);
    const ownerAttempt = await call(tokens[0], "getPreference", {
      owner_user_id: ids[1],
    });
    assert.equal(ownerAttempt.status, 400);
    const own = await call(tokens[0], "updatePreference", {
      revision: 0,
      patch: {
        schemaVersion: "1.0",
        set: { "mobility.lessWalking": true },
        unset: [],
      },
    });
    assert.equal(own.status, 200);
    const input = {
      creationKey: randomUUID(),
      content: { facts: fullDraftFixture(), progress: progressFixture() },
    };
    const duplicates = await Promise.all([
      call(tokens[0], "createDraft", input),
      call(tokens[0], "createDraft", input),
    ]);
    assert.ok(
      duplicates.every((r) => r.status === 200),
      "Both concurrent create retries succeed",
    );
    const draft = duplicates[0].body.result;
    assert.equal(draft.id, duplicates[1].body.result.id);
    assert.equal(draft.sourcePreferenceRevision, 1);
    assert.equal(
      (await call(tokens[1], "getDraft", { id: draft.id })).status,
      404,
    );
    const update = { id: draft.id, revision: 1, content: input.content };
    const race = await Promise.all([
      call(tokens[0], "updateDraft", update),
      call(tokens[0], "updateDraft", update),
    ]);
    assert.deepEqual(race.map((x) => x.status).sort(), [200, 409]);
    const override = await call(tokens[0], "updateOverrides", {
      id: draft.id,
      revision: 1,
      patch: {
        schemaVersion: "1.0",
        set: { "mobility.lessWalking": false },
        unset: [],
      },
    });
    assert.equal(override.status, 200);
    assert.equal(
      override.body.result.effective.values["mobility.lessWalking"],
      false,
    );
    assert.equal(
      (await call(tokens[0], "getPreference", {})).body.result.preference
        .values["mobility.lessWalking"],
      true,
    );
    assert.equal(
      (await call(tokens[1], "listDrafts", {})).body.result.length,
      0,
    );
    assert.equal(
      (await call(tokens[0], "listDrafts", {})).body.result.length,
      1,
    );
    assert.equal(
      (
        await call(tokens[0], "createDraft", {
          ...input,
          owner_user_id: ids[1],
        })
      ).status,
      400,
    );
  } finally {
    await closeDb();
    for (const id of ids) {
      const result = await admin.auth.admin.deleteUser(id);
      assert.equal(
        result.error,
        null,
        "Delete only the fixture user created by this test",
      );
    }
    assert.equal(
      Number((await db`select count(*) from auth.users`)[0].count),
      0,
    );
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    await db.end({ timeout: 5 });
  }
});
