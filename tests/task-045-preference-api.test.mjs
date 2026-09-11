import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  emptyPreference,
  applyPreferencePatch,
  parsePreferenceV1,
  preferenceKeys,
} from "../src/features/preferences/domain/preference-v1.ts";
import {
  parsePatchRequest,
  parseResetRequest,
  parsePreferenceResource,
  emptyPreferenceResource,
  PreferenceApiError,
} from "../src/features/preferences/persistence/preference-resource.ts";
import {
  preferenceDraftPatch,
  editPreferenceValue,
  keysForPage,
  preferenceOverview,
  categorySummary,
} from "../src/features/preferences/persistence/preference-adapter.ts";
import {
  readPreferenceJson,
  PREFERENCE_HTTP_MAX_BYTES,
} from "../src/server/preferences/http.ts";
import { preferenceClient } from "../src/features/preferences/persistence/preference-client.ts";
const patch = { schemaVersion: "1.0", set: { "style.planning": 5 }, unset: [] };
const body = { expectedRevision: 0, patch };
test("missing resource is detached empty revision zero", () => {
  assert.deepEqual(parsePreferenceResource(emptyPreferenceResource()), {
    preference: emptyPreference(),
    revision: 0,
    updatedAt: null,
  });
  const one = emptyPreferenceResource();
  one.preference.values["style.pace"] = 1;
  assert.deepEqual(emptyPreferenceResource().preference, emptyPreference());
});
for (const value of [
  null,
  {},
  [],
  true,
  { ...body, owner_user_id: "spoof" },
  { ...body, owner: "spoof" },
  { ...body, extra: 1 },
]) {
  test("strict request envelope " + JSON.stringify(value), () =>
    assert.throws(() => parsePatchRequest(value), PreferenceApiError),
  );
}
for (const expectedRevision of [
  -1,
  0.5,
  "0",
  null,
  true,
  Infinity,
  NaN,
  Number.MAX_SAFE_INTEGER + 1,
]) {
  test("reject revision " + String(expectedRevision), () => {
    assert.throws(
      () => parsePatchRequest({ expectedRevision, patch }),
      PreferenceApiError,
    );
    assert.throws(
      () => parseResetRequest({ expectedRevision }),
      PreferenceApiError,
    );
  });
}
test("canonical patch and reset request parsers", () => {
  assert.deepEqual(parsePatchRequest(body), body);
  assert.equal(
    parsePatchRequest({ expectedRevision: 2147483648, patch }).expectedRevision,
    2147483648,
  );
  assert.deepEqual(parseResetRequest({ expectedRevision: 3 }), {
    expectedRevision: 3,
  });
  assert.throws(
    () => parseResetRequest({ expectedRevision: 0, patch }),
    PreferenceApiError,
  );
});
for (const key of [
  "mobility.preset",
  "mobility.lessWalking",
  "attractions.nature",
  "experience.photoExperience",
  "interests.likes",
  "少步行",
]) {
  test("legacy key rejected " + key, () =>
    assert.throws(
      () =>
        parsePatchRequest({
          expectedRevision: 0,
          patch: { schemaVersion: "1.0", set: { [key]: true }, unset: [] },
        }),
      (e) => e.code === "INVALID_PREFERENCE",
    ),
  );
}
for (const invalid of [
  { ...emptyPreferenceResource(), owner_user_id: "spoof" },
  {
    ...emptyPreferenceResource(),
    preference: { schemaVersion: "1.0", values: { "style.pace": 1 } },
  },
  { ...emptyPreferenceResource(), revision: 1 },
  { ...emptyPreferenceResource(), updatedAt: "2026-09-11T00:00:00Z" },
  { ...emptyPreferenceResource(), revision: 1, updatedAt: "invalid" },
]) {
  test("invalid resource " + JSON.stringify(invalid), () =>
    assert.throws(() => parsePreferenceResource(invalid)),
  );
}
test("resource parsing is independent and accepts committed DB timestamps", () => {
  const row = {
    preference: {
      schemaVersion: "1.0",
      values: { "interests.preferences": { photography: "like" } },
    },
    revision: 1,
    updatedAt: "2026-09-11T12:30:00.000+00:00",
  };
  const parsed = parsePreferenceResource(row);
  parsed.preference.values["interests.preferences"].photography = "dislike";
  assert.equal(
    row.preference.values["interests.preferences"].photography,
    "like",
  );
});
test("page field mappings cover exactly the 23 existing canonical keys", () => {
  const keys = [
    "mobility",
    "attractions",
    "dining",
    "accommodation",
    "budget",
    "experience",
  ].flatMap(keysForPage);
  assert.deepEqual([...keys].sort(), [...preferenceKeys].sort());
  assert.deepEqual(keysForPage("advanced"), preferenceKeys);
  assert.ok(keysForPage("mobility").includes("mobility.walkingTolerance"));
  assert.ok(keysForPage("experience").includes("style.planning"));
});
test("missing, false, neutral and mid style remain distinct through roundtrip", () => {
  let draft = emptyPreference();
  for (const [key, value] of [
    ["mobility.noBus", false],
    ["dining.localCuisine", "neutral"],
    ["style.pace", 3],
  ]) {
    draft = editPreferenceValue(draft, key, value);
  }
  const delta = preferenceDraftPatch(emptyPreference(), draft);
  assert.deepEqual(delta.set, draft.values);
  assert.deepEqual(applyPreferencePatch(emptyPreference(), delta), draft);
  assert.equal(Object.keys(delta.set).length, 3);
  const cleared = editPreferenceValue(draft, "mobility.noBus", undefined);
  assert.deepEqual(preferenceDraftPatch(draft, cleared), {
    schemaVersion: "1.0",
    set: {},
    unset: ["mobility.noBus"],
  });
});
test("map edit preserves untouched map entries, API patch replaces whole values", () => {
  const saved = parsePreferenceV1({
    schemaVersion: "1.0",
    values: {
      "interests.preferences": { food: "like", photography: "like" },
      "interests.details": { photography: ["landscape"] },
      "budget.spendingTendency": "moderate",
    },
  });
  const next = editPreferenceValue(saved, "interests.preferences", {
    ...saved.values["interests.preferences"],
    food: "dislike",
  });
  const delta = preferenceDraftPatch(saved, next);
  assert.deepEqual(delta.set["interests.preferences"], {
    food: "dislike",
    photography: "like",
  });
  assert.deepEqual(applyPreferencePatch(saved, delta), next);
  const replaced = applyPreferencePatch(saved, {
    schemaVersion: "1.0",
    set: { "interests.preferences": { nature_scenery: "like" } },
    unset: [],
  });
  assert.equal(replaced.values["interests.preferences"].food, undefined);
  assert.equal(replaced.values["budget.spendingTendency"], "moderate");
});
test("empty overview has no mock traits and reset remains empty", () => {
  const view = preferenceOverview(emptyPreference());
  assert.ok(
    [...view.attractions, ...view.travelStyle].every(
      (x) => x.level === "unset",
    ),
  );
  assert.ok(view.categories.every((x) => x.summary === "未设置"));
  assert.deepEqual(preferenceDraftPatch(emptyPreference(), emptyPreference()), {
    schemaVersion: "1.0",
    set: {},
    unset: [],
  });
});
test("overview derives from canonical interests and explicit style; no key is invented", () => {
  const preference = {
    schemaVersion: "1.0",
    values: {
      "interests.preferences": { photography: "like" },
      "style.planning": 5,
      "mobility.noBus": false,
    },
  };
  const view = preferenceOverview(preference);
  assert.equal(
    view.attractions.find((x) => x.id === "photography").level,
    "like",
  );
  assert.equal(
    view.travelStyle.find((x) => x.id === "style.planning").level,
    "veryLike",
  );
  assert.match(categorySummary(preference, "mobility"), /否/);
  assert.equal(categorySummary(preference, "dining"), "未设置");
});
test("HTTP parser enforces actual streamed bytes, JSON media type and UTF-8", async () => {
  assert.equal(PREFERENCE_HTTP_MAX_BYTES, 81920);
  const make = (body, headers = { "content-type": "application/json" }) =>
    new Request("http://localhost/api/preferences", {
      method: "PATCH",
      body,
      headers,
    });
  assert.deepEqual(await readPreferenceJson(make(JSON.stringify(body))), body);
  await assert.rejects(
    () => readPreferenceJson(make("{}", { "content-type": "text/plain" })),
    (e) => e.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    () => readPreferenceJson(make("{")),
    (e) => e.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    () => readPreferenceJson(make(new Uint8Array([0xff]))),
    (e) => e.code === "INVALID_REQUEST",
  );
  const near = "{}" + " ".repeat(81918);
  assert.deepEqual(await readPreferenceJson(make(near)), {});
  await assert.rejects(
    () => readPreferenceJson(make(near + " ")),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(" ".repeat(40960)));
      c.enqueue(new TextEncoder().encode(" ".repeat(40961)));
      c.close();
    },
  });
  await assert.rejects(
    () =>
      readPreferenceJson(
        new Request("http://localhost/api/preferences", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "content-length": "1",
          },
          body: stream,
          duplex: "half",
        }),
      ),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
});
test("client uses private same-origin fetch and preserves draft on network/409 failure", async () => {
  const original = globalThis.fetch,
    calls = [];
  const draft = parsePreferenceV1({
    schemaVersion: "1.0",
    values: { "mobility.noBus": true },
  });
  const before = structuredClone(draft);
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      throw Error("offline");
    };
    await assert.rejects(
      () =>
        preferenceClient.patch(
          2,
          preferenceDraftPatch(emptyPreference(), draft),
        ),
      (e) => e.code === "PREFERENCE_UNAVAILABLE",
    );
    assert.deepEqual(draft, before);
    assert.equal(calls[0].options.credentials, "same-origin");
    assert.equal(calls[0].options.cache, "no-store");
    globalThis.fetch = async () =>
      Response.json(
        { ok: false, error: { code: "STALE_PREFERENCE_REVISION" } },
        { status: 409 },
      );
    await assert.rejects(
      () => preferenceClient.patch(2, patch),
      (e) => e.code === "STALE_PREFERENCE_REVISION",
    );
    assert.deepEqual(draft, before);
    globalThis.fetch = async () =>
      Response.json({ ok: true, data: emptyPreferenceResource() });
    assert.deepEqual(await preferenceClient.read(), emptyPreferenceResource());
  } finally {
    globalThis.fetch = original;
  }
});
test("production preference surfaces reuse accepted parsers/Auth and expose no defaults/legacy persistence", () => {
  const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
  const repo = read("src/server/preferences/repository.ts"),
    http = read("src/server/preferences/http.ts"),
    editor = read(
      "src/features/preferences/persistence/canonical-preference-editor.tsx",
    ),
    hook = read(
      "src/features/preferences/persistence/use-preference-resource.ts",
    );
  assert.match(repo, /applyPreferencePatch/);
  assert.match(repo, /\.eq\("revision", expectedRevision\)/);
  assert.match(http, /requireAuthUser/);
  assert.match(http, /createRequestSupabase/);
  assert.match(http, /publicSupabaseConfig/);
  assert.doesNotMatch(
    repo + http,
    /service_role|sb_secret_|getSession\(|advisory/,
  );
  assert.doesNotMatch(
    editor + hook,
    /createDefault|mobility\.preset|mobility\.lessWalking|attractions\.nature|experience\.photoExperience|localStorage/,
  );
  assert.match(editor, /GuardedLink/);
  assert.match(editor, /setIsDirty\(isDirty\)/);
  assert.match(hook, /STALE_PREFERENCE_REVISION/);
});
