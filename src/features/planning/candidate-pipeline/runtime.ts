import {
  PLANNING_CONTRACT_VERSION,
  parseCandidateRunV1,
  parseDecisionRunV1,
  parseEffectivePreferenceV1,
  parsePoiPlanningProjectionV1,
  parseTravelRegionGraphV1,
  type CandidateReasonV1,
  type CandidateStage,
  type CandidateStageTraceV1,
  type PlanningCandidateV1,
} from "../../../shared/contracts/planning";

import {
  REFERENCE_PIPELINE_STAGES,
  type CandidatePipelineConfigV1,
  type CandidatePipelineDiagnosticsV1,
  type CandidatePipelineInputV1,
  type CandidatePipelineResultV1,
  type CandidatePipelineValidationResult,
  type CandidatePoiFixtureV1,
  type PilotObjectiveVectorV1,
} from "./types";

const MAX_SAFE_PIPELINE_LIMIT = 10_000;
const MAX_CONFIGURED_EXPANSION_ROUNDS = 16;
const LOCAL_CANDIDATE_PREFIX = "candidate:";

export class CandidatePipelineError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path = "$") {
    super(`${code} at ${path}`);
    this.name = "CandidatePipelineError";
    this.code = code;
    this.path = path;
  }
}

type MutablePoiState = {
  fixture: CandidatePoiFixtureV1;
  candidate: PlanningCandidateV1;
};

type PipelineContext = {
  input: CandidatePipelineInputV1;
  config: CandidatePipelineConfigV1;
  knownRegionRefs: Set<string>;
  knownPoiRefs: Set<string>;
  candidates: PlanningCandidateV1[];
  poiStates: MutablePoiState[];
  traces: CandidateStageTraceV1[];
  fallbackCodes: string[];
  expansionRoundsUsed: number;
};

const fail = (code: string, path = "$"): never => {
  throw new CandidatePipelineError(code, path);
};

const assertText = (value: unknown, path: string) => {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0)
    fail("INVALID_ID", path);
};

const assertInteger = (
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
) => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    fail("INVALID_LIMIT", path);
};

const unique = (values: string[], code: string, path: string) => {
  if (new Set(values).size !== values.length) fail(code, path);
};

const candidateId = (runId: string, kind: string, domainRef: string) =>
  `${LOCAL_CANDIDATE_PREFIX}${runId}:${kind}:${domainRef}`;

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "en");

const reason = (
  code: string,
  stage: CandidateStage,
  subjectRef: string,
  severity: CandidateReasonV1["severity"],
  factRefs: string[] = [],
  relatedCandidateRef: string | null = null,
): CandidateReasonV1 => ({
  code,
  stage,
  severity,
  subjectRef,
  relatedCandidateRef,
  factRefs: [...factRefs].sort(compareText),
});

const stageTrace = (
  stage: CandidateStageTraceV1["stage"],
  inputCount: number,
  outputCount: number,
  rejectedCount = 0,
  needsFactCount = 0,
  rejectionReasonCounts: Record<string, number> = {},
  fallbackCodes: string[] = [],
): CandidateStageTraceV1 => ({
  stage,
  inputCount,
  outputCount,
  rejectedCount,
  needsFactCount,
  elapsedMilliseconds: null,
  rejectionReasonCounts: Object.fromEntries(
    Object.entries(rejectionReasonCounts).sort(([left], [right]) =>
      compareText(left, right),
    ),
  ),
  fallbackCodes: [...fallbackCodes].sort(compareText),
});

const countCodes = (rows: MutablePoiState[]) => {
  const counts: Record<string, number> = {};
  for (const row of rows)
    for (const item of row.candidate.reasons)
      counts[item.code] = (counts[item.code] ?? 0) + 1;
  return counts;
};

const baseCandidate = (
  input: CandidatePipelineInputV1,
  domainRef: string,
  kind: PlanningCandidateV1["candidateKind"],
  stage: CandidateStage,
  parentCandidateIds: string[] = [],
): PlanningCandidateV1 => ({
  contractVersion: PLANNING_CONTRACT_VERSION,
  runId: input.runId,
  candidateId: candidateId(input.runId, kind, domainRef),
  domainRef,
  candidateKind: kind,
  stage,
  status: "active",
  anchor: null,
  protection: { mustGo: false, locked: false, protected: false },
  gate: null,
  feasibility: { route: null, itinerary: null },
  scoreRefs: {},
  factRefs: [],
  reasons: [],
  parentCandidateIds: [...parentCandidateIds].sort(compareText),
});

function validateConfig(config: CandidatePipelineConfigV1) {
  assertText(config.configVersion, "$.config.configVersion");
  for (const key of [
    "regionLimit",
    "corridorLimit",
    "expansionBatchSize",
    "minimumViablePoiCount",
    "diversityCategoryLimit",
    "topN",
    "backupN",
  ] as const)
    assertInteger(
      config[key],
      `$.config.${key}`,
      key === "backupN" ? 0 : 1,
      MAX_SAFE_PIPELINE_LIMIT,
    );
  assertInteger(
    config.maxExpansionRounds,
    "$.config.maxExpansionRounds",
    1,
    MAX_CONFIGURED_EXPANSION_ROUNDS,
  );
}

function validateInput(
  input: CandidatePipelineInputV1,
  config: CandidatePipelineConfigV1,
) {
  if (input.schemaVersion !== "1.0") fail("UNSUPPORTED_VERSION");
  assertText(input.runId, "$.input.runId");
  if (Number.isNaN(Date.parse(input.runAt)))
    fail("INVALID_INSTANT", "$.input.runAt");
  assertText(input.tripRequest.tripRef, "$.input.tripRequest.tripRef");
  assertInteger(
    input.tripRequest.revision,
    "$.input.tripRequest.revision",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  assertInteger(
    input.tripRequest.expectedRevision,
    "$.input.tripRequest.expectedRevision",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  if (input.tripRequest.revision !== input.tripRequest.expectedRevision)
    fail("STALE_RUN_REVISION", "$.input.tripRequest.expectedRevision");
  const preference = parseEffectivePreferenceV1(input.effectivePreference);
  if (!preference.ok)
    fail(
      preference.issue.code,
      `$.input.effectivePreference${preference.issue.path.slice(1)}`,
    );
  const graph = parseTravelRegionGraphV1(input.runtimeContext.graph);
  const graphValue = graph.ok
    ? graph.value
    : fail(
        graph.issue.code,
        `$.input.runtimeContext.graph${graph.issue.path.slice(1)}`,
      );
  assertInteger(
    input.runtimeContext.requestedExpansionRounds,
    "$.input.runtimeContext.requestedExpansionRounds",
    1,
    MAX_CONFIGURED_EXPANSION_ROUNDS,
  );
  if (input.runtimeContext.requestedExpansionRounds > config.maxExpansionRounds)
    fail(
      "EXPANSION_BOUND_EXCEEDED",
      "$.input.runtimeContext.requestedExpansionRounds",
    );

  const knownRegions = new Set(
    graphValue.nodes.map(({ regionId }) => regionId),
  );
  unique(
    input.tripRequest.requestedRegionRefs,
    "DUPLICATE_REGION_REF",
    "$.input.tripRequest.requestedRegionRefs",
  );
  for (const [
    index,
    regionRef,
  ] of input.tripRequest.requestedRegionRefs.entries())
    if (!knownRegions.has(regionRef))
      fail(
        "DANGLING_REGION_REF",
        `$.input.tripRequest.requestedRegionRefs[${index}]`,
      );

  const corridorRefs = input.corridors.map(({ corridorRef }) => corridorRef);
  unique(corridorRefs, "DUPLICATE_CORRIDOR_REF", "$.input.corridors");
  input.corridors.forEach((corridor, index) => {
    assertText(corridor.corridorRef, `$.input.corridors[${index}].corridorRef`);
    unique(
      corridor.orderedRegionRefs,
      "DUPLICATE_REGION_REF",
      `$.input.corridors[${index}].orderedRegionRefs`,
    );
    for (const regionRef of corridor.orderedRegionRefs)
      if (!knownRegions.has(regionRef))
        fail(
          "DANGLING_REGION_REF",
          `$.input.corridors[${index}].orderedRegionRefs`,
        );
    assertInteger(
      corridor.expansionPriority,
      `$.input.corridors[${index}].expansionPriority`,
      0,
      MAX_SAFE_PIPELINE_LIMIT,
    );
  });

  const poiRefs = input.poiCatalog.map(({ poiRef }) => poiRef);
  unique(poiRefs, "DUPLICATE_POI_REF", "$.input.poiCatalog");
  const knownPois = new Set(poiRefs);
  input.poiCatalog.forEach((poi, index) => {
    assertText(poi.poiRef, `$.input.poiCatalog[${index}].poiRef`);
    if (!knownRegions.has(poi.regionRef))
      fail("DANGLING_REGION_REF", `$.input.poiCatalog[${index}].regionRef`);
    const projection = parsePoiPlanningProjectionV1(poi.projection);
    if (!projection.ok)
      fail(
        projection.issue.code,
        `$.input.poiCatalog[${index}].projection${projection.issue.path.slice(1)}`,
      );
    if (poi.projection.poiRef !== poi.poiRef)
      fail(
        "POI_PROJECTION_MISMATCH",
        `$.input.poiCatalog[${index}].projection.poiRef`,
      );
    if (!poi.projection.regionRefs.includes(poi.regionRef))
      fail(
        "POI_REGION_MISMATCH",
        `$.input.poiCatalog[${index}].projection.regionRefs`,
      );
    assertInteger(
      poi.expansionRound,
      `$.input.poiCatalog[${index}].expansionRound`,
      1,
      MAX_CONFIGURED_EXPANSION_ROUNDS,
    );
    for (const [key, value] of Object.entries(poi.objectiveVector))
      if (!Number.isFinite(value) || value < 0 || value > 9)
        fail(
          "INVALID_OBJECTIVE_VALUE",
          `$.input.poiCatalog[${index}].objectiveVector.${key}`,
        );
  });
  unique(
    input.tripRequest.mustGoPoiRefs,
    "DUPLICATE_POI_REF",
    "$.input.tripRequest.mustGoPoiRefs",
  );
  for (const poiRef of input.tripRequest.mustGoPoiRefs)
    if (!knownPois.has(poiRef))
      fail("DANGLING_POI_REF", "$.input.tripRequest.mustGoPoiRefs");
}

function addRegionCandidates(context: PipelineContext) {
  const selected = [...context.input.tripRequest.requestedRegionRefs]
    .sort(compareText)
    .slice(0, context.config.regionLimit);
  const candidates = selected.map((regionRef) =>
    baseCandidate(context.input, regionRef, "region", "region_candidate"),
  );
  context.candidates.push(...candidates);
  context.traces.push(
    stageTrace("region_candidate", selected.length, candidates.length),
  );
  return candidates;
}

function addCorridorCandidates(
  context: PipelineContext,
  regionCandidates: PlanningCandidateV1[],
) {
  const requested = new Set(regionCandidates.map(({ domainRef }) => domainRef));
  const corridors = [...context.input.corridors]
    .filter(({ orderedRegionRefs }) =>
      orderedRegionRefs.some((regionRef) => requested.has(regionRef)),
    )
    .sort(
      (left, right) =>
        left.expansionPriority - right.expansionPriority ||
        compareText(left.corridorRef, right.corridorRef),
    )
    .slice(0, context.config.corridorLimit);
  const candidates = corridors.map((corridor) =>
    baseCandidate(
      context.input,
      corridor.corridorRef,
      "corridor",
      "corridor_candidate",
      regionCandidates
        .filter(({ domainRef }) =>
          corridor.orderedRegionRefs.includes(domainRef),
        )
        .map(({ candidateId: id }) => id),
    ),
  );
  context.candidates.push(...candidates);
  context.traces.push(
    stageTrace(
      "corridor_candidate",
      regionCandidates.length,
      candidates.length,
    ),
  );
  return { corridors, candidates };
}

function expandPoiCandidates(
  context: PipelineContext,
  regionCandidates: PlanningCandidateV1[],
  corridorData: ReturnType<typeof addCorridorCandidates>,
) {
  const selectedRegions = new Set([
    ...regionCandidates.map(({ domainRef }) => domainRef),
    ...corridorData.corridors.flatMap(
      ({ orderedRegionRefs }) => orderedRegionRefs,
    ),
  ]);
  const available = [...context.input.poiCatalog]
    .filter(({ regionRef }) => selectedRegions.has(regionRef))
    .sort(
      (left, right) =>
        left.expansionRound - right.expansionRound ||
        compareText(left.poiRef, right.poiRef),
    );
  const requestedRounds = context.input.runtimeContext.requestedExpansionRounds;
  const selected: CandidatePoiFixtureV1[] = [];
  let round = 0;
  while (
    round < requestedRounds &&
    round < context.config.maxExpansionRounds &&
    selected.length < context.config.minimumViablePoiCount
  ) {
    round += 1;
    selected.push(
      ...available
        .filter(({ expansionRound }) => expansionRound === round)
        .slice(0, context.config.expansionBatchSize),
    );
  }
  context.expansionRoundsUsed = round;
  if (round > 1) context.fallbackCodes.push("SPARSE_POOL_EXPANSION");

  const corridorCandidateByRegion = new Map<string, string>();
  corridorData.corridors.forEach((corridor, index) => {
    for (const regionRef of corridor.orderedRegionRefs)
      if (!corridorCandidateByRegion.has(regionRef))
        corridorCandidateByRegion.set(
          regionRef,
          corridorData.candidates[index].candidateId,
        );
  });
  const regionCandidateByRef = new Map(
    regionCandidates.map((candidate) => [
      candidate.domainRef,
      candidate.candidateId,
    ]),
  );
  context.poiStates = selected.map((fixture) => {
    const parent =
      corridorCandidateByRegion.get(fixture.regionRef) ??
      regionCandidateByRef.get(fixture.regionRef);
    const candidate = baseCandidate(
      context.input,
      fixture.poiRef,
      "poi",
      "poi_expansion",
      parent ? [parent] : [],
    );
    candidate.anchor = context.input.tripRequest.mustGoPoiRefs.includes(
      fixture.poiRef,
    )
      ? "must_go"
      : fixture.anchor;
    candidate.protection = {
      mustGo: candidate.anchor === "must_go",
      locked: false,
      protected: candidate.anchor === "must_go",
    };
    return { fixture, candidate };
  });
  context.candidates.push(
    ...context.poiStates.map(({ candidate }) => candidate),
  );
  context.traces.push(
    stageTrace(
      "poi_expansion",
      available.length,
      context.poiStates.length,
      0,
      0,
      {},
      round > 1 ? ["SPARSE_POOL_EXPANSION"] : [],
    ),
  );
}

function applyHardFilter(context: PipelineContext) {
  for (const state of context.poiStates) {
    const { hardGate } = state.fixture;
    state.candidate.stage = "hard_filter";
    state.candidate.gate = hardGate.status;
    state.candidate.factRefs = [...hardGate.factRefs].sort(compareText);
    if (hardGate.status === "REJECT") {
      state.candidate.status = "rejected";
      state.candidate.reasons.push(
        reason(
          hardGate.reasonCode ?? "HARD_CONSTRAINT",
          "hard_filter",
          state.fixture.poiRef,
          "blocking",
          hardGate.factRefs,
        ),
      );
    } else if (hardGate.status === "NEEDS_FACT") {
      state.candidate.status = "needs_fact";
      state.candidate.reasons.push(
        reason(
          hardGate.reasonCode ?? "MISSING_CRITICAL_FACT",
          "hard_filter",
          state.fixture.poiRef,
          "blocking",
          hardGate.factRefs,
        ),
      );
    }
  }
  const survivors = context.poiStates.filter(
    ({ candidate }) => candidate.status === "active",
  );
  const rejected = context.poiStates.filter(
    ({ candidate }) => candidate.status === "rejected",
  );
  const unresolved = context.poiStates.filter(
    ({ candidate }) => candidate.status === "needs_fact",
  );
  context.traces.push(
    stageTrace(
      "hard_filter",
      context.poiStates.length,
      survivors.length,
      rejected.length,
      unresolved.length,
      countCodes([...rejected, ...unresolved]),
    ),
  );
}

function applyScoring(context: PipelineContext) {
  const active = context.poiStates.filter(
    ({ candidate }) => candidate.status === "active",
  );
  for (const state of active) {
    state.candidate.stage = "scoring";
    state.candidate.scoreRefs = {
      matchScore: `${state.fixture.scoreProjectionRef}:match`,
      currentSuitability: `${state.fixture.scoreProjectionRef}:current`,
      routeFit: `${state.fixture.scoreProjectionRef}:route-prior`,
    };
  }
  context.traces.push(stageTrace("scoring", active.length, active.length));
}

function applyFeasibility(
  context: PipelineContext,
  key: "routeFeasibility" | "itineraryFeasibility",
  stage: "route_feasibility" | "itinerary_feasibility",
) {
  const activeBefore = context.poiStates.filter(
    ({ candidate }) => candidate.status === "active",
  );
  const affected: MutablePoiState[] = [];
  for (const state of activeBefore) {
    const check = state.fixture[key];
    state.candidate.stage = stage;
    state.candidate.feasibility[
      key === "routeFeasibility" ? "route" : "itinerary"
    ] = check.status;
    state.candidate.factRefs = [
      ...new Set([...state.candidate.factRefs, ...check.factRefs]),
    ].sort(compareText);
    if (check.status === "CRITICAL") {
      state.candidate.status = "rejected";
      state.candidate.reasons.push(
        reason(
          check.reasonCode ??
            (key === "routeFeasibility"
              ? "ROUTE_INFEASIBLE"
              : "ITINERARY_INFEASIBLE"),
          stage,
          state.fixture.poiRef,
          "blocking",
          check.factRefs,
        ),
      );
      affected.push(state);
    } else if (check.status === "NEEDS_FACT") {
      state.candidate.status = "needs_fact";
      state.candidate.reasons.push(
        reason(
          check.reasonCode ??
            (key === "routeFeasibility"
              ? "MISSING_ROUTE_FACT"
              : "MISSING_ITINERARY_FACT"),
          stage,
          state.fixture.poiRef,
          "blocking",
          check.factRefs,
        ),
      );
      affected.push(state);
    } else if (check.status === "WARNING") {
      state.candidate.reasons.push(
        reason(
          check.reasonCode ?? "FEASIBILITY_WARNING",
          stage,
          state.fixture.poiRef,
          "warning",
          check.factRefs,
        ),
      );
    }
  }
  context.traces.push(
    stageTrace(
      stage,
      activeBefore.length,
      context.poiStates.filter(({ candidate }) => candidate.status === "active")
        .length,
      affected.filter(({ candidate }) => candidate.status === "rejected")
        .length,
      affected.filter(({ candidate }) => candidate.status === "needs_fact")
        .length,
      countCodes(affected),
    ),
  );
}

const maximizeObjectives: (keyof PilotObjectiveVectorV1)[] = [
  "preferenceValue",
  "currentSuitability",
  "iconicValue",
  "hiddenValue",
];
const minimizeObjectives: (keyof PilotObjectiveVectorV1)[] = [
  "routeBurden",
  "timeCost",
  "moneyCost",
  "fatigueLoad",
  "risk",
];

export function objectiveDominates(
  left: PilotObjectiveVectorV1,
  right: PilotObjectiveVectorV1,
) {
  const noWorse =
    maximizeObjectives.every((key) => left[key] >= right[key]) &&
    minimizeObjectives.every((key) => left[key] <= right[key]);
  const better =
    maximizeObjectives.some((key) => left[key] > right[key]) ||
    minimizeObjectives.some((key) => left[key] < right[key]);
  return noWorse && better;
}

function applyPareto(context: PipelineContext) {
  const active = context.poiStates.filter(
    ({ candidate }) => candidate.status === "active",
  );
  const dominated: MutablePoiState[] = [];
  for (const state of active) {
    if (state.candidate.protection.mustGo) continue;
    const competitor = active
      .filter(
        (other) =>
          other !== state &&
          other.fixture.category === state.fixture.category &&
          objectiveDominates(
            other.fixture.objectiveVector,
            state.fixture.objectiveVector,
          ),
      )
      .sort((left, right) =>
        compareText(left.fixture.poiRef, right.fixture.poiRef),
      )[0];
    if (!competitor) continue;
    state.candidate.stage = "pareto";
    state.candidate.status = "dominated";
    state.candidate.reasons.push(
      reason(
        "PARETO_DOMINATED",
        "pareto",
        state.fixture.poiRef,
        "info",
        [],
        competitor.candidate.candidateId,
      ),
    );
    dominated.push(state);
  }
  context.traces.push(
    stageTrace(
      "pareto",
      active.length,
      active.length - dominated.length,
      dominated.length,
      0,
      countCodes(dominated),
    ),
  );
}

const rankingVector = (state: MutablePoiState) => {
  const vector = state.fixture.objectiveVector;
  return [
    state.candidate.protection.mustGo ? 1 : 0,
    vector.preferenceValue,
    vector.currentSuitability,
    vector.iconicValue,
    vector.hiddenValue,
    -vector.risk,
    -vector.routeBurden,
    -vector.fatigueLoad,
  ];
};

const compareRank = (left: MutablePoiState, right: MutablePoiState) => {
  const leftVector = rankingVector(left);
  const rightVector = rankingVector(right);
  for (let index = 0; index < leftVector.length; index += 1) {
    if (leftVector[index] !== rightVector[index])
      return rightVector[index] - leftVector[index];
  }
  return compareText(left.fixture.poiRef, right.fixture.poiRef);
};

function applyDiversity(context: PipelineContext) {
  const active = context.poiStates
    .filter(({ candidate }) => candidate.status === "active")
    .sort(compareRank);
  const categoryCounts = new Map<string, number>();
  const pruned: MutablePoiState[] = [];
  for (const state of active) {
    const count = categoryCounts.get(state.fixture.category) ?? 0;
    if (
      !state.candidate.protection.mustGo &&
      count >= context.config.diversityCategoryLimit
    ) {
      state.candidate.stage = "diversity";
      state.candidate.status = "pruned_by_diversity";
      state.candidate.reasons.push(
        reason("DIVERSITY_PRUNED", "diversity", state.fixture.poiRef, "info"),
      );
      pruned.push(state);
      continue;
    }
    categoryCounts.set(state.fixture.category, count + 1);
  }
  context.traces.push(
    stageTrace(
      "diversity",
      active.length,
      active.length - pruned.length,
      pruned.length,
      0,
      countCodes(pruned),
    ),
  );
}

function applyTopN(context: PipelineContext) {
  const active = context.poiStates
    .filter(({ candidate }) => candidate.status === "active")
    .sort(compareRank);
  const mustGoCount = active.filter(
    ({ candidate }) => candidate.protection.mustGo,
  ).length;
  const topN = Math.max(context.config.topN, mustGoCount);
  const selected = active.slice(0, topN);
  const backups = active.slice(topN, topN + context.config.backupN);
  const pruned = active.slice(topN + context.config.backupN);
  if (mustGoCount > context.config.topN)
    context.fallbackCodes.push("MUST_GO_BUDGET_EXPANDED");
  for (const state of selected) {
    state.candidate.stage = "top_n";
    state.candidate.status = "selected";
  }
  for (const state of backups) {
    state.candidate.stage = "top_n";
    state.candidate.status = "backup";
  }
  for (const state of pruned) {
    state.candidate.stage = "top_n";
    state.candidate.status = "pruned_by_limit";
    state.candidate.reasons.push(
      reason("TOP_N_LIMIT", "top_n", state.fixture.poiRef, "info"),
    );
  }
  context.traces.push(
    stageTrace(
      "top_n",
      active.length,
      selected.length + backups.length,
      pruned.length,
      0,
      countCodes(pruned),
      mustGoCount > context.config.topN ? ["MUST_GO_BUDGET_EXPANDED"] : [],
    ),
  );
}

function diagnostics(
  context: PipelineContext,
  result: Omit<CandidatePipelineResultV1, "diagnostics">,
): CandidatePipelineDiagnosticsV1 {
  const selected = new Set(result.persistableSelection.selectedPoiRefs);
  const backup = new Set(result.persistableSelection.backupPoiRefs);
  const outputPoiRefs = new Set([...selected, ...backup]);
  const hardRejected = context.poiStates.filter(
    ({ candidate }) =>
      candidate.gate === "REJECT" ||
      candidate.feasibility.route === "CRITICAL" ||
      candidate.feasibility.itinerary === "CRITICAL",
  );
  const needsFact = context.poiStates.filter(
    ({ candidate }) =>
      candidate.gate === "NEEDS_FACT" ||
      candidate.feasibility.route === "NEEDS_FACT" ||
      candidate.feasibility.itinerary === "NEEDS_FACT",
  );
  const mustGoSilentlyDropped = context.poiStates.filter(
    ({ candidate, fixture }) =>
      candidate.protection.mustGo &&
      !outputPoiRefs.has(fixture.poiRef) &&
      candidate.status !== "rejected" &&
      candidate.status !== "needs_fact",
  ).length;
  const candidateIds = new Set(
    context.candidates.map(({ candidateId: id }) => id),
  );
  const poiRefs = new Set(context.input.poiCatalog.map(({ poiRef }) => poiRef));
  const stageCoverage =
    new Set(context.traces.map(({ stage }) => stage)).size /
    REFERENCE_PIPELINE_STAGES.length;
  return {
    deterministicRepeat: true,
    byteStableNormalizedResult: true,
    hardRejectBypass: hardRejected.filter(({ fixture }) =>
      outputPoiRefs.has(fixture.poiRef),
    ).length,
    mustGoSilentlyDropped,
    needsFactSilentlyPromoted: needsFact.filter(({ fixture }) =>
      outputPoiRefs.has(fixture.poiRef),
    ).length,
    danglingRegionRefs: result.persistableSelection.regionRefs.filter(
      (ref) => !context.knownRegionRefs.has(ref),
    ).length,
    danglingPoiRefs: [...outputPoiRefs].filter((ref) => !poiRefs.has(ref))
      .length,
    danglingCandidateRefs: context.candidates
      .flatMap(({ parentCandidateIds }) => parentCandidateIds)
      .filter((ref) => !candidateIds.has(ref)).length,
    improperParetoSurvivors: context.poiStates.filter(
      ({ candidate, fixture }) =>
        candidate.status === "dominated" && outputPoiRefs.has(fixture.poiRef),
    ).length,
    diversityResurrectedRejected: context.poiStates.filter(
      ({ candidate, fixture }) =>
        (candidate.status === "rejected" ||
          candidate.status === "needs_fact") &&
        outputPoiRefs.has(fixture.poiRef),
    ).length,
    unboundedExpansionOrRetry:
      context.expansionRoundsUsed > context.config.maxExpansionRounds ? 1 : 0,
    decisionTraceStageCoverage: stageCoverage,
    aiCalls: result.decisionTrace.aiUsage.length,
    providerCalls: result.decisionTrace.providerUsage.length,
    productionDatabaseWrites: 0,
    scoringParameterChanges: 0,
    regionGraphSemanticChanges: 0,
    masterCodeGovernanceChanges: 0,
    plannerOrStepUiChanges: 0,
  };
}

function buildResult(context: PipelineContext): CandidatePipelineResultV1 {
  const selectedPoiRefs = context.poiStates
    .filter(({ candidate }) => candidate.status === "selected")
    .sort(compareRank)
    .map(({ fixture }) => fixture.poiRef);
  const backupPoiRefs = context.poiStates
    .filter(({ candidate }) => candidate.status === "backup")
    .sort(compareRank)
    .map(({ fixture }) => fixture.poiRef);
  const unresolvedPoiRefs = context.poiStates
    .filter(({ candidate }) => candidate.status === "needs_fact")
    .map(({ fixture }) => fixture.poiRef)
    .sort(compareText);
  const rejectedPoiRefs = context.poiStates
    .filter(({ candidate }) => candidate.status === "rejected")
    .map(({ fixture }) => fixture.poiRef)
    .sort(compareText);
  const terminalDisposition =
    selectedPoiRefs.length > 0
      ? "TOP_N_READY"
      : unresolvedPoiRefs.length > 0
        ? "NEEDS_FACT"
        : "NO_VALID_CHOICE";
  const countsByStage = Object.fromEntries(
    context.traces.map(({ stage, outputCount }) => [stage, outputCount]),
  );
  const candidateRun = {
    contractVersion: PLANNING_CONTRACT_VERSION,
    runId: context.input.runId,
    pipelineVersion: "1.0" as const,
    configVersion: context.config.configVersion,
    tripRef: context.input.tripRequest.tripRef,
    preferenceSnapshotRef: context.input.effectivePreference.snapshotRef,
    contextSnapshotRef: context.input.runtimeContext.contextSnapshotRef,
    graphVersion: context.input.runtimeContext.graph.graphDataRevision,
    poiFeatureVersion: "1.0",
    scope: "day" as const,
    candidates: context.candidates.sort((left, right) =>
      compareText(left.candidateId, right.candidateId),
    ),
    countsByStage,
    startedAt: context.input.runAt,
    completedAt: context.input.runAt,
  };
  const decisionTrace = {
    contractVersion: PLANNING_CONTRACT_VERSION,
    traceVersion: "1.0" as const,
    decisionRunId: `decision:${context.input.runId}`,
    kind: "day_plan" as const,
    trigger: {
      kind: "candidate_pipeline_reference",
      eventRef: null,
      userIntentCode: null,
      occurredAt: context.input.runAt,
    },
    scope: {
      kind: "trip" as const,
      subjectRef: context.input.tripRequest.tripRef,
    },
    tripRef: context.input.tripRequest.tripRef,
    planRef: null,
    inputVersionRefs: {
      tripContractVersion: "1.0",
      tripRevision: context.input.tripRequest.revision,
      planRevision: null,
      runtimeRevision: null,
      preferenceSnapshotRef: context.input.effectivePreference.snapshotRef,
      preferenceOverrideRevision:
        context.input.effectivePreference.overrideRevision,
      poiFeatureVersion: "1.0",
      regionGraphVersion: context.input.runtimeContext.graph.graphDataRevision,
    },
    policyVersionRefs: {
      candidatePipeline: "1.0",
      pilotConfig: context.config.configVersion,
    },
    startedAt: context.input.runAt,
    completedAt: context.input.runAt,
    outcome:
      terminalDisposition === "TOP_N_READY"
        ? ("selected" as const)
        : terminalDisposition === "NEEDS_FACT"
          ? ("needs_user_confirmation" as const)
          : ("no_valid_choice" as const),
    stageTraces: context.traces,
    factUsage: [],
    scoreRefs: context.poiStates
      .flatMap(({ candidate }) => Object.values(candidate.scoreRefs))
      .sort(compareText),
    paretoRecordRefs: context.poiStates
      .filter(({ candidate }) => candidate.status === "dominated")
      .map(({ fixture }) => `pareto:${fixture.poiRef}`)
      .sort(compareText),
    diversityRecordRefs: context.poiStates
      .filter(({ candidate }) => candidate.status === "pruned_by_diversity")
      .map(({ fixture }) => `diversity:${fixture.poiRef}`)
      .sort(compareText),
    repairAttemptRefs: [],
    aiUsed: false,
    aiUsage: [],
    providerUsage: [],
    fallbackCodes: [...context.fallbackCodes].sort(compareText),
    finalDecisionRef:
      selectedPoiRefs.length > 0 ? `selection:${context.input.runId}` : null,
    proposalRef: null,
    engineValidationRef: null,
    changeSetRef: null,
    previewRef: null,
    applyResultRef: null,
    userOutcome: "not_applicable" as const,
  };
  const partial: Omit<CandidatePipelineResultV1, "diagnostics"> = {
    schemaVersion: "1.0",
    pipelineVersion: "1.0",
    configVersion: context.config.configVersion,
    inputRevision: context.input.tripRequest.revision,
    graphRevision: context.input.runtimeContext.graph.graphDataRevision,
    terminalDisposition,
    candidateRun,
    decisionTrace,
    persistableSelection: {
      schemaVersion: "1.0",
      tripRef: context.input.tripRequest.tripRef,
      tripRevision: context.input.tripRequest.revision,
      regionRefs: [...context.input.tripRequest.requestedRegionRefs].sort(
        compareText,
      ),
      corridorRefs: context.candidates
        .filter(({ candidateKind }) => candidateKind === "corridor")
        .map(({ domainRef }) => domainRef)
        .sort(compareText),
      selectedPoiRefs,
      backupPoiRefs,
    },
    unresolvedPoiRefs,
    rejectedPoiRefs,
    expansionRoundsUsed: context.expansionRoundsUsed,
  };
  return { ...partial, diagnostics: diagnostics(context, partial) };
}

export function runCandidatePipelineReference(
  input: CandidatePipelineInputV1,
  config: CandidatePipelineConfigV1,
): CandidatePipelineResultV1 {
  validateConfig(config);
  validateInput(input, config);
  const context: PipelineContext = {
    input: structuredClone(input),
    config: structuredClone(config),
    knownRegionRefs: new Set(
      input.runtimeContext.graph.nodes.map(({ regionId }) => regionId),
    ),
    knownPoiRefs: new Set(input.poiCatalog.map(({ poiRef }) => poiRef)),
    candidates: [],
    poiStates: [],
    traces: [],
    fallbackCodes: [],
    expansionRoundsUsed: 0,
  };
  const regions = addRegionCandidates(context);
  const corridors = addCorridorCandidates(context, regions);
  expandPoiCandidates(context, regions, corridors);
  applyHardFilter(context);
  applyScoring(context);
  applyFeasibility(context, "routeFeasibility", "route_feasibility");
  applyFeasibility(context, "itineraryFeasibility", "itinerary_feasibility");
  applyPareto(context);
  applyDiversity(context);
  applyTopN(context);
  const result = buildResult(context);
  const validation = validateCandidatePipelineResult(result, input, config);
  if (!validation.ok) fail(validation.issue.code, validation.issue.path);
  return result;
}

export function stableCandidatePipelineJson(value: unknown) {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .sort(([left], [right]) => compareText(left, right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    return item;
  };
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

function findValidationIssue(
  result: CandidatePipelineResultV1,
  input: CandidatePipelineInputV1,
  config: CandidatePipelineConfigV1,
) {
  if (result.inputRevision !== input.tripRequest.revision)
    return { code: "STALE_RUN_REVISION", path: "$.inputRevision" };
  const run = parseCandidateRunV1(result.candidateRun);
  if (!run.ok) return run.issue;
  const trace = parseDecisionRunV1(result.decisionTrace);
  if (!trace.ok) return trace.issue;
  const candidateIds = result.candidateRun.candidates.map(
    ({ candidateId: id }) => id,
  );
  if (new Set(candidateIds).size !== candidateIds.length)
    return {
      code: "DUPLICATE_CANDIDATE_ID",
      path: "$.candidateRun.candidates",
    };
  const candidatesByPoi = new Map(
    result.candidateRun.candidates
      .filter(({ candidateKind }) => candidateKind === "poi")
      .map((candidate) => [candidate.domainRef, candidate]),
  );
  const outputPoiRefs = [
    ...result.persistableSelection.selectedPoiRefs,
    ...result.persistableSelection.backupPoiRefs,
  ];
  for (const poiRef of outputPoiRefs) {
    const candidate = candidatesByPoi.get(poiRef);
    if (!candidate)
      return { code: "DANGLING_POI_REF", path: "$.persistableSelection" };
    if (
      candidate.status === "rejected" ||
      candidate.gate === "REJECT" ||
      candidate.feasibility.route === "CRITICAL" ||
      candidate.feasibility.itinerary === "CRITICAL"
    )
      return {
        code: "HARD_REJECT_REINTRODUCED",
        path: "$.persistableSelection",
      };
    if (
      candidate.status === "needs_fact" ||
      candidate.gate === "NEEDS_FACT" ||
      candidate.feasibility.route === "NEEDS_FACT" ||
      candidate.feasibility.itinerary === "NEEDS_FACT"
    )
      return { code: "NEEDS_FACT_PROMOTED", path: "$.persistableSelection" };
    if (candidate.status === "dominated" && !candidate.protection.mustGo)
      return {
        code: "PARETO_DOMINATED_SURVIVOR",
        path: "$.persistableSelection",
      };
    if (candidate.status !== "selected" && candidate.status !== "backup")
      return {
        code: "PRUNED_CANDIDATE_REINTRODUCED",
        path: "$.persistableSelection",
      };
  }
  for (const mustGo of input.tripRequest.mustGoPoiRefs) {
    const candidate = candidatesByPoi.get(mustGo);
    if (!candidate)
      return {
        code: "MUST_GO_SILENTLY_DROPPED",
        path: "$.candidateRun.candidates",
      };
    if (
      !outputPoiRefs.includes(mustGo) &&
      candidate.status !== "rejected" &&
      candidate.status !== "needs_fact"
    )
      return {
        code: "MUST_GO_SILENTLY_DROPPED",
        path: "$.persistableSelection",
      };
  }
  if (result.expansionRoundsUsed > config.maxExpansionRounds)
    return { code: "EXPANSION_BOUND_EXCEEDED", path: "$.expansionRoundsUsed" };
  if (
    REFERENCE_PIPELINE_STAGES.some(
      (stage, index) =>
        result.decisionTrace.stageTraces[index]?.stage !== stage,
    ) ||
    result.decisionTrace.stageTraces.length !== REFERENCE_PIPELINE_STAGES.length
  )
    return {
      code: "INCOMPLETE_STAGE_TRACE",
      path: "$.decisionTrace.stageTraces",
    };
  if (
    result.decisionTrace.aiUsed ||
    result.decisionTrace.aiUsage.length > 0 ||
    result.decisionTrace.providerUsage.length > 0
  )
    return { code: "FORBIDDEN_EXTERNAL_CALL", path: "$.decisionTrace" };
  const serializedStableOutput = JSON.stringify(result.persistableSelection);
  if (serializedStableOutput.includes(LOCAL_CANDIDATE_PREFIX))
    return { code: "LOCAL_ID_LEAK", path: "$.persistableSelection" };
  const requiredZeroDiagnostics: (keyof CandidatePipelineDiagnosticsV1)[] = [
    "hardRejectBypass",
    "mustGoSilentlyDropped",
    "needsFactSilentlyPromoted",
    "danglingRegionRefs",
    "danglingPoiRefs",
    "danglingCandidateRefs",
    "improperParetoSurvivors",
    "diversityResurrectedRejected",
    "unboundedExpansionOrRetry",
    "aiCalls",
    "providerCalls",
    "productionDatabaseWrites",
    "scoringParameterChanges",
    "regionGraphSemanticChanges",
    "masterCodeGovernanceChanges",
    "plannerOrStepUiChanges",
  ];
  for (const key of requiredZeroDiagnostics)
    if (result.diagnostics[key] !== 0)
      return {
        code: "ACCEPTANCE_DIAGNOSTIC_FAILED",
        path: `$.diagnostics.${key}`,
      };
  if (result.diagnostics.decisionTraceStageCoverage !== 1)
    return {
      code: "INCOMPLETE_STAGE_TRACE",
      path: "$.diagnostics.decisionTraceStageCoverage",
    };
  return null;
}

export function validateCandidatePipelineResult(
  result: CandidatePipelineResultV1,
  input: CandidatePipelineInputV1,
  config: CandidatePipelineConfigV1,
): CandidatePipelineValidationResult {
  const issue = findValidationIssue(result, input, config);
  return issue ? { ok: false, issue } : { ok: true };
}
