import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountDraft,
  accountPatch,
  contactInput,
} from "../src/features/profile/persistence/profile-adapter.ts";
import {
  profileClient,
  profileErrorMessage,
} from "../src/features/profile/persistence/profile-client.ts";
import { initialAccountDraft } from "../src/features/profile/profile-data.ts";
import {
  emptyProfileView,
  fullProfilePatch,
} from "./task-050-profile-fixtures.mjs";
const view = () => {
  const result = emptyProfileView(),
    patch = fullProfilePatch();
  Object.assign(result.profile, patch.profile);
  Object.assign(result.settings, patch.settings);
  return result;
};
test("TASK-060 empty server projection has no example identity, contacts or implicit defaults", () => {
  const draft = accountDraft(emptyProfileView());
  assert.deepEqual(draft, initialAccountDraft);
  assert.equal(accountPatch(draft, structuredClone(draft)), null);
});
test("TASK-060 untouched unfamiliar codes and avatar references survive unrelated field edits", () => {
  const source = view();
  Object.assign(source.profile, {
    genderCode: "self-described",
    residenceCountryCode: "NZ",
  });
  Object.assign(source.settings, {
    locale: "en-NZ",
    regionCode: "NZ",
    timezone: "Pacific/Auckland",
    currencyCode: "NZD",
  });
  const saved = accountDraft(source),
    draft = structuredClone(saved);
  assert.equal(draft.profile.countryRegion, "NZ");
  assert.equal(draft.settings.language, "en-NZ");
  draft.profile.displayName = "  Persist me  ";
  assert.deepEqual(accountPatch(saved, draft), {
    schemaVersion: "1.0",
    profile: { displayName: "Persist me" },
  });
});
test("TASK-060 selected display labels produce canonical codes; clearing emits null only for touched fields", () => {
  const saved = accountDraft(emptyProfileView()),
    draft = structuredClone(saved);
  Object.assign(draft.profile, {
    countryRegion: "日本",
    gender: "女",
    legalName: "Example",
  });
  Object.assign(draft.settings, {
    language: "English",
    region: "美国",
    currency: "USD ($)",
    distanceUnit: "英里 (mi)",
    temperatureUnit: "华氏度 (°F)",
    timeFormat: "12 小时制 (1:00 PM)",
  });
  assert.deepEqual(accountPatch(saved, draft), {
    schemaVersion: "1.0",
    profile: {
      fullName: "Example",
      genderCode: "female",
      residenceCountryCode: "JP",
    },
    settings: {
      locale: "en",
      regionCode: "US",
      currencyCode: "USD",
      distanceUnit: "mi",
      temperatureUnit: "fahrenheit",
      timeFormat: "12h",
    },
  });
  const existing = accountDraft(view()),
    cleared = structuredClone(existing);
  cleared.profile.displayName = "";
  cleared.settings.language = "";
  cleared.avatar = { kind: "default" };
  assert.deepEqual(accountPatch(existing, cleared), {
    schemaVersion: "1.0",
    profile: { displayName: null, avatarPath: null },
    settings: { locale: null },
  });
});
test("TASK-060 contacts separate ISO country from E164 phone and reject dialing prefix as country", () => {
  const draft = {
    name: "Person",
    relationship: "friend",
    countryCode: "JP",
    phone: "+819012345678",
    email: "",
    note: "",
    id: "local-only",
  };
  assert.deepEqual(contactInput(draft), {
    schemaVersion: "1.0",
    name: "Person",
    relationship: "friend",
    countryCode: "JP",
    phoneE164: "+819012345678",
    email: null,
    note: null,
  });
  assert.throws(() => contactInput({ ...draft, countryCode: "+81" }));
  assert.throws(() => contactInput({ ...draft, phone: "09012345678" }));
});
test("TASK-060 client uses private same-origin API, strict responses and sanitized error messaging", async () => {
  const calls = [],
    source = view();
  const client = profileClient(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ ok: true, data: source });
  });
  const abort = new AbortController();
  assert.deepEqual(await client.read(abort.signal), source);
  await client.patch({ schemaVersion: "1.0", profile: { displayName: "New" } });
  assert.equal(calls[0].url, "/api/profile");
  assert.equal(calls[0].options.signal, abort.signal);
  for (const { options } of calls) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.Authorization, undefined);
  }
  assert.equal(calls[1].options.method, "PATCH");
  const invalid = profileClient(async () =>
    Response.json({ ok: true, data: {} }),
  );
  await assert.rejects(() => invalid.read(), { code: "PROFILE_UNAVAILABLE" });
  const expired = profileClient(async () =>
    Response.json(
      { ok: false, error: { code: "AUTH_REQUIRED", detail: "secret" } },
      { status: 401 },
    ),
  );
  await assert.rejects(() => expired.read(), { code: "AUTH_REQUIRED" });
  assert.doesNotMatch(profileErrorMessage(new Error("secret")), /secret/);
  const rejectOwner = profileClient(async () => {
    throw new Error("must not reach transport");
  });
  await assert.rejects(
    () =>
      rejectOwner.patch({
        schemaVersion: "1.0",
        ownerUserId: "spoof",
        profile: { displayName: "x" },
      }),
    { code: "INVALID_REQUEST" },
  );
});
