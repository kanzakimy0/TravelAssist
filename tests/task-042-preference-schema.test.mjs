import assert from "node:assert/strict";
import { test } from "node:test";
import {
  preferenceFields,
  preferenceKeys,
  interestCodes,
  interestDetails,
  parsePreferenceV1,
  parsePreferencePatchV1,
  applyPreferencePatch,
  emptyPreference,
  PreferenceValidationError,
} from "../src/features/preferences/domain/preference-v1.ts";
import {
  expectedRules,
  expectedDetails,
  validPayloads,
  invalidPayloads,
  payload,
} from "./task-042-preference-fixtures.mjs";

test("TASK-042 exact frozen registry and hard/soft/UI metadata", () => {
  assert.equal(preferenceKeys.length, 23);
  assert.deepEqual(
    [...preferenceKeys].sort(),
    Object.keys(expectedRules).sort(),
  );
  assert.deepEqual(
    [...interestCodes].sort(),
    Object.keys(expectedDetails).sort(),
  );
  assert.equal(interestCodes.length, 16);
  assert.deepEqual(interestDetails, expectedDetails);
  assert.deepEqual(
    Object.entries(preferenceFields)
      .filter(([, v]) => v.strength === "hard_when_true")
      .map(([k]) => k)
      .sort(),
    ["mobility.noBus", "mobility.noFerry", "mobility.noPublicTransit"],
  );
  assert.deepEqual(
    Object.entries(preferenceFields)
      .filter(([, v]) => v.strength === "soft_constraint_input")
      .map(([k]) => k)
      .sort(),
    ["dining.queueTolerance", "mobility.walkingTolerance"],
  );
  for (const [key, field] of Object.entries(preferenceFields)) {
    assert.equal(typeof field.parse, "function");
    assert.equal(
      field.uiTier,
      [
        "mobility.walkingTolerance",
        "mobility.noPublicTransit",
        "mobility.noBus",
        "mobility.noFerry",
        "interests.details",
      ].includes(key)
        ? 3
        : 2,
    );
    assert.ok(Object.isFrozen(field));
  }
  assert.ok(Object.isFrozen(preferenceFields));
});
for (const [i, input] of validPayloads.entries())
  test("TASK-042 valid vector " + i, () => {
    assert.deepEqual(parsePreferenceV1(input), input);
  });
for (const [i, input] of invalidPayloads.entries())
  test("TASK-042 rejected vector " + i, () => {
    assert.throws(() => parsePreferenceV1(input), PreferenceValidationError);
  });
test("TASK-042 sparse values preserve false/neutral without injecting defaults", () => {
  assert.deepEqual(emptyPreference(), payload());
  const value = parsePreferenceV1(
    payload({
      "mobility.fewerTransfers": false,
      "dining.localCuisine": "neutral",
    }),
  );
  assert.equal(Object.keys(value.values).length, 2);
  assert.equal(Object.hasOwn(value.values, "style.planning"), false);
});
test("TASK-042 size, non-JSON objects, getters, hidden/symbol keys and cycles fail closed", () => {
  assert.throws(
    () => parsePreferenceV1(payload({ "style.planning": "日".repeat(22000) })),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
  let called = false;
  const accessor = Object.defineProperty({}, "food", {
    enumerable: true,
    get() {
      called = true;
      return "like";
    },
  });
  const hidden = Object.defineProperty({}, "food", { value: "like" });
  const arrayAccessor = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      called = true;
      return "sushi";
    },
  });
  const cycle = {};
  cycle.food = cycle;
  for (const value of [
    Object.create(null),
    Object.create({ food: "like" }),
    new Date(),
    new Map(),
    new Set(),
    { food: undefined },
    { food: NaN },
    { food: Infinity },
    { food: 1n },
    { food: () => {} },
    { [Symbol("food")]: "like" },
    accessor,
    hidden,
    cycle,
  ]) {
    assert.throws(
      () => parsePreferenceV1(payload({ "interests.preferences": value })),
      PreferenceValidationError,
    );
  }
  for (const value of [
    arrayAccessor,
    Array(1),
    Object.assign(["sushi"], { extra: true }),
  ])
    assert.throws(
      () =>
        parsePreferenceV1(payload({ "interests.details": { food: value } })),
      PreferenceValidationError,
    );
  assert.equal(called, false);
});
const patch = (set = {}, unset = []) => ({ schemaVersion: "1.0", set, unset });
test("TASK-042 set/unset, explicit false, detached results and whole-map replacement", () => {
  const base = payload({
    "interests.preferences": { food: "like", shopping: "dislike" },
    "style.planning": 5,
  });
  const changes = patch(
    {
      "interests.preferences": { photography: "like" },
      "mobility.noBus": false,
    },
    ["style.planning"],
  );
  const result = applyPreferencePatch(base, changes);
  assert.deepEqual(
    result,
    payload({
      "interests.preferences": { photography: "like" },
      "mobility.noBus": false,
    }),
  );
  result.values["interests.preferences"].photography = "dislike";
  assert.equal(changes.set["interests.preferences"].photography, "like");
  assert.equal(base.values["style.planning"], 5);
  assert.deepEqual(
    applyPreferencePatch(
      base,
      patch({}, ["interests.preferences", "style.planning"]),
    ),
    emptyPreference(),
  );
  assert.deepEqual(
    applyPreferencePatch(emptyPreference(), patch({}, ["style.pace"])),
    emptyPreference(),
  );
  assert.deepEqual(
    applyPreferencePatch(
      payload({ "interests.details": { food: ["sushi"] } }),
      patch({ "interests.details": {} }),
    ),
    payload({ "interests.details": {} }),
  );
});
test("TASK-042 strict patch parser rejects ambiguous/duplicate/unknown input", () => {
  for (const input of [
    patch({}, ["style.pace", "style.pace"]),
    patch({ "style.pace": 1 }, ["style.pace"]),
    patch({}, ["mobility.preset"]),
    patch({ "style.pace": 6 }),
    { ...patch(), owner: "fake" },
    { ...patch(), schemaVersion: "2.0" },
    { ...patch(), unset: null },
    { ...patch(), set: null },
    { schemaVersion: "1.0", set: {} },
    { schemaVersion: "1.0", unset: [] },
    patch({}, Array(1)),
    patch({}, [null]),
  ])
    assert.throws(
      () => parsePreferencePatchV1(input),
      PreferenceValidationError,
    );
});
test("TASK-042 patches reparse existing input and final cross-field interests", () => {
  const base = payload({ "interests.details": { food: ["sushi"] } });
  assert.throws(
    () =>
      applyPreferencePatch(
        base,
        patch({ "interests.preferences": { food: "dislike" } }),
      ),
    /CONFLICTING_INTEREST/,
  );
  assert.deepEqual(
    applyPreferencePatch(
      base,
      patch({ "interests.preferences": { food: "dislike" } }, [
        "interests.details",
      ]),
    ),
    payload({ "interests.preferences": { food: "dislike" } }),
  );
  assert.throws(
    () => applyPreferencePatch(payload({ "style.pace": 0 }), patch()),
    PreferenceValidationError,
  );
  assert.throws(
    () => applyPreferencePatch(emptyPreference(), patch({}, ["bad"])),
    PreferenceValidationError,
  );
});
