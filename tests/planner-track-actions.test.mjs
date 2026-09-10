import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState } =
  await import("../src/features/planner/model/trip-model.ts");
const { timelineAxis } =
  await import("../src/features/planner/model/planner-timeline.ts");
const { recommendationModified, restoreRecommendation } =
  await import("../src/features/planner/model/recommendation-actions.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("close start times and extended days cannot balloon the ruler", () => {
  const axis = timelineAxis([
    { startTime: "08:00", endTime: "09:00" },
    { startTime: "08:01", endTime: "160:00" },
  ]);
  assert.ok(axis.width <= 1440);
  assert.equal(axis.start, 480);
  assert.equal(axis.end, 9600);
  assert.equal(axis.ticks.length, 7);
});
test("all pristine recommendations are unmodified, without mutating state", () => {
  const state = fixture(),
    before = JSON.stringify(state);
  for (const p of state.plans)
    assert.equal(recommendationModified(state, p.id), false, p.id);
  assert.equal(JSON.stringify(state), before);
});
test("restore only resets the selected recommendation and clears its badge", () => {
  const state = fixture(),
    target = state.plans[0],
    other = state.plans[1];
  target.name = "QA edited recommendation";
  target.items[0].startTime = "06:30";
  other.name = "Keep my other plan";
  assert.equal(recommendationModified(state, target.id), true);
  const next = restoreRecommendation(state, target.id);
  assert.equal(recommendationModified(next, target.id), false);
  assert.equal(next.plans[1], other);
  assert.equal(next.settings, state.settings);
  assert.equal(next.places, state.places);
  assert.equal(target.name, "QA edited recommendation");
});
test("unknown recommendation restore is a no-op", () => {
  const state = fixture();
  assert.equal(restoreRecommendation(state, "missing"), state);
});
