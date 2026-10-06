import type { LongTermPreferenceReadV1 } from "../../src/shared/contracts/preferences";
import type {
  EffectivePreferenceV1,
  SparsePreferenceV1,
} from "../../src/shared/contracts/planning/features";
// Type-only integration checks. This function is never called by production.
export function assertPreferenceBoundaries(read: LongTermPreferenceReadV1) {
  // @ts-expect-error Long-term facts are not a 43-dimensional effective vector.
  const effective: EffectivePreferenceV1 = read;
  // @ts-expect-error Long-term facts are not an AI-only sparse vector.
  const sparse: SparsePreferenceV1 = read;
  // @ts-expect-error Nested facts are recursively readonly.
  read.preference.values["mobility.noBus"] = true;
  // @ts-expect-error Detail arrays are recursively readonly.
  read.preference.values["interests.details"]?.photography?.push("landscape");
  return { effective, sparse };
}
