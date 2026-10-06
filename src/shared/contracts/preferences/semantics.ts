import {
  preferenceFields,
  preferenceKeys,
  type PreferenceKey,
  type PreferenceStrength,
} from "./core";
/** Static meaning only: no scoring, route gating or inferred values. */
export const preferenceStrengths: Readonly<
  Record<PreferenceKey, PreferenceStrength>
> = Object.freeze(
  Object.fromEntries(
    preferenceKeys.map((key) => [key, preferenceFields[key].strength]),
  ) as Record<PreferenceKey, PreferenceStrength>,
);
