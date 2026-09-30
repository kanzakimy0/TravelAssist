import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseCandidateRunV1,
  parseDecisionRunV1,
} from "../src/shared/contracts/planning/index.ts";
import {
  CandidatePipelineError,
  REFERENCE_PIPELINE_STAGES,
  runCandidatePipelineReference,
  stableCandidatePipelineJson,
} from "../src/features/planning/candidate-pipeline/index.ts";
import {
  buildFailureCases,
  buildPilotEvidence,
  pilotScenarios,
  runPilotScenarios,
  writePilotOutputs,
} from "../tools/qa/candidate-pipeline-pilot.mjs";

const runById = (runs, scenarioId) =>
  runs.find((row) => row.scenarioId === scenarioId);

test("TASK-048 covers exactly the 14 mandatory Pilot scenarios", () => {
  assert.equal(pilotScenarios.length, 14);
  assert.deepEqual(
    pilotScenarios.map(({ title }) => title),
    [
      "Tokyo first-time iconic trip",
      "Tokyo hidden/local preference",
      "Hakone/Fuji corridor",
      "Alpine/Hokuriku corridor",
      "Kyoto/Nara/Osaka/Kobe corridor",
      "Low walking tolerance",
      "Low crowd tolerance",
      "Must-go item preserved",
      "Must-go item impossible because of a hard constraint",
      "Route-infeasible candidate removed",
      "Critical route/opening fact unknown",
      "Diversity prevents one-category Top-N monoculture",
      "Sparse candidate fallback expansion",
      "No-valid-choice terminal case",
    ],
  );
});

test("each run conforms to canonical CandidateRun and DecisionRun contracts", () => {
  for (const { result } of runPilotScenarios()) {
    assert.equal(parseCandidateRunV1(result.candidateRun).ok, true);
    assert.equal(parseDecisionRunV1(result.decisionTrace).ok, true);
  }
});

test("stage order and trace coverage are complete and stable", () => {
  for (const { result } of runPilotScenarios()) {
    assert.deepEqual(
      result.decisionTrace.stageTraces.map(({ stage }) => stage),
      REFERENCE_PIPELINE_STAGES,
    );
    assert.equal(result.diagnostics.decisionTraceStageCoverage, 1);
  }
});

test("scenario outcomes satisfy every explicit expectation", () => {
  for (const { scenarioId, expected, result } of runPilotScenarios()) {
    assert.equal(
      result.terminalDisposition,
      expected.terminalDisposition,
      scenarioId,
    );
    for (const poiRef of expected.selectedIncludes ?? [])
      assert.ok(
        result.persistableSelection.selectedPoiRefs.includes(poiRef),
        `${scenarioId}:${poiRef}`,
      );
    for (const poiRef of expected.rejectedIncludes ?? [])
      assert.ok(
        result.rejectedPoiRefs.includes(poiRef),
        `${scenarioId}:${poiRef}`,
      );
    for (const poiRef of expected.unresolvedIncludes ?? [])
      assert.ok(
        result.unresolvedPoiRefs.includes(poiRef),
        `${scenarioId}:${poiRef}`,
      );
    if (expected.corridorCount !== undefined)
      assert.equal(
        result.persistableSelection.corridorRefs.length,
        expected.corridorCount,
      );
    if (expected.expansionRoundsUsed !== undefined)
      assert.equal(result.expansionRoundsUsed, expected.expansionRoundsUsed);
    if (expected.diversityPrunedMinimum !== undefined)
      assert.ok(
        result.candidateRun.candidates.filter(
          ({ status }) => status === "pruned_by_diversity",
        ).length >= expected.diversityPrunedMinimum,
      );
  }
});

test("identical input, config and revision produce byte-stable normalized output", () => {
  const first = runPilotScenarios();
  const second = runPilotScenarios();
  assert.equal(
    stableCandidatePipelineJson(first),
    stableCandidatePipelineJson(second),
  );
});

test("equal-score candidates use domain identity as a deterministic tie-break", () => {
  const scenario = pilotScenarios[11];
  const first = runCandidatePipelineReference(scenario.input, scenario.config);
  const reversed = structuredClone(scenario.input);
  reversed.poiCatalog.reverse();
  const second = runCandidatePipelineReference(reversed, scenario.config);
  assert.deepEqual(
    first.persistableSelection.selectedPoiRefs,
    second.persistableSelection.selectedPoiRefs,
  );
  assert.deepEqual(
    first.persistableSelection.backupPoiRefs,
    second.persistableSelection.backupPoiRefs,
  );
});

test("must-go survives ranking while an impossible must-go returns an explicit conflict", () => {
  const runs = runPilotScenarios();
  const preserved = runById(runs, "08-must-go-preserved").result;
  const impossible = runById(runs, "09-must-go-hard-conflict").result;
  const mustGo = pilotScenarios[7].input.tripRequest.mustGoPoiRefs[0];
  assert.ok(preserved.persistableSelection.selectedPoiRefs.includes(mustGo));
  assert.ok(
    impossible.rejectedPoiRefs.includes(
      pilotScenarios[8].input.tripRequest.mustGoPoiRefs[0],
    ),
  );
  assert.equal(impossible.terminalDisposition, "NO_VALID_CHOICE");
});

test("critical unknown facts remain NEEDS_FACT and never enter stable output", () => {
  const result = runById(
    runPilotScenarios(),
    "11-critical-fact-unknown",
  ).result;
  assert.equal(result.terminalDisposition, "NEEDS_FACT");
  assert.equal(result.unresolvedPoiRefs.length, 2);
  assert.deepEqual(result.persistableSelection.selectedPoiRefs, []);
  assert.equal(result.diagnostics.needsFactSilentlyPromoted, 0);
});

test("route and itinerary hard failures cannot bypass rejection", () => {
  const result = runById(
    runPilotScenarios(),
    "10-route-infeasible-removed",
  ).result;
  assert.equal(result.rejectedPoiRefs.length, 1);
  assert.equal(result.diagnostics.hardRejectBypass, 0);
  assert.ok(
    result.candidateRun.candidates.some(
      ({ status, reasons }) =>
        status === "rejected" &&
        reasons.some(({ code }) => code === "ROUTE_INFEASIBLE"),
    ),
  );
});

test("Pareto and diversity never resurrect an ineligible candidate", () => {
  const evidence = buildPilotEvidence();
  assert.equal(evidence.acceptance.improperParetoSurvivors, 0);
  assert.equal(evidence.acceptance.diversityResurrectedRejectedCandidates, 0);
  const diversity = evidence.scenarioResults.find(
    ({ scenarioId }) => scenarioId === "12-diversity-monoculture-guard",
  );
  assert.ok(diversity.diversityPruned >= 2);
});

test("sparse fallback is explicit, deterministic and bounded", () => {
  const result = runById(
    runPilotScenarios(),
    "13-sparse-fallback-expansion",
  ).result;
  assert.equal(result.expansionRoundsUsed, 2);
  assert.ok(
    result.decisionTrace.fallbackCodes.includes("SPARSE_POOL_EXPANSION"),
  );
  assert.equal(result.diagnostics.unboundedExpansionOrRetry, 0);
});

test("stable selection exposes domain refs and never local Candidate IDs", () => {
  for (const { result } of runPilotScenarios()) {
    assert.equal(
      stableCandidatePipelineJson(result.persistableSelection).includes(
        "candidate:",
      ),
      false,
    );
  }
});

test("all required fail-closed negative cases are executable", () => {
  const cases = buildFailureCases();
  assert.equal(cases.length, 12);
  assert.ok(cases.every(({ rejected }) => rejected));
  assert.deepEqual(
    new Set(cases.map(({ caseId }) => caseId)),
    new Set([
      "duplicate-candidate-id",
      "stale-run-revision",
      "hard-rejected-candidate-reintroduced",
      "unknown-critical-fact-treated-pass",
      "must-go-dropped-without-hard-reason",
      "invalid-region-ref",
      "invalid-poi-ref",
      "pareto-dominated-improper-survivor",
      "diversity-revives-rejected-candidate",
      "expansion-bound-exceeded",
      "local-candidate-id-leak",
      "dangling-candidate-ref",
    ]),
  );
});

test("runtime rejects stale revisions without retrying", () => {
  const scenario = structuredClone(pilotScenarios[0]);
  scenario.input.tripRequest.expectedRevision = 2;
  assert.throws(
    () => runCandidatePipelineReference(scenario.input, scenario.config),
    (error) =>
      error instanceof CandidatePipelineError &&
      error.code === "STALE_RUN_REVISION",
  );
});

test("provider, AI and persistence boundaries remain zero", () => {
  const evidence = buildPilotEvidence();
  assert.equal(evidence.sourceBoundary.humanGoldRead, false);
  assert.equal(evidence.sourceBoundary.reviewerAnswersRead, false);
  assert.equal(evidence.sourceBoundary.candidate0457ReadOrChanged, false);
  assert.equal(evidence.sourceBoundary.aiCalls, 0);
  assert.equal(evidence.sourceBoundary.providerCalls, 0);
  assert.equal(evidence.sourceBoundary.productionDatabaseWrites, 0);
  assert.equal(evidence.acceptance.scoringParameterChanges, 0);
  assert.equal(evidence.acceptance.regionGraphSemanticChanges, 0);
  assert.equal(evidence.acceptance.masterCodeGovernanceChanges, 0);
});

test("checked-in evidence is deterministic", async () => {
  await writePilotOutputs();
  const before = await Promise.all(
    [
      "pipeline-fixtures.json",
      "pipeline-config.json",
      "stage-trace.json",
      "scenario-results.json",
      "failure-cases.json",
      "pilot-report.md",
    ].map((name) => readFile(`docs/qa/TASK-048/${name}`, "utf8")),
  );
  await writePilotOutputs();
  const after = await Promise.all(
    [
      "pipeline-fixtures.json",
      "pipeline-config.json",
      "stage-trace.json",
      "scenario-results.json",
      "failure-cases.json",
      "pilot-report.md",
    ].map((name) => readFile(`docs/qa/TASK-048/${name}`, "utf8")),
  );
  assert.deepEqual(after, before);
});
