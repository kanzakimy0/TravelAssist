import type {
  CandidateRunV1,
  ConstraintGateStatus,
  DecisionRunV1,
  EffectivePreferenceV1,
  FeasibilityStatus,
  PoiPlanningProjectionV1,
  TravelRegionGraphV1,
} from "../../../shared/contracts/planning";

export const REFERENCE_PIPELINE_STAGES = [
  "region_candidate",
  "corridor_candidate",
  "poi_expansion",
  "hard_filter",
  "scoring",
  "route_feasibility",
  "itinerary_feasibility",
  "pareto",
  "diversity",
  "top_n",
] as const;

export type ReferencePipelineStage = (typeof REFERENCE_PIPELINE_STAGES)[number];

export type CandidatePipelineConfigV1 = {
  configVersion: string;
  regionLimit: number;
  corridorLimit: number;
  expansionBatchSize: number;
  maxExpansionRounds: number;
  minimumViablePoiCount: number;
  diversityCategoryLimit: number;
  topN: number;
  backupN: number;
};

export type CandidateCorridorFixtureV1 = {
  corridorRef: string;
  orderedRegionRefs: string[];
  edgeRefs: string[];
  expansionPriority: number;
};

export type PilotObjectiveVectorV1 = {
  preferenceValue: number;
  currentSuitability: number;
  routeBurden: number;
  timeCost: number;
  moneyCost: number;
  fatigueLoad: number;
  risk: number;
  iconicValue: number;
  hiddenValue: number;
};

export type CandidatePoiFixtureV1 = {
  poiRef: string;
  regionRef: string;
  category: string;
  projection: PoiPlanningProjectionV1;
  scoreProjectionRef: string;
  objectiveVector: PilotObjectiveVectorV1;
  anchor: "must_go" | "want_go" | "prefer" | "avoid" | "must_avoid" | null;
  hardGate: {
    status: ConstraintGateStatus;
    reasonCode: string | null;
    factRefs: string[];
  };
  routeFeasibility: {
    status: FeasibilityStatus;
    reasonCode: string | null;
    factRefs: string[];
  };
  itineraryFeasibility: {
    status: FeasibilityStatus;
    reasonCode: string | null;
    factRefs: string[];
  };
  expansionRound: number;
};

export type CandidatePipelineInputV1 = {
  schemaVersion: "1.0";
  runId: string;
  runAt: string;
  tripRequest: {
    tripRef: string;
    revision: number;
    expectedRevision: number;
    requestedRegionRefs: string[];
    mustGoPoiRefs: string[];
  };
  effectivePreference: EffectivePreferenceV1;
  runtimeContext: {
    contextSnapshotRef: string;
    graph: TravelRegionGraphV1;
    requestedExpansionRounds: number;
  };
  corridors: CandidateCorridorFixtureV1[];
  poiCatalog: CandidatePoiFixtureV1[];
};

export type PersistableCandidateSelectionV1 = {
  schemaVersion: "1.0";
  tripRef: string;
  tripRevision: number;
  regionRefs: string[];
  corridorRefs: string[];
  selectedPoiRefs: string[];
  backupPoiRefs: string[];
};

export type CandidatePipelineDiagnosticsV1 = {
  deterministicRepeat: boolean;
  byteStableNormalizedResult: boolean;
  hardRejectBypass: number;
  mustGoSilentlyDropped: number;
  needsFactSilentlyPromoted: number;
  danglingRegionRefs: number;
  danglingPoiRefs: number;
  danglingCandidateRefs: number;
  improperParetoSurvivors: number;
  diversityResurrectedRejected: number;
  unboundedExpansionOrRetry: number;
  decisionTraceStageCoverage: number;
  aiCalls: number;
  providerCalls: number;
  productionDatabaseWrites: number;
  scoringParameterChanges: number;
  regionGraphSemanticChanges: number;
  masterCodeGovernanceChanges: number;
  plannerOrStepUiChanges: number;
};

export type CandidatePipelineResultV1 = {
  schemaVersion: "1.0";
  pipelineVersion: "1.0";
  configVersion: string;
  inputRevision: number;
  graphRevision: string;
  terminalDisposition: "TOP_N_READY" | "NEEDS_FACT" | "NO_VALID_CHOICE";
  candidateRun: CandidateRunV1;
  decisionTrace: DecisionRunV1;
  persistableSelection: PersistableCandidateSelectionV1;
  unresolvedPoiRefs: string[];
  rejectedPoiRefs: string[];
  expansionRoundsUsed: number;
  diagnostics: CandidatePipelineDiagnosticsV1;
};

export type CandidatePipelineValidationIssue = {
  code: string;
  path: string;
};

export type CandidatePipelineValidationResult =
  { ok: true } | { ok: false; issue: CandidatePipelineValidationIssue };
