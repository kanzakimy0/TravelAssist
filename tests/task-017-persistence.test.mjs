import "./register-preference-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
const {
  parsePreference,
  emptyPreference,
  applyPreferencePatch,
  effectivePreference,
} = await import("../src/shared/contracts/preferences/index.ts");
const {
  createDraftInput,
  updateDraftInput,
  updatePreferenceInput,
  draftResponse,
} = await import("../src/shared/contracts/preferences/drafts.ts");
const { parse } = await import("../src/shared/contracts/trips/validation.ts");
const { fullDraftFixture, progressFixture } =
  await import("../src/shared/contracts/trips/fixtures.ts");
const { createServerDraftAutosave } =
  await import("../src/features/start-flow/model/server-draft-autosave.ts");

const pref = (values) => ({ schemaVersion: "1.0", values });
const patch = (set, unset = []) => ({ schemaVersion: "1.0", set, unset });
const content = () => ({
  facts: fullDraftFixture(),
  progress: progressFixture(),
});
test("preference values preserve missing, false, neutral and explicit unset without mock defaults", () => {
  const baseline = pref({
    "mobility.lessWalking": true,
    "attractions.nature": "like",
  });
  const overrides = applyPreferencePatch(
    emptyPreference(),
    patch({ "mobility.lessWalking": false, "attractions.nature": "neutral" }),
  );
  assert.deepEqual(effectivePreference(baseline, overrides).values, {
    "mobility.lessWalking": false,
    "attractions.nature": "neutral",
  });
  assert.equal(baseline.values["mobility.lessWalking"], true);
  assert.deepEqual(
    applyPreferencePatch(overrides, patch({}, ["mobility.lessWalking"])).values,
    { "attractions.nature": "neutral" },
  );
  assert.deepEqual(emptyPreference().values, {});
  assert.throws(
    () =>
      applyPreferencePatch(
        overrides,
        patch({ "mobility.lessWalking": false }, ["mobility.lessWalking"]),
      ),
    /AMBIGUOUS_PATCH/,
  );
});
test("existing five-position sliders reject 0 instead of inventing a sixth value; trip money retains 0", () => {
  for (const value of [1, 2, 3, 4, 5])
    assert.equal(parsePreference(pref({ "style.pace": value })).ok, true);
  for (const value of [0, 6, "3", NaN, null])
    assert.equal(parsePreference(pref({ "style.pace": value })).ok, false);
  assert.equal(
    parse(createDraftInput, { creationKey: randomUUID(), content: content() })
      .value.content.facts.budget.diningPerDayMinor,
    0,
  );
});
test("unknown keys, dates, owners, radar summaries, prototype tricks and mismatched versions fail closed", () => {
  for (const value of [
    pref({ destination: "Tokyo" }),
    pref({ "dining.localCuisine": "invented" }),
    pref({ "mobility.lessWalking": null }),
    { ...pref({}), owner_user_id: randomUUID() },
    { schemaVersion: "2.0", values: {} },
    JSON.parse('{"schemaVersion":"1.0","values":{"__proto__":{}}}'),
    pref({ "interests.likes": ["美食", "美食"] }),
    pref({ "interests.likes": ["美食"], "interests.dislikes": ["美食"] }),
  ])
    assert.equal(parsePreference(value).ok, false);
  assert.equal(
    parse(createDraftInput, {
      creationKey: randomUUID(),
      content: content(),
      owner_user_id: randomUUID(),
    }).ok,
    false,
  );
  assert.equal(
    parse(updatePreferenceInput, { revision: 0, patch: patch({}), profile: {} })
      .ok,
    false,
  );
  assert.equal(
    parse(updateDraftInput, {
      id: randomUUID(),
      revision: 0,
      content: content(),
    }).ok,
    false,
  );
});
test("effective preference validates cross-layer like/dislike contradictions", () => {
  assert.throws(
    () =>
      effectivePreference(
        pref({ "interests.likes": ["美食"] }),
        pref({ "interests.dislikes": ["美食"] }),
      ),
    /CONFLICTING_INTEREST/,
  );
});

function fakeServer() {
  let state = null;
  let createCalls = 0;
  let updateCalls = 0;
  let loseCreate = false;
  let stale = false;
  const transport = async (op, input) => {
    await sleep(5);
    if (op === "createDraft") {
      createCalls++;
      state ??= {
        id: randomUUID(),
        creationKey: input.creationKey,
        status: "active",
        revision: 1,
        content: input.content,
        snapshot: emptyPreference(),
        sourcePreferenceRevision: 0,
        overrides: emptyPreference(),
        overrideRevision: 1,
        effective: emptyPreference(),
      };
      if (loseCreate) {
        loseCreate = false;
        throw new Error("NETWORK");
      }
    } else if (op === "updateDraft") {
      if (stale || input.revision !== state.revision)
        throw new Error("STALE_REVISION");
      updateCalls++;
      state = {
        ...state,
        content: input.content,
        revision: state.revision + 1,
      };
    }
    return structuredClone(state);
  };
  return {
    transport,
    get state() {
      return state;
    },
    get createCalls() {
      return createCalls;
    },
    get updateCalls() {
      return updateCalls;
    },
    lose: () => (loseCreate = true),
    stale: () => (stale = true),
  };
}
test("autosave debounces valid edits, serializes in-flight edits and resumes server progress", async () => {
  const server = fakeServer();
  const statuses = [];
  const saver = createServerDraftAutosave({
    creationKey: randomUUID(),
    transport: server.transport,
    delayMs: 1000,
    onStatus: (s) => statuses.push(s),
  });
  const a = content(),
    b = content();
  b.facts.title = "Second edit";
  saver.queue(a);
  saver.queue(b);
  const run = saver.flush();
  const c = content();
  c.facts.title = "During request";
  saver.queue(c);
  await run;
  assert.equal(server.createCalls, 1);
  assert.equal(server.updateCalls, 1);
  assert.equal(server.state.content.facts.title, "During request");
  const resume = await saver.resume(server.state.id);
  assert.deepEqual(resume.content.progress, c.progress);
  assert.equal(parse(draftResponse, resume).ok, true);
  assert.ok(statuses.includes("saved"));
  saver.dispose();
});
test("lost create response is safely retried with same creation key and preserves newer content", async () => {
  const server = fakeServer();
  server.lose();
  const key = randomUUID();
  const saver = createServerDraftAutosave({
    creationKey: key,
    transport: server.transport,
    delayMs: 1000,
  });
  saver.queue(content());
  await assert.rejects(saver.flush(), /NETWORK/);
  const originalId = server.state.id;
  const edit = content();
  edit.facts.title = "Retry newer edit";
  saver.queue(edit);
  await saver.retry();
  assert.equal(server.state.id, originalId);
  assert.equal(server.state.creationKey, key);
  assert.equal(server.state.content.facts.title, "Retry newer edit");
  saver.dispose();
});
test("stale client does not silently overwrite and requires explicit resume", async () => {
  const server = fakeServer();
  const saver = createServerDraftAutosave({
    creationKey: randomUUID(),
    transport: server.transport,
    delayMs: 1000,
  });
  saver.queue(content());
  await saver.flush();
  server.stale();
  const next = content();
  next.facts.title = "Old client";
  saver.queue(next);
  await assert.rejects(saver.flush(), /STALE_REVISION/);
  await assert.rejects(saver.retry(), /RESUME_REQUIRED/);
  assert.notEqual(server.state.content.facts.title, "Old client");
  await saver.resume(server.state.id);
  saver.dispose();
});
test("retrying a lost create cannot overwrite a draft that another device already changed", async () => {
  const server = fakeServer();
  server.lose();
  const saver = createServerDraftAutosave({
    creationKey: randomUUID(),
    transport: server.transport,
    delayMs: 1000,
  });
  saver.queue(content());
  await assert.rejects(saver.flush(), /NETWORK/);
  const elsewhere = content();
  elsewhere.facts.title = "Other device";
  await server.transport("updateDraft", {
    id: server.state.id,
    revision: 1,
    content: elsewhere,
  });
  await assert.rejects(saver.retry(), /STALE_REVISION/);
  assert.equal(server.state.content.facts.title, "Other device");
  saver.dispose();
});
test("no initial autosave or anonymous account creation; dispose cancels scheduled writes", async () => {
  const server = fakeServer();
  const saver = createServerDraftAutosave({
    creationKey: randomUUID(),
    transport: server.transport,
    delayMs: 10,
  });
  await sleep(20);
  assert.equal(server.createCalls, 0);
  saver.queue(content());
  saver.dispose();
  await sleep(20);
  assert.equal(server.createCalls, 0);
});
