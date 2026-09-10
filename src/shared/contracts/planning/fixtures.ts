import type {
  AiCompactContextV1,
  AiDecisionResponseV1,
  LocalIdMapV1,
} from "./ai";
import type { CandidateRunV1 } from "./candidates";
import { PLANNING_CONTRACT_VERSION } from "./common";
import type { FactUsabilityV1, PlanningFactRefV1 } from "./facts";
import {
  POI_FEATURE_CODES,
  type EffectivePreferenceV1,
  type PoiFeatureSetV1,
  type PoiFeatureVectorV1,
} from "./features";
import type { PoiPlanningProjectionV1, PoiVisitProfileV1 } from "./poi";
import type { ReplanProposalV1 } from "./replanning";
import type { TravelRegionGraphV1 } from "./regions";
import {
  SCORE_COMPONENTS,
  type FeasibilityResultV1,
  type PlanningScoreSetV1,
} from "./scoring";
import type { DecisionRunV1 } from "./trace";

const now = "2026-09-10T12:00:00+09:00";
const featureValues = Object.fromEntries(
  POI_FEATURE_CODES.map((code) => [code, 0]),
) as PoiFeatureVectorV1;
featureValues["01"] = 0;
featureValues["02"] = null;
featureValues["04"] = 9;
featureValues["25"] = 7;
featureValues["26"] = 6;

export const completePoiFeatureFixture: PoiFeatureSetV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  featureVersion: "1.0",
  poiRef: "poi-kiyomizu-fixture",
  values: featureValues,
  sourceRefs: ["source-synthetic-fixture"],
  confidence: 0.8,
  updatedAt: now,
};

const preferenceValues = Object.fromEntries(
  POI_FEATURE_CODES.map((code) => [code, 5]),
) as EffectivePreferenceV1["values"];
preferenceValues["04"] = 9;
preferenceValues["25"] = 3;
export const effectivePreferenceFixture: EffectivePreferenceV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  preferenceVersion: "1.0",
  snapshotRef: "preference-snapshot-fixture",
  overrideRevision: 2,
  values: preferenceValues,
};

export const sparsePreferenceFixture = {
  version: "1" as const,
  entries: [
    ["04", 9],
    ["25", 3],
  ] as const,
};

export const visitProfileFixture: PoiVisitProfileV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  profileVersion: "1.0",
  profileId: "visit-profile-full-fixture",
  poiRef: completePoiFeatureFixture.poiRef,
  visitMode: "full_visit",
  status: "active",
  minimumDurationMinutes: 60,
  recommendedDurationMinutes: 90,
  maximumUsefulDurationMinutes: 150,
  fixedWalkingLoad: 2.8,
  variableWalkingLoad: 4.2,
  fixedPhysicalLoad: 2.4,
  variablePhysicalLoad: 3.6,
  terrainModifier: null,
  standingModifier: null,
  sourceRefs: ["source-synthetic-fixture"],
  confidence: 0.7,
  updatedAt: now,
};

export const poiPlanningProjectionFixture: PoiPlanningProjectionV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  poiRef: completePoiFeatureFixture.poiRef,
  featureSet: completePoiFeatureFixture,
  visitProfiles: [visitProfileFixture],
  regionRefs: ["region-kyoto"],
  factRefs: ["fact-opening-fixture"],
};

const region = (
  regionId: string,
  masterCode: string,
): TravelRegionGraphV1["nodes"][number] => ({
  contractVersion: PLANNING_CONTRACT_VERSION,
  schemaVersion: "1.0",
  regionId,
  masterCode,
  regionType: "travel_region",
  names: { nameJa: null, nameZhCn: null, nameEn: masterCode, aliases: [] },
  center: null,
  geometryRef: null,
  geometryKind: "unknown",
  gatewayProfile: null,
  sourceRefs: ["source-synthetic-fixture"],
  revision: 1,
});

const range = (low: number, typical: number, high: number) => ({
  low,
  typical,
  high,
});
export const regionGraphFixture: TravelRegionGraphV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  graphSchemaVersion: "1.0",
  graphDataRevision: "fixture-1",
  nodes: [
    region("region-tokyo", "JP-TOKYO"),
    region("region-hakone", "JP-HAKONE"),
  ],
  relations: [],
  travelEdges: [
    {
      contractVersion: PLANNING_CONTRACT_VERSION,
      edgeId: "edge-tokyo-hakone",
      fromRegionRef: "region-tokyo",
      toRegionRef: "region-hakone",
      scope: "macro",
      planningPrior: {
        tripCompatibility: 9,
        dayTripFit: 8,
        sameDayTransitionFit: 8,
        overnightTransitionFit: 7,
        scenicTransition: 6,
        slowTravelFit: 7,
        luggageEase: 6,
        reliabilityPrior: 7,
        detourPenaltyPrior: 2,
      },
      recommendedStayAfterArrivalDays: 1,
      variants: [
        {
          variantId: "variant-rail",
          mode: "rail",
          gatewayFromRef: null,
          gatewayToRef: null,
          typicalDurationMinutes: range(70, 90, 120),
          typicalCostJpy: range(1800, 2500, 4000),
          typicalTransfers: range(0, 1, 2),
          typicalWalkMinutes: range(5, 10, 20),
          frequencyBand: "high",
          reservationPrior: "optional",
          sourceRefs: ["source-synthetic-fixture"],
          observedAt: null,
          validUntil: null,
          confidence: 0.6,
        },
        {
          variantId: "variant-bus",
          mode: "bus",
          gatewayFromRef: null,
          gatewayToRef: null,
          typicalDurationMinutes: range(90, 120, 180),
          typicalCostJpy: range(1500, 2200, 3000),
          typicalTransfers: range(0, 0, 1),
          typicalWalkMinutes: range(5, 8, 15),
          frequencyBand: "medium",
          reservationPrior: "often_recommended",
          sourceRefs: ["source-synthetic-fixture"],
          observedAt: null,
          validUntil: null,
          confidence: 0.5,
        },
      ],
      sourceRefs: ["source-synthetic-fixture"],
      confidence: 0.6,
      revision: 1,
      lifecycleStatus: "active",
    },
  ],
};

const scores = Object.fromEntries(
  SCORE_COMPONENTS.map((component, index) => [
    component,
    {
      component,
      value: 80 - index,
      coverage: 0.9,
      confidence: 0.8,
      status: "scored",
      configVersion: "fixture-score-config",
      breakdown: [
        {
          featureCode: "04",
          preferenceValue: 9,
          featureValue: 9,
          contribution: 1,
          confidence: 0.8,
          reasonCode: "PREFERENCE_MATCH",
        },
      ],
    },
  ]),
) as PlanningScoreSetV1["scores"];
export const scoreSetFixture: PlanningScoreSetV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  subjectRef: completePoiFeatureFixture.poiRef,
  scores,
  overallValue: 78,
  overallConfigVersion: "fixture-overall-config",
};

const metrics = {
  scheduledMinutes: 90,
  transitionMinutes: 15,
  bufferMinutes: 10,
  walkingLoad: 7,
  physicalLoad: 6,
  remainingFatigueBudget: 8,
};
export const feasibilityPassFixture: FeasibilityResultV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  status: "PASS",
  scope: "item",
  subjectRef: completePoiFeatureFixture.poiRef,
  issues: [],
  metrics,
  visit: {
    visitMode: "full_visit",
    plannedDurationMinutes: 90,
    minimumDurationMinutes: 60,
    recommendedDurationMinutes: 90,
    maximumUsefulDurationMinutes: 150,
    visitWalkingLoad: 7,
    visitPhysicalLoad: 6,
    loadSource: "estimated_from_feature_summary",
  },
  factRefs: ["fact-opening-fixture"],
  configVersion: "fixture-feasibility-config",
};
export const durationTooShortFixture: FeasibilityResultV1 = {
  ...feasibilityPassFixture,
  status: "CRITICAL",
  issues: [
    {
      code: "DURATION_TOO_SHORT",
      severity: "CRITICAL",
      subjectRef: completePoiFeatureFixture.poiRef,
      requiredValue: 60,
      actualValue: 30,
      shortfallOrExcess: -30,
      factRefs: [],
      repairHints: ["extend_duration", "choose_supported_visit_mode"],
    },
  ],
  metrics: {
    ...metrics,
    scheduledMinutes: 30,
    walkingLoad: 4.2,
    physicalLoad: 3.8,
  },
  visit: {
    ...feasibilityPassFixture.visit!,
    plannedDurationMinutes: 30,
    visitWalkingLoad: 4.2,
    visitPhysicalLoad: 3.8,
  },
};

export const candidateRunFixture: CandidateRunV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  runId: "candidate-run-fixture",
  pipelineVersion: "1.0",
  configVersion: "candidate-config-fixture",
  tripRef: "trip-fixture",
  preferenceSnapshotRef: "preference-snapshot-fixture",
  contextSnapshotRef: "context-snapshot-fixture",
  graphVersion: "fixture-1",
  poiFeatureVersion: "1.0",
  scope: "day",
  candidates: [
    {
      contractVersion: PLANNING_CONTRACT_VERSION,
      runId: "candidate-run-fixture",
      candidateId: "candidate-closed",
      domainRef: "poi-closed-fixture",
      candidateKind: "poi",
      stage: "hard_filter",
      status: "rejected",
      anchor: null,
      protection: { mustGo: false, locked: false, protected: false },
      gate: "REJECT",
      feasibility: { route: null, itinerary: null },
      scoreRefs: {},
      factRefs: ["fact-closed-fixture"],
      reasons: [
        {
          code: "LIFECYCLE_CLOSED",
          stage: "hard_filter",
          severity: "blocking",
          subjectRef: "poi-closed-fixture",
          relatedCandidateRef: null,
          factRefs: ["fact-closed-fixture"],
        },
      ],
      parentCandidateIds: [],
    },
  ],
  countsByStage: { poi_expansion: 1, hard_filter: 0 },
  startedAt: now,
  completedAt: now,
};

export const localIdMapFixture: LocalIdMapV1 = {
  runId: "ai-run-fixture",
  entries: [
    { localId: 0, entityKind: "poi", domainRef: "poi-a", candidate: true },
    { localId: 1, entityKind: "poi", domainRef: "poi-b", candidate: true },
    {
      localId: 2,
      entityKind: "item",
      domainRef: "item-current",
      candidate: false,
    },
  ],
};

export const aiCompactContextFixture: AiCompactContextV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  v: "1",
  runId: localIdMapFixture.runId,
  task: "poi_choice",
  scope: {
    kind: "timeslot",
    tripRef: "trip-fixture",
    dayIndex: 3,
    regionLocalId: null,
    itemLocalId: null,
    window: [780, 1080],
  },
  state: {
    tripDays: 5,
    macroPath: [],
    currentRegion: null,
    currentDay: 3,
    currentWindow: [780, 1080],
    partySummary: "2A",
    budgetBand: "M",
    tripStyle: "balanced",
    lockedAnchors: [],
    completedRefs: [],
    inProgressRef: null,
    currentLoad: [5, 4],
    adjacentBoundary: null,
  },
  preference: {
    version: "1",
    entries: [
      ["04", 9],
      ["25", 3],
    ],
  },
  constraints: [
    { code: "finish_before", targetLocalId: null, value: 1080, hard: true },
  ],
  candidates: [
    {
      id: 0,
      entityKind: "poi",
      status: "candidate",
      name: null,
      metrics: { match: 9, visitRecommended: 90 },
      reasonTags: ["PREF_MATCH"],
    },
    {
      id: 1,
      entityKind: "poi",
      status: "candidate",
      name: null,
      metrics: { match: 8, visitRecommended: 60 },
      reasonTags: ["LOW_FATIGUE"],
    },
  ],
  route: null,
  weather: null,
  request: {
    kind: "choose",
    minimumSelections: 1,
    maximumSelections: 1,
    orderTargetIds: [],
    allowedOperations: [],
  },
  precision: "normal",
};

export const aiDecisionFixture: AiDecisionResponseV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  v: "1",
  runId: localIdMapFixture.runId,
  task: "poi_choice",
  status: "decision",
  decision: { kind: "choice", selectedIds: [1], backupIds: [0] },
  contextRequest: null,
  reasonCodes: ["R06"],
  confidenceBand: "high",
  uncertaintyCodes: [],
};
export const aiNeedMoreContextFixture: AiDecisionResponseV1 = {
  ...aiDecisionFixture,
  status: "need_more_context",
  decision: null,
  contextRequest: { needs: ["need_route_detail"], targetIds: [0, 1] },
  confidenceBand: "low",
};

export const replanProposalFixture: ReplanProposalV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  proposalId: "replan-proposal-fixture",
  runId: "replan-run-fixture",
  triggerRef: "trigger-delay-fixture",
  scope: "rest_of_day",
  earliestMutableAt: "2026-09-10T14:00:00+09:00",
  baseTripRevision: 2,
  basePlanRevision: 3,
  baseRuntimeRevision: 4,
  selectedRepairAttemptRef: "repair-consume-buffer",
  repairAttempts: [
    {
      attemptId: "repair-consume-buffer",
      strategyCode: "consume_buffer",
      status: "accepted",
      issueCodesBefore: ["RP01"],
      issueCodesAfter: [],
      affectedRefs: ["item-future"],
      elapsedMilliseconds: 2,
    },
  ],
  protectedRefs: ["item-completed", "item-in-progress"],
  affectedRefs: ["item-future"],
  factRefs: ["fact-route-fixture"],
  reasonCodes: ["RP01"],
  changeSetRef: null,
};

const fact = (factId: string, expiresAt: string): PlanningFactRefV1 => ({
  contractVersion: PLANNING_CONTRACT_VERSION,
  factId,
  factKind: "route_plan",
  subjectRef: "route-fixture",
  source: {
    sourceKind: "provider",
    provider: "fixture-provider",
    sourceRef: "source-fixture",
    authorityBand: "B",
  },
  observedAt: now,
  effectiveAt: null,
  validFrom: null,
  validUntil: null,
  expiresAt,
  confidence: 0.8,
  status: "active",
  revision: "fixture-1",
});
export const currentFactFixture = fact(
  "fact-current-fixture",
  "2026-09-10T13:00:00+09:00",
);
export const staleFactFixture = fact(
  "fact-stale-fixture",
  "2026-09-10T11:00:00+09:00",
);
export const currentFactUsabilityFixture: FactUsabilityV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  factRef: currentFactFixture.factId,
  decisionUse: "DRAFT_PLANNING",
  freshness: "CURRENT",
  action: "USE",
  reasonCodes: ["F01_CURRENT"],
  evaluatedAt: now,
};
export const staleFactUsabilityFixture: FactUsabilityV1 = {
  ...currentFactUsabilityFixture,
  factRef: staleFactFixture.factId,
  freshness: "STALE",
  action: "USE_WITH_WARNING",
  reasonCodes: ["F03_STALE"],
};

const traceBase: DecisionRunV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  traceVersion: "1.0",
  decisionRunId: "decision-run-engine-fixture",
  kind: "day_plan",
  trigger: {
    kind: "trip_creation",
    eventRef: null,
    userIntentCode: null,
    occurredAt: now,
  },
  scope: { kind: "day", subjectRef: "day-fixture" },
  tripRef: "trip-fixture",
  planRef: "plan-fixture",
  inputVersionRefs: {
    tripContractVersion: "1.0",
    tripRevision: 1,
    planRevision: 1,
    runtimeRevision: 1,
    preferenceSnapshotRef: "preference-snapshot-fixture",
    preferenceOverrideRevision: 2,
    poiFeatureVersion: "1.0",
    regionGraphVersion: "fixture-1",
  },
  policyVersionRefs: {
    candidateConfigVersion: "fixture-1",
    freshnessPolicyVersion: "fixture-1",
  },
  startedAt: now,
  completedAt: now,
  outcome: "selected",
  stageTraces: [
    {
      stage: "hard_filter",
      inputCount: 3,
      outputCount: 2,
      rejectedCount: 1,
      needsFactCount: 0,
      elapsedMilliseconds: 1,
      rejectionReasonCounts: { LIFECYCLE_CLOSED: 1 },
      fallbackCodes: [],
    },
  ],
  factUsage: [
    {
      factRef: currentFactFixture.factId,
      factKind: currentFactFixture.factKind,
      subjectRef: currentFactFixture.subjectRef,
      freshnessAtDecision: "CURRENT",
      actionAtDecision: "USE",
      authorityBand: "B",
      confidence: 0.8,
      observedAt: now,
      fallbackFromFactRef: null,
    },
  ],
  scoreRefs: ["score-fixture"],
  paretoRecordRefs: ["pareto-fixture"],
  diversityRecordRefs: ["diversity-fixture"],
  repairAttemptRefs: [],
  aiUsed: false,
  aiUsage: [],
  providerUsage: [],
  fallbackCodes: [],
  finalDecisionRef: "decision-fixture",
  proposalRef: null,
  engineValidationRef: "validation-fixture",
  changeSetRef: null,
  previewRef: null,
  applyResultRef: null,
  userOutcome: "not_applicable",
};
export const engineOnlyDecisionRunFixture = traceBase;
export const aiProviderDecisionRunFixture: DecisionRunV1 = {
  ...traceBase,
  decisionRunId: "decision-run-ai-fixture",
  aiUsed: true,
  aiUsage: [
    {
      aiRunRef: "ai-run-fixture",
      taskType: "poi_choice",
      contextContractVersion: "1",
      decisionContractVersion: "1",
      modelClass: "standard",
      providerClass: "fixture-ai",
      inputTokens: 200,
      outputTokens: 20,
      cachedInputTokens: 0,
      latencyMilliseconds: 50,
      expansionRounds: 0,
      retryCount: 0,
      status: "decision",
      reasonCodes: ["R01"],
    },
  ],
  providerUsage: [
    {
      callRef: "provider-call-fixture",
      capability: "route",
      providerClass: "fixture-route",
      requestPurpose: "route_feasibility",
      status: "ok",
      latencyMilliseconds: 20,
      cacheHit: false,
      factRefsProduced: [currentFactFixture.factId],
      billableUnits: 1,
      costMinor: null,
      currency: null,
    },
  ],
};

/** Synthetic invalid inputs used to prove fail-closed contract boundaries. */
export const negativePlanningFixtures = {
  featureValueTen: (() => {
    const value = structuredClone(
      completePoiFeatureFixture,
    ) as unknown as Record<string, unknown>;
    (value.values as Record<string, unknown>)["01"] = 10;
    return value;
  })(),
  unknownFeatureCode: (() => {
    const value = structuredClone(
      completePoiFeatureFixture,
    ) as unknown as Record<string, unknown>;
    (value.values as Record<string, unknown>)["44"] = null;
    return value;
  })(),
  explicitCompactNeutral: { version: "1", entries: [["01", 5]] },
  invalidVisitDurationOrder: {
    ...visitProfileFixture,
    minimumDurationMinutes: 100,
  },
  duplicateLocalId: {
    ...aiCompactContextFixture,
    candidates: [
      aiCompactContextFixture.candidates[0],
      { ...aiCompactContextFixture.candidates[1], id: 0 },
    ],
  },
  invalidScore: {
    ...scoreSetFixture,
    scores: {
      ...scoreSetFixture.scores,
      matchScore: { ...scoreSetFixture.scores.matchScore!, value: 100 },
    },
  },
  invalidFreshness: { ...currentFactUsabilityFixture, freshness: "FRESHISH" },
  forbiddenTraceProviderRaw: {
    ...engineOnlyDecisionRunFixture,
    providerRaw: { payload: true },
  },
} as const;
