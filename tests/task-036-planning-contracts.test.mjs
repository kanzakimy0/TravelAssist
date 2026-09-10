import assert from "node:assert/strict";
import test from "node:test";

import "./register-route-ts.mjs";

const planning = await import("../src/shared/contracts/planning/index.ts");

const {
  aiCompactContextFixture,
  aiDecisionFixture,
  aiNeedMoreContextFixture,
  aiProviderDecisionRunFixture,
  candidateRunFixture,
  completePoiFeatureFixture,
  currentFactFixture,
  currentFactUsabilityFixture,
  durationTooShortFixture,
  effectivePreferenceFixture,
  engineOnlyDecisionRunFixture,
  feasibilityPassFixture,
  localIdMapFixture,
  negativePlanningFixtures,
  poiPlanningProjectionFixture,
  regionGraphFixture,
  replanProposalFixture,
  scoreSetFixture,
  sparsePreferenceFixture,
  staleFactFixture,
  staleFactUsabilityFixture,
  visitProfileFixture,
} = planning;

const expectIssue = (result, code) => {
  assert.equal(result.ok, false);
  assert.equal(result.issue.code, code);
  assert.equal(typeof result.issue.path, "string");
  assert.equal(Object.hasOwn(result.issue, "input"), false);
};

test("43-feature vector is complete and preserves explicit zero versus unknown null", () => {
  assert.equal(planning.POI_FEATURE_CODES.length, 43);
  const result = planning.parsePoiFeatureSetV1(completePoiFeatureFixture);
  assert.equal(result.ok, true);
  assert.equal(result.value.values["01"], 0);
  assert.equal(result.value.values["02"], null);

  const changedSemantic = structuredClone(completePoiFeatureFixture);
  changedSemantic.values["02"] = 0;
  const changed = planning.parsePoiFeatureSetV1(changedSemantic);
  assert.equal(changed.ok, true);
  assert.notDeepEqual(changed.value.values, result.value.values);
});

test("feature contract rejects out-of-range and unknown feature codes", () => {
  expectIssue(
    planning.parsePoiFeatureSetV1(negativePlanningFixtures.featureValueTen),
    "INVALID_NUMBER",
  );
  expectIssue(
    planning.parsePoiFeatureSetV1(negativePlanningFixtures.unknownFeatureCode),
    "INCOMPLETE_FEATURE_VECTOR",
  );
  const wrongKind = { ...planning.POI_FEATURE_KIND_BY_CODE, 25: "benefit" };
  assert.notDeepEqual(wrongKind, planning.POI_FEATURE_KIND_BY_CODE);
  assert.equal(planning.POI_FEATURE_KIND_BY_CODE["25"], "cost");
  assert.equal(planning.POI_FEATURE_KIND_BY_CODE["39"], "risk");
});

test("effective preference preserves explicit neutral 5 while AI compact form rejects it", () => {
  const effective = planning.parseEffectivePreferenceV1(
    effectivePreferenceFixture,
  );
  assert.equal(effective.ok, true);
  assert.equal(effective.value.values["01"], 5);
  assert.equal(
    planning.parseSparsePreferenceV1(sparsePreferenceFixture).ok,
    true,
  );
  expectIssue(
    planning.parseSparsePreferenceV1(
      negativePlanningFixtures.explicitCompactNeutral,
    ),
    "COMPACT_NEUTRAL_MUST_BE_OMITTED",
  );
});

test("visit projection validates duration ordering and keeps load priors separate from actual fatigue", () => {
  assert.equal(planning.parsePoiVisitProfileV1(visitProfileFixture).ok, true);
  assert.equal(
    planning.parsePoiPlanningProjectionV1(poiPlanningProjectionFixture).ok,
    true,
  );
  assert.equal(Object.hasOwn(visitProfileFixture, "actualFatigue"), false);
  expectIssue(
    planning.parsePoiVisitProfileV1(
      negativePlanningFixtures.invalidVisitDurationOrder,
    ),
    "INVALID_DURATION_ORDER",
  );
});

test("region graph validates directional priors with multiple variants", () => {
  const result = planning.parseTravelRegionGraphV1(regionGraphFixture);
  assert.equal(result.ok, true);
  assert.equal(result.value.travelEdges[0].variants.length, 2);
  assert.equal(result.value.travelEdges[0].fromRegionRef, "region-tokyo");
  assert.equal(result.value.travelEdges[0].toRegionRef, "region-hakone");
});

test("region graph rejects contains cycles, reverse symmetric duplicates and live timetable claims", () => {
  const cycle = structuredClone(regionGraphFixture);
  cycle.relations = [
    {
      relationId: "rel-a",
      relationType: "contains",
      fromRegionRef: "region-tokyo",
      toRegionRef: "region-hakone",
      confidence: 1,
      sourceRefs: [],
      validFrom: null,
      validUntil: null,
      lifecycleStatus: "active",
      revision: 1,
    },
    {
      relationId: "rel-b",
      relationType: "contains",
      fromRegionRef: "region-hakone",
      toRegionRef: "region-tokyo",
      confidence: 1,
      sourceRefs: [],
      validFrom: null,
      validUntil: null,
      lifecycleStatus: "active",
      revision: 1,
    },
  ];
  expectIssue(planning.parseTravelRegionGraphV1(cycle), "CONTAINS_CYCLE");

  const reverse = structuredClone(regionGraphFixture);
  reverse.relations = [
    {
      relationId: "rel-a",
      relationType: "adjacent",
      fromRegionRef: "region-tokyo",
      toRegionRef: "region-hakone",
      confidence: 1,
      sourceRefs: [],
      validFrom: null,
      validUntil: null,
      lifecycleStatus: "active",
      revision: 1,
    },
    {
      relationId: "rel-b",
      relationType: "adjacent",
      fromRegionRef: "region-hakone",
      toRegionRef: "region-tokyo",
      confidence: 1,
      sourceRefs: [],
      validFrom: null,
      validUntil: null,
      lifecycleStatus: "active",
      revision: 1,
    },
  ];
  expectIssue(
    planning.parseTravelRegionGraphV1(reverse),
    "DUPLICATE_SYMMETRIC_RELATION",
  );

  const liveClaim = structuredClone(regionGraphFixture);
  liveClaim.travelEdges[0].confirmedDeparture = "09:00";
  expectIssue(planning.parseTravelRegionGraphV1(liveClaim), "UNKNOWN_FIELD");
});

test("score and feasibility contracts keep components and critical duration evidence explicit", () => {
  assert.equal(planning.parsePlanningScoreSetV1(scoreSetFixture).ok, true);
  expectIssue(
    planning.parsePlanningScoreSetV1(negativePlanningFixtures.invalidScore),
    "INVALID_NUMBER",
  );
  assert.equal(
    planning.parseFeasibilityResultV1(feasibilityPassFixture).ok,
    true,
  );
  const critical = planning.parseFeasibilityResultV1(durationTooShortFixture);
  assert.equal(critical.ok, true);
  assert.equal(critical.value.status, "CRITICAL");
  assert.equal(critical.value.issues[0].code, "DURATION_TOO_SHORT");
  assert.equal(critical.value.visit.plannedDurationMinutes, 30);
  assert.notEqual(
    critical.value.visit.visitWalkingLoad,
    feasibilityPassFixture.visit.visitWalkingLoad,
  );
});

test("candidate pipeline retains a hard reject reason instead of treating it as soft ranking", () => {
  const result = planning.parseCandidateRunV1(candidateRunFixture);
  assert.equal(result.ok, true);
  assert.equal(result.value.candidates[0].gate, "REJECT");
  assert.equal(result.value.candidates[0].reasons[0].code, "LIFECYCLE_CLOSED");
});

test("AI compact context validates local IDs, omit-5 preference and precision", () => {
  assert.equal(
    planning.parseAiCompactContextV1(aiCompactContextFixture).ok,
    true,
  );
  expectIssue(
    planning.parseAiCompactContextV1(negativePlanningFixtures.duplicateLocalId),
    "DUPLICATE_LOCAL_ID",
  );
  const raw = { ...aiCompactContextFixture, providerRaw: { result: true } };
  expectIssue(planning.parseAiCompactContextV1(raw), "UNKNOWN_FIELD");
});

const decisionContext = {
  runId: aiCompactContextFixture.runId,
  task: aiCompactContextFixture.task,
  localIdMap: localIdMapFixture,
  request: aiCompactContextFixture.request,
};

test("AI decision accepts valid decision and need-more-context branches", () => {
  assert.equal(
    planning.parseAiDecisionResponseV1(aiDecisionFixture, decisionContext).ok,
    true,
  );
  assert.equal(
    planning.parseAiDecisionResponseV1(
      aiNeedMoreContextFixture,
      decisionContext,
    ).ok,
    true,
  );
});

test("AI decision rejects wrong binding and unknown/non-candidate IDs", () => {
  expectIssue(
    planning.parseAiDecisionResponseV1(
      { ...aiDecisionFixture, runId: "other-run" },
      decisionContext,
    ),
    "OUT_RUN_MISMATCH",
  );
  expectIssue(
    planning.parseAiDecisionResponseV1(
      { ...aiDecisionFixture, task: "region_choice" },
      decisionContext,
    ),
    "OUT_TASK_MISMATCH",
  );
  const unknown = structuredClone(aiDecisionFixture);
  unknown.decision.selectedIds = [999];
  expectIssue(
    planning.parseAiDecisionResponseV1(unknown, decisionContext),
    "OUT_UNKNOWN_LOCAL_ID",
  );
  const notCandidate = structuredClone(aiDecisionFixture);
  notCandidate.decision.selectedIds = [2];
  expectIssue(
    planning.parseAiDecisionResponseV1(notCandidate, decisionContext),
    "OUT_NON_CANDIDATE_ID",
  );
});

test("AI decision rejects duplicate IDs and mutually exclusive status payloads", () => {
  const duplicate = structuredClone(aiDecisionFixture);
  duplicate.decision.selectedIds = [1, 1];
  expectIssue(
    planning.parseAiDecisionResponseV1(duplicate, decisionContext),
    "DUPLICATE_ID",
  );
  const mixed = {
    ...aiDecisionFixture,
    contextRequest: aiNeedMoreContextFixture.contextRequest,
  };
  expectIssue(
    planning.parseAiDecisionResponseV1(mixed, decisionContext),
    "INVALID_STATUS_BRANCH",
  );
  const abstain = { ...aiDecisionFixture, status: "abstain" };
  expectIssue(
    planning.parseAiDecisionResponseV1(abstain, decisionContext),
    "INVALID_STATUS_BRANCH",
  );
  const invalidExpansion = structuredClone(aiNeedMoreContextFixture);
  invalidExpansion.contextRequest.needs = ["need_everything"];
  expectIssue(
    planning.parseAiDecisionResponseV1(invalidExpansion, decisionContext),
    "UNSUPPORTED_VALUE",
  );
});

test("AI patch intent cannot smuggle schedules, booking, payment, permissions, or canonical payloads", () => {
  const patchContext = {
    ...decisionContext,
    task: "poi_replacement",
    request: {
      kind: "patch",
      minimumSelections: 0,
      maximumSelections: 0,
      orderTargetIds: [],
      allowedOperations: ["REPLACE"],
    },
  };
  const patch = {
    ...aiDecisionFixture,
    task: "poi_replacement",
    decision: {
      kind: "patch",
      operations: [{ op: "REPLACE", itemId: 2, candidateId: 1 }],
      backupIds: [],
    },
  };
  assert.equal(
    planning.parseAiDecisionResponseV1(patch, patchContext).ok,
    true,
  );
  for (const forbidden of [
    "schedule",
    "bookingAction",
    "paymentToken",
    "role",
    "tripRevision",
    "providerRaw",
    "coordinates",
    "fare",
  ]) {
    const invalid = structuredClone(patch);
    invalid.decision.operations[0][forbidden] = forbidden;
    expectIssue(
      planning.parseAiDecisionResponseV1(invalid, patchContext),
      "UNKNOWN_FIELD",
    );
  }
});

test("replan proposal binds all revisions and never mutates completed or protected refs", () => {
  const result = planning.parseReplanProposalV1(replanProposalFixture);
  assert.equal(result.ok, true);
  assert.equal(result.value.scope, "rest_of_day");
  assert.deepEqual(result.value.protectedRefs, [
    "item-completed",
    "item-in-progress",
  ]);
  const overlap = {
    ...replanProposalFixture,
    affectedRefs: ["item-completed"],
  };
  expectIssue(
    planning.parseReplanProposalV1(overlap),
    "PROTECTED_REF_AFFECTED",
  );
});

test("fact and freshness contracts distinguish facts, priors, current and stale use", () => {
  assert.equal(planning.parsePlanningFactRefV1(currentFactFixture).ok, true);
  assert.equal(planning.parsePlanningFactRefV1(staleFactFixture).ok, true);
  assert.equal(
    planning.parseFactUsabilityV1(currentFactUsabilityFixture).ok,
    true,
  );
  assert.equal(
    planning.parseFactUsabilityV1(staleFactUsabilityFixture).ok,
    true,
  );
  assert.notEqual(
    currentFactUsabilityFixture.freshness,
    staleFactUsabilityFixture.freshness,
  );
  expectIssue(
    planning.parseFactUsabilityV1(negativePlanningFixtures.invalidFreshness),
    "UNSUPPORTED_VALUE",
  );
  assert.equal(Object.hasOwn(currentFactFixture, "ttlMinutes"), false);
});

test("decision trace validates both Engine-only and Engine+AI/provider paths", () => {
  const engineOnly = planning.parseDecisionRunV1(engineOnlyDecisionRunFixture);
  const withAi = planning.parseDecisionRunV1(aiProviderDecisionRunFixture);
  assert.equal(engineOnly.ok, true);
  assert.equal(withAi.ok, true);
  assert.equal(engineOnly.value.aiUsage.length, 0);
  assert.equal(withAi.value.aiUsage.length, 1);
  assert.equal(withAi.value.providerUsage.length, 1);
});

test("decision trace strict boundary rejects raw provider and secret-like execution fields", () => {
  expectIssue(
    planning.parseDecisionRunV1(
      negativePlanningFixtures.forbiddenTraceProviderRaw,
    ),
    "UNKNOWN_FIELD",
  );
  for (const field of [
    "chainOfThought",
    "systemPrompt",
    "apiToken",
    "cookie",
    "bookingConfirmationCode",
    "paymentToken",
    "fullChatTranscript",
    "preciseLocationHistory",
  ]) {
    const invalid = {
      ...engineOnlyDecisionRunFixture,
      [field]: "not-persistable",
    };
    expectIssue(planning.parseDecisionRunV1(invalid), "UNKNOWN_FIELD");
  }
});

test("public planning entry point re-exports canonical Trip and Route symbols without copies", async () => {
  const trips = await import("../src/shared/contracts/trips/index.ts");
  const routes = await import("../src/shared/contracts/routes/index.ts");
  assert.equal(planning.TRIP_CONTRACT_VERSION, trips.TRIP_CONTRACT_VERSION);
  assert.equal(planning.ROUTE_CONTRACT_VERSION, routes.ROUTE_CONTRACT_VERSION);
});
