import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const {
  snapTimelineMinute,
  timelineCollisionGroups,
  timelineAxis,
  plannerTimeline,
} = await import("../src/features/planner/model/planner-timeline.ts");
const { tripSnapshot, parseSavedTrip, restoreTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { archiveWorkingDraft, readWorkingDrafts, WORKING_DRAFTS_KEY } =
  await import("../src/features/planner/model/working-drafts.ts");
const { mealAreaChoices } =
  await import("../src/features/planner/model/meal-area-choices.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("pointer positions snap to five minutes including 11:55", () => {
  assert.equal(snapTimelineMinute((715 - 420) / 840, 420, 840), 715);
  for (let ratio = 0; ratio <= 1; ratio += 0.017)
    assert.equal(snapTimelineMinute(ratio, 423, 970) % 5, 0);
});
test("explicit snapped drops preserve duration and every other item", () => {
  const s = fixture(),
    candidate = plannerTimeline(s, 1).reserve.find(
      (i) => !i.planningPlaceholder,
    );
  const next = tripReducer(s, {
    type: "timelineDrop",
    planId: s.ui.currentPlanId,
    day: 1,
    id: candidate.id,
    to: "planned",
    afterId: null,
    startMinute: 715,
  });
  const item = next.plans[0].items.find((i) => i.id === candidate.id);
  assert.equal(item.startTime, "11:55");
  // Movement hints legitimately invalidate when adjacency changes; timings,
  // identity, locks and reservations must remain untouched.
  for (const old of s.plans[0].items) {
    const actual = next.plans[0].items.find((i) => i.id === old.id);
    assert.deepEqual(
      { ...actual, next: undefined },
      { ...old, next: undefined },
    );
  }
});
test("locked items and invalid snapping are rejected", () => {
  const s = fixture(),
    item = s.plans[0].items[0];
  item.locked = true;
  assert.equal(
    tripReducer(s, {
      type: "timelineDrop",
      planId: s.ui.currentPlanId,
      day: 1,
      id: item.id,
      to: "planned",
      afterId: null,
      startMinute: 715,
    }).plans,
    s.plans,
  );
  item.locked = false;
  item.fixedTime = false;
  item.reservationStatus = "not_required";
  assert.equal(
    tripReducer(s, {
      type: "timelineDrop",
      planId: s.ui.currentPlanId,
      day: 1,
      id: item.id,
      to: "planned",
      afterId: null,
      startMinute: 716,
    }).plans,
    s.plans,
  );
});
test("visually overlapping unequal times are included in collision picker", () => {
  const items = plannerTimeline(fixture(), 1).planned;
  const copy = items.slice(0, 3).map((item, index) => ({
    ...item,
    startTime: index === 2 ? "20:00" : index === 0 ? "08:00" : "08:05",
  }));
  const axis = timelineAxis(copy),
    groups = timelineCollisionGroups(copy, axis.width, axis.span);
  assert.ok(
    groups.some(
      (g) =>
        g.some((i) => i.id === copy[0].id) &&
        g.some((i) => i.id === copy[1].id),
    ),
  );
});
test("working plan survives regeneration and browser serialization", () => {
  const s = fixture();
  s.workingPlanId = s.ui.currentPlanId;
  s.plans[0].name = "My working plan";
  const next = tripReducer(s, { type: "replan" });
  assert.deepEqual(next.plans, s.plans);
  assert.match(next.notice, /工作中方案已固定/);
  const saved = parseSavedTrip(
    JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      snapshot: tripSnapshot(s, emptyDetailDraft()),
    }),
    s,
  );
  assert.equal(restoreTrip(s, saved.snapshot).workingPlanId, s.workingPlanId);
  saved.snapshot.workingPlanId = "missing";
  assert.equal(parseSavedTrip(JSON.stringify(saved), s), null);
});
test("browser drafts archive losslessly, retry no-op, malformed records untouched", () => {
  const s = fixture(),
    snapshot = tripSnapshot(s, emptyDetailDraft()),
    map = new Map(),
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
    };
  const entries = archiveWorkingDraft(storage, snapshot, s);
  assert.deepEqual(entries[0].snapshot, snapshot);
  assert.equal(archiveWorkingDraft(storage, snapshot, s).length, 1);
  assert.equal(
    readWorkingDrafts(storage.getItem(WORKING_DRAFTS_KEY), s).length,
    1,
  );
  storage.setItem(WORKING_DRAFTS_KEY, "broken");
  assert.throws(() => archiveWorkingDraft(storage, snapshot, s));
  assert.equal(storage.getItem(WORKING_DRAFTS_KEY), "broken");
});
test("storage failure never mutates source draft", () => {
  const s = fixture(),
    snapshot = tripSnapshot(s, emptyDetailDraft()),
    before = structuredClone(snapshot);
  assert.throws(() =>
    archiveWorkingDraft(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("Quota");
        },
      },
      snapshot,
      s,
    ),
  );
  assert.deepEqual(snapshot, before);
});
test("meal and lodging regions derive only from current day anchors or existing areas", () => {
  const s = fixture();
  for (let day = 1; day <= 3; day++)
    for (const hotel of [false, true]) {
      const choices = mealAreaChoices(s, day, hotel);
      assert.ok(choices.length >= 2 && choices.length <= 3);
      for (const c of choices) {
        assert.ok(
          s.places.some((p) => p.id === c.id) ||
            s.areas.some((a) => a.id === c.id),
        );
        assert.ok(c.reason.length > 15);
      }
    }
});
