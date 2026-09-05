import test from "node:test";
import assert from "node:assert/strict";
import {
  plannerMockPlans,
  initialPlannerSettings,
} from "../src/features/planner/data/planner-mock-data.ts";
import { makePlannerCatalog } from "../src/features/planner/data/planner-catalog.ts";
import {
  makeTripState,
  tripReducer,
  currentPlan,
  changeTripDates,
  confirmedStay,
  visibleAreas,
  mapObjectType,
  mapView,
  dayTimeBand,
  timeBandPosition,
  pendingItems,
  isoDay,
} from "../src/features/planner/model/trip-model.ts";
import {
  preferenceDefinitions,
  budgetLabels,
  paceLabels,
} from "../src/features/planner/data/planner-preferences.ts";
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("four independent traveler categories preserve siblings, preferences and plans", () => {
  const before = fixture();
  let state = tripReducer(before, {
    type: "travelers",
    key: "child",
    value: 2,
  });
  assert.deepEqual(state.configuration.travelers, {
    adultMale: 1,
    adultFemale: 1,
    child: 2,
    infant: 0,
  });
  assert.equal(state.plans, before.plans);
  assert.match(state.settings.travelers, /儿童 2/);
  assert.equal(
    tripReducer(state, { type: "travelers", key: "child", value: -1 }),
    state,
  );
  assert.equal(
    tripReducer(state, { type: "travelers", key: "child", value: 1.5 }),
    state,
  );
});
test("all three preference levels and nine advanced sections use v0.3 vocabulary", () => {
  assert.equal(Object.keys(preferenceDefinitions).length, 12);
  assert.equal(preferenceDefinitions.sights.quick.length, 13);
  assert.equal(preferenceDefinitions.food.quick.length, 12);
  assert.equal(preferenceDefinitions.stay.quick.length, 12);
  assert.ok(preferenceDefinitions.food.details.includes("过敏 / 忌口"));
  assert.ok(preferenceDefinitions.stay.details.includes("到车站最大步行时间"));
  let state = fixture();
  const items = currentPlan(state).items;
  state = tripReducer(state, {
    type: "preference",
    group: "sights",
    quick: ["摄影", "历史文化"],
  });
  state = tripReducer(state, {
    type: "preference",
    group: "sights",
    detail: { key: "必去", value: "浅草寺" },
  });
  state = tripReducer(state, {
    type: "preference",
    group: "constraints",
    detail: { key: "不允许AI自动删除", value: "是" },
  });
  state = tripReducer(state, { type: "plan", id: state.plans[1].id });
  state = tripReducer(state, { type: "replan" });
  state = tripReducer(state, { type: "plan", id: state.plans[0].id });
  assert.equal(state.configuration.preferences.sights.details.必去, "浅草寺");
  assert.deepEqual(currentPlan(state).items, items);
  assert.deepEqual(budgetLabels, ["节省", "中等", "宽松", "高预算"]);
  assert.equal(paceLabels.length, 5);
  for (const [key, value] of [
    ["budget", 3],
    ["pace", 4],
  ]) {
    state = tripReducer(state, { type: "level", key, value });
    assert.equal(state.configuration[key], value);
  }
  assert.equal(
    tripReducer(state, { type: "level", key: "budget", value: 4 }),
    state,
  );
});
test("date extension adds empty days, preserves all bookings and clamps valid windows", () => {
  const before = fixture(),
    state = changeTripDates(
      before,
      before.settings.startDate,
      isoDay(before.settings.startDate, 9),
    );
  assert.equal(currentPlan(state).days.length, 9);
  assert.deepEqual(currentPlan(state).items, currentPlan(before).items);
  assert.equal(currentPlan(state).days[8].title, "自由安排（未生成路线）");
  const window = tripReducer(state, {
    type: "range",
    mode: "threeDays",
    start: 9,
  });
  assert.equal(window.ui.threeDayStart, 7);
  assert.equal(
    state.configuration.returnDate,
    isoDay(before.settings.startDate, 9),
  );
});
test("invalid, reversed, shortened and protected shifted dates reject atomically", () => {
  const state = fixture();
  for (const [a, b] of [
    ["2026-02-30", "2026-03-04"],
    ["2026-04-15", "2026-04-10"],
    [state.settings.startDate, state.settings.startDate],
    ["2026-05-01", "2026-05-03"],
  ]) {
    const next = changeTripDates(state, a, b);
    assert.equal(next.plans, state.plans);
    assert.equal(next.configuration, state.configuration);
    assert.equal(next.settings, state.settings);
    assert.ok(next.notice);
  }
  const unlocked = {
    ...state,
    plans: state.plans.map((p) => ({
      ...p,
      items: p.items.map((i) => ({
        ...i,
        fixedTime: false,
        locked: false,
        reservationStatus: "not_required",
      })),
    })),
  };
  const moved = changeTripDates(unlocked, "2028-02-28", "2028-03-01");
  assert.equal(
    currentPlan(moved).items.find((i) => i.day === 2).date,
    "2028-02-29",
  );
});
test("dates cannot trim a multi-night checkout, and add cannot overrun return day", () => {
  let state = fixture();
  state = changeTripDates(
    state,
    state.settings.startDate,
    isoDay(state.settings.startDate, 5),
  );
  state = tripReducer(state, {
    type: "add",
    placeId: "hotelArea-1-1",
    day: 1,
    reservation: true,
    nights: 4,
  });
  const next = changeTripDates(
    state,
    state.settings.startDate,
    isoDay(state.settings.startDate, 4),
  );
  assert.equal(next.plans, state.plans);
  assert.match(next.notice, /退房/);
  const invalid = tripReducer(fixture(), {
    type: "add",
    placeId: "hotelArea-1-1",
    day: 1,
    reservation: true,
    nights: 3,
  });
  assert.equal(
    currentPlan(invalid).items.some((i) => i.placeId === "hotelArea-1-1"),
    false,
  );
});
test("confirmed nights hide only the matching area, reuse one item and anchor next day", () => {
  let state = fixture();
  state = tripReducer(state, {
    type: "add",
    placeId: "hotelArea-1-1",
    day: 1,
    reservation: true,
    nights: 1,
  });
  let item = currentPlan(state).items.find(
    (i) => i.placeId === "hotelArea-1-1",
  );
  const count = pendingItems(currentPlan(state)).length;
  assert.ok(visibleAreas(state).some((a) => a.id === "hotelArea-1"));
  state = tripReducer(state, {
    type: "provider",
    id: item.id,
    providerId: state.places.find((p) => p.id === item.placeId)
      .bookingOptions[0].providerId,
  });
  state = tripReducer(state, {
    type: "complete",
    id: item.id,
    time: item.startTime,
  });
  assert.equal(pendingItems(currentPlan(state)).length, count - 1);
  assert.equal(mapObjectType(state, item.placeId), "confirmed-stay-point");
  assert.equal(
    visibleAreas(state).some((a) => a.id === "hotelArea-1"),
    false,
  );
  assert.ok(visibleAreas(state).some((a) => a.id === "hotelArea-2"));
  state = tripReducer(state, { type: "range", mode: "day", start: 2 });
  assert.equal(confirmedStay(currentPlan(state), 1).id, item.id);
  assert.deepEqual(
    mapView(state).routes.find((r) => r.id === "day-2").coordinates[0],
    state.places.find((p) => p.id === item.placeId).coordinates,
  );
});
test("checkout day retains the confirmed hotel anchor even before a route exists", () => {
  let state = fixture();
  state = changeTripDates(
    state,
    state.settings.startDate,
    isoDay(state.settings.startDate, 4),
  );
  state = tripReducer(state, {
    type: "add",
    placeId: "hotelArea-1-1",
    day: 1,
    nights: 3,
    reservation: true,
  });
  const item = currentPlan(state).items.find(
    (i) => i.placeId === "hotelArea-1-1",
  );
  state = tripReducer(state, {
    type: "provider",
    id: item.id,
    providerId: state.places.find((p) => p.id === item.placeId)
      .bookingOptions[0].providerId,
  });
  state = tripReducer(state, {
    type: "complete",
    id: item.id,
    time: item.startTime,
  });
  state = tripReducer(state, { type: "range", mode: "day", start: 4 });
  const view = mapView(state);
  assert.ok(
    view.places.some(
      (p) => p.tripItemId === item.id && p.label.includes("D4 出发"),
    ),
  );
  assert.equal(
    view.routes.some((r) => r.id === "day-4"),
    false,
  );
  assert.equal(
    currentPlan(state).items.filter((i) => i.placeId === item.placeId).length,
    1,
  );
});
test("map object taxonomy covers seven types and no business change for alternatives", () => {
  let state = fixture();
  assert.equal(mapObjectType(state, "hotelArea-1"), "recommended-stay-area");
  assert.equal(mapObjectType(state, "foodArea-1"), "recommended-dining-area");
  const plan = currentPlan(state),
    attraction = plan.items.find((i) => i.type === "attraction"),
    transport = plan.items.find((i) => i.type === "transport");
  assert.equal(mapObjectType(state, attraction.placeId), "itinerary-point");
  assert.equal(mapObjectType(state, transport.placeId), "transport-node");
  const alternative = state.places.find((p) => p.id.startsWith("alternative-"));
  assert.equal(mapObjectType(state, alternative.id), "recommended-poi");
  state = tripReducer(state, { type: "alternative", id: alternative.id });
  assert.deepEqual(currentPlan(state).items, plan.items);
  assert.ok(state.configuration.alternatives.includes(alternative.id));
  const restaurant = plan.items.find((i) => i.type === "restaurant");
  const changed = {
    ...state,
    plans: state.plans.map((p) => ({
      ...p,
      items: p.items.map((i) =>
        i.id === restaurant.id ? { ...i, reservationStatus: "booked" } : i,
      ),
    })),
  };
  assert.equal(
    mapObjectType(changed, restaurant.placeId),
    "confirmed-restaurant-point",
  );
});
test("time widths use actual end minus start, not catalog duration; gaps and movement preserved", () => {
  const state = fixture(),
    plan = currentPlan(state),
    original = plan.items.find((i) => i.day === 1);
  const item = (id, startTime, endTime, next) => ({
    ...original,
    type: "attraction",
    id,
    day: 1,
    endDay: 1,
    startTime,
    endTime,
    next,
  });
  const edited = {
    ...plan,
    items: [
      item("a", "08:00", "09:00", "步行 · 15 分"),
      item("b", "10:00", "12:00"),
    ],
  };
  const band = dayTimeBand(edited, 1);
  assert.equal(band.start, 480);
  assert.equal(band.end, 720);
  assert.equal(band.activity, 180);
  assert.equal(band.movement, 15);
  assert.equal(band.walking, 15);
  assert.deepEqual(timeBandPosition(480, 540, 480, 720), {
    left: "0%",
    width: "25%",
  });
  assert.deepEqual(timeBandPosition(600, 720, 480, 720), {
    left: "50%",
    width: "50%",
  });
  assert.equal(band.segments.find((s) => s.kind === "movement").end, 555); // The 45-minute gap is real.
});
test("three parallel days share a common axis: 09:00 is right of 08:00", () => {
  const plan = currentPlan(fixture()),
    template = plan.items[0];
  const edited = {
    ...plan,
    items: [1, 2, 3].map((day) => ({
      ...template,
      id: String(day),
      day,
      endDay: day,
      startTime: day === 1 ? "08:00" : "09:00",
      endTime: "12:00",
      next: undefined,
    })),
  };
  const bands = [1, 2, 3].map((day) => dayTimeBand(edited, day)),
    start = Math.min(...bands.map((b) => b.start)),
    end = Math.max(...bands.map((b) => b.end));
  assert.equal(
    timeBandPosition(bands[0].start, bands[0].end, start, end).left,
    "0%",
  );
  assert.equal(
    timeBandPosition(bands[1].start, bands[1].end, start, end).left,
    "25%",
  );
});
test("transport conflict is flagged without faking a shorter travel duration", () => {
  const plan = currentPlan(fixture()),
    original = plan.items[0];
  const edited = {
    ...plan,
    items: [
      {
        ...original,
        id: "a",
        day: 1,
        endDay: 1,
        startTime: "08:00",
        endTime: "09:00",
        next: "电车 · 90 分",
      },
      {
        ...original,
        id: "b",
        day: 1,
        endDay: 1,
        startTime: "09:30",
        endTime: "10:00",
        next: undefined,
      },
    ],
  };
  const band = dayTimeBand(edited, 1);
  assert.equal(band.segments.find((s) => s.kind === "movement").end, 630);
  assert.equal(band.intensity, "较紧");
  assert.match(band.suggestion, /本地规则/);
  assert.equal(dayTimeBand({ ...plan, items: [] }, 1).segments.length, 0);
});
