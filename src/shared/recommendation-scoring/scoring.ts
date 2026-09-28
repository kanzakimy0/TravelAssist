import {
  POI_FEATURE_DEFINITIONS,
  POI_FEATURE_KIND_BY_CODE,
  type PoiFeatureCode,
  type PoiFeatureSetV1,
} from "../contracts/planning/features";
import { parsePoiFeatureSetV1 } from "../contracts/planning/validation";
import {
  adaptPreferenceToScoringV1,
  type AdaptedPreferenceV1,
  type PreferenceAdapterInputV1,
  type ScoringSignal,
  type ScoringSignalSource,
} from "./adapter";
import {
  MAPPING_VERSION,
  SCORING_CONFIG_V1,
  SCORING_CONFIG_VERSION,
} from "./config";

type ComponentName = ScoringSignal["component"];
type ScoreStatus =
  "scored" | "neutral_default" | "not_applicable" | "blocked" | "needs_fact";
type HardGateStatus = "PASS" | "REJECT" | "NEEDS_FACT";
type ToleranceCode = "25" | "26" | "27" | "28";
type FeatureEvidence = {
  confidence: number;
  provenanceRef: string | null;
};
type LiveRiskFact = FeatureEvidence & {
  value: number;
  fresh: boolean;
};

export type ScoringContextV1 = {
  contextVersion: string;
  party?: Partial<
    Record<
      "family" | "senior" | "couple" | "solo" | "wheelchair" | "stroller",
      number
    >
  >;
  partyMemberTolerances?: readonly Partial<Record<ToleranceCode, number>>[];
  season?: "spring" | "summer" | "autumn" | "winter" | null;
  weather?: {
    condition: "rain" | "heat" | "cold" | "snow" | "clear";
    severity: number;
  } | null;
  timeSlot?: "morning" | "daytime" | "sunrise" | "sunset" | "night" | null;
  needsRestStrength?: number | null;
  crowdTolerance?: number | null;
  queueTolerance?: number | null;
};
export type HardConstraintInputV1 = {
  partyNeeds?: readonly {
    requiresWheelchair?: boolean;
    requiresStroller?: boolean;
  }[];
  accessibilityFacts?: {
    wheelchairAccessible: boolean | null;
    strollerAccessible: boolean | null;
  };
  route?: {
    evaluationRequired: boolean;
    modes:
      | readonly (
          "walking" | "driving" | "transit" | "bus" | "ferry" | "taxi"
        )[]
      | null;
  };
  schedule?: {
    evaluationRequired: boolean;
    open: boolean | null;
  };
  criticalFacts?: readonly {
    code: string;
    satisfied: boolean | null;
  }[];
};
export type PoiRecommendationInputV1 = PreferenceAdapterInputV1 & {
  poiRef: string;
  features: PoiFeatureSetV1;
  featureEvidence?: Partial<Record<PoiFeatureCode, FeatureEvidence>>;
  liveRiskFacts?: Partial<Record<"27" | "28", LiveRiskFact>>;
  context: ScoringContextV1;
  constraints?: HardConstraintInputV1;
  dataRevision: string;
};
export type ScoreBreakdownItemV1 = {
  signalKey: string;
  component: ComponentName;
  featureCode: PoiFeatureCode;
  featureKey: string;
  featureKind: (typeof POI_FEATURE_KIND_BY_CODE)[PoiFeatureCode];
  featureValue: number | null;
  featureConfidence: number | null;
  featureProvenanceRef: string | null;
  featureSource: "master" | "live";
  preferenceValue: number | null;
  contextStrength: number | null;
  signalSource: ScoringSignalSource;
  signalProvenanceRef: string | null;
  functionKind: ScoringSignal["functionKind"];
  contribution: number | null;
  weight: number;
  weightedContribution: number;
  limitingPartyMemberIndex: number | null;
};
export type ScoreEnvelopeV1 = {
  value: number | null;
  coverage: number;
  confidence: number;
  status: ScoreStatus;
  configVersion: typeof SCORING_CONFIG_VERSION;
  mappingVersion: typeof MAPPING_VERSION;
  requestedWeight: number;
  knownWeight: number;
  knownRaw: number;
  adjustedRaw: number;
  breakdown: ScoreBreakdownItemV1[];
};
export type ScoreReasonV1 = {
  code: string;
  component: ComponentName;
  featureCode: PoiFeatureCode | null;
  evidence: {
    featureValue: number | null;
    contribution: number | null;
    provenanceRef: string | null;
    coverage: number | null;
  };
};
export type PoiRecommendationResultV1 = {
  poiRef: string;
  dataRevision: string;
  featureVersion: string;
  preferenceSourceRevision: number;
  preferenceSnapshotRef: string | null;
  preferenceOverrideRevision: number | null;
  contextVersion: string;
  mappingVersion: typeof MAPPING_VERSION;
  scoringConfigVersion: typeof SCORING_CONFIG_VERSION;
  constraintGate: { status: HardGateStatus; reasonCodes: string[] };
  matchScore: ScoreEnvelopeV1;
  partyFit: ScoreEnvelopeV1;
  seasonFit: ScoreEnvelopeV1;
  weatherFit: ScoreEnvelopeV1;
  timeSlotFit: ScoreEnvelopeV1;
  restFit: ScoreEnvelopeV1;
  dayFit: ScoreEnvelopeV1;
  routeFit: ScoreEnvelopeV1;
  reasons: ScoreReasonV1[];
};

const finite01 = (value: number, code: string): number => {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new TypeError(code);
  return value;
};
const preference19 = (value: number, code: string): number => {
  if (!Number.isInteger(value) || value < 1 || value > 9)
    throw new TypeError(code);
  return value;
};
const feature09 = (value: number, code: string): number => {
  if (!Number.isInteger(value) || value < 0 || value > 9)
    throw new TypeError(code);
  return value;
};
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function hardGate(
  input: HardConstraintInputV1 | undefined,
  preference: AdaptedPreferenceV1,
): PoiRecommendationResultV1["constraintGate"] {
  const reject: string[] = [];
  const needsFact: string[] = [];
  const wheelchair = input?.partyNeeds?.some(
    (member) => member.requiresWheelchair,
  );
  const stroller = input?.partyNeeds?.some((member) => member.requiresStroller);
  if (wheelchair) {
    const fact = input?.accessibilityFacts?.wheelchairAccessible;
    if (fact === false) reject.push("WHEELCHAIR_ACCESS_UNAVAILABLE");
    else if (fact !== true) needsFact.push("WHEELCHAIR_ACCESS_UNKNOWN");
  }
  if (stroller) {
    const fact = input?.accessibilityFacts?.strollerAccessible;
    if (fact === false) reject.push("STROLLER_ACCESS_UNAVAILABLE");
    else if (fact !== true) needsFact.push("STROLLER_ACCESS_UNKNOWN");
  }
  if (input?.schedule?.evaluationRequired) {
    if (input.schedule.open === false) reject.push("SCHEDULE_CLOSED");
    else if (input.schedule.open !== true) needsFact.push("SCHEDULE_UNKNOWN");
  }
  if (input?.route?.evaluationRequired) {
    if (!input.route.modes?.length) needsFact.push("ROUTE_MODES_UNKNOWN");
    else {
      const modes = input.route.modes;
      if (
        preference.hardRouteBans.includes("public_transit") &&
        modes.some(
          (mode) => mode === "transit" || mode === "bus" || mode === "ferry",
        )
      )
        reject.push("PUBLIC_TRANSIT_BANNED");
      if (preference.hardRouteBans.includes("bus") && modes.includes("bus"))
        reject.push("BUS_BANNED");
      if (preference.hardRouteBans.includes("ferry") && modes.includes("ferry"))
        reject.push("FERRY_BANNED");
      if (
        modes.includes("transit") &&
        (preference.hardRouteBans.includes("bus") ||
          preference.hardRouteBans.includes("ferry"))
      )
        needsFact.push("TRANSIT_SUBMODE_UNKNOWN");
    }
  }
  for (const fact of input?.criticalFacts ?? []) {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(fact.code))
      throw new TypeError("INVALID_CRITICAL_FACT_CODE");
    if (fact.satisfied === false)
      reject.push("CRITICAL_" + fact.code + "_FAILED");
    else if (fact.satisfied === null)
      needsFact.push("CRITICAL_" + fact.code + "_UNKNOWN");
  }
  return reject.length
    ? { status: "REJECT", reasonCodes: [...new Set(reject)].sort() }
    : needsFact.length
      ? { status: "NEEDS_FACT", reasonCodes: [...new Set(needsFact)].sort() }
      : { status: "PASS", reasonCodes: [] };
}

function contextSignals(context: ScoringContextV1): ScoringSignal[] {
  const signals: ScoringSignal[] = [];
  const add = (
    component: ComponentName,
    key: string,
    code: PoiFeatureCode,
    strength: number,
    functionKind: ScoringSignal["functionKind"] = "suitability",
    source: ScoringSignalSource = "party_context",
  ) =>
    signals.push({
      signalKey: key,
      component,
      featureCode: code,
      functionKind,
      preferenceValue: null,
      contextStrength: finite01(strength, "INVALID_CONTEXT_STRENGTH"),
      source,
      provenanceRef: context.contextVersion,
      weightScale: 1,
    });
  const partyCodes = {
    family: "16",
    senior: "17",
    couple: "18",
    solo: "19",
    wheelchair: "29",
    stroller: "30",
  } as const;
  for (const [key, strength] of Object.entries(context.party ?? {}))
    add(
      "partyFit",
      "party." + key,
      partyCodes[key as keyof typeof partyCodes],
      strength,
    );
  const seasonCodes = {
    spring: "40",
    summer: "41",
    autumn: "42",
    winter: "43",
  } as const;
  if (context.season)
    add(
      "seasonFit",
      "season." + context.season,
      seasonCodes[context.season],
      1,
      "suitability",
      "season_context",
    );
  const weatherCodes = {
    rain: "35",
    heat: "36",
    cold: "37",
    snow: "38",
  } as const;
  if (context.weather) {
    const severity = finite01(
      context.weather.severity,
      "INVALID_WEATHER_SEVERITY",
    );
    if (context.weather.condition !== "clear") {
      add(
        "weatherFit",
        "weather." + context.weather.condition,
        weatherCodes[context.weather.condition],
        severity,
        "suitability",
        "weather_context",
      );
      add(
        "weatherFit",
        "weather.sensitivity",
        "39",
        severity,
        "risk",
        "weather_context",
      );
    }
  }
  const slotCodes = {
    morning: "31",
    daytime: "32",
    sunrise: "33",
    sunset: "34",
    night: "08",
  } as const;
  if (context.timeSlot)
    add(
      "timeSlotFit",
      "timeSlot." + context.timeSlot,
      slotCodes[context.timeSlot],
      1,
      "suitability",
      "schedule_context",
    );
  if (
    context.needsRestStrength !== undefined &&
    context.needsRestStrength !== null
  )
    add(
      "restFit",
      "dayContext.restNeed",
      "24",
      context.needsRestStrength,
      "suitability",
      "day_context",
    );
  return signals;
}

function resolveFeature(
  input: PoiRecommendationInputV1,
  code: PoiFeatureCode,
): {
  value: number | null;
  confidence: number | null;
  provenanceRef: string | null;
  source: "master" | "live";
} {
  const live =
    code === "27" || code === "28" ? input.liveRiskFacts?.[code] : undefined;
  if (live?.fresh) {
    return {
      value: feature09(live.value, "INVALID_LIVE_FEATURE"),
      confidence: finite01(live.confidence, "INVALID_LIVE_CONFIDENCE"),
      provenanceRef: live.provenanceRef,
      source: "live",
    };
  }
  const value = input.features.values[code];
  const evidence = input.featureEvidence?.[code];
  return {
    value,
    confidence:
      evidence !== undefined
        ? finite01(evidence.confidence, "INVALID_FEATURE_CONFIDENCE")
        : input.features.confidence,
    provenanceRef:
      evidence?.provenanceRef ?? input.features.sourceRefs[0] ?? null,
    source: "master",
  };
}

function scoreComponent(
  component: ComponentName,
  signals: readonly ScoringSignal[],
  input: PoiRecommendationInputV1,
): ScoreEnvelopeV1 {
  const relevant = signals.filter((signal) => signal.component === component);
  const breakdown: ScoreBreakdownItemV1[] = [];
  let requestedWeight = 0;
  let knownWeight = 0;
  let knownBaseWeight = 0;
  let weightedSum = 0;
  for (const signal of relevant) {
    const baseWeight =
      SCORING_CONFIG_V1.featureWeights[signal.featureCode] * signal.weightScale;
    requestedWeight += baseWeight;
    const feature = resolveFeature(input, signal.featureCode);
    let preferenceValue = signal.preferenceValue;
    let signalSource = signal.source;
    let limitingPartyMemberIndex: number | null = null;
    if (
      (signal.functionKind === "cost" || signal.functionKind === "risk") &&
      preferenceValue !== null
    ) {
      const members = input.context.partyMemberTolerances ?? [];
      for (let i = 0; i < members.length; i += 1) {
        const candidate = members[i][signal.featureCode as ToleranceCode];
        if (candidate !== undefined) {
          preference19(candidate, "INVALID_PARTY_TOLERANCE");
          if (candidate < preferenceValue) {
            preferenceValue = candidate;
            limitingPartyMemberIndex = i;
          }
        }
      }
      const contextTolerance =
        signal.featureCode === "27"
          ? input.context.crowdTolerance
          : signal.featureCode === "28"
            ? input.context.queueTolerance
            : null;
      if (contextTolerance !== undefined && contextTolerance !== null) {
        preferenceValue = preference19(
          contextTolerance,
          "INVALID_CONTEXT_TOLERANCE",
        );
        limitingPartyMemberIndex = null;
        signalSource = "party_context";
        for (let i = 0; i < members.length; i += 1) {
          const candidate = members[i][signal.featureCode as ToleranceCode];
          if (candidate !== undefined && candidate < preferenceValue) {
            preferenceValue = candidate;
            limitingPartyMemberIndex = i;
          }
        }
      }
    }
    let contribution: number | null = null;
    if (feature.value !== null) {
      const x = feature.value / 9;
      if (
        signal.functionKind === "benefit" ||
        signal.functionKind === "suitability"
      ) {
        contribution =
          preferenceValue !== null
            ? ((preference19(preferenceValue, "INVALID_PREFERENCE_VALUE") - 5) /
                4) *
              x
            : finite01(
                signal.contextStrength ?? 0,
                "INVALID_CONTEXT_STRENGTH",
              ) *
              (2 * x - 1);
      } else if (signal.functionKind === "cost") {
        const tolerance =
          (preference19(preferenceValue ?? 5, "INVALID_PREFERENCE_VALUE") - 1) /
          8;
        contribution = -(
          Math.max(0, x - tolerance) ** SCORING_CONFIG_V1.gamma.cost
        );
      } else if (signal.featureCode === "39") {
        contribution =
          -finite01(signal.contextStrength ?? 0, "INVALID_CONTEXT_STRENGTH") *
          x ** SCORING_CONFIG_V1.gamma.weatherSensitivity;
      } else {
        const tolerance =
          (preference19(preferenceValue ?? 5, "INVALID_PREFERENCE_VALUE") - 1) /
          8;
        contribution = -(
          Math.max(0, x - tolerance) ** SCORING_CONFIG_V1.gamma.risk
        );
      }
    }
    if (Object.is(contribution, -0)) contribution = 0;
    const confidence = feature.confidence;
    const weightedContribution =
      contribution === null || confidence === null
        ? 0
        : baseWeight * confidence * contribution;
    if (feature.value !== null) {
      knownBaseWeight += baseWeight;
      if (confidence !== null) knownWeight += baseWeight * confidence;
    }
    weightedSum += weightedContribution;
    breakdown.push({
      signalKey: signal.signalKey,
      component,
      featureCode: signal.featureCode,
      featureKey: featureName(signal.featureCode),
      featureKind: POI_FEATURE_KIND_BY_CODE[signal.featureCode],
      featureValue: feature.value,
      featureConfidence: confidence,
      featureProvenanceRef: feature.provenanceRef,
      featureSource: feature.source,
      preferenceValue,
      contextStrength: signal.contextStrength,
      signalSource:
        limitingPartyMemberIndex !== null ? "party_context" : signalSource,
      signalProvenanceRef: signal.provenanceRef,
      functionKind: signal.functionKind,
      contribution,
      weight: baseWeight,
      weightedContribution,
      limitingPartyMemberIndex,
    });
  }
  const coverage = requestedWeight
    ? clamp(knownWeight / requestedWeight, 0, 1)
    : 0;
  const confidence = knownBaseWeight
    ? clamp(knownWeight / knownBaseWeight, 0, 1)
    : 0;
  const knownRaw = knownWeight ? clamp(weightedSum / knownWeight, -1, 1) : 0;
  const adjustedRaw = coverage * knownRaw;
  return {
    value: knownWeight
      ? clamp(
          Math.round(SCORING_CONFIG_V1.scoreMax * ((adjustedRaw + 1) / 2)),
          SCORING_CONFIG_V1.scoreMin,
          SCORING_CONFIG_V1.scoreMax,
        )
      : null,
    coverage,
    confidence,
    status: requestedWeight
      ? knownWeight
        ? "scored"
        : "neutral_default"
      : "not_applicable",
    configVersion: SCORING_CONFIG_VERSION,
    mappingVersion: MAPPING_VERSION,
    requestedWeight,
    knownWeight,
    knownRaw,
    adjustedRaw,
    breakdown,
  };
}

function featureName(code: PoiFeatureCode): string {
  return (
    POI_FEATURE_DEFINITIONS.find(([candidate]) => candidate === code)?.[1] ??
    code
  );
}

function emptyScore(status: ScoreStatus): ScoreEnvelopeV1 {
  return {
    value: null,
    coverage: 0,
    confidence: 0,
    status,
    configVersion: SCORING_CONFIG_VERSION,
    mappingVersion: MAPPING_VERSION,
    requestedWeight: 0,
    knownWeight: 0,
    knownRaw: 0,
    adjustedRaw: 0,
    breakdown: [],
  };
}

function deriveReasons(scores: readonly ScoreEnvelopeV1[]): ScoreReasonV1[] {
  const reasons: ScoreReasonV1[] = [];
  const add = (code: string, item: ScoreBreakdownItemV1) =>
    reasons.push({
      code,
      component: item.component,
      featureCode: item.featureCode,
      evidence: {
        featureValue: item.featureValue,
        contribution: item.contribution,
        provenanceRef: item.featureProvenanceRef,
        coverage: null,
      },
    });
  for (const score of scores) {
    if (
      score.requestedWeight &&
      score.coverage < SCORING_CONFIG_V1.lowCoverageThreshold
    )
      reasons.push({
        code: "LOW_DATA_COVERAGE",
        component: score.breakdown[0]?.component ?? "matchScore",
        featureCode: null,
        evidence: {
          featureValue: null,
          contribution: null,
          provenanceRef: null,
          coverage: score.coverage,
        },
      });
    for (const item of score.breakdown) {
      if (item.contribution === null || item.featureConfidence === null)
        continue;
      if (item.component === "matchScore" && item.functionKind === "benefit") {
        if (item.contribution >= SCORING_CONFIG_V1.reasonContributionThreshold)
          add("PREF_STRONG_MATCH", item);
        if (item.contribution <= -SCORING_CONFIG_V1.reasonContributionThreshold)
          add("PREF_DISLIKE_CONFLICT", item);
      }
      if (item.featureCode === "25") {
        if (item.contribution < 0) add("WALKING_OVER_TOLERANCE", item);
        else if (item.featureValue !== null && item.featureValue <= 3)
          add("LOW_WALKING_BURDEN", item);
      }
      if (item.featureCode === "27") {
        if (item.contribution < 0) add("CROWD_OVER_TOLERANCE", item);
        else if (item.featureValue !== null && item.featureValue <= 3)
          add("LOW_CROWD_RISK", item);
      }
      if (item.component === "partyFit")
        add(item.contribution >= 0 ? "PARTY_FIT_HIGH" : "PARTY_FIT_LOW", item);
      if (item.component === "seasonFit" && item.contribution > 0)
        add("SEASON_FIT_HIGH", item);
      if (item.component === "weatherFit" && item.contribution < 0)
        add("WEATHER_FIT_LOW", item);
      if (item.component === "timeSlotFit" && item.contribution > 0)
        add("TIME_SLOT_FIT_HIGH", item);
      if (item.component === "restFit" && item.contribution > 0)
        add("REST_VALUE_HIGH", item);
    }
  }
  return reasons;
}

export function scorePoiRecommendationV1(
  input: PoiRecommendationInputV1,
): PoiRecommendationResultV1 {
  if (!input.dataRevision || !input.context.contextVersion)
    throw new TypeError("MISSING_INPUT_VERSION");
  const parsed = parsePoiFeatureSetV1(input.features);
  if (!parsed.ok || input.poiRef !== input.features.poiRef)
    throw new TypeError("INVALID_POI_FEATURE_SET");
  const preference = adaptPreferenceToScoringV1(input);
  const gate = hardGate(input.constraints, preference);
  const blockedStatus = gate.status === "REJECT" ? "blocked" : "needs_fact";
  const score = (
    component: ComponentName,
    signals: readonly ScoringSignal[],
  ) =>
    gate.status === "PASS"
      ? scoreComponent(component, signals, input)
      : emptyScore(blockedStatus);
  const signals = [...preference.signals, ...contextSignals(input.context)];
  const matchScore = score("matchScore", signals);
  const partyFit = score("partyFit", signals);
  const seasonFit = score("seasonFit", signals);
  const weatherFit = score("weatherFit", signals);
  const timeSlotFit = score("timeSlotFit", signals);
  const restFit = score("restFit", signals);
  return {
    poiRef: input.poiRef,
    dataRevision: input.dataRevision,
    featureVersion: input.features.featureVersion,
    preferenceSourceRevision: preference.longTermSourceRevision,
    preferenceSnapshotRef: preference.tripSnapshotRef,
    preferenceOverrideRevision: preference.tripOverrideRevision,
    contextVersion: input.context.contextVersion,
    mappingVersion: MAPPING_VERSION,
    scoringConfigVersion: SCORING_CONFIG_VERSION,
    constraintGate: gate,
    matchScore,
    partyFit,
    seasonFit,
    weatherFit,
    timeSlotFit,
    restFit,
    dayFit: emptyScore("not_applicable"),
    routeFit: emptyScore("not_applicable"),
    reasons:
      gate.status === "PASS"
        ? deriveReasons([
            matchScore,
            partyFit,
            seasonFit,
            weatherFit,
            timeSlotFit,
            restFit,
          ])
        : [],
  };
}
