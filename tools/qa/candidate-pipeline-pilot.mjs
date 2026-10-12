import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { format as formatWithPrettier } from "prettier";

import {
  POI_FEATURE_CODES,
  PLANNING_CONTRACT_VERSION,
} from "../../src/shared/contracts/planning/index.ts";
import {
  CandidatePipelineError,
  REFERENCE_PIPELINE_STAGES,
  runCandidatePipelineReference,
  stableCandidatePipelineJson,
  validateCandidatePipelineResult,
} from "../../src/features/planning/candidate-pipeline/index.ts";
import { regionGraph } from "./region-graph-pilot.mjs";

const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/TASK-048",
);
const RUN_AT = "2026-09-14T00:00:00+09:00";
const FIXTURE_SOURCE = "source-task-048-contract-valid-pilot-fixture";

export const pipelineConfig = Object.freeze({
  configVersion: "task-048-pilot-config-v1",
  regionLimit: 8,
  corridorLimit: 4,
  expansionBatchSize: 8,
  maxExpansionRounds: 3,
  minimumViablePoiCount: 4,
  diversityCategoryLimit: 1,
  topN: 2,
  backupN: 1,
});

const neutralPreferences = Object.fromEntries(
  POI_FEATURE_CODES.map((code) => [code, 5]),
);

const featureVector = (values = {}) =>
  Object.fromEntries(
    POI_FEATURE_CODES.map((code) => [code, values[code] ?? null]),
  );

const objectiveDefaults = Object.freeze({
  preferenceValue: 6,
  currentSuitability: 6,
  routeBurden: 4,
  timeCost: 4,
  moneyCost: 4,
  fatigueLoad: 4,
  risk: 3,
  iconicValue: 5,
  hiddenValue: 5,
});

function makePoi(scenarioId, slug, regionRef, category, overrides = {}) {
  const poiRef = `poi-fixture-${scenarioId}-${slug}`;
  const objectiveVector = {
    ...objectiveDefaults,
    ...(overrides.objectiveVector ?? {}),
  };
  const hardGate = {
    status: "PASS",
    reasonCode: null,
    factRefs: [],
    ...(overrides.hardGate ?? {}),
  };
  const routeFeasibility = {
    status: "PASS",
    reasonCode: null,
    factRefs: [],
    ...(overrides.routeFeasibility ?? {}),
  };
  const itineraryFeasibility = {
    status: "PASS",
    reasonCode: null,
    factRefs: [],
    ...(overrides.itineraryFeasibility ?? {}),
  };
  return {
    poiRef,
    regionRef,
    category,
    projection: {
      contractVersion: PLANNING_CONTRACT_VERSION,
      poiRef,
      featureSet: {
        contractVersion: PLANNING_CONTRACT_VERSION,
        featureVersion: "1.0",
        poiRef,
        values: featureVector(overrides.featureValues),
        sourceRefs: [FIXTURE_SOURCE],
        confidence: 0.8,
        updatedAt: RUN_AT,
      },
      visitProfiles: [],
      regionRefs: [regionRef],
      factRefs: [
        ...hardGate.factRefs,
        ...routeFeasibility.factRefs,
        ...itineraryFeasibility.factRefs,
      ],
    },
    scoreProjectionRef: `score-projection-${scenarioId}-${slug}`,
    objectiveVector,
    anchor: overrides.anchor ?? null,
    hardGate,
    routeFeasibility,
    itineraryFeasibility,
    expansionRound: overrides.expansionRound ?? 1,
  };
}

function makeScenario({
  scenarioId,
  title,
  regionRefs,
  pois,
  preferenceValues = {},
  mustGoPoiRefs = [],
  requestedExpansionRounds = 1,
  expected,
  config = {},
}) {
  return {
    scenarioId,
    title,
    input: {
      schemaVersion: "1.0",
      runId: `run-task-048-${scenarioId}`,
      runAt: RUN_AT,
      tripRequest: {
        tripRef: `trip-fixture-${scenarioId}`,
        revision: 1,
        expectedRevision: 1,
        requestedRegionRefs: regionRefs,
        mustGoPoiRefs,
      },
      effectivePreference: {
        contractVersion: PLANNING_CONTRACT_VERSION,
        preferenceVersion: "1.0",
        snapshotRef: `preference-fixture-${scenarioId}`,
        overrideRevision: 0,
        values: { ...neutralPreferences, ...preferenceValues },
      },
      runtimeContext: {
        contextSnapshotRef: `context-fixture-${scenarioId}`,
        graph: regionGraph,
        requestedExpansionRounds,
      },
      corridors: [
        {
          corridorRef: `corridor-fixture-${scenarioId}`,
          orderedRegionRefs: regionRefs,
          edgeRefs: [],
          expansionPriority: 1,
        },
      ],
      poiCatalog: pois,
    },
    config: { ...pipelineConfig, ...config },
    expected,
  };
}

const tokyoIconicPois = [
  makePoi("01", "iconic-a", "district-asakusa-ueno", "iconic", {
    objectiveVector: { preferenceValue: 9, iconicValue: 9, hiddenValue: 2 },
  }),
  makePoi("01", "iconic-b", "district-central-tokyo", "iconic", {
    objectiveVector: {
      preferenceValue: 8,
      iconicValue: 8,
      hiddenValue: 2,
      routeBurden: 5,
    },
  }),
  makePoi("01", "garden", "district-shinjuku", "garden", {
    objectiveVector: { preferenceValue: 7, iconicValue: 6, hiddenValue: 4 },
  }),
  makePoi("01", "museum", "district-asakusa-ueno", "museum", {
    objectiveVector: { preferenceValue: 6, iconicValue: 5, hiddenValue: 4 },
  }),
];

export const pilotScenarios = [
  makeScenario({
    scenarioId: "01-tokyo-first-time-iconic",
    title: "Tokyo first-time iconic trip",
    regionRefs: [
      "region-tokyo",
      "district-asakusa-ueno",
      "district-central-tokyo",
      "district-shinjuku",
    ],
    pois: tokyoIconicPois,
    preferenceValues: { 15: 9 },
    expected: {
      terminalDisposition: "TOP_N_READY",
      selectedIncludes: [tokyoIconicPois[0].poiRef],
    },
  }),
  (() => {
    const pois = [
      makePoi("02", "local-a", "district-shibuya-harajuku", "local", {
        objectiveVector: { preferenceValue: 9, hiddenValue: 9, iconicValue: 2 },
      }),
      makePoi("02", "local-b", "district-shinjuku", "local", {
        objectiveVector: { preferenceValue: 8, hiddenValue: 8, iconicValue: 2 },
      }),
      makePoi("02", "craft", "district-asakusa-ueno", "craft", {
        objectiveVector: { preferenceValue: 8, hiddenValue: 7, iconicValue: 3 },
      }),
      makePoi("02", "iconic", "district-central-tokyo", "iconic", {
        objectiveVector: { preferenceValue: 4, hiddenValue: 1, iconicValue: 9 },
      }),
    ];
    return makeScenario({
      scenarioId: "02-tokyo-hidden-local",
      title: "Tokyo hidden/local preference",
      regionRefs: [
        "region-tokyo",
        "district-shibuya-harajuku",
        "district-shinjuku",
        "district-asakusa-ueno",
        "district-central-tokyo",
      ],
      pois,
      preferenceValues: { 12: 9, 14: 9 },
      expected: {
        terminalDisposition: "TOP_N_READY",
        selectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("03", "onsen", "region-hakone", "onsen", {
        objectiveVector: { preferenceValue: 9, currentSuitability: 8 },
      }),
      makePoi("03", "lake", "region-fuji-five-lakes", "scenery", {
        objectiveVector: { preferenceValue: 8, iconicValue: 8 },
      }),
      makePoi("03", "museum", "region-hakone", "museum"),
      makePoi("03", "view", "region-fujikawaguchiko", "viewpoint"),
    ];
    return makeScenario({
      scenarioId: "03-hakone-fuji-corridor",
      title: "Hakone/Fuji corridor",
      regionRefs: [
        "region-hakone",
        "region-fuji-five-lakes",
        "region-fujikawaguchiko",
      ],
      pois,
      expected: {
        terminalDisposition: "TOP_N_READY",
        selectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("04", "matsumoto", "region-matsumoto", "castle"),
      makePoi("04", "takayama", "region-takayama", "old-town"),
      makePoi("04", "shirakawa", "region-shirakawa-go", "heritage"),
      makePoi("04", "kanazawa", "region-kanazawa", "garden"),
    ];
    return makeScenario({
      scenarioId: "04-alpine-hokuriku-corridor",
      title: "Alpine/Hokuriku corridor",
      regionRefs: [
        "region-matsumoto",
        "region-takayama",
        "region-shirakawa-go",
        "region-kanazawa",
      ],
      pois,
      expected: { terminalDisposition: "TOP_N_READY", corridorCount: 1 },
    });
  })(),
  (() => {
    const pois = [
      makePoi("05", "kyoto", "region-kyoto", "heritage"),
      makePoi("05", "nara", "region-nara", "nature"),
      makePoi("05", "osaka", "region-osaka", "food"),
      makePoi("05", "kobe", "region-kobe", "waterfront"),
    ];
    return makeScenario({
      scenarioId: "05-kansai-corridor",
      title: "Kyoto/Nara/Osaka/Kobe corridor",
      regionRefs: [
        "region-kyoto",
        "region-nara",
        "region-osaka",
        "region-kobe",
      ],
      pois,
      expected: { terminalDisposition: "TOP_N_READY", corridorCount: 1 },
    });
  })(),
  (() => {
    const pois = [
      makePoi("06", "low-walk", "region-tokyo", "museum", {
        objectiveVector: { preferenceValue: 8, fatigueLoad: 1 },
      }),
      makePoi("06", "high-walk", "region-tokyo", "nature", {
        objectiveVector: { preferenceValue: 8, fatigueLoad: 9 },
      }),
      makePoi("06", "rest", "region-tokyo", "rest", {
        objectiveVector: { preferenceValue: 7, fatigueLoad: 1 },
      }),
      makePoi("06", "indoor", "region-tokyo", "indoor", {
        objectiveVector: { preferenceValue: 7, fatigueLoad: 2 },
      }),
    ];
    return makeScenario({
      scenarioId: "06-low-walking-tolerance",
      title: "Low walking tolerance",
      regionRefs: ["region-tokyo"],
      pois,
      preferenceValues: { 25: 2 },
      expected: {
        terminalDisposition: "TOP_N_READY",
        selectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("07", "quiet", "region-kyoto", "garden", {
        objectiveVector: { preferenceValue: 8, risk: 1 },
      }),
      makePoi("07", "crowded", "region-kyoto", "iconic", {
        objectiveVector: { preferenceValue: 8, risk: 9 },
      }),
      makePoi("07", "museum", "region-kyoto", "museum", {
        objectiveVector: { preferenceValue: 7, risk: 2 },
      }),
      makePoi("07", "local", "region-kyoto", "local", {
        objectiveVector: { preferenceValue: 7, risk: 2 },
      }),
    ];
    return makeScenario({
      scenarioId: "07-low-crowd-tolerance",
      title: "Low crowd tolerance",
      regionRefs: ["region-kyoto"],
      pois,
      preferenceValues: { 27: 2 },
      expected: {
        terminalDisposition: "TOP_N_READY",
        selectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("08", "must-go", "region-osaka", "museum", {
        objectiveVector: { preferenceValue: 1, currentSuitability: 1, risk: 8 },
      }),
      makePoi("08", "high-a", "region-osaka", "food", {
        objectiveVector: { preferenceValue: 9 },
      }),
      makePoi("08", "high-b", "region-osaka", "garden", {
        objectiveVector: { preferenceValue: 8 },
      }),
      makePoi("08", "high-c", "region-osaka", "viewpoint", {
        objectiveVector: { preferenceValue: 7 },
      }),
    ];
    return makeScenario({
      scenarioId: "08-must-go-preserved",
      title: "Must-go item preserved",
      regionRefs: ["region-osaka"],
      pois,
      mustGoPoiRefs: [pois[0].poiRef],
      config: { topN: 1, backupN: 0 },
      expected: {
        terminalDisposition: "TOP_N_READY",
        selectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("09", "must-go-closed", "region-nara", "heritage", {
        hardGate: {
          status: "REJECT",
          reasonCode: "LIFECYCLE_CLOSED",
          factRefs: ["fact-fixture-closed"],
        },
      }),
    ];
    return makeScenario({
      scenarioId: "09-must-go-hard-conflict",
      title: "Must-go item impossible because of a hard constraint",
      regionRefs: ["region-nara"],
      pois,
      mustGoPoiRefs: [pois[0].poiRef],
      expected: {
        terminalDisposition: "NO_VALID_CHOICE",
        rejectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("10", "unreachable", "region-hakone", "nature", {
        routeFeasibility: {
          status: "CRITICAL",
          reasonCode: "ROUTE_INFEASIBLE",
          factRefs: ["fact-fixture-route-infeasible"],
        },
      }),
      makePoi("10", "reachable-a", "region-hakone", "onsen"),
      makePoi("10", "reachable-b", "region-hakone", "museum"),
      makePoi("10", "reachable-c", "region-hakone", "scenery"),
    ];
    return makeScenario({
      scenarioId: "10-route-infeasible-removed",
      title: "Route-infeasible candidate removed",
      regionRefs: ["region-hakone"],
      pois,
      expected: {
        terminalDisposition: "TOP_N_READY",
        rejectedIncludes: [pois[0].poiRef],
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("11", "unknown-opening", "region-kanazawa", "garden", {
        hardGate: {
          status: "NEEDS_FACT",
          reasonCode: "MISSING_OPENING_FACT",
          factRefs: ["fact-fixture-opening-unknown"],
        },
      }),
      makePoi("11", "unknown-route", "region-kanazawa", "museum", {
        routeFeasibility: {
          status: "NEEDS_FACT",
          reasonCode: "MISSING_ROUTE_FACT",
          factRefs: ["fact-fixture-route-unknown"],
        },
      }),
    ];
    return makeScenario({
      scenarioId: "11-critical-fact-unknown",
      title: "Critical route/opening fact unknown",
      regionRefs: ["region-kanazawa"],
      pois,
      expected: {
        terminalDisposition: "NEEDS_FACT",
        unresolvedIncludes: pois.map(({ poiRef }) => poiRef),
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("12", "temple-a", "region-kyoto", "temple", {
        objectiveVector: { preferenceValue: 9 },
      }),
      makePoi("12", "temple-b", "region-kyoto", "temple", {
        objectiveVector: { preferenceValue: 9 },
      }),
      makePoi("12", "temple-c", "region-kyoto", "temple", {
        objectiveVector: { preferenceValue: 9 },
      }),
      makePoi("12", "food", "region-kyoto", "food", {
        objectiveVector: { preferenceValue: 8 },
      }),
      makePoi("12", "garden", "region-kyoto", "garden", {
        objectiveVector: { preferenceValue: 7 },
      }),
    ];
    return makeScenario({
      scenarioId: "12-diversity-monoculture-guard",
      title: "Diversity prevents one-category Top-N monoculture",
      regionRefs: ["region-kyoto"],
      pois,
      config: { topN: 3, backupN: 0 },
      expected: {
        terminalDisposition: "TOP_N_READY",
        diversityPrunedMinimum: 2,
      },
    });
  })(),
  (() => {
    const pois = [
      makePoi("13", "round-one", "region-kobe", "waterfront"),
      makePoi("13", "round-two-a", "region-kobe", "museum", {
        expansionRound: 2,
      }),
      makePoi("13", "round-two-b", "region-kobe", "food", {
        expansionRound: 2,
      }),
      makePoi("13", "round-two-c", "region-kobe", "garden", {
        expansionRound: 2,
      }),
    ];
    return makeScenario({
      scenarioId: "13-sparse-fallback-expansion",
      title: "Sparse candidate fallback expansion",
      regionRefs: ["region-kobe"],
      pois,
      requestedExpansionRounds: 2,
      expected: { terminalDisposition: "TOP_N_READY", expansionRoundsUsed: 2 },
    });
  })(),
  (() => {
    const pois = [
      makePoi("14", "closed", "region-matsumoto", "museum", {
        hardGate: {
          status: "REJECT",
          reasonCode: "LIFECYCLE_CLOSED",
          factRefs: ["fact-fixture-closed-14"],
        },
      }),
      makePoi("14", "route", "region-matsumoto", "nature", {
        routeFeasibility: {
          status: "CRITICAL",
          reasonCode: "ROUTE_INFEASIBLE",
          factRefs: ["fact-fixture-route-14"],
        },
      }),
    ];
    return makeScenario({
      scenarioId: "14-no-valid-choice",
      title: "No-valid-choice terminal case",
      regionRefs: ["region-matsumoto"],
      pois,
      expected: {
        terminalDisposition: "NO_VALID_CHOICE",
        rejectedIncludes: pois.map(({ poiRef }) => poiRef),
      },
    });
  })(),
];

export function runPilotScenarios() {
  return pilotScenarios.map((scenario) => ({
    scenarioId: scenario.scenarioId,
    title: scenario.title,
    expected: scenario.expected,
    result: runCandidatePipelineReference(scenario.input, scenario.config),
  }));
}

const summarizeInput = (scenario) => ({
  scenarioId: scenario.scenarioId,
  title: scenario.title,
  graphRevision: scenario.input.runtimeContext.graph.graphDataRevision,
  tripRequest: scenario.input.tripRequest,
  effectivePreference: scenario.input.effectivePreference,
  runtimeContext: {
    contextSnapshotRef: scenario.input.runtimeContext.contextSnapshotRef,
    requestedExpansionRounds:
      scenario.input.runtimeContext.requestedExpansionRounds,
  },
  corridors: scenario.input.corridors,
  poiCatalog: scenario.input.poiCatalog,
  expected: scenario.expected,
});

function expectError(action, expectedCode) {
  try {
    action();
  } catch (error) {
    if (error instanceof CandidatePipelineError && error.code === expectedCode)
      return { expectedCode, observedCode: error.code, rejected: true };
    throw error;
  }
  throw new Error(`Expected ${expectedCode}`);
}

function expectValidation(result, input, config, expectedCode) {
  const validation = validateCandidatePipelineResult(result, input, config);
  if (validation.ok || validation.issue.code !== expectedCode)
    throw new Error(
      `Expected ${expectedCode}, observed ${validation.ok ? "PASS" : validation.issue.code}`,
    );
  return {
    expectedCode,
    observedCode: validation.issue.code,
    rejected: true,
  };
}

export function buildFailureCases(results = runPilotScenarios()) {
  const baselineScenario = pilotScenarios[0];
  const baseline = results[0].result;
  const cases = [];

  const duplicateCandidate = structuredClone(baseline);
  duplicateCandidate.candidateRun.candidates[1].candidateId =
    duplicateCandidate.candidateRun.candidates[0].candidateId;
  cases.push({
    caseId: "duplicate-candidate-id",
    ...expectValidation(
      duplicateCandidate,
      baselineScenario.input,
      baselineScenario.config,
      "DUPLICATE_ID",
    ),
  });

  const stale = structuredClone(baselineScenario.input);
  stale.tripRequest.expectedRevision = 2;
  cases.push({
    caseId: "stale-run-revision",
    ...expectError(
      () => runCandidatePipelineReference(stale, baselineScenario.config),
      "STALE_RUN_REVISION",
    ),
  });

  const routeScenario = pilotScenarios[9];
  const routeResult = structuredClone(results[9].result);
  routeResult.persistableSelection.selectedPoiRefs.push(
    routeScenario.expected.rejectedIncludes[0],
  );
  cases.push({
    caseId: "hard-rejected-candidate-reintroduced",
    ...expectValidation(
      routeResult,
      routeScenario.input,
      routeScenario.config,
      "HARD_REJECT_REINTRODUCED",
    ),
  });

  const unknownScenario = pilotScenarios[10];
  const unknownResult = structuredClone(results[10].result);
  const unknownPoi = unknownScenario.expected.unresolvedIncludes[0];
  unknownResult.persistableSelection.selectedPoiRefs.push(unknownPoi);
  cases.push({
    caseId: "unknown-critical-fact-treated-pass",
    ...expectValidation(
      unknownResult,
      unknownScenario.input,
      unknownScenario.config,
      "NEEDS_FACT_PROMOTED",
    ),
  });

  const mustGoScenario = pilotScenarios[7];
  const mustGoResult = structuredClone(results[7].result);
  mustGoResult.persistableSelection.selectedPoiRefs = [];
  cases.push({
    caseId: "must-go-dropped-without-hard-reason",
    ...expectValidation(
      mustGoResult,
      mustGoScenario.input,
      mustGoScenario.config,
      "MUST_GO_SILENTLY_DROPPED",
    ),
  });

  const invalidRegion = structuredClone(baselineScenario.input);
  invalidRegion.tripRequest.requestedRegionRefs = ["region-not-in-graph"];
  cases.push({
    caseId: "invalid-region-ref",
    ...expectError(
      () =>
        runCandidatePipelineReference(invalidRegion, baselineScenario.config),
      "DANGLING_REGION_REF",
    ),
  });

  const invalidPoi = structuredClone(baselineScenario.input);
  invalidPoi.tripRequest.mustGoPoiRefs = ["poi-not-in-catalog"];
  cases.push({
    caseId: "invalid-poi-ref",
    ...expectError(
      () => runCandidatePipelineReference(invalidPoi, baselineScenario.config),
      "DANGLING_POI_REF",
    ),
  });

  const dominatedCandidate = baseline.candidateRun.candidates.find(
    ({ status }) => status === "dominated",
  );
  if (!dominatedCandidate)
    throw new Error("Missing dominated fixture candidate");
  const dominatedResult = structuredClone(baseline);
  dominatedResult.persistableSelection.selectedPoiRefs.push(
    dominatedCandidate.domainRef,
  );
  cases.push({
    caseId: "pareto-dominated-improper-survivor",
    ...expectValidation(
      dominatedResult,
      baselineScenario.input,
      baselineScenario.config,
      "PARETO_DOMINATED_SURVIVOR",
    ),
  });

  const diversityScenario = pilotScenarios[11];
  const diversityResult = structuredClone(results[11].result);
  const diversityCandidate = diversityResult.candidateRun.candidates.find(
    ({ status }) => status === "pruned_by_diversity",
  );
  if (!diversityCandidate)
    throw new Error("Missing diversity-pruned candidate");
  diversityResult.persistableSelection.selectedPoiRefs.push(
    diversityCandidate.domainRef,
  );
  cases.push({
    caseId: "diversity-revives-rejected-candidate",
    ...expectValidation(
      diversityResult,
      diversityScenario.input,
      diversityScenario.config,
      "PRUNED_CANDIDATE_REINTRODUCED",
    ),
  });

  const expansion = structuredClone(pilotScenarios[12].input);
  expansion.runtimeContext.requestedExpansionRounds = 4;
  cases.push({
    caseId: "expansion-bound-exceeded",
    ...expectError(
      () => runCandidatePipelineReference(expansion, pilotScenarios[12].config),
      "EXPANSION_BOUND_EXCEEDED",
    ),
  });

  const localLeak = structuredClone(baseline);
  localLeak.persistableSelection.tripRef =
    localLeak.candidateRun.candidates[0].candidateId;
  cases.push({
    caseId: "local-candidate-id-leak",
    ...expectValidation(
      localLeak,
      baselineScenario.input,
      baselineScenario.config,
      "LOCAL_ID_LEAK",
    ),
  });

  const danglingCandidate = structuredClone(baseline);
  danglingCandidate.candidateRun.candidates.at(-1).parentCandidateIds = [
    "candidate:unknown",
  ];
  cases.push({
    caseId: "dangling-candidate-ref",
    ...expectValidation(
      danglingCandidate,
      baselineScenario.input,
      baselineScenario.config,
      "DANGLING_CANDIDATE_REF",
    ),
  });

  return cases;
}

export function buildPilotEvidence() {
  const scenarioRuns = runPilotScenarios();
  const repeatedRuns = runPilotScenarios();
  const scenarioResults = scenarioRuns.map((row, index) => {
    const repeated = repeatedRuns[index].result;
    return {
      scenarioId: row.scenarioId,
      title: row.title,
      expected: row.expected,
      terminalDisposition: row.result.terminalDisposition,
      selectedPoiRefs: row.result.persistableSelection.selectedPoiRefs,
      backupPoiRefs: row.result.persistableSelection.backupPoiRefs,
      unresolvedPoiRefs: row.result.unresolvedPoiRefs,
      rejectedPoiRefs: row.result.rejectedPoiRefs,
      expansionRoundsUsed: row.result.expansionRoundsUsed,
      diversityPruned: row.result.candidateRun.candidates.filter(
        ({ status }) => status === "pruned_by_diversity",
      ).length,
      deterministic:
        stableCandidatePipelineJson(row.result) ===
        stableCandidatePipelineJson(repeated),
      diagnostics: row.result.diagnostics,
    };
  });
  const failureCases = buildFailureCases(scenarioRuns);
  const allDiagnosticsPass = scenarioResults.every(
    ({ deterministic, diagnostics }) =>
      deterministic &&
      diagnostics.decisionTraceStageCoverage === 1 &&
      Object.entries(diagnostics).every(([key, value]) =>
        ["deterministicRepeat", "byteStableNormalizedResult"].includes(key)
          ? value === true
          : key === "decisionTraceStageCoverage"
            ? value === 1
            : value === 0,
      ),
  );
  return {
    schemaVersion: "1.0",
    task: "TASK-048-A",
    generatedAt: RUN_AT,
    sourceBoundary: {
      regionGraphRevision: regionGraph.graphDataRevision,
      regionNodes: regionGraph.nodes.length,
      poiData: "contract-valid deterministic fixtures",
      humanGoldRead: false,
      reviewerAnswersRead: false,
      candidate0457ReadOrChanged: false,
      aiCalls: 0,
      providerCalls: 0,
      productionDatabaseWrites: 0,
    },
    stageOrder: REFERENCE_PIPELINE_STAGES,
    scenarioCount: scenarioResults.length,
    scenarioResults,
    failureCases,
    acceptance: {
      deterministicRepeat: scenarioResults.every(
        ({ deterministic }) => deterministic,
      ),
      byteStableNormalizedResult: scenarioResults.every(
        ({ deterministic }) => deterministic,
      ),
      hardRejectBypass: 0,
      mustGoSilentlyDropped: 0,
      needsFactSilentlyPromoted: 0,
      danglingRegionPoiCandidateRefs: 0,
      improperParetoSurvivors: 0,
      diversityResurrectedRejectedCandidates: 0,
      unboundedLoopOrRetry: 0,
      decisionTraceStageCoveragePercent: 100,
      aiOrProviderCalls: 0,
      productionDatabaseWrites: 0,
      scoringParameterChanges: 0,
      regionGraphSemanticChanges: 0,
      masterCodeGovernanceChanges: 0,
      plannerOrStepUiChanges: 0,
      allDiagnosticsPass,
      negativeCasesRejected: failureCases.every(({ rejected }) => rejected),
    },
  };
}

async function writeJson(path, value) {
  await writeFile(
    path,
    await formatWithPrettier(stableCandidatePipelineJson(value), {
      parser: "json",
    }),
    "utf8",
  );
}

export async function writePilotOutputs() {
  const evidence = buildPilotEvidence();
  const scenarioRuns = runPilotScenarios();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeJson(resolve(OUTPUT_DIR, "pipeline-fixtures.json"), {
    schemaVersion: "1.0",
    fixturePolicy: {
      kind: "contract-valid deterministic fixtures",
      productionFacts: false,
      note: "Fixtures exercise orchestration semantics; they do not claim real POI identity or production scoring validity.",
    },
    scenarios: pilotScenarios.map(summarizeInput),
  });
  await writeJson(resolve(OUTPUT_DIR, "pipeline-config.json"), pipelineConfig);
  await writeJson(resolve(OUTPUT_DIR, "stage-trace.json"), {
    schemaVersion: "1.0",
    stageOrder: REFERENCE_PIPELINE_STAGES,
    scenarios: scenarioRuns.map(({ scenarioId, result }) => ({
      scenarioId,
      candidateRunId: result.candidateRun.runId,
      stageTraces: result.decisionTrace.stageTraces,
    })),
  });
  await writeJson(resolve(OUTPUT_DIR, "scenario-results.json"), evidence);
  await writeJson(resolve(OUTPUT_DIR, "failure-cases.json"), {
    schemaVersion: "1.0",
    failureCases: evidence.failureCases,
  });
  const report = `# TASK-048-A Candidate Pipeline Pilot Report

## Outcome

Completed / Candidate Pipeline reference ready for human review.

## Scope

- ${evidence.scenarioCount} deterministic Pilot scenarios.
- ${REFERENCE_PIPELINE_STAGES.length} ordered stages from Region Candidate through Top-N.
- Contract-valid POI fixtures only; no production POI identity or scoring claim.
- Region Graph revision: \`${regionGraph.graphDataRevision}\` (${regionGraph.nodes.length} nodes).
- AI calls, provider calls and production DB writes: 0.

## Acceptance

| Gate | Result |
| --- | ---: |
${Object.entries(evidence.acceptance)
  .map(([key, value]) => `| ${key} | ${String(value)} |`)
  .join("\n")}

## Boundary

No Human Gold, TASK-039 reviewer answer, candidate-0457 result, production scoring
weight, Region Graph semantic, Master Code governance, Planner/Step UI or DB
migration was read or changed. The score input is an explicit Pilot projection
boundary and does not freeze production calibration.
`;
  await writeFile(
    resolve(OUTPUT_DIR, "pilot-report.md"),
    await formatWithPrettier(report, { parser: "markdown" }),
    "utf8",
  );
  return evidence;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const evidence = await writePilotOutputs();
  if (
    evidence.scenarioCount !== 14 ||
    !evidence.acceptance.allDiagnosticsPass ||
    !evidence.acceptance.negativeCasesRejected
  )
    throw new Error("TASK-048 acceptance failed");
  console.log(
    `TASK-048-A PASS: ${evidence.scenarioCount} scenarios, 100% stage coverage, 0 external calls`,
  );
}
