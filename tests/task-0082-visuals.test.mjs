import assert from "node:assert/strict";
import test from "node:test";
import {
  landmarkKey,
  isLandmark,
  travelBubbles,
  warmMapStyle,
} from "../src/features/planner/map/map-visuals.ts";
import {
  plannerMockPlans,
  initialPlannerSettings,
} from "../src/features/planner/data/planner-mock-data.ts";
import { makePlannerCatalog } from "../src/features/planner/data/planner-catalog.ts";
import {
  makeTripState,
  currentPlan,
  mapView,
  tripReducer,
} from "../src/features/planner/model/trip-model.ts";
const { places, areas } = makePlannerCatalog(plannerMockPlans);
const state = makeTripState(
  plannerMockPlans,
  places,
  areas,
  initialPlannerSettings,
);
test("local landmark artwork maps familiar locations without remote photos", () => {
  assert.equal(landmarkKey("东京晴空塔"), "tower");
  assert.equal(landmarkKey("浅草寺"), "temple");
  assert.equal(landmarkKey("富士山"), "mountain");
  assert.equal(landmarkKey("河口湖"), "lake");
  assert.equal(
    isLandmark({ type: "attraction", tripStatus: "recommended" }),
    false,
  );
  assert.equal(isLandmark({ type: "city", tripStatus: "selected" }), true);
});
test("travel capsules use existing mock labels without changing state or route geometry", () => {
  const view = mapView(state),
    before = JSON.stringify(view);
  const hints = Object.fromEntries(
    currentPlan(state)
      .items.filter((i) => i.next)
      .map((i) => [i.id, i.next]),
  );
  const bubbles = travelBubbles(view, hints);
  assert.ok(bubbles.length > 0 && bubbles.length <= 3);
  for (const b of bubbles) {
    assert.ok(Object.values(hints).some((s) => `${s} · 示例` === b.label));
    assert.equal(b.coordinates.length, 2);
  }
  assert.equal(JSON.stringify(view), before);
  assert.deepEqual(travelBubbles(view, {}), []);
  const all = mapView(
    tripReducer(state, { type: "range", mode: "all", start: 1 }),
  );
  assert.deepEqual(travelBubbles(all, hints), []); // No invented intercity timing.
});
test("map warmth only adjusts existing base styling, not route data", () => {
  const calls = [];
  warmMapStyle({
    getStyle: () => ({
      layers: [
        { id: "background", type: "background" },
        { id: "water", type: "fill" },
        { id: "landuse", type: "fill" },
        { id: "building", type: "fill" },
        { id: "road-street", type: "line" },
        { id: "poi-label", type: "symbol" },
        { id: "route-selected", type: "line" },
      ],
    }),
    setPaintProperty: (...a) => calls.push(a),
    setLayoutProperty: (...a) => calls.push(a),
  });
  assert.ok(calls.some((a) => a[0] === "water" && a[2] === "#cbdcdb"));
  assert.ok(calls.some((a) => a[0] === "poi-label" && a[2] === "none"));
  assert.ok(!calls.some((a) => a[0] === "route-selected"));
});
