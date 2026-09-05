import assert from "node:assert/strict";
import test from "node:test";
import {
  plannerMockPlans,
  initialPlannerSettings,
} from "../src/features/planner/data/planner-mock-data.ts";
import { makePlannerCatalog } from "../src/features/planner/data/planner-catalog.ts";
import {
  currentPlan,
  itemsForDay,
  makeTripState,
  mapView,
  pendingItems,
  presentationPlan,
  reservationLabel,
  tripReducer,
  timeConflicts,
} from "../src/features/planner/model/trip-model.ts";
import {
  bindMap,
  mapCollections,
  mountMapbox,
  plannerLayers,
  schematicLayout,
} from "../src/features/planner/map/map-provider.ts";

function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
function fiveDays() {
  const state = fixture(),
    plan = currentPlan(state);
  plan.days.push(
    ...[4, 5].map((day) => ({
      ...plan.days[0],
      day,
      city: `fixture-city-${day}`,
    })),
  );
  plan.items.push(
    ...[4, 5].flatMap((day) =>
      plan.items
        .filter((i) => i.day === 1)
        .map((i) => ({ ...i, id: `${i.id}-d${day}`, day, endDay: day })),
    ),
  );
  return state;
}
const add = (state, placeId, extras = {}) =>
  tripReducer(state, {
    type: "add",
    placeId,
    day: 1,
    reservation: true,
    ...extras,
  });
test("one-day contains every formal stop and exactly the two adjacent boundary legs", () => {
  const state = tripReducer(fiveDays(), {
    type: "range",
    mode: "day",
    start: 3,
  });
  const view = mapView(state);
  assert.deepEqual(
    view.routes
      .filter((r) => r.context)
      .map((r) => r.id)
      .sort(),
    ["context-2-3", "context-3-4"],
  );
  assert.deepEqual(
    view.routes.filter((r) => !r.context).map((r) => r.id),
    ["day-3"],
  );
  assert.deepEqual(
    view.places.filter((p) => p.tripItemId).map((p) => p.tripItemId),
    itemsForDay(currentPlan(state), 3).map((i) => i.id),
  );
  assert.ok(view.places.every((p) => p.day === 3));
  assert.equal(
    view.places.filter((p) => p.tripStatus === "recommended").length,
    3,
  );
});
test("three-day windows work on a five-day trip and never draw distant day routes or pins", () => {
  for (let start = 1; start <= 3; start++) {
    const state = tripReducer(fiveDays(), {
      type: "range",
      mode: "threeDays",
      start,
    });
    const view = mapView(state);
    assert.deepEqual(
      view.routes.filter((r) => r.id.startsWith("day-")).map((r) => r.day),
      [start, start + 1, start + 2],
    );
    assert.ok(view.places.every((p) => p.day >= start && p.day <= start + 2));
    assert.equal(
      view.routes.filter((r) => r.context).length,
      (start > 1 ? 1 : 0) + (start < 3 ? 1 : 0),
    );
    for (let day = start; day <= start + 2; day++)
      assert.ok(view.places.filter((p) => p.day === day).length <= 4);
  }
});
test("all-trip aggregates cities/nights and hides ordinary POIs, meals, areas and local legs", () => {
  const state = tripReducer(fixture(), { type: "range", mode: "all" });
  const view = mapView(state);
  assert.equal(view.places.filter((p) => p.type === "city").length, 3);
  assert.ok(view.places.every((p) => ["city", "transport"].includes(p.type)));
  assert.equal(view.areas.length, 0);
  assert.ok(view.routes.every((r) => !r.context && !r.id.startsWith("day-")));
  assert.ok(view.places.find((p) => p.name === "东京").label.includes("1晚"));
});
test("add reservation replaces the generic meal with one canonical TripItem immediately", () => {
  const before = fixture(),
    count = pendingItems(currentPlan(before)).length;
  const state = add(before, "foodArea-1-1"),
    plan = currentPlan(state);
  const item = plan.items.find((i) => i.placeId === "foodArea-1-1");
  assert.equal(item.id, "classic-lunch");
  assert.equal(item.title, "丸之内季节食堂");
  assert.equal(item.reservationStatus, "pending");
  assert.equal(pendingItems(plan).length, count + 1);
  assert.equal(
    presentationPlan(state).days[0].stops.find((s) => s.id === item.id).name,
    item.title,
  );
  assert.match(
    presentationPlan(state).days[0].booking.join(),
    /丸之内季节食堂.*待预约/,
  );
  assert.equal(
    mapView(state).places.find((p) => p.tripItemId === item.id)
      .reservationStatus,
    "pending",
  );
});
test("duplicate add is idempotent and cannot reset a completed booking", () => {
  let state = add(fixture(), "foodArea-1-1");
  const count = pendingItems(currentPlan(state)).length,
    id = state.ui.selectedTripItemId;
  state = add(state, "foodArea-1-1");
  assert.equal(pendingItems(currentPlan(state)).length, count);
  state = tripReducer(state, { type: "provider", id, providerId: "official" });
  state = tripReducer(state, { type: "complete", id, time: "19:00" });
  state = add(state, "foodArea-1-1");
  assert.equal(
    currentPlan(state).items.find((i) => i.id === id).reservationStatus,
    "booked",
  );
});
test("manual confirmation updates map, timeline, booking tab and derived count", () => {
  let state = add(fixture(), "foodArea-1-1");
  const id = state.ui.selectedTripItemId,
    count = pendingItems(currentPlan(state)).length;
  state = tripReducer(state, {
    type: "provider",
    id,
    providerId: "tablecheck",
  });
  assert.equal(pendingItems(currentPlan(state)).length, count);
  state = tripReducer(state, { type: "complete", id, time: "19:00" });
  const item = currentPlan(state).items.find((i) => i.id === id);
  assert.equal(item.reservationStatus, "booked");
  assert.equal(item.startTime, "19:00");
  assert.equal(item.fixedTime, true);
  assert.equal(pendingItems(currentPlan(state)).length, count - 1);
  assert.equal(
    mapView(state).places.find((p) => p.tripItemId === id).reservationStatus,
    "booked",
  );
  assert.match(presentationPlan(state).days[0].booking.join(), /19:00.*已预约/);
  assert.match(state.notice, /12:30 → 19:00/);
});
test("fixed times remain unchanged through replan, range changes and switching away/back", () => {
  let state = add(fixture(), "foodArea-1-1"),
    id = state.ui.selectedTripItemId;
  state = tripReducer(state, { type: "provider", id, providerId: "official" });
  state = tripReducer(state, { type: "complete", id, time: "19:00" });
  const original = structuredClone(currentPlan(state).items);
  state = tripReducer(state, { type: "replan" });
  state = tripReducer(state, { type: "range", mode: "all" });
  state = tripReducer(state, { type: "plan", id: "depth" });
  state = tripReducer(state, { type: "plan", id: "classic" });
  assert.deepEqual(currentPlan(state).items, original);
});
test("fixed booking conflict check includes earlier/later stop and travel buffer", () => {
  const state = fixture(),
    plan = currentPlan(state),
    item = plan.items.find((i) => i.id === "classic-lunch");
  assert.ok(timeConflicts(plan, item, "14:30").includes("东京晴空塔"));
  assert.ok(timeConflicts(plan, item, "09:50").includes("浅草寺"));
});
test("hotel areas and food areas have three canonical local recommendations each", () => {
  const state = fixture();
  assert.equal(state.areas.length, 6);
  for (const area of state.areas) {
    assert.equal(area.recommendationIds.length, 3);
    assert.deepEqual(area.polygon[0], area.polygon.at(-1));
    for (const id of area.recommendationIds)
      assert.equal(
        state.places.find((p) => p.id === id).type,
        area.type === "hotelArea" ? "hotel" : "restaurant",
      );
  }
});
test("a three-night hotel is one booking, displayed on every relevant night", () => {
  const state = add(fixture(), "hotelArea-1-1", { nights: 3 }),
    plan = currentPlan(state);
  const hotels = plan.items.filter((i) => i.type === "hotel");
  assert.equal(hotels.length, 1);
  assert.equal(hotels[0].endDay, 3);
  for (const day of [1, 2, 3])
    assert.equal(
      itemsForDay(plan, day).filter((i) => i.type === "hotel").length,
      1,
    );
  assert.equal(pendingItems(plan).filter((i) => i.type === "hotel").length, 1);
  const all = mapView(tripReducer(state, { type: "range", mode: "all" }));
  assert.match(all.places.find((p) => p.name === "东京").label, /3晚/);
  assert.match(all.places.find((p) => p.name === "河口湖").label, /0晚/);
});
test("map events and timeline use the same tripItemId", () => {
  let state = fixture();
  const point = mapView(state).places.find(
    (p) => p.tripItemId === "classic-asakusa",
  );
  state = tripReducer(state, { type: "select", id: point.tripItemId });
  assert.equal(state.ui.selectedTripItemId, "classic-asakusa");
  const collections = mapCollections(mapView(state));
  assert.equal(
    collections["planner-places"].features.find((f) => f.properties.selected)
      .properties.tripItemId,
    state.ui.selectedTripItemId,
  );
  const place = currentPlan(state).items.find((i) => i.id === point.tripItemId);
  state = tripReducer(state, { type: "inspect", id: place.placeId });
  assert.equal(state.ui.selectedTripItemId, point.tripItemId);
});
test("GeoJSON is a whitelisted view model without provider raw data", () => {
  const text = JSON.stringify(mapCollections(mapView(fixture())));
  for (const key of [
    "providerId",
    "bookingOptions",
    "cancellationSummary",
    "affiliate",
    "fixture:",
  ])
    assert.ok(!text.includes(key));
  const roles = plannerLayers.map((l) => l.id);
  for (const id of [
    "route-context",
    "route-selected",
    "hotel-area",
    "food-area",
    "attraction-pin",
    "hotel-pin",
    "restaurant-pin",
    "transport-pin",
    "reservation-status",
    "selected-feature",
  ])
    assert.ok(roles.includes(id));
  assert.equal(plannerLayers[0].paint["line-opacity"], 0.25);
  assert.equal(
    plannerLayers[0].paint["line-width"] / plannerLayers[1].paint["line-width"],
    0.64,
  );
});
test("missing or whitespace token returns fallback before importing/constructing Mapbox", async () => {
  let calls = 0;
  for (const token of [undefined, "", "  "])
    assert.equal(
      await mountMapbox(
        {},
        token,
        () => calls++,
        () => calls++,
      ),
      null,
    );
  assert.equal(calls, 0);
});
test("one map controller uses setData for range changes, reduced motion, and cleans up once", () => {
  const sources = new Map(),
    calls = { adds: 0, layers: 0, updates: 0, fits: [], ease: [], removed: 0 };
  const port = {
    addSource(id) {
      calls.adds++;
      sources.set(id, {
        setData() {
          calls.updates++;
        },
      });
    },
    addLayer() {
      calls.layers++;
    },
    getSource(id) {
      return sources.get(id);
    },
    fitBounds(b, o) {
      calls.fits.push(o);
    },
    easeTo(o) {
      calls.ease.push(o);
    },
    resize() {},
    remove() {
      calls.removed++;
    },
  };
  const controller = bindMap(port, () => true);
  let state = fixture();
  controller.update(mapView(state));
  state = tripReducer(state, { type: "range", mode: "threeDays", start: 1 });
  controller.update(mapView(state));
  state = tripReducer(state, { type: "select", id: "classic-lake" });
  controller.update(mapView(state));
  state = tripReducer(state, { type: "range", mode: "all" });
  controller.update(mapView(state));
  assert.equal(calls.adds, 3);
  assert.equal(calls.layers, plannerLayers.length);
  assert.equal(calls.updates, 9);
  assert.equal(calls.fits.length, 3);
  assert.ok(calls.fits.every((o) => o.duration === 0));
  assert.equal(calls.ease[0].duration, 0);
  controller.destroy();
  controller.destroy();
  controller.update(mapView(state));
  assert.equal(calls.removed, 1);
  assert.equal(calls.updates, 9);
});
test("provider selection is not an order and confirmation requires an allowed channel", () => {
  const state = add(fixture(), "foodArea-1-1"),
    id = state.ui.selectedTripItemId;
  assert.deepEqual(
    tripReducer(state, { type: "complete", id, time: "19:00" }),
    state,
  );
  assert.deepEqual(
    tripReducer(state, { type: "provider", id, providerId: "unknown" }),
    state,
  );
  const selected = tripReducer(state, {
    type: "provider",
    id,
    providerId: "official",
  });
  assert.equal(
    currentPlan(selected).items.find((i) => i.id === id).reservationStatus,
    "booking",
  );
  assert.match(selected.notice, /未跳转、未下单/);
});
test("locked/fixed appointments cannot be removed or implicitly replaced", () => {
  let state = fixture(),
    original = currentPlan(state).items;
  state = tripReducer(state, { type: "remove", id: "classic-skytree" });
  assert.deepEqual(currentPlan(state).items, original);
  state = add(state, "alternative-1-1", { replaceId: "classic-skytree" });
  assert.deepEqual(currentPlan(state).items, original);
});
test("all reservation status variants have a visible non-color label", () => {
  for (const status of [
    "not_required",
    "pending",
    "booking",
    "booked",
    "ticketed",
    "pay_on_site",
    "failed",
    "cancelled",
    "changed",
  ])
    assert.ok(reservationLabel({ type: "hotel", reservationStatus: status }));
});
test("range/focus changes retain active bottom tab and edited settings", () => {
  let state = tripReducer(fixture(), {
    type: "setting",
    key: "food",
    value: "素食",
  });
  state = tripReducer(state, {
    type: "ui",
    patch: { activeBottomTab: "weather" },
  });
  state = tripReducer(state, { type: "range", mode: "threeDays", start: 1 });
  state = tripReducer(state, { type: "focusDay", day: 2 });
  assert.equal(state.ui.rangeMode, "threeDays");
  assert.equal(state.ui.activeBottomTab, "weather");
  assert.equal(state.settings.food, "素食");
});

test("repeated city focus remains an explicit camera request with visible selected label", () => {
  let state = tripReducer(fixture(), { type: "range", mode: "all" });
  const before = state.ui.focusRevision;
  state = tripReducer(state, { type: "focusDay", day: 1 });
  assert.equal(state.ui.focusRevision, before + 1);
  assert.equal(
    mapView(state).places.find((p) => p.type === "city" && p.day === 1).focused,
    true,
  );
});
test("schematic labels do not overlap and remain readable on desktop and mobile", () => {
  for (const [width, height] of [
    [1200, 611],
    [1080, 611],
    [960, 536],
    [390, 784],
  ]) {
    const layout = schematicLayout(mapView(fixture()), width, height);
    for (let i = 0; i < layout.positions.length; i++)
      for (let j = i + 1; j < layout.positions.length; j++) {
        const a = layout.positions[i].label,
          b = layout.positions[j].label;
        assert.ok(
          Math.abs(a[0] - b[0]) >= 156 || Math.abs(a[1] - b[1]) >= 52,
          `${width}x${height}: ${i}/${j}`,
        );
      }
    for (const {
      label: [x, y],
    } of layout.positions)
      assert.ok(x >= 78 && x <= width - 78 && y >= 21 && y <= height - 31);
  }
});
