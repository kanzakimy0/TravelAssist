import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan } =
  await import("../src/features/planner/model/trip-model.ts");
const {
  detailRailItems,
  detailMapView,
  emptyDetailDraft,
  validDetailLocation,
} = await import("../src/features/planner/model/detail-workspace.ts");
const { overviewEntries, overviewTone, withDraftMapPlaces, makeConflictTest } =
  await import("../src/features/planner/model/detail-overview.ts");
const { tripSnapshot, parseSavedTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const fixture = () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
};
test("overview includes every actual item and missing meals/stay in chronological order", () => {
  const state = fixture();
  const items = detailRailItems(state, 1);
  const entries = overviewEntries(items, 1, 3);
  assert.deepEqual(
    entries.map((i) => i.time),
    entries.map((i) => i.time).sort(),
  );
  for (const item of items)
    assert.ok(entries.some((i) => i.item?.id === item.id));
  for (const label of ["早餐", "午餐", "晚餐", "住宿"])
    assert.ok(entries.some((i) => i.title.includes(label)));
  assert.equal(
    overviewEntries([], 3, 3).filter((i) => i.missing === "hotel").length,
    0,
  );
});
test("overview green requires all normal; missing booking, warning and conflicts retain distinct priority", () => {
  assert.equal(overviewTone([{ tone: "normal" }]), "normal");
  assert.equal(
    overviewTone([{ tone: "normal" }, { tone: "unknown" }]),
    "unknown",
  );
  assert.equal(
    overviewTone([{ tone: "unknown" }, { tone: "warning" }]),
    "warning",
  );
  assert.equal(overviewTone([{ tone: "warning" }, { tone: "error" }]), "error");
});
test("location boundary rejects missing, nonfinite, out-of-range and incomplete catalog points", () => {
  const location = {
    source: "manual",
    coordinates: [139.7, 35.6],
    label: "手动项目",
  };
  assert.ok(validDetailLocation(location));
  for (const bad of [
    null,
    {},
    { ...location, source: "provider" },
    { ...location, coordinates: [181, 35] },
    { ...location, coordinates: [1, 91] },
    { ...location, coordinates: [NaN, 35] },
    { ...location, source: "catalog" },
  ])
    assert.equal(validDetailLocation(bad), false);
});
test("mapped drafts add selectable pins and camera focus without fabricating route geometry", () => {
  const state = fixture();
  const view = detailMapView(state, 1);
  const draft = {
    id: "local",
    day: 1,
    type: "attraction",
    title: "坐标测试",
    startTime: "06:00",
    endTime: "06:20",
    note: "",
    location: { source: "manual", coordinates: [139, 35], label: "测试地点" },
  };
  const mapped = withDraftMapPlaces(
    view,
    [draft, { ...draft, id: "without", location: undefined }],
    "local",
  );
  assert.equal(mapped.places.length, view.places.length + 1);
  assert.equal(mapped.places.at(-1).tripItemId, draft.id);
  assert.equal(mapped.selectedTripItemId, draft.id);
  assert.deepEqual(mapped.focus, [139, 35]);
  assert.equal(mapped.routes, view.routes);
  assert.equal(
    mapped.key,
    withDraftMapPlaces(view, [draft], null).key,
    "selecting a draft pin must focus, not refit the whole map",
  );
});
test("manual and catalog location survive saved browser snapshot, invalid location is rejected", () => {
  const state = fixture();
  const place = state.places[0];
  for (const location of [
    { source: "manual", coordinates: [139, 35], label: "manual" },
    {
      source: "catalog",
      coordinates: place.coordinates,
      label: place.name,
      placeId: place.id,
    },
  ]) {
    const draft = {
      ...emptyDetailDraft(),
      items: [
        {
          id: "local",
          day: 1,
          title: "mapped",
          type: "attraction",
          note: "",
          startTime: "06:00",
          endTime: "06:30",
          location,
        },
      ],
    };
    const saved = {
      version: 1,
      savedAt: new Date().toISOString(),
      snapshot: tripSnapshot(state, draft),
    };
    assert.deepEqual(
      parseSavedTrip(JSON.stringify(saved), state).snapshot.draft.items[0]
        .location,
      location,
    );
    saved.snapshot.draft.items[0].location.coordinates = [999, 999];
    assert.equal(parseSavedTrip(JSON.stringify(saved), state), null);
  }
});
test("explicit removable conflict fixture makes both real and test rows red; removing restores original status", () => {
  const state = fixture();
  const original = detailRailItems(state, 1);
  const before = JSON.stringify(currentPlan(state));
  const item = makeConflictTest(original, 1, "test-local");
  assert.match(item.title, /^\[测试\]/);
  const tested = detailRailItems(state, 1, [item]);
  assert.equal(tested.find((i) => i.id === item.id).aiStatus, "error");
  assert.ok(tested.filter((i) => i.aiStatus === "error").length >= 2);
  assert.deepEqual(detailRailItems(state, 1, []), original);
  assert.equal(JSON.stringify(currentPlan(state)), before);
});
