/**
 * TASK-042-B canonical semantics, promoted by TASK-046-B. Public reads use index.ts.
 * Missing is unset. No UI defaults, presets, trip facts or derived scores.
 */
export type PreferenceStrength =
  "soft" | "soft_constraint_input" | "hard_when_true";
export type PreferenceUiTier = 2 | 3;
export const PREFERENCE_MAX_BYTES = 64 * 1024;

export class PreferenceValidationError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string) {
    super(code + " at " + path);
    this.name = "PreferenceValidationError";
    this.code = code;
    this.path = path;
  }
}
function invalid(code: string, path: string): never {
  throw new PreferenceValidationError(code, path);
}

function object(input: unknown, path: string): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    invalid("EXPECTED_PLAIN_OBJECT", path);
  const output: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") invalid("INVALID_JSON", path);
    const d = Object.getOwnPropertyDescriptor(input, key)!;
    if (!d.enumerable || !("value" in d)) invalid("INVALID_JSON", path);
    // Define instead of assign: "__proto__" must remain an own, rejectable key.
    Object.defineProperty(output, key, { value: d.value, enumerable: true });
  }
  return output;
}
function array(input: unknown, path: string, max: number): unknown[] {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > max ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    invalid("INVALID_ARRAY", path);
  const result: unknown[] = [];
  for (let i = 0; i < input.length; i++) {
    const d = Object.getOwnPropertyDescriptor(input, String(i));
    if (!d || !d.enumerable || !("value" in d)) invalid("INVALID_JSON", path);
    result.push(d.value);
  }
  return result;
}

// Validate JSON descriptors before serialization; never invoke a getter/toJSON.
// Bounded depth and bytes also apply to malformed inputs and patches.
function boundedJson(input: unknown): unknown {
  let bytes = 0;
  const charge = (text: string) => {
    for (const char of text) {
      const cp = char.codePointAt(0)!;
      bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
      if (bytes > PREFERENCE_MAX_BYTES) invalid("PAYLOAD_TOO_LARGE", "$");
    }
  };
  const copy = (v: unknown, depth: number): unknown => {
    if (depth > 8) invalid("INVALID_JSON", "$");
    if (
      v === null ||
      typeof v === "boolean" ||
      typeof v === "string" ||
      (typeof v === "number" && Number.isFinite(v))
    ) {
      charge(JSON.stringify(v));
      return v;
    }
    if (Array.isArray(v)) {
      charge("[]");
      return array(v, "$", PREFERENCE_MAX_BYTES).map((item, i) => {
        if (i) charge(",");
        return copy(item, depth + 1);
      });
    }
    const source = object(v, "$");
    charge("{}");
    return Object.fromEntries(
      Object.entries(source).map(([k, value], i) => {
        charge((i ? "," : "") + JSON.stringify(k) + ":");
        return [k, copy(value, depth + 1)];
      }),
    );
  };
  return copy(input, 0);
}

export const interestDetails = Object.freeze({
  nature_scenery: Object.freeze([
    "mountain",
    "coast",
    "lake",
    "forest",
    "flower_field",
  ] as const),
  history_culture: Object.freeze([
    "shrine_temple",
    "castle",
    "museum",
    "historic_district",
  ] as const),
  food: Object.freeze([
    "sushi",
    "ramen",
    "regional_cuisine",
    "dessert",
    "sake",
  ] as const),
  photography: Object.freeze([
    "street_photography",
    "landscape",
    "nightscape",
    "architecture",
    "people_culture",
  ] as const),
  onsen_wellness: Object.freeze([
    "ryokan_onsen",
    "open_air_bath",
    "forest_wellness",
    "sea_view_onsen",
  ] as const),
  art_museums: Object.freeze([
    "contemporary_art",
    "traditional_crafts",
    "architecture",
    "design_exhibition",
  ] as const),
  anime_entertainment: Object.freeze([
    "anime_pilgrimage",
    "gaming",
    "themed_cafe",
    "merchandise",
  ] as const),
  shopping: Object.freeze([
    "department_store",
    "vintage",
    "drugstore",
    "local_specialties",
  ] as const),
  urban_exploration: Object.freeze([
    "distinctive_neighborhood",
    "architecture_walk",
    "cafe",
    "city_nightscape",
  ] as const),
  outdoor_activity: Object.freeze([
    "hiking",
    "cycling",
    "skiing",
    "water_activity",
  ] as const),
  night_experience: Object.freeze([
    "izakaya",
    "nightscape",
    "performance",
    "night_walk",
  ] as const),
  family_activity: Object.freeze([
    "zoo",
    "science_museum",
    "family_crafts",
    "park",
  ] as const),
  traditional_experience: Object.freeze([
    "tea_ceremony",
    "kimono",
    "crafts",
    "traditional_performance",
  ] as const),
  theme_parks: Object.freeze([
    "major_theme_park",
    "character_park",
    "aquarium",
    "immersive_exhibition",
  ] as const),
  rural_towns: Object.freeze([
    "historic_town",
    "fishing_village",
    "countryside",
    "local_market",
  ] as const),
  seasonal_events: Object.freeze([
    "cherry_blossom",
    "autumn_leaves",
    "snow_scenery",
    "festival",
    "fireworks",
  ] as const),
});
export type InterestCode = keyof typeof interestDetails;
export type InterestDetailCode = (typeof interestDetails)[InterestCode][number];
export type InterestPreferenceSignal = "like" | "dislike";
export type InterestPreferences = Partial<
  Record<InterestCode, InterestPreferenceSignal>
>;
export type InterestDetailValues = {
  [K in InterestCode]?: (typeof interestDetails)[K][number][];
};
export const interestCodes = Object.freeze(
  Object.keys(interestDetails) as InterestCode[],
);

type Parser<T> = (input: unknown, path: string) => T;
const boolean: Parser<boolean> = (v, p) =>
  typeof v === "boolean" ? v : invalid("EXPECTED_BOOLEAN", p);
function oneOf<const T extends readonly (string | number)[]>(
  options: T,
): Parser<T[number]> {
  return (v, p) =>
    options.some((option) => option === v)
      ? (v as T[number])
      : invalid("INVALID_VALUE", p);
}
export const walkingToleranceValues = Object.freeze([
  "veryLow",
  "low",
  "standard",
  "high",
  "veryHigh",
] as const);
export const priorityValues = Object.freeze([
  "deprioritize",
  "neutral",
  "prioritize",
] as const);
export const queueToleranceValues = Object.freeze([
  "low",
  "medium",
  "high",
] as const);
export const spendingTendencyValues = Object.freeze([
  "economical",
  "moderate",
  "flexible",
] as const);
const style = oneOf([1, 2, 3, 4, 5] as const);
const signals = oneOf(["like", "dislike"] as const);
const preferences: Parser<InterestPreferences> = (input, path) =>
  Object.fromEntries(
    Object.entries(object(input, path)).map(([key, value]) => {
      if (!Object.hasOwn(interestDetails, key))
        invalid("UNKNOWN_INTEREST", path);
      return [key, signals(value, path + "." + key)];
    }),
  );
const details: Parser<InterestDetailValues> = (input, path) =>
  Object.fromEntries(
    Object.entries(object(input, path)).map(([key, value]) => {
      if (!Object.hasOwn(interestDetails, key))
        invalid("UNKNOWN_INTEREST", path);
      const options = interestDetails[key as InterestCode];
      const items = array(value, path + "." + key, options.length).map((v) =>
        oneOf(options)(v, path + "." + key),
      );
      if (new Set(items).size !== items.length)
        invalid("DUPLICATE_DETAIL", path);
      return [key, items];
    }),
  );

function field<T>(
  parse: Parser<T>,
  strength: PreferenceStrength = "soft",
  uiTier: PreferenceUiTier = 2,
) {
  return Object.freeze({ parse, strength, uiTier });
}
// The sole TS field registry drives types, metadata and all field parsing.
export const preferenceFields = Object.freeze({
  "mobility.fewerTransfers": field(boolean),
  "mobility.walkingTolerance": field(
    oneOf(walkingToleranceValues),
    "soft_constraint_input",
    3,
  ),
  "mobility.noPublicTransit": field(boolean, "hard_when_true", 3),
  "mobility.noBus": field(boolean, "hard_when_true", 3),
  "mobility.noFerry": field(boolean, "hard_when_true", 3),
  "dining.localCuisine": field(oneOf(priorityValues)),
  "dining.smallShops": field(oneOf(priorityValues)),
  "dining.queueTolerance": field(
    oneOf(queueToleranceValues),
    "soft_constraint_input",
  ),
  "accommodation.transportConvenience": field(oneOf(priorityValues)),
  "accommodation.comfort": field(oneOf(priorityValues)),
  "accommodation.fewerHotelChanges": field(oneOf(priorityValues)),
  "budget.spendingTendency": field(oneOf(spendingTendencyValues)),
  "budget.prioritizeAccommodation": field(boolean),
  "budget.prioritizeExperience": field(boolean),
  "interests.preferences": field(preferences),
  "interests.details": field(details, "soft", 3),
  "style.pace": field(style),
  "style.depth": field(style),
  "style.discovery": field(style),
  "style.movement": field(style),
  "style.coverage": field(style),
  "style.priority": field(style),
  "style.planning": field(style),
});
export type PreferenceKey = keyof typeof preferenceFields;
export type PreferenceValuesV1 = {
  [K in PreferenceKey]?: ReturnType<(typeof preferenceFields)[K]["parse"]>;
};
export type PreferenceV1 = { schemaVersion: "1.0"; values: PreferenceValuesV1 };
export type PreferencePatchV1 = {
  schemaVersion: "1.0";
  set: PreferenceValuesV1;
  unset: PreferenceKey[];
};
export const preferenceKeys = Object.freeze(
  Object.keys(preferenceFields) as PreferenceKey[],
);
export const emptyPreference = (): PreferenceV1 => ({
  schemaVersion: "1.0",
  values: {},
});

function parseValues(input: unknown, path: string): PreferenceValuesV1 {
  const values = Object.fromEntries(
    Object.entries(object(input, path)).map(([k, v]) => {
      if (!Object.hasOwn(preferenceFields, k))
        invalid("UNKNOWN_PREFERENCE_KEY", path + "." + k);
      return [k, preferenceFields[k as PreferenceKey].parse(v, path + "." + k)];
    }),
  ) as PreferenceValuesV1;
  for (const [parent, children] of Object.entries(
    values["interests.details"] ?? {},
  )) {
    if (
      children.length &&
      values["interests.preferences"]?.[parent as InterestCode] === "dislike"
    )
      invalid("CONFLICTING_INTEREST", path + ".interests.details." + parent);
  }
  return values;
}
function envelope(input: unknown, keys: string[]): Record<string, unknown> {
  const value = object(boundedJson(input), "$");
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    invalid("INVALID_ENVELOPE", "$");
  if (value.schemaVersion !== "1.0")
    invalid("UNSUPPORTED_VERSION", "$.schemaVersion");
  return value;
}
/** Throws PreferenceValidationError; returns a detached, canonical sparse value. */
export function parsePreferenceV1(input: unknown): PreferenceV1 {
  const value = envelope(input, ["schemaVersion", "values"]);
  return {
    schemaVersion: "1.0",
    values: parseValues(value.values, "$.values"),
  };
}
export function parsePreferencePatchV1(input: unknown): PreferencePatchV1 {
  const value = envelope(input, ["schemaVersion", "set", "unset"]);
  const set = parseValues(value.set, "$.set");
  const unset = array(value.unset, "$.unset", preferenceKeys.length).map(
    (key) => {
      if (typeof key !== "string" || !Object.hasOwn(preferenceFields, key))
        invalid("UNKNOWN_PREFERENCE_KEY", "$.unset");
      if (Object.hasOwn(set, key)) invalid("AMBIGUOUS_PATCH", "$.unset");
      return key as PreferenceKey;
    },
  );
  if (new Set(unset).size !== unset.length)
    invalid("DUPLICATE_UNSET", "$.unset");
  return { schemaVersion: "1.0", set, unset };
}
/** Map fields are replaced whole. Inputs AND the merged result are reparsed. */
export function applyPreferencePatch(
  current: unknown,
  input: unknown,
): PreferenceV1 {
  const base = parsePreferenceV1(current);
  const patch = parsePreferencePatchV1(input);
  const values = { ...base.values, ...patch.set };
  for (const key of patch.unset) delete values[key];
  return parsePreferenceV1({ schemaVersion: "1.0", values });
}
