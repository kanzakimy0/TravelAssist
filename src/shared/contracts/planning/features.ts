import type { Instant, PlanningContractVersion, PlanningId } from "./common";

export const POI_FEATURE_DEFINITIONS = [
  ["01", "scenery", "benefit"],
  ["02", "history", "benefit"],
  ["03", "architecture", "benefit"],
  ["04", "photo", "benefit"],
  ["05", "food", "benefit"],
  ["06", "shopping", "benefit"],
  ["07", "nature", "benefit"],
  ["08", "night", "benefit"],
  ["09", "onsen", "benefit"],
  ["10", "art", "benefit"],
  ["11", "entertainment", "benefit"],
  ["12", "local", "benefit"],
  ["13", "unique", "benefit"],
  ["14", "hidden", "benefit"],
  ["15", "iconic", "benefit"],
  ["16", "family", "suitability"],
  ["17", "senior", "suitability"],
  ["18", "couple", "suitability"],
  ["19", "solo", "suitability"],
  ["20", "relax", "suitability"],
  ["21", "adventure", "suitability"],
  ["22", "educational", "suitability"],
  ["23", "interactive", "suitability"],
  ["24", "rest", "suitability"],
  ["25", "walking", "cost"],
  ["26", "physical", "cost"],
  ["27", "crowd", "risk"],
  ["28", "queue", "risk"],
  ["29", "wheelchair", "suitability"],
  ["30", "stroller", "suitability"],
  ["31", "morning", "suitability"],
  ["32", "daytime", "suitability"],
  ["33", "sunrise", "suitability"],
  ["34", "sunset", "suitability"],
  ["35", "rain", "suitability"],
  ["36", "heat", "suitability"],
  ["37", "cold", "suitability"],
  ["38", "snow", "suitability"],
  ["39", "weather_sensitive", "risk"],
  ["40", "spring", "suitability"],
  ["41", "summer", "suitability"],
  ["42", "autumn", "suitability"],
  ["43", "winter", "suitability"],
] as const;

export type PoiFeatureDefinition = (typeof POI_FEATURE_DEFINITIONS)[number];
export type PoiFeatureCode = PoiFeatureDefinition[0];
export type PoiFeatureName = PoiFeatureDefinition[1];
export type PoiFeatureKind = PoiFeatureDefinition[2];
export type PoiFeatureValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null;
export type PreferenceValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const POI_FEATURE_CODES = POI_FEATURE_DEFINITIONS.map(
  ([code]) => code,
) as readonly PoiFeatureCode[];

export const POI_FEATURE_KIND_BY_CODE = Object.freeze(
  Object.fromEntries(
    POI_FEATURE_DEFINITIONS.map(([code, , kind]) => [code, kind]),
  ),
) as Readonly<Record<PoiFeatureCode, PoiFeatureKind>>;

export type PoiFeatureVectorV1 = Record<PoiFeatureCode, PoiFeatureValue>;

export type PoiFeatureSetV1 = {
  contractVersion: PlanningContractVersion;
  featureVersion: "1.0";
  poiRef: PlanningId;
  values: PoiFeatureVectorV1;
  sourceRefs: PlanningId[];
  confidence: number | null;
  updatedAt: Instant;
};

export type EffectivePreferenceV1 = {
  contractVersion: PlanningContractVersion;
  preferenceVersion: "1.0";
  snapshotRef: PlanningId;
  overrideRevision: number;
  values: Record<PoiFeatureCode, PreferenceValue>;
};

/** AI-only projection after effective preferences are merged; explicit neutral 5 is forbidden. */
export type SparsePreferenceEntryV1 = readonly [
  code: PoiFeatureCode,
  value: Exclude<PreferenceValue, 5>,
];

export type SparsePreferenceV1 = {
  version: "1";
  entries: SparsePreferenceEntryV1[];
};
