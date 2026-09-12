import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  parseTripLibraryRecord,
  parseTripPartySnapshot,
  captureTripPreference,
  emptyTripPreferencePatch,
  effectiveTripPreference,
  captureTripParty,
  canTransitionTripLibrary,
  validateTripLibraryUpdate,
  copyHistoryToDraft,
  TRIP_PERSISTENCE_MAX_BYTES as caps,
  STORAGE_REVISION_MAX,
} from "../src/features/trip-library/domain/trip-persistence-v1.ts";
import {
  parseTripDraftFacts,
  parseWizardProgress,
  parseTripPlanSnapshot,
} from "../src/shared/contracts/trips/index.ts";
import {
  minimalDraftFixture,
  minimalSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { PREFERENCE_MAX_BYTES } from "../src/features/preferences/domain/preference-v1.ts";
import {
  MAX_COMPANIONS_PER_USER,
  derivePlanningAgeGroup,
} from "../src/features/companions/domain/companion-v1.ts";
import {
  record,
  member,
  party,
  preference,
  patch,
  profile,
  time,
  forbiddenPartyKeys,
  jsonbText,
  planAtBytes,
} from "./task-048-trip-fixtures.mjs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const reject = (input) => assert.throws(() => parseTripLibraryRecord(input));
for (const state of ["draft", "saved", "history"])
  test(`canonical detached ${state} roundtrip`, () => {
    const input = record(state),
      value = parseTripLibraryRecord(input);
    assert.deepEqual(
      value.draftFacts,
      parseTripDraftFacts(input.draftFacts).value,
    );
    assert.deepEqual(
      value.wizardProgress,
      parseWizardProgress(input.wizardProgress).value,
    );
    if (input.planSnapshot)
      assert.deepEqual(
        value.planSnapshot,
        parseTripPlanSnapshot(input.planSnapshot).value,
      );
    assert.deepEqual(value, input);
    input.draftFacts.destinations[0].name = "Changed master";
    input.wizardProgress.completedPhases.length = 0;
    if (input.planSnapshot)
      input.planSnapshot.plans[0].title = "Changed Planner";
    assert.notDeepEqual(value, input);
  });
test("minimal canonical facts and a non-UUID Trip ID remain separate from B UUID and revision", () => {
  const input = record("saved");
  input.draftFacts = minimalDraftFixture();
  input.planSnapshot = minimalSnapshotFixture();
  input.canonicalTripId = input.planSnapshot.trip.id = "A:trip/string-001";
  input.storageRevision = 8;
  input.planSnapshot.trip.revision = 21;
  const value = parseTripLibraryRecord(input);
  assert.notEqual(value.id, value.canonicalTripId);
  assert.equal(value.canonicalTripId, "A:trip/string-001");
  assert.equal(value.storageRevision, 8);
  assert.equal(value.planSnapshot.trip.revision, 21);
});
const malformed = [
  ["draft version", (r) => (r.draftFacts.contractVersion = "2.0")],
  ["draft date", (r) => (r.draftFacts.dates.departure = "2027-02-30")],
  ["draft field", (r) => (r.draftFacts.reservations = [])],
  ["wizard phase", (r) => (r.wizardProgress.phase = "future")],
  [
    "wizard duplicates",
    (r) => (r.wizardProgress.completedPhases = ["preferences", "preferences"]),
  ],
  ["plan version", (r) => (r.planSnapshot.contractVersion = "2.0")],
  [
    "plan duplicate IDs",
    (r) => r.planSnapshot.plans.push(r.planSnapshot.plans[0]),
  ],
  [
    "plan missing active ID",
    (r) => (r.planSnapshot.trip.activePlanId = "missing"),
  ],
  [
    "plan invalid timezone",
    (r) => (r.planSnapshot.trip.defaultTimezone = "Somewhere/Fictional"),
  ],
  ["plan unknown field", (r) => (r.planSnapshot.reservations = [])],
  [
    "plan unknown structure",
    (r) => (r.planSnapshot.plans[0].days[0].items[0].surprise = true),
  ],
  ["plan revision", (r) => (r.planSnapshot.trip.revision = 0)],
  ["canonical mismatch", (r) => (r.canonicalTripId = "different")],
  [
    "canonical too long",
    (r) => (r.canonicalTripId = r.planSnapshot.trip.id = "x".repeat(161)),
  ],
  [
    "canonical padded",
    (r) => (r.canonicalTripId = r.planSnapshot.trip.id = " padded "),
  ],
  ["DB identity", (r) => (r.id = "trip-string")],
  ["storage zero", (r) => (r.storageRevision = 0)],
  ["storage overflow", (r) => (r.storageRevision = STORAGE_REVISION_MAX + 1)],
  ["source negative", (r) => (r.preferenceSourceRevision = -1)],
  [
    "missing snapshot source",
    (r) => (r.preferenceSnapshot = preference({ "style.pace": 2 })),
  ],
];
for (const [name, change] of malformed)
  test(`fail closed: ${name}`, () => {
    const r = record("saved");
    change(r);
    reject(r);
  });
for (const [name, change] of [
  ["draft with plan", (r) => (r.planSnapshot = minimalSnapshotFixture())],
  ["draft with canonical ID", (r) => (r.canonicalTripId = "example-trip")],
  ["draft with freeze", (r) => (r.frozenAt = time)],
  ["unknown state", (r) => (r.libraryState = "archived")],
])
  test(name, () => {
    const r = record();
    change(r);
    reject(r);
  });
test("saved needs plan/id and history needs a finite freeze instant", () => {
  for (const key of ["planSnapshot", "canonicalTripId"]) {
    const r = record("saved");
    r[key] = null;
    reject(r);
  }
  const h = record("history");
  h.frozenAt = null;
  reject(h);
  h.frozenAt = "infinity";
  reject(h);
  const s = record("saved");
  s.frozenAt = time;
  reject(s);
});
for (const from of ["draft", "saved", "history"])
  for (const to of ["draft", "saved", "history"])
    test(`lifecycle ${from} -> ${to}`, () => {
      const allowed = [
        "draft:draft",
        "draft:saved",
        "saved:saved",
        "saved:history",
      ].includes(`${from}:${to}`);
      assert.equal(canTransitionTripLibrary(from, to), allowed);
      const old = record(from),
        next = {
          ...record(to),
          id: old.id,
          ownerUserId: old.ownerUserId,
          creationKey: old.creationKey,
          storageRevision: 2,
        };
      if (allowed)
        assert.equal(validateTripLibraryUpdate(old, next).libraryState, to);
      else assert.throws(() => validateTripLibraryUpdate(old, next));
    });
test("updates require exactly one storage revision; canonical revisions never substitute", () => {
  const old = record("saved");
  for (const revision of [0, 1, 3, -1, 1.5, null, STORAGE_REVISION_MAX + 1])
    assert.throws(() =>
      validateTripLibraryUpdate(old, { ...old, storageRevision: revision }),
    );
  assert.equal(
    validateTripLibraryUpdate(old, { ...old, storageRevision: 2 }).planSnapshot
      .trip.revision,
    old.planSnapshot.trip.revision,
  );
  old.storageRevision = STORAGE_REVISION_MAX;
  assert.throws(() =>
    validateTripLibraryUpdate(old, {
      ...old,
      storageRevision: STORAGE_REVISION_MAX,
    }),
  );
});
for (const key of [
  "id",
  "ownerUserId",
  "creationKey",
  "preferenceSnapshot",
  "preferenceSourceRevision",
  "createdAt",
])
  test(`immutable creation field: ${key}`, () => {
    const old = record();
    old.preferenceSourceRevision = 1;
    const values = {
      id: randomUUID(),
      ownerUserId: randomUUID(),
      creationKey: randomUUID(),
      preferenceSnapshot: preference({ "style.pace": 3 }),
      preferenceSourceRevision: 2,
      createdAt: "2026-09-13T00:00:00Z",
    };
    assert.throws(() =>
      validateTripLibraryUpdate(old, {
        ...old,
        storageRevision: 2,
        [key]: values[key],
      }),
    );
  });
test("missing preference, explicit false/neutral, set/unset and no writeback", () => {
  assert.deepEqual(captureTripPreference(null), {
    preferenceSnapshot: preference(),
    preferenceSourceRevision: 0,
  });
  assert.deepEqual(emptyTripPreferencePatch(), patch());
  const source = {
    preference: preference({
      "mobility.fewerTransfers": true,
      "style.pace": 4,
      "dining.localCuisine": "prioritize",
    }),
    revision: 7,
  };
  const captured = captureTripPreference(source);
  const result = effectiveTripPreference(
    captured.preferenceSnapshot,
    patch(
      { "mobility.fewerTransfers": false, "dining.localCuisine": "neutral" },
      ["style.pace"],
    ),
  );
  assert.deepEqual(result.values, {
    "mobility.fewerTransfers": false,
    "dining.localCuisine": "neutral",
  });
  assert.equal(source.preference.values["style.pace"], 4);
  source.preference.values["style.pace"] = 1;
  assert.equal(captured.preferenceSnapshot.values["style.pace"], 4);
  assert.throws(() =>
    captureTripPreference({ preference: source.preference, revision: 0 }),
  );
});
for (const key of [
  "mobility.preset",
  "mobility.lessWalking",
  "attractions.nature",
  "interests.likes",
  "interests.dislikes",
  "experience.photoExperience",
])
  test(`old PR #221 key rejected: ${key}`, () => {
    const r = record();
    r.preferenceSourceRevision = 1;
    r.preferenceSnapshot = preference({ [key]: true });
    reject(r);
    r.preferenceSnapshot = preference();
    r.preferenceOverridePatch = patch({ [key]: true });
    reject(r);
  });
test("ambiguous patch, unknown unset and invalid effective preference fail closed", () => {
  const r = record();
  for (const p of [
    patch({ "style.pace": 3 }, ["style.pace"]),
    patch({}, ["legacy.key"]),
    patch({}, ["style.pace", "style.pace"]),
  ]) {
    r.preferenceOverridePatch = p;
    reject(r);
  }
  r.preferenceSourceRevision = 1;
  r.preferenceSnapshot = preference({
    "interests.details": { nature_scenery: ["mountain"] },
  });
  r.preferenceOverridePatch = patch({
    "interests.preferences": { nature_scenery: "dislike" },
  });
  reject(r);
});
test("party self flag, order, duplicates and maximum follow Companion v1", () => {
  for (const includesOwner of [false, true])
    assert.deepEqual(
      parseTripPartySnapshot({ ...party(), includesOwner }).members,
      [],
    );
  const members = Array.from({ length: MAX_COMPANIONS_PER_USER }, member),
    p = { ...party(), members };
  assert.deepEqual(
    parseTripPartySnapshot(p).members.map((m) => m.sourceCompanionId),
    members.map((m) => m.sourceCompanionId),
  );
  assert.throws(() =>
    parseTripPartySnapshot({ ...p, members: [...members, member()] }),
  );
  assert.throws(() =>
    parseTripPartySnapshot({ ...p, members: [members[0], members[0]] }),
  );
  assert.throws(() =>
    parseTripPartySnapshot({
      ...p,
      members: [
        members[0],
        {
          ...members[0],
          sourceCompanionId: members[0].sourceCompanionId.toUpperCase(),
        },
      ],
    }),
  );
  const r = record();
  r.draftFacts.participants = {
    adults: 0,
    children: 0,
    infants: 0,
    seniors: 0,
  };
  r.partySnapshot = p;
  assert.equal(
    parseTripLibraryRecord(r).partySnapshot.members.length,
    MAX_COMPANIONS_PER_USER,
  );
});
for (const key of forbiddenPartyKeys)
  test(`party never accepts privacy field: ${key}`, () => {
    const p = { ...party(), members: [member()] };
    p.members[0][key] = "Sensitive synthetic";
    assert.throws(() => parseTripPartySnapshot(p));
    assert.throws(() =>
      parseTripPartySnapshot({ ...party(), [key]: "Sensitive synthetic" }),
    );
  });
test("departure-local age reference, explicit fallback date, leap birthday and detached minimized capture", () => {
  const r = record(),
    source = {
      id: randomUUID(),
      displayName: "Synthetic",
      birthDate: "2009-04-10",
      ageGroupFallback: null,
      travelProfile: profile(),
      genderCode: "other",
      privateNote: "Do not copy",
    };
  const p = captureTripParty(r.draftFacts, "2026-09-12", true, [source]);
  assert.equal(p.ageReferenceDate, "2027-04-10");
  assert.equal(p.members[0].planningAgeGroup, "adult");
  assert.deepEqual(Object.keys(p.members[0]), [
    "sourceCompanionId",
    "displayName",
    "planningAgeGroup",
    "travelProfile",
  ]);
  source.displayName = "Edited";
  source.travelProfile.mobilityNeeds.push("reduce_stairs");
  assert.equal(p.members[0].displayName, "Synthetic");
  assert.deepEqual(p.members[0].travelProfile.mobilityNeeds, []);
  source.birthDate = "2024-02-29";
  for (const date of ["2027-02-28", "2027-03-01"]) {
    const v = captureTripParty(minimalDraftFixture(), date, false, [source]);
    assert.equal(
      v.members[0].planningAgeGroup,
      derivePlanningAgeGroup(source.birthDate, date),
    );
  }
  source.birthDate = null;
  source.ageGroupFallback = "senior";
  assert.equal(
    captureTripParty(minimalDraftFixture(), "2027-03-01", false, [source])
      .members[0].planningAgeGroup,
    "senior",
  );
  assert.throws(() =>
    captureTripParty(minimalDraftFixture(), "2027-02-30", false, [source]),
  );
});
test("copy history demands both new identities and captures current creation preference explicitly", () => {
  const old = record("history"),
    before = structuredClone(old),
    creation = {
      id: randomUUID(),
      creationKey: randomUUID(),
      createdAt: time,
      preferenceSource: {
        preference: preference({ "style.pace": 2 }),
        revision: 4,
      },
    };
  const fresh = copyHistoryToDraft(old, creation);
  assert.equal(fresh.libraryState, "draft");
  assert.equal(fresh.storageRevision, 1);
  assert.equal(fresh.canonicalTripId, null);
  assert.equal(fresh.planSnapshot, null);
  assert.equal(fresh.frozenAt, null);
  assert.deepEqual(fresh.draftFacts, old.draftFacts);
  assert.deepEqual(fresh.preferenceOverridePatch, patch());
  assert.equal(fresh.preferenceSourceRevision, 4);
  assert.equal(fresh.ownerUserId, old.ownerUserId);
  fresh.draftFacts.destinations.length = 0;
  assert.deepEqual(old, before);
  for (const key of ["id", "creationKey"])
    assert.throws(() =>
      copyHistoryToDraft(old, { ...creation, [key]: old[key] }),
    );
  assert.throws(() => copyHistoryToDraft(record("saved"), creation));
});
test("strict JSON boundary rejects getters, hidden keys, toJSON, symbols, sparse arrays and cycles without execution", () => {
  let invoked = 0;
  const getter = record();
  Object.defineProperty(getter, "id", {
    get() {
      invoked++;
      return randomUUID();
    },
    enumerable: true,
  });
  reject(getter);
  const hidden = record();
  Object.defineProperty(hidden, "privateNote", { value: "Hidden" });
  reject(hidden);
  const symbol = record();
  symbol[Symbol("hidden")] = 1;
  reject(symbol);
  const cycle = record();
  cycle.draftFacts.self = cycle;
  reject(cycle);
  const toJSON = record();
  toJSON.draftFacts.toJSON = () => {
    invoked++;
    return {};
  };
  reject(toJSON);
  const sparse = record();
  sparse.partySnapshot.members = Array(1);
  reject(sparse);
  for (const value of [
    undefined,
    NaN,
    Infinity,
    1n,
    new Date(),
    Object.create(null),
  ]) {
    const r = record();
    r.draftFacts.title = value;
    reject(r);
  }
  for (const title of ["a\u0000b", "\ud800"]) {
    const r = record();
    r.draftFacts.title = title;
    reject(r);
  }
  assert.equal(invoked, 0);
});
test("payload caps mirror SQL and reuse existing Preference/Companion constants", () => {
  const migration = read(
    "../supabase/migrations/20260912100000_create_trip_library_records.sql",
  );
  for (const [column, key] of [
    ["draft_facts", "draftFacts"],
    ["wizard_progress", "wizardProgress"],
    ["plan_snapshot", "planSnapshot"],
    ["preference_override_patch", "preferenceOverridePatch"],
  ])
    assert.match(
      migration,
      new RegExp(
        `is_trip_library_envelope_v1\\(${column},'[^']+',${caps[key]}\\)`,
      ),
    );
  assert.match(
    migration,
    new RegExp(`'schemaVersion', ${caps.partySnapshot}\\)`),
  );
  assert.equal(caps.preferenceSnapshot, PREFERENCE_MAX_BYTES);
  assert.equal(caps.preferenceOverridePatch, PREFERENCE_MAX_BYTES);
  assert.match(
    migration,
    new RegExp(
      `jsonb_array_length\\(payload->'members'\\) > ${MAX_COMPANIONS_PER_USER}`,
    ),
  );
  const canonical = record("saved");
  for (const [key, max] of Object.entries(caps))
    assert.ok(Buffer.byteLength(jsonbText(canonical[key])) < max);
});
for (const key of Object.keys(caps))
  test(`bounded UTF-8 input rejects oversized ${key} before semantic delegation`, () => {
    const r = record("saved");
    r[key] = {
      contractVersion: "1.0",
      schemaVersion: "1.0",
      padding: "界".repeat(Math.ceil(caps[key] / 3)),
    };
    assert.throws(
      () => parseTripLibraryRecord(r),
      (e) => e.code === "PAYLOAD_TOO_LARGE",
    );
  });
test("server schema rejects browser import and B model has no server/client I/O", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      "await import('./src/db/schema/trip-library.ts')",
    ],
    {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /server-only|Client Component/);
  const domain = read(
    "../src/features/trip-library/domain/trip-persistence-v1.ts",
  );
  assert.doesNotMatch(
    domain,
    /fetch\(|from ["'][^"']*(?:\/db\/|\/server\/|\/preferences\/planner)/,
  );
});

test("canonical plan at exact UTF-8 cap roundtrips; one extra byte fails", () => {
  const r = record("saved");
  r.planSnapshot = planAtBytes(caps.planSnapshot);
  assert.equal(parseTripPlanSnapshot(r.planSnapshot).ok, true);
  assert.deepEqual(parseTripLibraryRecord(r).planSnapshot, r.planSnapshot);
  r.planSnapshot.trip.title += "x";
  assert.throws(
    () => parseTripLibraryRecord(r),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
});
