import {
  boolean,
  integer,
  invalid,
  list,
  object,
  oneOf,
  parse,
  refine,
  text,
  type Parser,
  type Parsed,
} from "../trips/validation";
import { INTERESTS } from "../../../features/start-flow/model/start-flow-draft";
import { mobilityPresets } from "../../../features/preferences/mobility-preference-model";
import {
  attractionPreferenceDimensions,
  attractionPreferenceLevels,
} from "../../../features/preferences/attraction-activity-preference-model";
import {
  diningPreferenceOptions,
  accommodationPreferenceOptions,
  budgetSpendingOptions,
} from "../../../features/preferences/dining-accommodation-budget-preference-model";

// Category.item paths: no labels, radar coordinates, derived summaries or trip facts.
// Existing master option keys are preserved. Missing is unset/inherit, never a mock default.
const attractionLevel = oneOf([
  ...attractionPreferenceLevels.map((x) => x.key),
  "unset",
] as const);
const accommodationLevel = oneOf(
  accommodationPreferenceOptions.map((x) => x.key),
);
const interests = refine(list(oneOf(INTERESTS), 16), (v, p) => {
  if (new Set(v).size !== v.length) invalid(p, "DUPLICATE_INTEREST");
});
export const preferenceFields = {
  "mobility.preset": oneOf(
    Object.keys(mobilityPresets) as (keyof typeof mobilityPresets)[],
  ),
  "mobility.fewerTransfers": boolean,
  "mobility.lessWalking": boolean,
  "mobility.noPublicTransit": boolean,
  "mobility.noBus": boolean,
  "mobility.noFerry": boolean,
  "attractions.nature": attractionLevel,
  "attractions.history": attractionLevel,
  "attractions.culture": attractionLevel,
  "attractions.art": attractionLevel,
  "attractions.photography": attractionLevel,
  "attractions.activityExperience": attractionLevel,
  "experience.photoExperience": boolean,
  "dining.localCuisine": oneOf(
    diningPreferenceOptions.localCuisine.map((x) => x.key),
  ),
  "dining.smallShops": oneOf(
    diningPreferenceOptions.smallShops.map((x) => x.key),
  ),
  "dining.queueTolerance": oneOf(
    diningPreferenceOptions.queueTolerance.map((x) => x.key),
  ),
  "accommodation.transportConvenience": accommodationLevel,
  "accommodation.comfort": accommodationLevel,
  "accommodation.fewerHotelChanges": accommodationLevel,
  "budget.spendingTendency": oneOf(budgetSpendingOptions.map((x) => x.key)),
  "budget.prioritizeAccommodation": boolean,
  "budget.prioritizeExperience": boolean,
  "interests.likes": interests,
  "interests.dislikes": interests,
  "style.pace": integer(1, 5),
  "style.depth": integer(1, 5),
  "style.discovery": integer(1, 5),
  "style.movement": integer(1, 5),
  "style.coverage": integer(1, 5),
  "style.priority": integer(1, 5),
} as const;
export type PreferenceKey = keyof typeof preferenceFields;
export type PreferenceValues = {
  [K in PreferenceKey]?: Parsed<(typeof preferenceFields)[K]>;
};
export const preferenceValues: Parser<PreferenceValues> = (input, path) => {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    invalid(path, "INVALID_PREFERENCE_VALUES");
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(preferenceFields, key))
      invalid(path, "UNKNOWN_PREFERENCE_KEY");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor))
      invalid(path, "INVALID_JSON_VALUE");
    output[key] = preferenceFields[key as PreferenceKey](
      descriptor.value,
      path + "." + key,
    );
  }
  const v = output as PreferenceValues;
  if (v["interests.likes"]?.some((x) => v["interests.dislikes"]?.includes(x)))
    invalid(path, "CONFLICTING_INTEREST");
  return v;
};
export const preferenceEnvelope = object({
  schemaVersion: oneOf(["1.0"]),
  values: preferenceValues,
});
export type PreferenceV1 = Parsed<typeof preferenceEnvelope>;
export const parsePreference = (value: unknown) =>
  parse(preferenceEnvelope, value);
export const emptyPreference = (): PreferenceV1 => ({
  schemaVersion: "1.0",
  values: {},
});
export const preferencePatch = object({
  schemaVersion: oneOf(["1.0"]),
  set: preferenceValues,
  unset: refine(
    list(oneOf(Object.keys(preferenceFields) as PreferenceKey[]), 64),
    (v, p) => {
      if (new Set(v).size !== v.length) invalid(p, "DUPLICATE_KEY");
    },
  ),
});
export type PreferencePatchV1 = Parsed<typeof preferencePatch>;
export function applyPreferencePatch(
  current: PreferenceV1,
  patch: PreferencePatchV1,
): PreferenceV1 {
  const values = { ...current.values, ...patch.set };
  for (const key of patch.unset) {
    if (Object.hasOwn(patch.set, key)) throw new Error("AMBIGUOUS_PATCH");
    delete values[key];
  }
  const result = parsePreference({ schemaVersion: "1.0", values });
  if (!result.ok) throw new Error(result.issue.code);
  return result.value;
}
export function effectivePreference(
  snapshot: PreferenceV1,
  overrides: PreferenceV1,
): PreferenceV1 {
  const result = parsePreference({
    schemaVersion: "1.0",
    values: { ...snapshot.values, ...overrides.values },
  });
  if (!result.ok) throw new Error(result.issue.code);
  return result.value;
}
// Useful for audits; never a second enum definition.
export const canonicalAttractionKeys = attractionPreferenceDimensions.map(
  (x) => x.key,
);
export const uuid = refine(text(36), (value, path) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalid(path, "INVALID_UUID");
});
