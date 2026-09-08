import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const { plannerTimeline, routineSlotFor } =
  await import("../src/features/planner/model/planner-timeline.ts");
const { plannerMovementLegs } =
  await import("../src/features/planner/model/planner-route.ts");
const { secondaryPanelModel } =
  await import("../src/features/planner/model/secondary-panels.ts");
const { tripSnapshot, parseSavedTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
function seed() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("museum names are not outdoor impacts and photography paths are not indoor alternatives", () => {
  const s = seed();
  assert.ok(
    secondaryPanelModel(s).rows.every((r) =>
      r.outdoors.every((i) => !i.title.includes("博物馆")),
    ),
  );
  const path = s.places.find((p) => p.name === "北岸摄影步道");
  assert.ok(path);
  assert.ok(!path.tags.includes("雨天室内"));
});
function initialized() {
  const s = seed();
  return tripReducer(s, { type: "hotelEndpoints", planId: currentPlan(s).id });
}
test("hotel endpoints initialize once, share ordered movement IDs and preserve existing records", () => {
  const before = seed(),
    s = tripReducer(before, {
      type: "hotelEndpoints",
      planId: currentPlan(before).id,
    });
  for (const day of currentPlan(s).days) {
    const items = plannerTimeline(s, day.day).planned,
      legs = plannerMovementLegs(currentPlan(s), day.day);
    assert.ok(items.some((i) => routineSlotFor(i) === "departure"));
    assert.ok(items.some((i) => routineSlotFor(i) === "return"));
    assert.deepEqual(
      legs.map((l) => l.from.id),
      items.slice(0, -1).map((i) => i.id),
    );
    assert.deepEqual(
      legs.map((l) => l.to.id),
      items.slice(1).map((i) => i.id),
    );
  }
  for (const item of currentPlan(before).items) {
    const after = currentPlan(s).items.find((i) => i.id === item.id);
    assert.equal(after.startTime, item.startTime);
    assert.equal(after.reservationStatus, item.reservationStatus);
  }
  assert.equal(
    tripReducer(s, { type: "hotelEndpoints", planId: currentPlan(s).id }),
    s,
  );
});
test("moving an endpoint to reserve does not respawn it on tab switch, and survives save", () => {
  let s = initialized();
  const id = plannerTimeline(s, 1).planned.find(
      (i) => routineSlotFor(i) === "departure",
    ).id,
    planId = currentPlan(s).id;
  s = tripReducer(s, {
    type: "timelineDrop",
    planId,
    id,
    day: 1,
    to: "reserve",
    afterId: null,
  });
  assert.equal(tripReducer(s, { type: "hotelEndpoints", planId }), s);
  const raw = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot: tripSnapshot(s, emptyDetailDraft()),
  });
  assert.ok(parseSavedTrip(raw, seed()));
  assert.equal(
    plannerTimeline(s, 1).planned.some((i) => i.id === id),
    false,
  );
  assert.equal(
    plannerTimeline(s, 1).reserve.some((i) => i.id === id),
    true,
  );
});
test("all ranges derive only selected days and do not count known blank gaps as actual transport", () => {
  for (const [mode, start, expected] of [
    ["day", 2, [2]],
    ["threeDays", 1, [1, 2, 3]],
    ["all", 1, [1, 2, 3]],
  ]) {
    const s = tripReducer(initialized(), { type: "range", mode, start }),
      m = secondaryPanelModel(s);
    assert.deepEqual(
      m.rows.map((r) => r.day.day),
      expected,
    );
    assert.ok(
      m.tickets.every((i) => expected.includes(i.day) && i.reservationRequired),
    );
    for (const r of m.rows) {
      assert.equal(
        r.estimatedTravel,
        r.legs.reduce((n, l) => n + (l.duration ?? 0), 0),
      );
      assert.equal(r.mealSlots.length, 3);
    }
  }
});
test("unnecessary and cancelled entries disappear, unknown inventory does not hide a required item", () => {
  const s = initialized(),
    p = currentPlan(s);
  const target = p.items.find((i) =>
    ["attraction", "activity"].includes(i.type),
  );
  target.reservationRequired = false;
  assert.ok(!secondaryPanelModel(s).tickets.some((i) => i.id === target.id));
  target.reservationRequired = true;
  target.reservationStatus = "pending";
  s.places.find((i) => i.id === target.placeId).bookingOptions = [];
  assert.ok(secondaryPanelModel(s).tickets.some((i) => i.id === target.id));
  target.reservationStatus = "cancelled";
  assert.ok(!secondaryPanelModel(s).tickets.some((i) => i.id === target.id));
});
test("health checks flag overlapping items and distinguish unknown locations", () => {
  const s = initialized(),
    p = currentPlan(s),
    items = plannerTimeline(s, 1).planned;
  items[1].startTime = items[0].startTime;
  items[1].endTime = items[0].endTime;
  const row = secondaryPanelModel(s).rows[0];
  assert.ok(row.issues.some((i) => i.reason.includes("重叠")));
  assert.ok(row.issues.some((i) => i.reason.includes("地点")));
  assert.equal(p.id, currentPlan(s).id);
});
