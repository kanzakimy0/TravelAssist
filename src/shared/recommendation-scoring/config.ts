import {
  POI_FEATURE_CODES,
  type PoiFeatureCode,
} from "../contracts/planning/features";
import {
  interestCodes,
  preferenceKeys,
  type InterestCode,
  type PreferenceKey,
} from "../contracts/preferences";

export const MAPPING_VERSION = "preference-to-poi-v1-pilot-candidate";
export const SCORING_CONFIG_VERSION = "poi-match-v1-pilot-candidate";

export const MAPPING_CATEGORIES = [
  "POI_43D_INPUT",
  "PLANNER_WEIGHT_INPUT",
  "ROUTE_HARD_CONSTRAINT",
  "ROUTE_SOFT_INPUT",
  "COST_INPUT",
  "DURATION_OR_PACE_INPUT",
  "NOT_USED_BY_POI_SCORING_V1",
] as const;
export type MappingCategory = (typeof MAPPING_CATEGORIES)[number];

// This matrix classifies the existing 23-key registry; it is not a Preference registry.
export const PREFERENCE_KEY_MAPPING = {
  "mobility.fewerTransfers": ["ROUTE_SOFT_INPUT"],
  "mobility.walkingTolerance": [
    "POI_43D_INPUT",
    "COST_INPUT",
    "DURATION_OR_PACE_INPUT",
  ],
  "mobility.noPublicTransit": ["ROUTE_HARD_CONSTRAINT"],
  "mobility.noBus": ["ROUTE_HARD_CONSTRAINT"],
  "mobility.noFerry": ["ROUTE_HARD_CONSTRAINT"],
  "dining.localCuisine": ["PLANNER_WEIGHT_INPUT"],
  "dining.smallShops": ["PLANNER_WEIGHT_INPUT"],
  "dining.queueTolerance": ["COST_INPUT", "PLANNER_WEIGHT_INPUT"],
  "accommodation.transportConvenience": ["ROUTE_SOFT_INPUT"],
  "accommodation.comfort": ["NOT_USED_BY_POI_SCORING_V1"],
  "accommodation.fewerHotelChanges": ["PLANNER_WEIGHT_INPUT"],
  "budget.spendingTendency": ["PLANNER_WEIGHT_INPUT"],
  "budget.prioritizeAccommodation": ["PLANNER_WEIGHT_INPUT"],
  "budget.prioritizeExperience": ["PLANNER_WEIGHT_INPUT"],
  "interests.preferences": ["POI_43D_INPUT"],
  "interests.details": ["POI_43D_INPUT"],
  "style.pace": ["DURATION_OR_PACE_INPUT"],
  "style.depth": ["DURATION_OR_PACE_INPUT"],
  "style.discovery": ["POI_43D_INPUT", "PLANNER_WEIGHT_INPUT"],
  "style.movement": ["ROUTE_SOFT_INPUT"],
  "style.coverage": ["PLANNER_WEIGHT_INPUT"],
  "style.priority": ["PLANNER_WEIGHT_INPUT"],
  "style.planning": ["PLANNER_WEIGHT_INPUT"],
} as const satisfies Record<PreferenceKey, readonly MappingCategory[]>;

// Explicit interest projection. Multiple codes split one interest's requested weight.
export const INTEREST_FEATURE_MAP = {
  nature_scenery: ["01", "07"],
  history_culture: ["02", "03"],
  food: ["05"],
  photography: ["04"],
  onsen_wellness: ["09", "20"],
  art_museums: ["10", "22"],
  anime_entertainment: ["11"],
  shopping: ["06"],
  urban_exploration: ["03", "12"],
  outdoor_activity: ["07", "21"],
  night_experience: ["08"],
  family_activity: ["16", "23"],
  traditional_experience: ["02", "12", "23"],
  theme_parks: ["11", "23"],
  rural_towns: ["12", "14"],
  seasonal_events: ["13"],
} as const satisfies Record<InterestCode, readonly PoiFeatureCode[]>;

// Only detail codes with an independent 43D meaning add a signal. Other details
// remain canonical Preference facts but are not invented as POI features.
export const INTEREST_DETAIL_EXTRA_MAP: Partial<
  Record<InterestCode, Readonly<Record<string, readonly PoiFeatureCode[]>>>
> = {
  photography: {
    nightscape: ["08"],
    architecture: ["03"],
  },
  outdoor_activity: {
    skiing: ["38"],
  },
  seasonal_events: {
    cherry_blossom: ["40"],
    autumn_leaves: ["42"],
    snow_scenery: ["38", "43"],
  },
  family_activity: {
    science_museum: ["22"],
  },
  art_museums: {
    architecture: ["03"],
  },
};

export const SCORING_CONFIG_V1 = Object.freeze({
  configVersion: SCORING_CONFIG_VERSION,
  calibrationStatus: "pilot_calibration_candidate" as const,
  featureWeights: Object.freeze(
    Object.fromEntries(POI_FEATURE_CODES.map((code) => [code, 1])),
  ) as Readonly<Record<PoiFeatureCode, number>>,
  gamma: Object.freeze({ cost: 2, risk: 2, weatherSensitivity: 2 }),
  interestPreference: Object.freeze({ like: 9, dislike: 1, detailLike: 7 }),
  walkingTolerance: Object.freeze({
    veryLow: 1,
    low: 3,
    standard: 5,
    high: 7,
    veryHigh: 9,
  }),
  queueTolerance: Object.freeze({ low: 1, medium: 5, high: 9 }),
  discoveryPreference: Object.freeze({
    1: Object.freeze({ iconic: 9, hidden: 1, local: 3 }),
    2: Object.freeze({ iconic: 7, hidden: 3, local: 4 }),
    3: Object.freeze({ iconic: 5, hidden: 5, local: 5 }),
    4: Object.freeze({ iconic: 3, hidden: 7, local: 7 }),
    5: Object.freeze({ iconic: 1, hidden: 9, local: 9 }),
  }),
  defaultTolerance: 5,
  lowCoverageThreshold: 0.35,
  reasonContributionThreshold: 0.25,
  scoreMin: 0,
  scoreMax: 99,
});

export function assertScoringRegistryAlignment(): void {
  if (
    preferenceKeys.length !== 23 ||
    Object.keys(PREFERENCE_KEY_MAPPING).length !== preferenceKeys.length ||
    preferenceKeys.some((key) => !PREFERENCE_KEY_MAPPING[key]?.length)
  )
    throw new Error("PREFERENCE_MAPPING_REGISTRY_MISMATCH");
  if (
    interestCodes.length !== Object.keys(INTEREST_FEATURE_MAP).length ||
    interestCodes.some((code) => !INTEREST_FEATURE_MAP[code]?.length)
  )
    throw new Error("INTEREST_MAPPING_REGISTRY_MISMATCH");
  if (
    POI_FEATURE_CODES.length !== 43 ||
    Object.keys(SCORING_CONFIG_V1.featureWeights).length !== 43
  )
    throw new Error("FEATURE_WEIGHT_REGISTRY_MISMATCH");
}
