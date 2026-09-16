import { toLongTermPreferenceReadV1 } from "./read";
// Synthetic examples only. Never use these as account defaults or error fallback.
export const syntheticMissingPreferenceReadV1 = toLongTermPreferenceReadV1({
  preference: { schemaVersion: "1.0", values: {} },
  revision: 0,
  updatedAt: null,
});
export const syntheticResetPreferenceReadV1 = toLongTermPreferenceReadV1({
  preference: { schemaVersion: "1.0", values: {} },
  revision: 2,
  updatedAt: "2026-09-11T13:00:00.123456+00:00",
});
export const syntheticExplicitPreferenceReadV1 = toLongTermPreferenceReadV1({
  preference: {
    schemaVersion: "1.0",
    values: {
      "mobility.noPublicTransit": true,
      "mobility.noBus": false,
      "mobility.walkingTolerance": "low",
      "dining.localCuisine": "neutral",
      "style.planning": 3,
      "interests.preferences": {},
      "interests.details": { photography: ["landscape"] },
    },
  },
  revision: 7,
  updatedAt: "2026-09-11T13:00:00Z",
});
