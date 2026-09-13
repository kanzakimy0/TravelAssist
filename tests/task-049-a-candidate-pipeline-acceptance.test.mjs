import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EXPECTED_STAGE_ORDER,
  INITIAL_REVIEWED_HEAD,
  REVIEWED_HEAD,
  buildIndependentAcceptance,
} from "../tools/qa/candidate-pipeline-acceptance.mjs";

const acceptance = await buildIndependentAcceptance();

test("reviews the exact PR 372 head without using TASK-048 result evidence", () => {
  assert.equal(REVIEWED_HEAD, INITIAL_REVIEWED_HEAD);
  assert.equal(acceptance.reviewedHead, REVIEWED_HEAD);
  assert.equal(acceptance.task048ResultUsedAsProof, false);
  assert.equal(acceptance.task048GeneratedQaUsedAsProof, false);
});

test("independently executes all 14 mandatory scenarios", () => {
  assert.equal(acceptance.scenarioChecks.length, 14);
  assert.equal(acceptance.acceptance.pilotScenariosPassed, 14);
  assert.ok(
    acceptance.scenarioChecks.every(
      ({ deterministic, byteStable, stageCoveragePercent }) =>
        deterministic && byteStable && stageCoveragePercent === 100,
    ),
  );
});

test("reconstructs the exact deterministic stage order", () => {
  assert.deepEqual(EXPECTED_STAGE_ORDER, [
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
  ]);
  assert.equal(acceptance.acceptance.decisionTraceCoveragePercent, 100);
});

test("all fail-closed mutations and tie ordering are independently checked", () => {
  assert.equal(acceptance.negativeChecks.length, 13);
  assert.deepEqual(
    acceptance.negativeChecks.map(({ caseId }) => caseId),
    [
      "duplicate-candidate-id",
      "stale-run-revision",
      "invalid-region-ref",
      "invalid-poi-ref",
      "hard-reject-reintroduced",
      "needs-fact-promoted",
      "must-go-silently-dropped",
      "pareto-dominated-survivor",
      "diversity-resurrection",
      "unbounded-expansion",
      "local-id-leak",
      "dangling-candidate-ref",
      "equal-score-ordering",
    ],
  );
});

test("hard filter, must-go and critical unknown invariants pass", () => {
  assert.equal(acceptance.acceptance.hardRejectBypass, 0);
  assert.equal(acceptance.acceptance.mustGoSilentlyDropped, 0);
  assert.equal(acceptance.acceptance.needsFactSilentlyPromoted, 0);
  assert.equal(acceptance.manualSemanticReview.hardFilterBypassPossible, false);
  assert.equal(
    acceptance.manualSemanticReview.mustGoRemovalRequiresBlockingReason,
    true,
  );
  assert.equal(
    acceptance.manualSemanticReview.criticalUnknownRemainsUnresolved,
    true,
  );
});

test("Pareto, diversity and bounded execution invariants pass", () => {
  assert.equal(acceptance.acceptance.improperParetoDominatedSurvivors, 0);
  assert.equal(acceptance.acceptance.diversityResurrectedRejectedCandidates, 0);
  assert.equal(acceptance.acceptance.unboundedLoopOrRetry, 0);
  assert.equal(acceptance.manualSemanticReview.paretoIsMultiObjective, true);
  assert.equal(
    acceptance.manualSemanticReview.diversityCanResurrectRejectedCandidate,
    false,
  );
});

test("stable output and identity gates pass", () => {
  assert.equal(acceptance.acceptance.danglingRegionPoiCandidateRefs, 0);
  assert.equal(acceptance.acceptance.equalScoreOrderingDeterministic, true);
  assert.equal(acceptance.acceptance.localRunIdsLeakToStableOutput, 0);
});

test("Decision Trace and external boundaries are safe", () => {
  assert.equal(acceptance.manualSemanticReview.decisionTraceSafety, "PASS");
  assert.equal(acceptance.acceptance.aiOrProviderCalls, 0);
  assert.equal(acceptance.acceptance.productionDatabaseWrites, 0);
  assert.equal(acceptance.sourceBoundary.noAiOrProviderRuntime, true);
  assert.equal(acceptance.sourceBoundary.noProductionPersistenceRuntime, true);
});

test("review boundary records no unrelated semantic changes", () => {
  assert.equal(acceptance.acceptance.scoringParameterChanges, 0);
  assert.equal(acceptance.acceptance.regionGraphSemanticChanges, 0);
  assert.equal(acceptance.acceptance.masterCodeGovernanceChanges, 0);
  assert.equal(acceptance.acceptance.plannerOrStepUiChanges, 0);
});

test("recommendation is ACCEPT while owner review remains required", () => {
  assert.equal(acceptance.recommendation, "ACCEPT");
  assert.equal(
    acceptance.status,
    "Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval",
  );
});

test("acceptance implementation never imports checked-in TASK-048 QA evidence", async () => {
  const source = await readFile(
    new URL("../tools/qa/candidate-pipeline-acceptance.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /docs\/qa\/TASK-048/);
  assert.doesNotMatch(source, /RESULT-TASK-048/);
  assert.doesNotMatch(source, /buildPilotEvidence|buildFailureCases/);
});
