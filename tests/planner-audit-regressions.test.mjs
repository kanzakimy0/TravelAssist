import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const {
  makeTripState,
  tripReducer,
  currentPlan,
  changeTripDates,
  isoDay,
  minutes,
} = await import("../src/features/planner/model/trip-model.ts");
const { emptyDetailDraft, detailRailItems } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { tripSnapshot, parseSavedTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const { restoreRecommendation, recommendationModified } =
  await import("../src/features/planner/model/recommendation-actions.ts");
const { detailTimeSuggestion, acceptDetailTimeSuggestion } =
  await import("../src/features/planner/model/detail-card-actions.ts");
const { plannerMovementLegs } =
  await import("../src/features/planner/model/planner-route.ts");
const { preparationIssues, emptyPreparation } =
  await import("../src/features/planner/model/trip-preparation.ts");
const { missingArrangements } =
  await import("../src/features/planner/model/required-arrangements.ts");
const { createBaseGeographyToggle } =
  await import("../src/features/planner/map/base-geography.ts");
const { consumePlannerPlanSelection, PLAN_SELECTION_BRIDGE_KEY } =
  await import("../src/features/navigation/main-flow-navigation.ts");
function seed() {
  const c = makePlannerCatalog(plannerMockPlans);
  return makeTripState(
    plannerMockPlans,
    c.places,
    c.areas,
    initialPlannerSettings,
  );
}
test("entering Detail never resets the saved baseline; wizard restore has a single owner", () => {
  const hook = readFileSync(
    new URL(
      "../src/features/planner/components/use-browser-trip.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const page = readFileSync(
    new URL(
      "../src/features/planner/components/planner-page.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    hook.split("function enterDetail")[1].split("function openSaved")[0],
    /setBaseline\(/,
  );
  assert.doesNotMatch(page, /readPlannerPlanSelection/);
  assert.match(hook, /incomingSnapshot\.current/);
  assert.match(
    hook,
    /tripSnapshot\(\s*initializeHotelEndpoints\(chosen, planId\)/,
  );
  assert.match(page, /browserTrip\.entryFromWizard/);
});
test("wizard intent is consumed once, rather than replaying on each Planner visit", () => {
  const data = new Map([[PLAN_SELECTION_BRIDGE_KEY, "depth"]]);
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (k) => data.get(k) ?? null,
      removeItem: (k) => data.delete(k),
    },
  };
  try {
    assert.equal(consumePlannerPlanSelection(), "depth");
    assert.equal(consumePlannerPlanSelection(), null);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
for (const length of [3, 4, 7, 60])
  test(`restore all recommendations retains ${length} dates and remains saveable`, () => {
    let state = seed();
    state = changeTripDates(
      state,
      state.settings.startDate,
      isoDay(state.settings.startDate, length),
    );
    assert.equal(currentPlan(state).days.length, length);
    for (const id of state.plans.map((p) => p.id)) {
      const other = state.plans.filter((p) => p.id !== id);
      state = restoreRecommendation(state, id);
      assert.ok(other.every((p) => state.plans.includes(p)));
      assert.ok(state.plans.every((p) => p.days.length === length));
      assert.equal(recommendationModified(state, id), false);
      assert.ok(
        parseSavedTrip(
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            snapshot: tripSnapshot(state, emptyDetailDraft()),
          }),
          seed(),
        ),
      );
    }
  });
test("unmodified fixture traffic conflicts agree between Movement and Detail", () => {
  const state = seed(),
    items = detailRailItems(state, 1, [], []);
  const leg = plannerMovementLegs(currentPlan(state), 1).find(
    (l) => l.to.id === "classic-asakusa",
  );
  assert.ok(leg.conflict);
  assert.equal(leg.edited, false);
  const item = items.find((i) => i.id === leg.to.id);
  assert.equal(item.aiStatus, "error");
  const suggestion = detailTimeSuggestion(state, item, items);
  assert.ok(suggestion);
  assert.ok(
    minutes(suggestion.startTime) >=
      minutes(leg.from.endTime) + leg.duration + leg.buffer,
  );
  const result = acceptDetailTimeSuggestion(
    state,
    emptyDetailDraft(),
    1,
    item.id,
  );
  assert.ok(result.action);
  const next = tripReducer(state, result.action),
    rail = detailRailItems(next, 1, [], []);
  for (const conflict of plannerMovementLegs(currentPlan(next), 1).filter(
    (l) => l.conflict,
  ))
    assert.equal(rail.find((i) => i.id === conflict.to.id)?.aiStatus, "error");
});
test("cancellation retains protection until a separate confirmed release", () => {
  const initial = seed(),
    id = "classic-skytree";
  const action = { type: "releaseCancelledSchedule", id, confirmed: true };
  assert.equal(tripReducer(initial, action), initial);
  const cancelled = tripReducer(initial, {
    type: "recordCancellation",
    id,
    externallyCancelled: true,
  });
  const record = currentPlan(cancelled).items.find((i) => i.id === id);
  assert.equal(record.reservationStatus, "cancelled");
  assert.equal(record.fixedTime, true);
  assert.equal(
    tripReducer(cancelled, { ...action, confirmed: false }),
    cancelled,
  );
  const released = tripReducer(cancelled, action);
  const free = currentPlan(released).items.find((i) => i.id === id);
  assert.equal(free.fixedTime, false);
  assert.equal(free.locked, false);
  assert.equal(free.reservationStatus, "cancelled");
  const edited = tripReducer(released, {
    type: "detailEdit",
    id,
    title: free.title,
    startTime: "14:10",
    endTime: "15:40",
  });
  assert.equal(
    currentPlan(edited).items.find((i) => i.id === id).startTime,
    "14:10",
  );
});
test("completion includes every empty meal/stay slot with a navigable target", () => {
  const state = seed(),
    items = currentPlan(state).days.flatMap((d) =>
      detailRailItems(state, d.day, [], []),
    );
  const missing = currentPlan(state).days.flatMap((d) =>
    missingArrangements(state, d.day, items).map((s) => ({ day: d.day, ...s })),
  );
  const issues = preparationIssues(state, items, {
    ...emptyPreparation(),
    noFlight: true,
  }).filter((i) => i.arrangement);
  assert.equal(issues.length, missing.length);
  assert.ok(
    issues.some(
      (i) => i.arrangement.day === 1 && i.arrangement.slot === "breakfast",
    ),
  );
  assert.ok(
    issues.some(
      (i) => i.arrangement.day === 1 && i.arrangement.slot === "dinner",
    ),
  );
  assert.ok(
    !issues.some(
      (i) => i.arrangement.day === 3 && i.arrangement.kind === "hotel",
    ),
  );
  const added = {
    ...items.find((i) => i.type === "restaurant"),
    id: "new-breakfast",
    day: 1,
    planningSlot: "breakfast",
    startTime: "07:00",
    endTime: "07:45",
  };
  assert.ok(
    !missingArrangements(state, 1, [...items, added]).some(
      (s) => s.slot === "breakfast",
    ),
  );
});
test("real map geography toggle preserves other layers and original hidden layers", () => {
  const visibility = new Map([["landcover-hidden", "none"]]);
  const calls = [];
  const map = {
    getStyle: () => ({
      layers: [
        { id: "water", type: "fill" },
        { id: "landuse", type: "fill" },
        { id: "landcover-hidden", type: "fill" },
        { id: "hill", type: "hillshade" },
        { id: "road", type: "line" },
        { id: "place-label", type: "symbol" },
        { id: "hotel-area", type: "fill" },
        { id: "route-selected", type: "line" },
      ],
    }),
    getLayoutProperty: (id) => visibility.get(id),
    setLayoutProperty: (id, property, value) => {
      calls.push([id, property, value]);
      visibility.set(id, value);
    },
  };
  const toggle = createBaseGeographyToggle(map);
  toggle(false);
  toggle(false);
  assert.equal(visibility.get("water"), "none");
  toggle(true);
  assert.equal(visibility.get("water"), "visible");
  assert.equal(visibility.get("landcover-hidden"), "none");
  assert.ok(
    calls.every(([id]) =>
      ["water", "landuse", "landcover-hidden", "hill"].includes(id),
    ),
  );
});
