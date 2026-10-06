// Independent A-like example; no private B imports and no live Planner wiring.
import {
  parseLongTermPreferenceReadV1,
  type LongTermPreferenceReadV1,
} from "../../src/shared/contracts/preferences";
import { readCurrentLongTermPreference } from "../../src/lib/preferences/client";
export function consumePreference(input: unknown): LongTermPreferenceReadV1 {
  return parseLongTermPreferenceReadV1(input);
}
export { readCurrentLongTermPreference };
