// B-internal Companion v1. No UI persistence, identity inference or Trip adapter.
export const MOBILITY_NEED_METADATA = Object.freeze({
  reduce_walking: "soft_constraint_input",
  reduce_stairs: "soft_constraint_input",
  stroller: "equipment_context",
  child_seat: "conditional_hard_when_car_applies",
  accessible_route: "hard_functional_requirement",
  more_rest: "soft_constraint_input",
} as const);
export type MobilityNeedCode = keyof typeof MOBILITY_NEED_METADATA;
export const MOBILITY_NEED_CODES = Object.freeze(
  Object.keys(MOBILITY_NEED_METADATA) as MobilityNeedCode[],
);
export const DINING_NEED_CODES = Object.freeze([
  "dietary_restriction",
  "food_allergy_notice",
  "vegetarian",
  "child_meal",
  "other_dietary_need",
] as const);
export type DiningNeedCode = (typeof DINING_NEED_CODES)[number];
export const ACTIVITY_INTEREST_METADATA = Object.freeze({
  animals: "soft_positive_signal",
  outdoor: "soft_positive_signal",
  museums: "soft_positive_signal",
  photography: "soft_positive_signal",
  rides: "soft_positive_signal",
} as const);
export type ActivityInterestCode = keyof typeof ACTIVITY_INTEREST_METADATA;
export const ACTIVITY_INTEREST_CODES = Object.freeze(
  Object.keys(ACTIVITY_INTEREST_METADATA) as ActivityInterestCode[],
);
export const RELATIONSHIP_CODES = Object.freeze([
  "family",
  "partner",
  "friend",
  "colleague",
  "other",
] as const);
export const GENDER_CODES = Object.freeze(["female", "male", "other"] as const);
export const PLANNING_AGE_GROUPS = Object.freeze([
  "infant",
  "child",
  "adult",
  "senior",
] as const);
export type PlanningAgeGroup = (typeof PLANNING_AGE_GROUPS)[number];
export const TRAVEL_PROFILE_MAX_BYTES = 8192;

export interface CompanionTravelProfileV1 {
  schemaVersion: "1.0";
  mobilityNeeds: MobilityNeedCode[];
  diningNeeds: DiningNeedCode[];
  activityInterests: ActivityInterestCode[];
}
export class CompanionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanionValidationError";
  }
}
function fail(): never {
  // Do not include potentially sensitive input in errors.
  throw new CompanionValidationError("Invalid Companion v1 value");
}
function record(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    fail();
  const ownKeys = Reflect.ownKeys(input);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor))
      fail();
    result[key] = descriptor.value;
  }
  return result;
}
function codes<T extends string>(input: unknown, allowed: readonly T[]): T[] {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > allowed.length
  )
    fail();
  if (Reflect.ownKeys(input).length !== input.length + 1) fail();
  const result: T[] = [];
  for (let i = 0; i < input.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(i));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor))
      fail();
    const value: unknown = descriptor.value;
    if (
      typeof value !== "string" ||
      !allowed.includes(value as T) ||
      result.includes(value as T)
    )
      fail();
    result.push(value as T);
  }
  return result;
}
export function parseCompanionTravelProfileV1(
  input: unknown,
): CompanionTravelProfileV1 {
  const value = record(input, [
    "schemaVersion",
    "mobilityNeeds",
    "diningNeeds",
    "activityInterests",
  ]);
  if (value.schemaVersion !== "1.0") fail();
  const output: CompanionTravelProfileV1 = {
    schemaVersion: "1.0",
    mobilityNeeds: codes(value.mobilityNeeds, MOBILITY_NEED_CODES),
    diningNeeds: codes(value.diningNeeds, DINING_NEED_CODES),
    activityInterests: codes(value.activityInterests, ACTIVITY_INTEREST_CODES),
  };
  // All accepted codes are ASCII. JSON.stringify length therefore equals UTF-8
  // byte length. The finite, unique code sets also give a much tighter bound.
  if (JSON.stringify(output).length > TRAVEL_PROFILE_MAX_BYTES) fail();
  return output;
}
function calendarDate(input: string): [number, number, number] {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) fail();
  const [year, month, day] = input.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > lengths[month - 1]
  )
    fail();
  return [year, month, day];
}
// Planning-only Gregorian calendar convention: Feb 29 birthday advances on
// March 1 in a non-leap year. This is not a legal, booking, ticket or fare rule.
export function derivePlanningAgeGroup(
  birthDate: string,
  referenceDate: string,
): PlanningAgeGroup {
  const [year, month, day] = calendarDate(birthDate);
  const [referenceYear, referenceMonth, referenceDay] =
    calendarDate(referenceDate);
  if (birthDate > referenceDate) fail();
  const beforeBirthday =
    referenceMonth < month || (referenceMonth === month && referenceDay < day);
  const age = referenceYear - year - Number(beforeBirthday);
  return age < 3
    ? "infant"
    : age < 18
      ? "child"
      : age < 65
        ? "adult"
        : "senior";
}
export type CompanionAgeSource =
  | { birthDate: string; ageGroupFallback: null }
  | { birthDate: null; ageGroupFallback: PlanningAgeGroup };
export function parseCompanionAgeSource(
  input: unknown,
  referenceDate: string,
): CompanionAgeSource {
  calendarDate(referenceDate);
  const value = record(input, ["birthDate", "ageGroupFallback"]);
  if (typeof value.birthDate === "string" && value.ageGroupFallback === null) {
    derivePlanningAgeGroup(value.birthDate, referenceDate);
    return { birthDate: value.birthDate, ageGroupFallback: null };
  }
  if (
    value.birthDate === null &&
    typeof value.ageGroupFallback === "string" &&
    PLANNING_AGE_GROUPS.includes(value.ageGroupFallback as PlanningAgeGroup)
  ) {
    return {
      birthDate: null,
      ageGroupFallback: value.ageGroupFallback as PlanningAgeGroup,
    };
  }
  return fail();
}

export const MAX_COMPANIONS_PER_USER = 100;
export const MAX_COMPANION_GROUPS = 20;
export const MAX_COMPANION_GROUP_MEMBERS = 20;

export type CompanionInputV1 = CompanionAgeSource & {
  displayName: string;
  relationshipCode: (typeof RELATIONSHIP_CODES)[number] | null;
  relationshipLabel: string | null;
  genderCode: (typeof GENDER_CODES)[number] | null;
  avatarPath: string | null;
  travelProfile: CompanionTravelProfileV1;
};
export type CompanionGroupInputV1 = {
  name: string;
  includesOwner: boolean;
  memberIds: string[];
};
export function parseCompanionId(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    fail();
  return input.toLowerCase();
}
function boundedText(
  input: unknown,
  max: number,
  required = false,
): string | null {
  if (input === null && !required) return null;
  if (typeof input !== "string" || [...input].length > max) fail();
  if (required && (!input.length || input !== input.replace(/^ +| +$/g, "")))
    fail();
  return input;
}
function optionalCode<T extends string>(
  input: unknown,
  allowed: readonly T[],
): T | null {
  if (input === null) return null;
  if (typeof input !== "string" || !allowed.includes(input as T)) fail();
  return input as T;
}
// TASK-047 extends the sole parser with the relational writable envelope.
// The existing travel-profile and age parsers retain their frozen semantics.
export function parseCompanionInputV1(
  input: unknown,
  referenceDate: string,
): CompanionInputV1 {
  const value = record(input, [
    "displayName",
    "relationshipCode",
    "relationshipLabel",
    "birthDate",
    "ageGroupFallback",
    "genderCode",
    "avatarPath",
    "travelProfile",
  ]);
  const avatarPath = boundedText(value.avatarPath, 1024);
  if (
    avatarPath !== null &&
    (!avatarPath ||
      avatarPath !== avatarPath.replace(/^ +| +$/g, "") ||
      /(^\/|:|\\|(^|\/)\.\.?($|\/))/.test(avatarPath))
  )
    fail();
  return {
    displayName: boundedText(value.displayName, 100, true)!,
    relationshipCode: optionalCode(value.relationshipCode, RELATIONSHIP_CODES),
    relationshipLabel: boundedText(value.relationshipLabel, 100),
    ...parseCompanionAgeSource(
      { birthDate: value.birthDate, ageGroupFallback: value.ageGroupFallback },
      referenceDate,
    ),
    genderCode: optionalCode(value.genderCode, GENDER_CODES),
    avatarPath,
    travelProfile: parseCompanionTravelProfileV1(value.travelProfile),
  };
}
export function parseCompanionGroupInputV1(
  input: unknown,
): CompanionGroupInputV1 {
  const value = record(input, ["name", "includesOwner", "memberIds"]);
  if (
    typeof value.includesOwner !== "boolean" ||
    !Array.isArray(value.memberIds) ||
    Object.getPrototypeOf(value.memberIds) !== Array.prototype ||
    value.memberIds.length > MAX_COMPANION_GROUP_MEMBERS ||
    Reflect.ownKeys(value.memberIds).length !== value.memberIds.length + 1
  )
    fail();
  const memberIds: string[] = [];
  for (let i = 0; i < value.memberIds.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(
      value.memberIds,
      String(i),
    );
    if (!descriptor?.enumerable || !("value" in descriptor)) fail();
    const id = parseCompanionId(descriptor.value);
    if (memberIds.includes(id)) fail();
    memberIds.push(id);
  }
  return {
    name: boundedText(value.name, 100, true)!,
    includesOwner: value.includesOwner,
    memberIds,
  };
}
