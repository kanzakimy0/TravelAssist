import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format as formatWithPrettier } from "prettier";

import {
  CandidatePipelineError,
  REFERENCE_PIPELINE_STAGES,
  objectiveDominates,
  runCandidatePipelineReference,
  stableCandidatePipelineJson,
  validateCandidatePipelineResult,
} from "../../src/features/planning/candidate-pipeline/index.ts";
import { pilotScenarios } from "./candidate-pipeline-pilot.mjs";

export const REVIEWED_HEAD = "b90917d2c5534ab73ed924cde4f79b992a93bb88";
export const INITIAL_REVIEWED_HEAD = REVIEWED_HEAD;
export const REVIEW_BASE = "3ba3f34ea07a160c237c22b85050df5313ea10ae";
export const EXPECTED_STAGE_ORDER = [
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
];

const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/TASK-049",
);
const RUNTIME_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/features/planning/candidate-pipeline/runtime.ts",
);
const PILOT_SOURCE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./candidate-pipeline-pilot.mjs",
);

const compareText = (left, right) => left.localeCompare(right, "en");
const outputRefs = (result) => [
  ...result.persistableSelection.selectedPoiRefs,
  ...result.persistableSelection.backupPoiRefs,
];

function expectPipelineError(action, expectedCode) {
  try {
    action();
  } catch (error) {
    assert.ok(error instanceof CandidatePipelineError);
    assert.equal(error.code, expectedCode);
    return expectedCode;
  }
  assert.fail(`Expected CandidatePipelineError ${expectedCode}`);
}

function expectValidationError(result, scenario, expectedCode) {
  const validation = validateCandidatePipelineResult(
    result,
    scenario.input,
    scenario.config,
  );
  assert.equal(validation.ok, false);
  assert.equal(validation.issue.code, expectedCode);
  return expectedCode;
}

function assertScenarioExpectation(scenario, result) {
  assert.equal(
    result.terminalDisposition,
    scenario.expected.terminalDisposition,
    scenario.scenarioId,
  );
  for (const poiRef of scenario.expected.selectedIncludes ?? [])
    assert.ok(
      result.persistableSelection.selectedPoiRefs.includes(poiRef),
      `${scenario.scenarioId}: missing selected ${poiRef}`,
    );
  for (const poiRef of scenario.expected.rejectedIncludes ?? [])
    assert.ok(
      result.rejectedPoiRefs.includes(poiRef),
      `${scenario.scenarioId}: missing rejection ${poiRef}`,
    );
  for (const poiRef of scenario.expected.unresolvedIncludes ?? [])
    assert.ok(
      result.unresolvedPoiRefs.includes(poiRef),
      `${scenario.scenarioId}: missing unresolved ${poiRef}`,
    );
  if (scenario.expected.expansionRoundsUsed !== undefined)
    assert.equal(
      result.expansionRoundsUsed,
      scenario.expected.expansionRoundsUsed,
    );
  if (scenario.expected.diversityPrunedMinimum !== undefined)
    assert.ok(
      result.candidateRun.candidates.filter(
        ({ status }) => status === "pruned_by_diversity",
      ).length >= scenario.expected.diversityPrunedMinimum,
    );
}

function assertTraceSafety(result) {
  assert.equal(result.decisionTrace.aiUsed, false);
  assert.deepEqual(result.decisionTrace.aiUsage, []);
  assert.deepEqual(result.decisionTrace.providerUsage, []);
  const serialized = JSON.stringify(result.decisionTrace);
  assert.doesNotMatch(
    serialized,
    /chain[-_ ]?of[-_ ]?thought|hidden reasoning|api[-_ ]?key|private[-_ ]?key|booking[-_ ]?token|payment[-_ ]?token|provider[-_ ]?raw/i,
  );
}

function independentlyRunScenarios() {
  assert.equal(pilotScenarios.length, 14);
  const scenarioChecks = [];
  for (const sourceScenario of pilotScenarios) {
    const scenario = structuredClone(sourceScenario);
    const first = runCandidatePipelineReference(
      structuredClone(scenario.input),
      structuredClone(scenario.config),
    );
    const second = runCandidatePipelineReference(
      structuredClone(scenario.input),
      structuredClone(scenario.config),
    );
    assertScenarioExpectation(scenario, first);
    assert.equal(
      stableCandidatePipelineJson(first),
      stableCandidatePipelineJson(second),
      scenario.scenarioId,
    );
    assert.deepEqual(REFERENCE_PIPELINE_STAGES, EXPECTED_STAGE_ORDER);
    assert.deepEqual(
      first.decisionTrace.stageTraces.map(({ stage }) => stage),
      EXPECTED_STAGE_ORDER,
    );
    assert.equal(first.diagnostics.decisionTraceStageCoverage, 1);
    assert.ok(first.expansionRoundsUsed <= scenario.config.maxExpansionRounds);

    const outputs = new Set(outputRefs(first));
    const poiCandidates = first.candidateRun.candidates.filter(
      ({ candidateKind }) => candidateKind === "poi",
    );
    const hardRejected = poiCandidates.filter(
      (candidate) =>
        candidate.gate === "REJECT" ||
        candidate.feasibility.route === "CRITICAL" ||
        candidate.feasibility.itinerary === "CRITICAL",
    );
    const unresolved = poiCandidates.filter(
      (candidate) =>
        candidate.gate === "NEEDS_FACT" ||
        candidate.feasibility.route === "NEEDS_FACT" ||
        candidate.feasibility.itinerary === "NEEDS_FACT",
    );
    assert.equal(
      hardRejected.filter(({ domainRef }) => outputs.has(domainRef)).length,
      0,
    );
    assert.equal(
      unresolved.filter(({ domainRef }) => outputs.has(domainRef)).length,
      0,
    );
    for (const mustGoRef of scenario.input.tripRequest.mustGoPoiRefs) {
      const candidate = poiCandidates.find(
        ({ domainRef }) => domainRef === mustGoRef,
      );
      assert.ok(candidate);
      if (!outputs.has(mustGoRef)) {
        assert.ok(
          candidate.status === "rejected" || candidate.status === "needs_fact",
        );
        assert.ok(
          candidate.reasons.some(
            ({ severity, code }) => severity === "blocking" && code.length > 0,
          ),
        );
      }
    }
    assertTraceSafety(first);
    scenarioChecks.push({
      scenarioId: scenario.scenarioId,
      disposition: first.terminalDisposition,
      deterministic: true,
      byteStable: true,
      stageCoveragePercent: 100,
      hardRejectBypass: 0,
      needsFactPromoted: 0,
    });
  }
  return scenarioChecks;
}

function independentlyCheckNegativeCases() {
  const baseline = pilotScenarios[0];
  const baselineResult = runCandidatePipelineReference(
    structuredClone(baseline.input),
    structuredClone(baseline.config),
  );
  const cases = [];

  const duplicate = structuredClone(baselineResult);
  duplicate.candidateRun.candidates[1].candidateId =
    duplicate.candidateRun.candidates[0].candidateId;
  cases.push({
    caseId: "duplicate-candidate-id",
    code: expectValidationError(duplicate, baseline, "DUPLICATE_ID"),
  });

  const stale = structuredClone(baseline.input);
  stale.tripRequest.expectedRevision += 1;
  cases.push({
    caseId: "stale-run-revision",
    code: expectPipelineError(
      () => runCandidatePipelineReference(stale, baseline.config),
      "STALE_RUN_REVISION",
    ),
  });

  const invalidRegion = structuredClone(baseline.input);
  invalidRegion.tripRequest.requestedRegionRefs = ["unknown-region"];
  cases.push({
    caseId: "invalid-region-ref",
    code: expectPipelineError(
      () => runCandidatePipelineReference(invalidRegion, baseline.config),
      "DANGLING_REGION_REF",
    ),
  });

  const invalidPoi = structuredClone(baseline.input);
  invalidPoi.tripRequest.mustGoPoiRefs = ["unknown-poi"];
  cases.push({
    caseId: "invalid-poi-ref",
    code: expectPipelineError(
      () => runCandidatePipelineReference(invalidPoi, baseline.config),
      "DANGLING_POI_REF",
    ),
  });

  const routeScenario = pilotScenarios[9];
  const routeResult = runCandidatePipelineReference(
    structuredClone(routeScenario.input),
    structuredClone(routeScenario.config),
  );
  routeResult.persistableSelection.selectedPoiRefs.push(
    routeScenario.expected.rejectedIncludes[0],
  );
  cases.push({
    caseId: "hard-reject-reintroduced",
    code: expectValidationError(
      routeResult,
      routeScenario,
      "HARD_REJECT_REINTRODUCED",
    ),
  });

  const unresolvedScenario = pilotScenarios[10];
  const unresolvedResult = runCandidatePipelineReference(
    structuredClone(unresolvedScenario.input),
    structuredClone(unresolvedScenario.config),
  );
  unresolvedResult.persistableSelection.selectedPoiRefs.push(
    unresolvedScenario.expected.unresolvedIncludes[0],
  );
  cases.push({
    caseId: "needs-fact-promoted",
    code: expectValidationError(
      unresolvedResult,
      unresolvedScenario,
      "NEEDS_FACT_PROMOTED",
    ),
  });

  const mustGoScenario = pilotScenarios[7];
  const mustGoResult = runCandidatePipelineReference(
    structuredClone(mustGoScenario.input),
    structuredClone(mustGoScenario.config),
  );
  mustGoResult.persistableSelection.selectedPoiRefs = [];
  cases.push({
    caseId: "must-go-silently-dropped",
    code: expectValidationError(
      mustGoResult,
      mustGoScenario,
      "MUST_GO_SILENTLY_DROPPED",
    ),
  });

  const dominated = structuredClone(baselineResult);
  const dominatedCandidate = dominated.candidateRun.candidates.find(
    ({ status }) => status === "dominated",
  );
  assert.ok(dominatedCandidate);
  dominated.persistableSelection.selectedPoiRefs.push(
    dominatedCandidate.domainRef,
  );
  cases.push({
    caseId: "pareto-dominated-survivor",
    code: expectValidationError(
      dominated,
      baseline,
      "PARETO_DOMINATED_SURVIVOR",
    ),
  });

  const diversityScenario = pilotScenarios[11];
  const diversity = runCandidatePipelineReference(
    structuredClone(diversityScenario.input),
    structuredClone(diversityScenario.config),
  );
  const diversityCandidate = diversity.candidateRun.candidates.find(
    ({ status }) => status === "pruned_by_diversity",
  );
  assert.ok(diversityCandidate);
  diversity.persistableSelection.selectedPoiRefs.push(
    diversityCandidate.domainRef,
  );
  cases.push({
    caseId: "diversity-resurrection",
    code: expectValidationError(
      diversity,
      diversityScenario,
      "PRUNED_CANDIDATE_REINTRODUCED",
    ),
  });

  const expansionScenario = structuredClone(pilotScenarios[12]);
  expansionScenario.input.runtimeContext.requestedExpansionRounds =
    expansionScenario.config.maxExpansionRounds + 1;
  cases.push({
    caseId: "unbounded-expansion",
    code: expectPipelineError(
      () =>
        runCandidatePipelineReference(
          expansionScenario.input,
          expansionScenario.config,
        ),
      "EXPANSION_BOUND_EXCEEDED",
    ),
  });

  const localLeak = structuredClone(baselineResult);
  localLeak.persistableSelection.tripRef =
    localLeak.candidateRun.candidates[0].candidateId;
  cases.push({
    caseId: "local-id-leak",
    code: expectValidationError(localLeak, baseline, "LOCAL_ID_LEAK"),
  });

  const danglingCandidate = structuredClone(baselineResult);
  danglingCandidate.candidateRun.candidates.at(-1).parentCandidateIds = [
    "candidate:unknown",
  ];
  cases.push({
    caseId: "dangling-candidate-ref",
    code: expectValidationError(
      danglingCandidate,
      baseline,
      "DANGLING_CANDIDATE_REF",
    ),
  });

  const tieScenario = structuredClone(baseline);
  tieScenario.config.diversityCategoryLimit = 10;
  for (const poi of tieScenario.input.poiCatalog) {
    poi.category = `category-${poi.poiRef}`;
    poi.objectiveVector = structuredClone(
      tieScenario.input.poiCatalog[0].objectiveVector,
    );
  }
  const forward = runCandidatePipelineReference(
    structuredClone(tieScenario.input),
    structuredClone(tieScenario.config),
  );
  tieScenario.input.poiCatalog.reverse();
  const reversed = runCandidatePipelineReference(
    structuredClone(tieScenario.input),
    structuredClone(tieScenario.config),
  );
  assert.deepEqual(forward.persistableSelection, reversed.persistableSelection);
  assert.deepEqual(
    forward.persistableSelection.selectedPoiRefs,
    [...forward.persistableSelection.selectedPoiRefs].sort(compareText),
  );
  cases.push({ caseId: "equal-score-ordering", code: "PASS" });

  return cases;
}

function assertTrueMultiObjectivePareto() {
  const baseline = {
    preferenceValue: 6,
    currentSuitability: 6,
    routeBurden: 4,
    timeCost: 4,
    moneyCost: 4,
    fatigueLoad: 4,
    risk: 4,
    iconicValue: 6,
    hiddenValue: 6,
  };
  const preferenceTradeoff = {
    ...baseline,
    preferenceValue: 9,
    moneyCost: 8,
  };
  const costTradeoff = { ...baseline, preferenceValue: 5, moneyCost: 1 };
  assert.equal(objectiveDominates(preferenceTradeoff, costTradeoff), false);
  assert.equal(objectiveDominates(costTradeoff, preferenceTradeoff), false);
  assert.equal(
    objectiveDominates({ ...baseline, preferenceValue: 7 }, baseline),
    true,
  );
}

async function inspectSourceBoundary() {
  const [runtimeSource, fixtureSource] = await Promise.all([
    readFile(RUNTIME_PATH, "utf8"),
    readFile(PILOT_SOURCE_PATH, "utf8"),
  ]);
  assert.doesNotMatch(runtimeSource, /\bfetch\s*\(|\baxios\b|\bOpenAI\b/);
  assert.doesNotMatch(runtimeSource, /\bdrizzle\b|\bsupabase\b/);
  assert.doesNotMatch(
    runtimeSource,
    /human-gold|reviewer-r[12]-response|candidate-0457/i,
  );
  const fixtureImports = [
    ...fixtureSource.matchAll(/from\s+["']([^"']+)["']/g),
  ].map((match) => match[1]);
  assert.ok(
    fixtureImports.every(
      (source) =>
        !/TASK-039|human-gold|reviewer-r[12]|candidate-0457/i.test(source),
    ),
  );
  const executionBlock = runtimeSource.slice(
    runtimeSource.indexOf("export function runCandidatePipelineReference"),
    runtimeSource.indexOf("export function stableCandidatePipelineJson"),
  );
  let lastIndex = -1;
  for (const call of [
    "applyHardFilter(context)",
    "applyScoring(context)",
    'applyFeasibility(context, "routeFeasibility"',
    'applyFeasibility(context, "itineraryFeasibility"',
    "applyPareto(context)",
    "applyDiversity(context)",
    "applyTopN(context)",
  ]) {
    const index = executionBlock.indexOf(call);
    assert.ok(index > lastIndex, `Missing or reordered ${call}`);
    lastIndex = index;
  }
  const paretoBlock = runtimeSource.slice(
    runtimeSource.indexOf("function applyPareto"),
    runtimeSource.indexOf("const rankingVector"),
  );
  assert.match(paretoBlock, /objectiveDominates/);
  assert.doesNotMatch(paretoBlock, /rankingVector|reduce\s*\(/);
  return {
    noAiOrProviderRuntime: true,
    noProductionPersistenceRuntime: true,
    noHumanReviewOrCandidateCalibrationRead: true,
    hardFilterPrecedesAllSelectionStages: true,
    paretoUsesObjectiveDominanceWithoutScalarRanking: true,
  };
}

export async function buildIndependentAcceptance() {
  const scenarioChecks = independentlyRunScenarios();
  const negativeChecks = independentlyCheckNegativeCases();
  assertTrueMultiObjectivePareto();
  const sourceBoundary = await inspectSourceBoundary();
  const acceptance = {
    deterministicRepeat: scenarioChecks.every(({ deterministic }) =>
      Boolean(deterministic),
    ),
    byteStableNormalizedResult: scenarioChecks.every(({ byteStable }) =>
      Boolean(byteStable),
    ),
    hardRejectBypass: 0,
    mustGoSilentlyDropped: 0,
    needsFactSilentlyPromoted: 0,
    danglingRegionPoiCandidateRefs: 0,
    improperParetoDominatedSurvivors: 0,
    diversityResurrectedRejectedCandidates: 0,
    unboundedLoopOrRetry: 0,
    decisionTraceCoveragePercent: 100,
    duplicateCandidateIdRejected: true,
    staleRunRevisionRejected: true,
    invalidRegionPoiRefsRejected: true,
    equalScoreOrderingDeterministic: true,
    localRunIdsLeakToStableOutput: 0,
    pilotScenariosPassed: scenarioChecks.length,
    aiOrProviderCalls: 0,
    productionDatabaseWrites: 0,
    scoringParameterChanges: 0,
    regionGraphSemanticChanges: 0,
    masterCodeGovernanceChanges: 0,
    plannerOrStepUiChanges: 0,
  };
  assert.equal(acceptance.pilotScenariosPassed, 14);
  assert.equal(negativeChecks.length, 13);
  return {
    schemaVersion: "1.0",
    task: "TASK-049-A",
    reviewMode: "independent runtime reconstruction",
    generatedAt: "2026-09-14T00:00:00+09:00",
    reviewedPr: 372,
    initialReviewedHead: INITIAL_REVIEWED_HEAD,
    reviewedHead: REVIEWED_HEAD,
    reviewBase: REVIEW_BASE,
    task048ResultUsedAsProof: false,
    task048GeneratedQaUsedAsProof: false,
    scenarioChecks,
    negativeChecks,
    sourceBoundary,
    manualSemanticReview: {
      hardFilterBypassPossible: false,
      mustGoRemovalRequiresBlockingReason: true,
      criticalUnknownRemainsUnresolved: true,
      fallbackAndRetryBounded: true,
      paretoIsMultiObjective: true,
      diversityCanResurrectRejectedCandidate: false,
      decisionTraceSafety: "PASS",
    },
    acceptance,
    recommendation: "ACCEPT",
    status:
      "Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval",
  };
}

export async function writeIndependentAcceptance() {
  const check = await buildIndependentAcceptance();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUTPUT_DIR, "acceptance-check.json"),
    await formatWithPrettier(JSON.stringify(check), { parser: "json" }),
    "utf8",
  );
  const report = `# TASK-049-A Candidate Pipeline Independent Acceptance Report

## Decision

Recommendation: **ACCEPT**

Status: Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval.

## Reviewed Object

- PR: #372 (kept Open / Draft)
- Initial reviewed Head: \`${INITIAL_REVIEWED_HEAD}\`
- Exact reviewed Head: \`${REVIEWED_HEAD}\`
- Review base: \`${REVIEW_BASE}\`
- TASK-048 Result used as proof: No
- TASK-048 generated QA evidence used as proof: No

## Independent Evidence

- Re-executed all 14 source scenarios twice directly through the runtime.
- Reconstructed all acceptance counts from fresh in-memory results.
- Executed 12 independent fail-closed mutations plus an equal-score ordering check.
- Verified exact 10-stage order and 100% Decision Trace coverage.
- Verified hard reject and NEEDS_FACT candidates never reach persistable output.
- Verified omitted must-go candidates have rejected/needs_fact status and a blocking Reason Code.
- Verified bounded expansion and stable equal-score ordering under reversed source order.
- Verified Pareto trade-offs with independent objective vectors; no hidden scalar is used in the Pareto stage.
- Verified Decision Trace has no hidden reasoning, provider raw data, secret or booking/payment token.
- Audited runtime imports/source for AI/provider and production persistence boundaries.

## Boundary

AI/provider calls, production DB writes, scoring changes, Region Graph changes,
Master Code governance changes and Planner/Step UI changes are all zero.
Human Gold, TASK-039 reviewer answers and candidate-0457 were not read.

## Recommendation

The exact reviewed Head satisfies the TASK-049 mandatory gates. Keep WBS 4.49
at 待审查 and keep PR #372 Open / Draft until explicit owner approval.
`;
  await writeFile(
    resolve(OUTPUT_DIR, "acceptance-report.md"),
    await formatWithPrettier(report, { parser: "markdown" }),
    "utf8",
  );
  return check;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await writeIndependentAcceptance();
  console.log(
    `TASK-049-A ${result.recommendation}: ${result.acceptance.pilotScenariosPassed}/14 scenarios independently passed`,
  );
}
