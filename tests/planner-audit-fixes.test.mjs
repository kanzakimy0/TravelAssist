import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const { detailRailItems, detailDaySummary } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { validateSchedule, editScheduleError, previewScheduleAdjustment } =
  await import("../src/features/planner/model/schedule-check.ts");
const { buildBookingReview } =
  await import("../src/features/planner/model/bulk-booking.ts");
const { pendingSettingsCount } =
  await import("../src/features/planner/model/secondary-panels.ts");
const fixture = () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
};
const item = (id, startTime, endTime, extra = {}) => ({
  id,
  title: id,
  startTime,
  endTime,
  type: "attraction",
  day: 1,
  ...extra,
});
test("invalid and reversed times fail shared validation", () => {
  for (const i of [
    item("x", "15:00", "14:00"),
    item("x", "12:00", "12:00"),
    item("x", "25:00", "26:00"),
    item(" ", "10:00", "11:00"),
  ])
    assert.ok(validateSchedule(i));
  assert.equal(validateSchedule(item("x", "10:00", "11:00")), "");
});
test("canonical and draft edits share conflict and protection checks", () => {
  assert.match(
    editScheduleError(item("draft", "10:30", "12:00"), [
      item("景点", "10:00", "11:00"),
    ]),
    /景点.*重叠/,
  );
  assert.match(
    editScheduleError(item("fixed", "10:00", "11:00", { fixed: true }), []),
    /锁定/,
  );
});
test("combined rail flags BOTH sides of draft conflicts", () => {
  const state = fixture();
  const original = currentPlan(state).items.find(
    (i) => i.type === "attraction",
  );
  const draft = { ...original, id: "local", type: "custom", note: "" };
  const rail = detailRailItems(state, original.day, [draft]);
  assert.equal(rail.find((i) => i.id === original.id).aiStatus, "error");
  assert.equal(rail.find((i) => i.id === "local").aiStatus, "error");
});
test("completion does not mask unresolved warnings", () => {
  const state = fixture();
  const pending = detailRailItems(state, 2).find(
    (i) => i.reservation === "unknown",
  );
  const done = detailRailItems(state, 2, [], [pending.id]).find(
    (i) => i.id === pending.id,
  );
  assert.equal(done.completed, true);
  assert.notEqual(done.aiStatus, "normal");
});
test("adjustment previews shifts without inserting fake buffer items", () => {
  const items = [item("a", "10:00", "11:00"), item("b", "11:00", "12:00")];
  const before = JSON.stringify(items);
  const preview = previewScheduleAdjustment(items);
  assert.deepEqual(preview.blockers, []);
  assert.equal(preview.changes[0].startTime, "11:15");
  assert.equal(preview.changes[0].endTime, "12:15");
  assert.equal(JSON.stringify(items), before);
});
test("adjustment blocks fixed appointments and overflowing days", () => {
  assert.ok(
    previewScheduleAdjustment([
      item("a", "10:00", "11:00"),
      item("b", "11:00", "12:00", { locked: true }),
    ]).blockers.length,
  );
  assert.ok(
    previewScheduleAdjustment([
      item("a", "22:00", "23:00"),
      item("b", "23:00", "23:59"),
    ]).blockers.length,
  );
});
test("bulk booking defaults can be scoped to exactly one day", () => {
  const state = fixture();
  assert.equal(buildBookingReview(state, 1).rows.length, 0);
  const day2 = buildBookingReview(state, 2);
  assert.equal(day2.day, 2);
  assert.equal(day2.rows.length, 1);
  assert.match(day2.rows[0].title, /富士急/);
  assert.ok(buildBookingReview(state).rows.length > day2.rows.length);
});
test("infants cannot be left without an adult or senior", () => {
  let state = fixture();
  state = tripReducer(state, { type: "travelers", key: "infant", value: 1 });
  state = tripReducer(state, { type: "travelers", key: "adultMale", value: 0 });
  const rejected = tripReducer(state, {
    type: "travelers",
    key: "adultFemale",
    value: 0,
  });
  assert.equal(rejected.configuration.travelers.adultFemale, 1);
  assert.match(rejected.notice, /成年/);
});
test("estimated adult subtotal scales, unknown lodging and extras are not fabricated", () => {
  const state = fixture();
  const a = detailDaySummary(state, 1, detailRailItems(state, 1));
  const more = tripReducer(state, {
    type: "travelers",
    key: "adultMale",
    value: 3,
  });
  const b = detailDaySummary(more, 1, detailRailItems(more, 1));
  assert.equal(b.expenses.total, a.expenses.total * 2);
  assert.equal(b.expenses.lodging, 0);
  assert.equal(b.expenses.parkingHighway, 0);
  assert.equal(b.expenses.other, 0);
});
test("quick preference and traveler draft commit both appear in replan count", () => {
  const state = fixture();
  let draft = tripReducer(state, {
    type: "travelers",
    key: "seniors",
    value: 1,
  });
  draft = tripReducer(draft, {
    type: "preference",
    group: "sights",
    quick: ["历史文化"],
  });
  assert.equal(state.configuration.travelers.seniors, 0);
  const applied = tripReducer(state, {
    type: "saveSettings",
    configuration: draft.configuration,
  });
  assert.ok(pendingSettingsCount(applied) >= 2);
  assert.equal(applied.plans, state.plans);
});
