import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { mealTimeWarning } =
  await import("../src/features/planner/model/schedule-check.ts");
const { mealAreaChoices } =
  await import("../src/features/planner/model/meal-area-choices.ts");
const { selectedBookingOffer, selectBookingProviders } =
  await import("../src/features/planner/model/bulk-booking.ts");
const { mealSlotFor, makeTripState, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { detailRailItems } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { plannerTimeline } =
  await import("../src/features/planner/model/planner-timeline.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("each meal has its own recommendation purpose and route ordering", () => {
  const state = fixture();
  const lists = ["breakfast", "lunch", "dinner"].map((slot) =>
    mealAreaChoices(state, 1, slot),
  );
  for (const list of lists) assert.ok(list.length > 0 && list.length <= 3);
  assert.match(lists[0][0].reason, /早餐/);
  assert.match(lists[1][0].reason, /午餐/);
  assert.match(lists[2][0].reason, /晚餐/);
  assert.notDeepEqual(lists[0], lists[1]);
  assert.notDeepEqual(lists[1], lists[2]);
  for (const choice of lists.flat())
    assert.ok(
      state.places.some((p) => p.id === choice.id) ||
        state.areas.some((a) => a.id === choice.id),
    );
});
test("meal windows warn outside their boundaries without changing meal identity", () => {
  for (const [slot, good, bad] of [
    ["breakfast", "07:00", "12:00"],
    ["lunch", "12:00", "18:00"],
    ["dinner", "18:00", "12:00"],
  ]) {
    const item = {
      id: slot,
      title: slot,
      type: "restaurant",
      planningSlot: slot,
      startTime: good,
      endTime: "23:00",
    };
    assert.equal(mealTimeWarning(item), "");
    assert.match(
      mealTimeWarning({ ...item, startTime: bad }),
      /超出建议用餐时段/,
    );
    assert.equal(mealSlotFor(bad, slot), slot);
  }
  assert.equal(mealTimeWarning({ type: "attraction", startTime: "12:00" }), "");
});
test("dragged breakfast retains identity and shows a warning in Detail", () => {
  const state = fixture(),
    candidate = plannerTimeline(state, 1).reserve.find(
      (i) => i.planningSlot === "breakfast",
    );
  assert.ok(candidate);
  const next = tripReducer(state, {
    type: "timelineDrop",
    planId: state.ui.currentPlanId,
    day: 1,
    id: candidate.id,
    to: "planned",
    afterId: null,
    startMinute: 960,
  });
  const item = next.plans[0].items.find((i) => i.id === candidate.id);
  assert.equal(item.planningSlot, "breakfast");
  assert.match(mealTimeWarning(item), /早餐/);
  const detail = detailRailItems(next, 1).find((i) => i.id === item.id);
  assert.notEqual(detail.aiStatus, "normal");
});
test("explicit provider wins, no choice uses minimum price, missing quotes stay missing", () => {
  const row = {
    id: "hotel",
    offers: [
      { providerId: "booking", name: "Booking", price: 18000 },
      { providerId: "agoda", name: "Agoda", price: 12000 },
    ],
  };
  const review = { rows: [row, { id: "unknown", offers: [] }] };
  assert.equal(selectedBookingOffer(row).providerId, "agoda");
  const chosen = selectBookingProviders(review, { hotel: "booking" });
  assert.equal(selectedBookingOffer(chosen.rows[0]).providerId, "booking");
  assert.equal(selectedBookingOffer(chosen.rows[0]).price, 18000);
  for (const choices of [{}, { hotel: "" }, { hotel: "invalid" }])
    assert.equal(
      selectBookingProviders(review, choices).rows[0].selectedProviderId,
      "agoda",
    );
  assert.equal(selectedBookingOffer(chosen.rows[1]), undefined);
  assert.equal(row.selectedProviderId, undefined);
});
