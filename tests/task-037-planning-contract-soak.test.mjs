import assert from "node:assert/strict";
import test from "node:test";

import * as planning from "../src/shared/contracts/planning/index.ts";
import {
  CASES_PER_SEED,
  COVERAGE_ROWS,
  SOAK_SEEDS,
  fixtureFingerprint,
  runFuzzCampaign,
  runJsonRoundTrips,
  runScaleObservations,
} from "../tools/qa/planning-contract-fuzz.mjs";

test("seeded planning mutation campaign is deterministic and fail-closed", () => {
  const before = fixtureFingerprint();
  const first = runFuzzCampaign();
  const second = runFuzzCampaign();
  assert.equal(first.totalCases, SOAK_SEEDS.length * CASES_PER_SEED);
  assert.ok(first.totalCases >= 4000);
  assert.equal(first.expectedRejects, first.totalCases);
  assert.equal(first.unexpectedAccepts, 0);
  assert.equal(first.unexpectedThrows, 0);
  assert.equal(first.unsafeIssues, 0);
  assert.equal(first.fixtureMutationDetected, false);
  assert.equal(first.sequenceDigest, second.sequenceDigest);
  assert.deepEqual(first.familyCounts, second.familyCounts);
  assert.deepEqual(first.parserCounts, second.parserCounts);
  assert.equal(fixtureFingerprint(), before);
});

test("mutation inventory covers all required safety families and multiple parsers", () => {
  const report = runFuzzCampaign({ casesPerSeed: 100 });
  for (const family of [
    "unknown_field",
    "missing_field",
    "wrong_contract_version",
    "wrong_enum",
    "nan",
    "infinity",
    "negative_number",
    "upper_bound_overflow",
    "wrong_nullable_semantics",
    "empty_string",
    "oversized_string",
    "invalid_id_whitespace",
    "invalid_id_control_character",
    "duplicate_ids",
    "dangling_candidate_ref",
    "dangling_region_ref",
    "cross_poi_feature_identity",
    "cross_poi_visit_profile_identity",
    "contains_cycle",
    "reverse_symmetric_relation_duplicate",
    "range_ordering_violation",
    "invalid_score_over_99",
    "invalid_coverage",
    "invalid_confidence",
    "ai_run_mismatch",
    "ai_unknown_local_id",
    "ai_non_candidate_selection",
    "ai_status_payload_conflict",
    "ai_forbidden_operation",
    "planning_prior_exact_timetable",
    "expired_fact_use",
    "protected_replan_overlap",
    "forbidden_raw_provider_trace_field",
  ]) {
    assert.ok(report.familyCounts[family] > 0, family);
  }
  assert.ok(report.parserCount >= 12);
});

test("JSON wire round-trips preserve planning null, zero, five, IDs and revisions", () => {
  const report = runJsonRoundTrips();
  assert.ok(report.results.every((entry) => entry.success));
  assert.ok(report.results.every((entry) => entry.exactRoundTrip));
  assert.ok(Object.values(report.semantics).every(Boolean));
});

test("TASK-036 review invariants remain explicit regression gates", () => {
  for (const action of ["USE", "USE_WITH_WARNING"]) {
    const result = planning.parseFactUsabilityV1({
      ...planning.currentFactUsabilityFixture,
      freshness: "EXPIRED",
      action,
    });
    assert.equal(result.ok, false);
    assert.equal(result.issue.code, "EXPIRED_FACT_ACTION_FORBIDDEN");
  }
  for (const fixture of [
    planning.negativePlanningFixtures.mismatchedFeatureSetPoiRef,
    planning.negativePlanningFixtures.mismatchedVisitProfilePoiRef,
  ]) {
    const result = planning.parsePoiPlanningProjectionV1(fixture);
    assert.equal(result.ok, false);
    assert.equal(result.issue.code, "POI_REF_MISMATCH");
  }
  const prior = planning.parseAiCompactContextV1(
    planning.negativePlanningFixtures.planningPriorWithExactTimes,
  );
  assert.equal(prior.ok, false);
  assert.equal(prior.issue.code, "PLANNING_PRIOR_EXACT_TIME_FORBIDDEN");
});

test("synthetic scale observations stay bounded and successful", () => {
  const report = runScaleObservations();
  assert.equal(
    report.thresholdPolicy,
    "observational_only_no_production_budget_frozen",
  );
  assert.equal(report.observations.length, 9);
  assert.ok(report.observations.every((entry) => entry.success));
  assert.ok(
    report.observations.some(
      (entry) =>
        entry.label === "candidate_records" && entry.inputCount === 5000,
    ),
  );
});

test("coverage matrix maps every required P0 contract group to concrete evidence", () => {
  assert.equal(COVERAGE_ROWS.length, 13);
  assert.ok(
    COVERAGE_ROWS.every(
      (row) =>
        row.contract &&
        row.parser &&
        row.positiveFixture &&
        row.negativeFixture &&
        row.test &&
        ["covered", "covered_by_owner"].includes(row.status),
    ),
  );
});
