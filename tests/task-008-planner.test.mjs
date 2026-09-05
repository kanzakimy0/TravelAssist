import assert from "node:assert/strict";
import test from "node:test";
import {
  threeDayWindows,
  visibleDays,
  plannerReducer,
  initialPlannerState,
  mapBounds,
  dateForDay,
} from "../src/features/planner/model/planner-state.ts";
import { plannerMockPlans } from "../src/features/planner/data/planner-mock-data.ts";

test("five-day fixture has exactly Day 1–3, 2–4, 3–5 windows", () => {
  assert.deepEqual(threeDayWindows(5), [
    { start: 1, end: 3 },
    { start: 2, end: 4 },
    { start: 3, end: 5 },
  ]);
  const fixture = Array.from({ length: 5 }, (_, i) => ({
    ...plannerMockPlans[0].days[0],
    day: i + 1,
  }));
  for (const { start, end } of threeDayWindows(5)) {
    assert.deepEqual(
      visibleDays(fixture, {
        ...initialPlannerState,
        rangeMode: "threeDays",
        threeDayStart: start,
      }).map((day) => day.day),
      [start, start + 1, end],
    );
  }
});
test("short trips cannot generate invalid trailing windows", () => {
  for (const total of [0, 1, 2]) assert.deepEqual(threeDayWindows(total), []);
  assert.deepEqual(threeDayWindows(3), [{ start: 1, end: 3 }]);
  assert.deepEqual(
    plannerReducer(initialPlannerState, {
      type: "range",
      mode: "threeDays",
      totalDays: 2,
    }),
    initialPlannerState,
  );
});
test("one day, three days, and all views share the same plan data", () => {
  const days = plannerMockPlans[0].days;
  let state = plannerReducer(initialPlannerState, {
    type: "range",
    mode: "day",
    start: 2,
    totalDays: 3,
  });
  assert.deepEqual(visibleDays(days, state), [days[1]]);
  state = plannerReducer(state, {
    type: "range",
    mode: "threeDays",
    start: 99,
    totalDays: 3,
  });
  assert.equal(state.threeDayStart, 1);
  assert.deepEqual(visibleDays(days, state), days);
  state = plannerReducer(state, { type: "range", mode: "all", totalDays: 3 });
  assert.deepEqual(visibleDays(days, state), days);
});
test("map and timeline selection use one selectedStopId and switch to itinerary", () => {
  const state = plannerReducer(
    { ...initialPlannerState, activeBottomTab: "weather" },
    { type: "stop", id: "classic-lake" },
  );
  assert.equal(state.selectedStopId, "classic-lake");
  assert.equal(state.activeBottomTab, "itinerary");
});
test("plan switch clears stale stop but preserves range and panel state", () => {
  const state = plannerReducer(
    {
      ...initialPlannerState,
      rangeMode: "day",
      selectedDay: 2,
      selectedStopId: "classic-lake",
      isMoreSettingsOpen: true,
    },
    { type: "plan", plan: plannerMockPlans[1] },
  );
  assert.equal(state.currentPlanId, "depth");
  assert.equal(state.selectedStopId, null);
  assert.equal(state.selectedDay, 2);
  assert.equal(state.isMoreSettingsOpen, true);
});
test("range change clears out-of-range highlights and clamps invalid days", () => {
  const state = plannerReducer(
    { ...initialPlannerState, selectedStopId: "classic-arrival" },
    { type: "range", mode: "day", start: 99, totalDays: 3 },
  );
  assert.equal(state.selectedDay, 3);
  assert.equal(state.selectedStopId, null);
});
test("map bounds include every visible point with space for controls", () => {
  for (const plan of plannerMockPlans) {
    for (const selected of [[plan.days[0]], [plan.days[1]], plan.days]) {
      const bounds = mapBounds(selected);
      for (const stop of selected.flatMap((day) => day.stops)) {
        assert.ok(stop.x > bounds.x && stop.x < bounds.x + bounds.width);
        assert.ok(stop.y > bounds.y && stop.y < bounds.y + bounds.height);
      }
    }
  }
});
test("three plans have distinct route geometry and nonempty execution tabs", () => {
  assert.equal(
    new Set(
      plannerMockPlans.map((plan) =>
        JSON.stringify(
          plan.days.map((day) => day.stops.map(({ x, y }) => [x, y])),
        ),
      ),
    ).size,
    3,
  );
  const ids = plannerMockPlans.flatMap((plan) =>
    plan.days.flatMap((day) => day.stops.map((stop) => stop.id)),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const plan of plannerMockPlans)
    for (const day of plan.days) {
      for (const tab of [
        "movement",
        "booking",
        "weather",
        "stayFood",
        "details",
      ])
        assert.ok(day[tab].length > 0, `${plan.id} Day ${day.day} ${tab}`);
    }
});
test("edited dates cross month and leap-year boundaries without timezone drift", () => {
  assert.equal(dateForDay("2028-02-28", 3), "3月1日");
  assert.equal(dateForDay("2027-12-31", 2), "1月1日");
});
