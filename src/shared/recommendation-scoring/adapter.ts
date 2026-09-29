import {
  parsePreferenceV1,
  type InterestCode,
  type PreferenceKey,
  type PreferenceV1,
  type PreferenceValuesV1,
} from "../contracts/preferences/core";
import {
  parseLongTermPreferenceReadV1,
  type LongTermPreferenceReadV1,
} from "../contracts/preferences/read";
import type { PoiFeatureCode } from "../contracts/planning/features";
import {
  INTEREST_DETAIL_EXTRA_MAP,
  INTEREST_FEATURE_MAP,
  MAPPING_VERSION,
  SCORING_CONFIG_V1,
  assertScoringRegistryAlignment,
} from "./config";

export type ScoringSignalSource =
  | "long_term"
  | "trip_snapshot"
  | "trip_override"
  | "party_context"
  | "season_context"
  | "weather_context"
  | "schedule_context"
  | "day_context"
  | "product_default";
export type ScoringSignal = {
  signalKey: string;
  featureCode: PoiFeatureCode;
  functionKind: "benefit" | "suitability" | "cost" | "risk";
  component:
    | "matchScore"
    | "partyFit"
    | "seasonFit"
    | "weatherFit"
    | "timeSlotFit"
    | "restFit";
  preferenceValue: number | null;
  contextStrength: number | null;
  source: ScoringSignalSource;
  provenanceRef: string | null;
  weightScale: number;
};
export type PreferenceAdapterInputV1 = {
  longTerm: LongTermPreferenceReadV1;
  tripSnapshot?: PreferenceV1 | null;
  tripSnapshotRef?: string | null;
  tripOverride?: PreferenceV1 | null;
  tripOverrideRevision?: number | null;
};
export type AdaptedPreferenceV1 = {
  mappingVersion: typeof MAPPING_VERSION;
  signals: ScoringSignal[];
  hardRouteBans: readonly ("public_transit" | "bus" | "ferry")[];
  longTermSourceRevision: number;
  tripSnapshotRef: string | null;
  tripOverrideRevision: number | null;
};

function featureFunction(code: PoiFeatureCode): ScoringSignal["functionKind"] {
  if (code === "25" || code === "26") return "cost";
  if (code === "27" || code === "28" || code === "39") return "risk";
  if (Number(code) <= 15) return "benefit";
  return "suitability";
}

export function adaptPreferenceToScoringV1(
  input: PreferenceAdapterInputV1,
): AdaptedPreferenceV1 {
  assertScoringRegistryAlignment();
  const longTerm = parseLongTermPreferenceReadV1(input.longTerm);
  const snapshot =
    input.tripSnapshot === undefined || input.tripSnapshot === null
      ? null
      : parsePreferenceV1(input.tripSnapshot);
  const override =
    input.tripOverride === undefined || input.tripOverride === null
      ? null
      : parsePreferenceV1(input.tripOverride);
  if (
    input.tripOverrideRevision !== undefined &&
    input.tripOverrideRevision !== null &&
    (!Number.isSafeInteger(input.tripOverrideRevision) ||
      input.tripOverrideRevision < 0)
  )
    throw new TypeError("INVALID_OVERRIDE_REVISION");
  const base: PreferenceValuesV1 = snapshot
    ? snapshot.values
    : parsePreferenceV1(longTerm.preference).values;
  const values: PreferenceValuesV1 = { ...base, ...override?.values };
  const sourceOf = (key: PreferenceKey): ScoringSignalSource =>
    override && Object.hasOwn(override.values, key)
      ? "trip_override"
      : snapshot && Object.hasOwn(snapshot.values, key)
        ? "trip_snapshot"
        : "long_term";
  const provenanceOf = (key: PreferenceKey): string | null => {
    const source = sourceOf(key);
    if (source === "trip_override")
      return input.tripOverrideRevision === undefined ||
        input.tripOverrideRevision === null
        ? null
        : "trip-override-rev:" + input.tripOverrideRevision;
    if (source === "trip_snapshot") return input.tripSnapshotRef ?? null;
    return "long-term-rev:" + longTerm.sourceRevision;
  };
  const signals: ScoringSignal[] = [];
  const add = (
    key: string,
    code: PoiFeatureCode,
    preferenceValue: number,
    source: ScoringSignalSource,
    provenanceRef: string | null,
    weightScale = 1,
  ) =>
    signals.push({
      signalKey: key,
      featureCode: code,
      functionKind: featureFunction(code),
      component: "matchScore",
      preferenceValue,
      contextStrength: null,
      source,
      provenanceRef,
      weightScale,
    });

  const interests = values["interests.preferences"];
  if (interests) {
    for (const [interest, preference] of Object.entries(interests)) {
      const codes = INTEREST_FEATURE_MAP[interest as InterestCode];
      for (const code of codes)
        add(
          "interests.preferences." + interest,
          code,
          SCORING_CONFIG_V1.interestPreference[preference],
          sourceOf("interests.preferences"),
          provenanceOf("interests.preferences"),
          1 / codes.length,
        );
    }
  }
  const details = values["interests.details"];
  if (details) {
    for (const [interest, selected] of Object.entries(details)) {
      const parent = interest as InterestCode;
      if (interests?.[parent] === "dislike")
        throw new TypeError("DISLIKED_INTEREST_DETAIL");
      const parentCodes: readonly PoiFeatureCode[] =
        INTEREST_FEATURE_MAP[parent];
      for (const detail of selected) {
        const extras = INTEREST_DETAIL_EXTRA_MAP[parent]?.[detail] ?? [];
        const independent = extras.filter(
          (code) => !parentCodes.includes(code),
        );
        for (const code of independent)
          add(
            "interests.details." + interest + "." + detail,
            code,
            SCORING_CONFIG_V1.interestPreference.detailLike,
            sourceOf("interests.details"),
            provenanceOf("interests.details"),
            1 / independent.length,
          );
      }
    }
  }

  const walking = values["mobility.walkingTolerance"];
  add(
    "mobility.walkingTolerance",
    "25",
    walking
      ? SCORING_CONFIG_V1.walkingTolerance[walking]
      : SCORING_CONFIG_V1.defaultTolerance,
    walking ? sourceOf("mobility.walkingTolerance") : "product_default",
    walking ? provenanceOf("mobility.walkingTolerance") : null,
  );
  for (const code of ["26", "27"] as const)
    add(
      "defaultTolerance." + code,
      code,
      SCORING_CONFIG_V1.defaultTolerance,
      "product_default",
      null,
    );
  const queueTolerance = values["dining.queueTolerance"];
  add(
    "dining.queueTolerance",
    "28",
    queueTolerance
      ? SCORING_CONFIG_V1.queueTolerance[queueTolerance]
      : SCORING_CONFIG_V1.defaultTolerance,
    queueTolerance ? sourceOf("dining.queueTolerance") : "product_default",
    queueTolerance ? provenanceOf("dining.queueTolerance") : null,
  );

  const discovery = values["style.discovery"];
  if (discovery !== undefined) {
    const policy = SCORING_CONFIG_V1.discoveryPreference[discovery];
    for (const [name, code] of [
      ["iconic", "15"],
      ["hidden", "14"],
      ["local", "12"],
    ] as const)
      add(
        "style.discovery." + name,
        code,
        policy[name],
        sourceOf("style.discovery"),
        provenanceOf("style.discovery"),
        1 / 3,
      );
  }
  const hardRouteBans: AdaptedPreferenceV1["hardRouteBans"] = [
    ...(values["mobility.noPublicTransit"]
      ? (["public_transit"] as const)
      : []),
    ...(values["mobility.noBus"] ? (["bus"] as const) : []),
    ...(values["mobility.noFerry"] ? (["ferry"] as const) : []),
  ];
  return {
    mappingVersion: MAPPING_VERSION,
    signals,
    hardRouteBans,
    longTermSourceRevision: longTerm.sourceRevision,
    tripSnapshotRef: snapshot ? (input.tripSnapshotRef ?? null) : null,
    tripOverrideRevision: override
      ? (input.tripOverrideRevision ?? null)
      : null,
  };
}
