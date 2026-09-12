// Public read-only boundary. Internal compatibility core is not an A write API.
export {
  PREFERENCE_READ_CONTRACT_VERSION,
  parseLongTermPreferenceReadV1,
  toLongTermPreferenceReadV1,
  PreferenceReadValidationError,
} from "./read";
export type {
  DeepReadonly,
  ReadonlyPreferenceV1,
  LongTermPreferenceReadV1,
  PreferenceReadErrorCode,
  PreferenceReadResultV1,
} from "./read";
export {
  interestCodes,
  interestDetails,
  preferenceKeys,
  walkingToleranceValues,
} from "./core";
export type {
  PreferenceKey,
  PreferenceStrength,
  InterestCode,
  InterestDetailCode,
  InterestPreferenceSignal,
} from "./core";
export { preferenceStrengths } from "./semantics";
export {
  syntheticMissingPreferenceReadV1,
  syntheticResetPreferenceReadV1,
  syntheticExplicitPreferenceReadV1,
} from "./fixtures";
