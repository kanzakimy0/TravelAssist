import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  parseCompanionTravelProfileV1 as parse,
  CompanionValidationError,
  derivePlanningAgeGroup as age,
  parseCompanionAgeSource,
  MOBILITY_NEED_CODES,
  MOBILITY_NEED_METADATA,
  DINING_NEED_CODES,
  ACTIVITY_INTEREST_CODES,
  ACTIVITY_INTEREST_METADATA,
  RELATIONSHIP_CODES,
  GENDER_CODES,
  PLANNING_AGE_GROUPS,
  TRAVEL_PROFILE_MAX_BYTES,
} from "../src/features/companions/domain/companion-v1.ts";
import {
  codes,
  emptyProfile,
  fullProfile,
  validProfiles,
  invalidProfiles,
  ageVectors,
  invalidDates,
  nearLimitJson,
} from "./task-044-companion-fixtures.mjs";

for (const [name, value] of validProfiles)
  test("Companion profile accepts " + name, () =>
    assert.deepEqual(parse(value), value),
  );
for (const [name, value] of invalidProfiles)
  test("Companion profile rejects " + name, () =>
    assert.throws(() => parse(value), CompanionValidationError),
  );
for (const [birth, reference, expected] of ageVectors)
  test("Planning age " + birth + " at " + reference, () =>
    assert.equal(age(birth, reference), expected),
  );
for (const value of invalidDates)
  test("Strict calendar " + String(value), () => {
    assert.throws(() => age(value, "2026-09-11"), CompanionValidationError);
    assert.throws(() => age("2000-01-01", value), CompanionValidationError);
  });
test("future date rejected; century leap calendar; timezone independent", () => {
  assert.throws(
    () => age("2026-09-12", "2026-09-11"),
    CompanionValidationError,
  );
  assert.equal(age("2000-02-29", "2003-03-01"), "child");
  const moduleUrl = new URL(
    "../src/features/companions/domain/companion-v1.ts",
    import.meta.url,
  ).href;
  const script = `import {derivePlanningAgeGroup as age} from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(${JSON.stringify(ageVectors)}.map(([a,b])=>age(a,b))));`;
  for (const TZ of [
    "UTC",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ]) {
    const result = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8", env: { ...process.env, TZ }, windowsHide: true },
    );
    assert.deepEqual(
      JSON.parse(result),
      ageVectors.map((x) => x[2]),
    );
  }
});
test("strict age source XOR; identity never supplies needs", () => {
  for (const ageGroupFallback of PLANNING_AGE_GROUPS) {
    assert.deepEqual(
      parseCompanionAgeSource(
        { birthDate: null, ageGroupFallback },
        "2026-09-11",
      ),
      { birthDate: null, ageGroupFallback },
    );
    assert.deepEqual(parse(emptyProfile()), emptyProfile());
  }
  assert.deepEqual(
    parseCompanionAgeSource(
      { birthDate: "2000-01-01", ageGroupFallback: null },
      "2026-09-11",
    ),
    { birthDate: "2000-01-01", ageGroupFallback: null },
  );
  for (const value of [
    {},
    { birthDate: null, ageGroupFallback: null },
    { birthDate: "2000-01-01", ageGroupFallback: "adult" },
    { birthDate: null, ageGroupFallback: "成年人" },
    { birthDate: "2099-01-01", ageGroupFallback: null },
    { birthDate: "2000-01-01", ageGroupFallback: null, gender: "female" },
  ])
    assert.throws(
      () => parseCompanionAgeSource(value, "2026-09-11"),
      CompanionValidationError,
    );
});
test("frozen registry and metadata exactly match the design", () => {
  assert.deepEqual(MOBILITY_NEED_CODES, codes.mobilityNeeds);
  assert.deepEqual(DINING_NEED_CODES, codes.diningNeeds);
  assert.deepEqual(ACTIVITY_INTEREST_CODES, codes.activityInterests);
  assert.deepEqual(MOBILITY_NEED_METADATA, {
    reduce_walking: "soft_constraint_input",
    reduce_stairs: "soft_constraint_input",
    stroller: "equipment_context",
    child_seat: "conditional_hard_when_car_applies",
    accessible_route: "hard_functional_requirement",
    more_rest: "soft_constraint_input",
  });
  assert.ok(
    Object.values(ACTIVITY_INTEREST_METADATA).every(
      (x) => x === "soft_positive_signal",
    ),
  );
  assert.deepEqual(RELATIONSHIP_CODES, [
    "family",
    "partner",
    "friend",
    "colleague",
    "other",
  ]);
  assert.deepEqual(GENDER_CODES, ["female", "male", "other"]);
  for (const registry of [
    MOBILITY_NEED_CODES,
    MOBILITY_NEED_METADATA,
    DINING_NEED_CODES,
    ACTIVITY_INTEREST_CODES,
    ACTIVITY_INTEREST_METADATA,
    RELATIONSHIP_CODES,
    GENDER_CODES,
    PLANNING_AGE_GROUPS,
  ])
    assert.ok(Object.isFrozen(registry));
  assert.equal(TRAVEL_PROFILE_MAX_BYTES, 8192);
  assert.equal(Buffer.byteLength(nearLimitJson), 8191);
  assert.ok(Buffer.byteLength(JSON.stringify(fullProfile())) < 8192);
});
test("defensive independent arrays, no invoking getters or accepting exotic JS", () => {
  const input = fullProfile(),
    output = parse(input);
  output.mobilityNeeds.length = 0;
  assert.equal(input.mobilityNeeds.length, 6);
  input.diningNeeds.length = 0;
  assert.equal(output.diningNeeds.length, 5);
  const getter = emptyProfile();
  Object.defineProperty(getter, "mobilityNeeds", {
    get() {
      throw Error("must not execute");
    },
    enumerable: true,
  });
  const getterArray = [];
  Object.defineProperty(getterArray, "0", {
    get() {
      throw Error("must not execute");
    },
    enumerable: true,
  });
  const hidden = emptyProfile();
  Object.defineProperty(hidden, "hidden", { value: true });
  const symbol = emptyProfile();
  symbol[Symbol("extra")] = true;
  const extraArray = [];
  extraArray.foo = "x";
  const arraySymbol = [];
  arraySymbol[Symbol("extra")] = true;
  const hiddenArray = ["stroller"];
  Object.defineProperty(hiddenArray, "0", {
    value: "stroller",
    enumerable: false,
  });
  const nullProto = Object.assign(Object.create(null), emptyProfile());
  const cycle = emptyProfile();
  cycle.mobilityNeeds = [cycle];
  for (const value of [
    getter,
    hidden,
    symbol,
    nullProto,
    new Date(),
    new Map(),
    Object.assign(Object.create({}), emptyProfile()),
    { ...emptyProfile(), mobilityNeeds: getterArray },
    { ...emptyProfile(), mobilityNeeds: extraArray },
    { ...emptyProfile(), mobilityNeeds: arraySymbol },
    { ...emptyProfile(), mobilityNeeds: hiddenArray },
    { ...emptyProfile(), mobilityNeeds: new Array(1) },
    cycle,
  ])
    assert.throws(() => parse(value), CompanionValidationError);
});
test("real generated types contain the three canonical tables and composite relationships", () => {
  const source = readFileSync(
    new URL("../src/types/database.generated.ts", import.meta.url),
    "utf8",
  );
  for (const name of [
    "companions",
    "companion_groups",
    "companion_group_members",
  ])
    assert.match(source, new RegExp(name + ": \\{"));
  for (const fk of [
    "companion_group_members_group_owner_fk",
    "companion_group_members_companion_owner_fk",
  ])
    assert.ok(source.includes(fk));
});
