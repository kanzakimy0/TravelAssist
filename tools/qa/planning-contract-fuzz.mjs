import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as planning from "../../src/shared/contracts/planning/index.ts";

export const SOAK_SEEDS = [
  0x05eed037, 0x00c0ffee, 0x12345678, 0x9e3779b9, 0xdecafbad,
];
export const CASES_PER_SEED = 800;

const clone = (value) => structuredClone(value);
const stableHash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const decisionContext = {
  runId: planning.aiCompactContextFixture.runId,
  task: planning.aiCompactContextFixture.task,
  localIdMap: planning.localIdMapFixture,
  request: planning.aiCompactContextFixture.request,
};

const relation = (id, type, from, to) => ({
  relationId: id,
  relationType: type,
  fromRegionRef: from,
  toRegionRef: to,
  confidence: 1,
  sourceRefs: [],
  validFrom: null,
  validUntil: null,
  lifecycleStatus: "active",
  revision: 1,
});

const mutationCases = [
  {
    family: "unknown_field",
    parser: "parsePoiFeatureSetV1",
    make: (n) => ({
      ...clone(planning.completePoiFeatureFixture),
      [`unexpected${n}`]: true,
    }),
  },
  {
    family: "missing_field",
    parser: "parsePoiFeatureSetV1",
    make: () => {
      const value = clone(planning.completePoiFeatureFixture);
      delete value.sourceRefs;
      return value;
    },
  },
  {
    family: "wrong_contract_version",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      contractVersion: "999",
    }),
  },
  {
    family: "wrong_enum",
    parser: "parsePoiVisitProfileV1",
    make: () => ({ ...clone(planning.visitProfileFixture), status: "future" }),
  },
  {
    family: "nan",
    parser: "parsePoiVisitProfileV1",
    make: () => ({
      ...clone(planning.visitProfileFixture),
      fixedWalkingLoad: Number.NaN,
    }),
  },
  {
    family: "infinity",
    parser: "parsePoiVisitProfileV1",
    make: () => ({
      ...clone(planning.visitProfileFixture),
      fixedWalkingLoad: Number.POSITIVE_INFINITY,
    }),
  },
  {
    family: "negative_number",
    parser: "parsePoiVisitProfileV1",
    make: () => ({
      ...clone(planning.visitProfileFixture),
      recommendedDurationMinutes: -1,
    }),
  },
  {
    family: "upper_bound_overflow",
    parser: "parsePoiFeatureSetV1",
    make: () => clone(planning.negativePlanningFixtures.featureValueTen),
  },
  {
    family: "wrong_nullable_semantics",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      confidence: "unknown",
    }),
  },
  {
    family: "empty_string",
    parser: "parsePoiFeatureSetV1",
    make: () => ({ ...clone(planning.completePoiFeatureFixture), poiRef: "" }),
  },
  {
    family: "oversized_string",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      poiRef: "p".repeat(161),
    }),
  },
  {
    family: "invalid_id_whitespace",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      poiRef: "poi invalid",
    }),
  },
  {
    family: "invalid_id_control_character",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      poiRef: "poi\u0001invalid",
    }),
  },
  {
    family: "duplicate_ids",
    parser: "parseCandidateRunV1",
    make: () => {
      const value = clone(planning.candidateRunFixture);
      value.candidates.push(clone(value.candidates[0]));
      return value;
    },
  },
  {
    family: "dangling_candidate_ref",
    parser: "parseCandidateRunV1",
    make: () => {
      const value = clone(planning.candidateRunFixture);
      value.candidates[0].parentCandidateIds = ["candidate-missing"];
      return value;
    },
  },
  {
    family: "dangling_region_ref",
    parser: "parseTravelRegionGraphV1",
    make: () => {
      const value = clone(planning.regionGraphFixture);
      value.travelEdges[0].toRegionRef = "region-missing";
      return value;
    },
  },
  {
    family: "cross_poi_feature_identity",
    parser: "parsePoiPlanningProjectionV1",
    make: () =>
      clone(planning.negativePlanningFixtures.mismatchedFeatureSetPoiRef),
  },
  {
    family: "cross_poi_visit_profile_identity",
    parser: "parsePoiPlanningProjectionV1",
    make: () =>
      clone(planning.negativePlanningFixtures.mismatchedVisitProfilePoiRef),
  },
  {
    family: "contains_cycle",
    parser: "parseTravelRegionGraphV1",
    make: () => {
      const value = clone(planning.regionGraphFixture);
      value.relations = [
        relation("rel-cycle-a", "contains", "region-tokyo", "region-hakone"),
        relation("rel-cycle-b", "contains", "region-hakone", "region-tokyo"),
      ];
      return value;
    },
  },
  {
    family: "reverse_symmetric_relation_duplicate",
    parser: "parseTravelRegionGraphV1",
    make: () => {
      const value = clone(planning.regionGraphFixture);
      value.relations = [
        relation("rel-adjacent-a", "adjacent", "region-tokyo", "region-hakone"),
        relation("rel-adjacent-b", "adjacent", "region-hakone", "region-tokyo"),
      ];
      return value;
    },
  },
  {
    family: "range_ordering_violation",
    parser: "parseTravelRegionGraphV1",
    make: () => {
      const value = clone(planning.regionGraphFixture);
      value.travelEdges[0].variants[0].typicalDurationMinutes = {
        low: 120,
        typical: 90,
        high: 100,
      };
      return value;
    },
  },
  {
    family: "invalid_visit_duration_order",
    parser: "parsePoiVisitProfileV1",
    make: () =>
      clone(planning.negativePlanningFixtures.invalidVisitDurationOrder),
  },
  {
    family: "invalid_score_over_99",
    parser: "parsePlanningScoreSetV1",
    make: () => clone(planning.negativePlanningFixtures.invalidScore),
  },
  {
    family: "invalid_coverage",
    parser: "parsePlanningScoreSetV1",
    make: () => {
      const value = clone(planning.scoreSetFixture);
      value.scores.matchScore.coverage = 2;
      return value;
    },
  },
  {
    family: "invalid_confidence",
    parser: "parsePoiFeatureSetV1",
    make: () => ({
      ...clone(planning.completePoiFeatureFixture),
      confidence: 2,
    }),
  },
  {
    family: "ai_run_mismatch",
    parser: "parseAiDecisionResponseV1",
    make: () => ({ ...clone(planning.aiDecisionFixture), runId: "run-other" }),
  },
  {
    family: "ai_unknown_local_id",
    parser: "parseAiDecisionResponseV1",
    make: () => {
      const value = clone(planning.aiDecisionFixture);
      value.decision.selectedIds = [999];
      return value;
    },
  },
  {
    family: "ai_non_candidate_selection",
    parser: "parseAiDecisionResponseV1",
    make: () => {
      const value = clone(planning.aiDecisionFixture);
      value.decision.selectedIds = [2];
      return value;
    },
  },
  {
    family: "ai_status_payload_conflict",
    parser: "parseAiDecisionResponseV1",
    make: () => ({
      ...clone(planning.aiDecisionFixture),
      status: "need_more_context",
    }),
  },
  {
    family: "ai_forbidden_operation",
    parser: "parseAiCompactContextV1",
    make: () => {
      const value = clone(planning.aiCompactContextFixture);
      value.request.allowedOperations = ["DELETE_TRIP"];
      return value;
    },
  },
  {
    family: "planning_prior_exact_timetable",
    parser: "parseAiCompactContextV1",
    make: () =>
      clone(planning.negativePlanningFixtures.planningPriorWithExactTimes),
  },
  {
    family: "expired_fact_use",
    parser: "parseFactUsabilityV1",
    make: () => clone(planning.negativePlanningFixtures.expiredFactUse),
  },
  {
    family: "protected_replan_overlap",
    parser: "parseReplanProposalV1",
    make: () => ({
      ...clone(planning.replanProposalFixture),
      affectedRefs: ["item-completed"],
    }),
  },
  {
    family: "forbidden_raw_provider_trace_field",
    parser: "parseDecisionRunV1",
    make: () =>
      clone(planning.negativePlanningFixtures.forbiddenTraceProviderRaw),
  },
  {
    family: "compact_neutral_must_be_omitted",
    parser: "parseSparsePreferenceV1",
    make: () => clone(planning.negativePlanningFixtures.explicitCompactNeutral),
  },
  {
    family: "feasibility_status_issue_mismatch",
    parser: "parseFeasibilityResultV1",
    make: () => ({
      ...clone(planning.feasibilityPassFixture),
      status: "PASS",
      issues: clone(planning.durationTooShortFixture.issues),
    }),
  },
  {
    family: "fact_invalid_source_enum",
    parser: "parsePlanningFactRefV1",
    make: () => {
      const value = clone(planning.currentFactFixture);
      value.source.sourceKind = "social_scrape";
      return value;
    },
  },
  {
    family: "effective_preference_missing_dimension",
    parser: "parseEffectivePreferenceV1",
    make: () => {
      const value = clone(planning.effectivePreferenceFixture);
      delete value.values["43"];
      return value;
    },
  },
];

const parsers = {
  parsePoiFeatureSetV1: planning.parsePoiFeatureSetV1,
  parseEffectivePreferenceV1: planning.parseEffectivePreferenceV1,
  parseSparsePreferenceV1: planning.parseSparsePreferenceV1,
  parsePoiVisitProfileV1: planning.parsePoiVisitProfileV1,
  parsePoiPlanningProjectionV1: planning.parsePoiPlanningProjectionV1,
  parseTravelRegionGraphV1: planning.parseTravelRegionGraphV1,
  parsePlanningScoreSetV1: planning.parsePlanningScoreSetV1,
  parseFeasibilityResultV1: planning.parseFeasibilityResultV1,
  parseCandidateRunV1: planning.parseCandidateRunV1,
  parseAiCompactContextV1: planning.parseAiCompactContextV1,
  parseAiDecisionResponseV1: (input) =>
    planning.parseAiDecisionResponseV1(input, decisionContext),
  parsePlanningFactRefV1: planning.parsePlanningFactRefV1,
  parseFactUsabilityV1: planning.parseFactUsabilityV1,
  parseReplanProposalV1: planning.parseReplanProposalV1,
  parseDecisionRunV1: planning.parseDecisionRunV1,
};

function xorshift32(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

function safeIssue(result) {
  if (result.ok) return false;
  const keys = Object.keys(result.issue).sort();
  return (
    keys.join(",") === "code,path" &&
    typeof result.issue.path === "string" &&
    typeof result.issue.code === "string"
  );
}

export function fixtureFingerprint() {
  return stableHash({
    feature: planning.completePoiFeatureFixture,
    projection: planning.poiPlanningProjectionFixture,
    graph: planning.regionGraphFixture,
    candidate: planning.candidateRunFixture,
    context: planning.aiCompactContextFixture,
    fact: planning.currentFactFixture,
    trace: planning.engineOnlyDecisionRunFixture,
  });
}

export function runFuzzCampaign({
  seeds = SOAK_SEEDS,
  casesPerSeed = CASES_PER_SEED,
} = {}) {
  const started = performance.now();
  const before = fixtureFingerprint();
  const sequence = [];
  const familyCounts = {};
  const parserCounts = {};
  let expectedRejects = 0;
  let unexpectedAccepts = 0;
  let unexpectedThrows = 0;
  let unsafeIssues = 0;
  const runs = [];

  for (const seed of seeds) {
    const next = xorshift32(seed);
    const runStarted = performance.now();
    for (let index = 0; index < casesPerSeed; index += 1) {
      const caseIndex =
        index < mutationCases.length ? index : next() % mutationCases.length;
      const mutation = mutationCases[caseIndex];
      familyCounts[mutation.family] = (familyCounts[mutation.family] ?? 0) + 1;
      parserCounts[mutation.parser] = (parserCounts[mutation.parser] ?? 0) + 1;
      try {
        const result = parsers[mutation.parser](
          mutation.make(index + (seed >>> 0)),
        );
        if (result.ok) unexpectedAccepts += 1;
        else {
          expectedRejects += 1;
          if (!safeIssue(result)) unsafeIssues += 1;
        }
        sequence.push([
          seed >>> 0,
          index,
          mutation.family,
          mutation.parser,
          result.ok ? "ACCEPTED" : result.issue.code,
          result.ok ? "$" : result.issue.path,
        ]);
      } catch (error) {
        unexpectedThrows += 1;
        sequence.push([
          seed >>> 0,
          index,
          mutation.family,
          mutation.parser,
          "UNEXPECTED_THROW",
          error instanceof Error ? error.name : "unknown",
        ]);
      }
    }
    runs.push({
      seed: seed >>> 0,
      cases: casesPerSeed,
      elapsedMilliseconds: Number((performance.now() - runStarted).toFixed(3)),
    });
  }

  const after = fixtureFingerprint();
  return {
    schemaVersion: "1.0",
    seeds: seeds.map((seed) => seed >>> 0),
    casesPerSeed,
    totalCases: seeds.length * casesPerSeed,
    mutationFamilyCount: mutationCases.length,
    parserCount: Object.keys(parserCounts).length,
    expectedRejects,
    unexpectedAccepts,
    unexpectedThrows,
    unsafeIssues,
    fixtureMutationDetected: before !== after,
    sequenceDigest: stableHash(sequence),
    familyCounts,
    parserCounts,
    runs,
    elapsedMilliseconds: Number((performance.now() - started).toFixed(3)),
  };
}

const wireCases = [
  [
    "poiFeature",
    planning.completePoiFeatureFixture,
    planning.parsePoiFeatureSetV1,
  ],
  [
    "effectivePreference",
    planning.effectivePreferenceFixture,
    planning.parseEffectivePreferenceV1,
  ],
  [
    "sparsePreference",
    planning.sparsePreferenceFixture,
    planning.parseSparsePreferenceV1,
  ],
  [
    "poiProjection",
    planning.poiPlanningProjectionFixture,
    planning.parsePoiPlanningProjectionV1,
  ],
  [
    "regionGraph",
    planning.regionGraphFixture,
    planning.parseTravelRegionGraphV1,
  ],
  ["candidateRun", planning.candidateRunFixture, planning.parseCandidateRunV1],
  [
    "aiCompactContext",
    planning.aiCompactContextFixture,
    planning.parseAiCompactContextV1,
  ],
  [
    "planningFact",
    planning.currentFactFixture,
    planning.parsePlanningFactRefV1,
  ],
  [
    "expiredFactUsability",
    {
      ...planning.currentFactUsabilityFixture,
      freshness: "EXPIRED",
      action: "REFRESH",
      reasonCodes: ["F05_EXPIRED"],
    },
    planning.parseFactUsabilityV1,
  ],
  [
    "replanProposal",
    planning.replanProposalFixture,
    planning.parseReplanProposalV1,
  ],
  [
    "decisionTrace",
    planning.engineOnlyDecisionRunFixture,
    planning.parseDecisionRunV1,
  ],
];

export function runJsonRoundTrips() {
  const results = wireCases.map(([name, fixture, parser]) => {
    const wire = JSON.parse(JSON.stringify(fixture));
    const parsed = parser(wire);
    return {
      name,
      success: parsed.ok,
      exactRoundTrip:
        parsed.ok && JSON.stringify(parsed.value) === JSON.stringify(wire),
      serializedBytes: Buffer.byteLength(JSON.stringify(wire)),
    };
  });
  const featureWire = JSON.parse(
    JSON.stringify(planning.completePoiFeatureFixture),
  );
  const effectiveWire = JSON.parse(
    JSON.stringify(planning.effectivePreferenceFixture),
  );
  const sparseWire = JSON.parse(
    JSON.stringify(planning.sparsePreferenceFixture),
  );
  const expired = results.find(
    (entry) => entry.name === "expiredFactUsability",
  );
  return {
    results,
    semantics: {
      featureZeroPreserved: featureWire.values["01"] === 0,
      featureNullPreserved: featureWire.values["02"] === null,
      effectiveNeutralFivePreserved: effectiveWire.values["01"] === 5,
      sparseNeutralOmitted: sparseWire.entries.every((entry) => entry[1] !== 5),
      localIdsPreserved:
        JSON.parse(JSON.stringify(planning.localIdMapFixture)).entries[0]
          .localId === 0,
      expiredMetadataPreserved: expired?.success === true,
      revisionNumberPreserved:
        JSON.parse(JSON.stringify(planning.regionGraphFixture)).nodes[0]
          .revision === 1,
      nullOptionalPreserved: featureWire.values["02"] === null,
    },
  };
}

function measure(label, inputCount, value, validate) {
  const bytes = Buffer.byteLength(JSON.stringify(value));
  const started = performance.now();
  const success = validate(value);
  return {
    label,
    inputCount,
    elapsedMilliseconds: Number((performance.now() - started).toFixed(3)),
    approximateSerializedBytes: bytes,
    success,
  };
}

function poiProjectionSet(count) {
  return Array.from({ length: count }, (_, index) => {
    const value = clone(planning.poiPlanningProjectionFixture);
    const poiRef = `poi-scale-${index}`;
    value.poiRef = poiRef;
    value.featureSet.poiRef = poiRef;
    value.visitProfiles = value.visitProfiles.map((profile, profileIndex) => ({
      ...profile,
      profileId: `profile-scale-${index}-${profileIndex}`,
      poiRef,
    }));
    return value;
  });
}

function candidateRun(count) {
  const value = clone(planning.candidateRunFixture);
  const template = value.candidates[0];
  value.candidates = Array.from({ length: count }, (_, index) => ({
    ...clone(template),
    candidateId: `candidate-scale-${index}`,
    domainRef: `poi-scale-${index}`,
    reasons: template.reasons.map((reason) => ({
      ...reason,
      subjectRef: `poi-scale-${index}`,
    })),
  }));
  value.countsByStage = { hard_filter: count };
  return value;
}

function sparseRegionGraph(count) {
  const value = clone(planning.regionGraphFixture);
  const template = value.nodes[0];
  value.nodes = Array.from({ length: count }, (_, index) => ({
    ...clone(template),
    regionId: `region-scale-${index}`,
    masterCode: `JP-SCALE-${index}`,
  }));
  value.relations = Array.from({ length: Math.max(0, count - 1) }, (_, index) =>
    relation(
      `rel-scale-${index}`,
      "adjacent",
      `region-scale-${index}`,
      `region-scale-${index + 1}`,
    ),
  );
  value.travelEdges = [];
  return value;
}

function decisionTrace(count) {
  const value = clone(planning.aiProviderDecisionRunFixture);
  const fact = value.factUsage[0];
  const provider = value.providerUsage[0];
  value.factUsage = Array.from({ length: count }, (_, index) => ({
    ...clone(fact),
    factRef: `fact-scale-${index}`,
  }));
  value.providerUsage = Array.from({ length: count }, (_, index) => ({
    ...clone(provider),
    callRef: `provider-call-scale-${index}`,
    factRefsProduced: [`fact-scale-${index}`],
  }));
  return value;
}

export function runScaleObservations() {
  const observations = [];
  for (const count of [100, 1000]) {
    const values = poiProjectionSet(count);
    observations.push(
      measure("poi_projections", count, values, (rows) =>
        rows.every((row) => planning.parsePoiPlanningProjectionV1(row).ok),
      ),
    );
  }
  for (const count of [100, 1000, 5000]) {
    const value = candidateRun(count);
    observations.push(
      measure(
        "candidate_records",
        count,
        value,
        (row) => planning.parseCandidateRunV1(row).ok,
      ),
    );
  }
  for (const count of [100, 1000]) {
    const value = sparseRegionGraph(count);
    observations.push(
      measure(
        "sparse_region_graph_nodes",
        count,
        value,
        (row) => planning.parseTravelRegionGraphV1(row).ok,
      ),
    );
  }
  for (const count of [10, 100]) {
    const value = decisionTrace(count);
    observations.push(
      measure(
        "decision_trace_fact_provider_rows",
        count,
        value,
        (row) => planning.parseDecisionRunV1(row).ok,
      ),
    );
  }
  return {
    schemaVersion: "1.0",
    thresholdPolicy: "observational_only_no_production_budget_frozen",
    observations,
  };
}

export const COVERAGE_ROWS = [
  [
    "43 POI Feature dimensions",
    "PoiFeatureSetV1",
    "parsePoiFeatureSetV1",
    "completePoiFeatureFixture",
    "featureValueTen / unknownFeatureCode",
    "task-036 + TASK-037 fuzz/wire",
    "covered",
  ],
  [
    "Effective / Sparse Preference",
    "EffectivePreferenceV1 / SparsePreferenceV1",
    "parseEffectivePreferenceV1 / parseSparsePreferenceV1",
    "effectivePreferenceFixture / sparsePreferenceFixture",
    "explicitCompactNeutral / missing dimension",
    "task-036 + TASK-037 fuzz/wire",
    "covered",
  ],
  [
    "Visit Profile / POI Projection",
    "PoiVisitProfileV1 / PoiPlanningProjectionV1",
    "parsePoiVisitProfileV1 / parsePoiPlanningProjectionV1",
    "visitProfileFixture / poiPlanningProjectionFixture",
    "duration order / cross-POI identity",
    "task-036 + TASK-037 fuzz/scale",
    "covered",
  ],
  [
    "Region Graph / TravelEdge",
    "TravelRegionGraphV1",
    "parseTravelRegionGraphV1",
    "regionGraphFixture",
    "cycle / reverse relation / dangling ref / range order",
    "task-036 + TASK-037 fuzz/scale",
    "covered",
  ],
  [
    "Score / Feasibility",
    "PlanningScoreSetV1 / FeasibilityResultV1",
    "parsePlanningScoreSetV1 / parseFeasibilityResultV1",
    "scoreSetFixture / feasibilityPassFixture",
    "score/coverage/status mismatch",
    "task-036 + TASK-037 fuzz",
    "covered",
  ],
  [
    "Candidate Pipeline",
    "CandidateRunV1",
    "parseCandidateRunV1",
    "candidateRunFixture",
    "duplicate/dangling candidate",
    "task-036 + TASK-037 fuzz/scale",
    "covered",
  ],
  [
    "AI Compact Context / Local IDs",
    "AiCompactContextV1 / LocalIdMapV1",
    "parseAiCompactContextV1",
    "aiCompactContextFixture / localIdMapFixture",
    "duplicate ID / forbidden op / prior exact time",
    "task-036 + TASK-037 fuzz/wire",
    "covered",
  ],
  [
    "AI Decision / Patch",
    "AiDecisionResponseV1 / AiCompactOpV1",
    "parseAiDecisionResponseV1",
    "aiDecisionFixture / aiNeedMoreContextFixture",
    "run mismatch / unknown/non-candidate ID / state conflict",
    "task-036 + TASK-037 fuzz",
    "covered",
  ],
  [
    "Replanning",
    "ReplanProposalV1",
    "parseReplanProposalV1",
    "replanProposalFixture",
    "protected overlap",
    "task-036 + TASK-037 fuzz/wire",
    "covered",
  ],
  [
    "Fact Freshness / Provenance",
    "PlanningFactRefV1 / FactUsabilityV1",
    "parsePlanningFactRefV1 / parseFactUsabilityV1",
    "currentFactFixture / currentFactUsabilityFixture",
    "invalid source / EXPIRED+USE",
    "task-036 + TASK-037 fuzz/wire",
    "covered",
  ],
  [
    "DecisionRun Trace / Telemetry",
    "DecisionRunV1",
    "parseDecisionRunV1",
    "engineOnlyDecisionRunFixture / aiProviderDecisionRunFixture",
    "forbidden raw/provider field",
    "task-036 + TASK-037 fuzz/scale",
    "covered",
  ],
  [
    "Canonical Trip compatibility export",
    "TripPlanSnapshotV1",
    "canonical Trip parser owner",
    "canonical Trip fixtures",
    "canonical Trip negative suite",
    "wbs-4-17-trip-contract.test.mjs",
    "covered_by_owner",
  ],
  [
    "Canonical Route compatibility export",
    "RouteRequest / RouteResponse",
    "canonical Route parser owner",
    "canonical Route fixtures",
    "canonical Route negative suite",
    "task-022-route-contract.test.mjs",
    "covered_by_owner",
  ],
].map(
  ([
    concept,
    contract,
    parser,
    positiveFixture,
    negativeFixture,
    test,
    status,
  ]) => ({
    concept,
    contract,
    parser,
    positiveFixture,
    negativeFixture,
    test,
    status,
  }),
);

function coverageMarkdown() {
  const header = [
    "# TASK-037 Planning Contract Coverage",
    "",
    "This matrix records concrete semantic coverage; file existence alone is not counted.",
    "",
    "| P0 concept | Contract | Parser / owner | Positive fixture | Negative fixture/family | Test | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const rows = COVERAGE_ROWS.map(
    (row) =>
      `| ${row.concept} | ${row.contract} | ${row.parser} | ${row.positiveFixture} | ${row.negativeFixture} | ${row.test} | ${row.status} |`,
  );
  return `${[...header, ...rows, ""].join("\n")}`;
}

export async function writeEvidence(root = process.cwd()) {
  const evidenceDir = path.join(root, "docs", "qa", "TASK-037");
  await mkdir(evidenceDir, { recursive: true });
  const first = runFuzzCampaign();
  const second = runFuzzCampaign();
  const roundTrip = runJsonRoundTrips();
  const soak = {
    ...first,
    repeatSequenceDigest: second.sequenceDigest,
    deterministicRepeat: first.sequenceDigest === second.sequenceDigest,
    repeatFixtureMutationDetected: second.fixtureMutationDetected,
    jsonRoundTrip: roundTrip,
  };
  const coverage = {
    schemaVersion: "1.0",
    rowCount: COVERAGE_ROWS.length,
    fullyMapped: COVERAGE_ROWS.every((row) =>
      ["covered", "covered_by_owner"].includes(row.status),
    ),
    rows: COVERAGE_ROWS,
  };
  const scale = runScaleObservations();
  await Promise.all([
    writeFile(
      path.join(evidenceDir, "planning-contract-coverage.md"),
      coverageMarkdown(),
    ),
    writeFile(
      path.join(evidenceDir, "planning-contract-coverage.json"),
      `${JSON.stringify(coverage, null, 2)}\n`,
    ),
    writeFile(
      path.join(evidenceDir, "soak-report.json"),
      `${JSON.stringify(soak, null, 2)}\n`,
    ),
    writeFile(
      path.join(evidenceDir, "scale-report.json"),
      `${JSON.stringify(scale, null, 2)}\n`,
    ),
  ]);
  return { coverage, soak, scale };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  const result = await writeEvidence(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  );
  const failed =
    result.soak.unexpectedAccepts !== 0 ||
    result.soak.unexpectedThrows !== 0 ||
    result.soak.unsafeIssues !== 0 ||
    result.soak.fixtureMutationDetected ||
    !result.soak.deterministicRepeat ||
    result.scale.observations.some((entry) => !entry.success);
  process.stdout.write(
    `${JSON.stringify({
      totalCases: result.soak.totalCases,
      sequenceDigest: result.soak.sequenceDigest,
      deterministicRepeat: result.soak.deterministicRepeat,
      unexpectedAccepts: result.soak.unexpectedAccepts,
      unexpectedThrows: result.soak.unexpectedThrows,
      unsafeIssues: result.soak.unsafeIssues,
      scaleChecks: result.scale.observations.length,
      failed,
    })}\n`,
  );
  if (failed) process.exitCode = 1;
}
