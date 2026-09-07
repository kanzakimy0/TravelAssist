import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { initialPlannerSettings, plannerMockPlans } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const {
  tripSnapshot,
  sameTrip,
  restoreTrip,
  parseSavedTrip,
  saveBrowserTrip,
  SAVED_TRIP_KEY,
} = await import("../src/features/planner/model/browser-trip.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
function storage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}
test("legacy browser saves without seniors migrate without losing travelers", () => {
  const trip = fixture(),
    db = storage();
  const snapshot = tripSnapshot(trip, emptyDetailDraft());
  delete snapshot.configuration.travelers.seniors;
  saveBrowserTrip(db, snapshot, null);
  const saved = parseSavedTrip(db.getItem(SAVED_TRIP_KEY), trip);
  assert.ok(saved);
  assert.equal(saved.snapshot.configuration.travelers.seniors, 0);
  assert.equal(saved.snapshot.configuration.travelers.adultMale, 1);
});
test("movement advice is persisted without changing route or reservation times", () => {
  const trip = fixture(),
    db = storage();
  const id = currentPlan(trip).items[0].id;
  const next = tripReducer(trip, {
    type: "movementAdvice",
    id,
    response: "accepted",
  });
  assert.equal(next.plans, trip.plans);
  saveBrowserTrip(db, tripSnapshot(next, emptyDetailDraft()), null);
  assert.equal(
    parseSavedTrip(db.getItem(SAVED_TRIP_KEY), trip).snapshot.configuration
      .movementAdvice[id],
    "accepted",
  );
});
test("explicit save round-trips complete workspace, no UI or camera persistence", () => {
  const trip = fixture(),
    draft = emptyDetailDraft(),
    db = storage();
  const snapshot = tripSnapshot(trip, draft);
  assert.equal(db.getItem(SAVED_TRIP_KEY), null);
  saveBrowserTrip(db, snapshot, null);
  const saved = parseSavedTrip(db.getItem(SAVED_TRIP_KEY), trip);
  assert.ok(saved);
  assert.ok(sameTrip(saved.snapshot, snapshot));
  assert.equal("ui" in saved.snapshot, false);
  assert.equal("places" in saved.snapshot, false);
});
test("view changes are clean; edits, lock, deletion, completion and additions are dirty", () => {
  const trip = fixture(),
    draft = emptyDetailDraft(),
    baseline = tripSnapshot(trip, draft);
  const ui = {
    ...trip,
    ui: {
      ...trip.ui,
      selectedDay: 2,
      activeBottomTab: "movement",
      focusRevision: 10,
    },
    notice: "updated",
  };
  assert.ok(sameTrip(tripSnapshot(ui, draft), baseline));
  const item = currentPlan(trip).items.find((i) => !i.fixedTime && !i.locked);
  for (const action of [
    {
      type: "detailEdit",
      id: item.id,
      title: "修改",
      startTime: item.startTime,
      endTime: item.endTime,
    },
    { type: "lock", id: item.id },
    { type: "remove", id: item.id },
  ])
    assert.equal(
      sameTrip(tripSnapshot(tripReducer(trip, action), draft), baseline),
      false,
    );
  assert.equal(
    sameTrip(
      tripSnapshot(trip, { ...draft, completedIds: [item.id] }),
      baseline,
    ),
    false,
  );
  assert.equal(
    sameTrip(
      tripSnapshot(trip, {
        ...draft,
        items: [
          {
            id: "new",
            day: 1,
            title: "领取行李",
            startTime: "20:00",
            endTime: "20:15",
            type: "task",
            note: "",
          },
        ],
      }),
      baseline,
    ),
    false,
  );
});
test("discard preserves Planner changes at entry while undoing Detail edits", () => {
  let trip = tripReducer(fixture(), {
    type: "travelers",
    key: "child",
    value: 2,
  });
  const draft = emptyDetailDraft(),
    baseline = tripSnapshot(trip, draft);
  const item = currentPlan(trip).items.find((i) => !i.fixedTime && !i.locked);
  trip = tripReducer(trip, { type: "remove", id: item.id });
  const restored = restoreTrip(trip, baseline);
  assert.equal(restored.configuration.travelers.child, 2);
  assert.ok(currentPlan(restored).items.some((i) => i.id === item.id));
  assert.ok(sameTrip(tripSnapshot(restored, draft), baseline));
});
test("canonical edits and draft survive serialization including changed plan and dates", () => {
  let trip = fixture();
  trip = tripReducer(trip, {
    type: "dates",
    departure: trip.settings.startDate,
    returning: "2027-04-14",
  });
  trip = tripReducer(trip, { type: "plan", id: "depth" });
  trip = tripReducer(trip, { type: "level", key: "budget", value: 0 });
  const item = currentPlan(trip).items.find((i) => !i.fixedTime && !i.locked);
  trip = tripReducer(trip, {
    type: "detailEdit",
    id: item.id,
    title: "已保存的编辑",
    startTime: item.startTime,
    endTime: item.endTime,
  });
  const snapshot = tripSnapshot(trip, {
    version: 1,
    completedIds: [item.id],
    items: [
      {
        id: "new",
        day: 1,
        title: "行李",
        startTime: "20:00",
        endTime: "20:15",
        type: "task",
        note: "备注",
      },
    ],
  });
  const db = storage();
  saveBrowserTrip(db, snapshot, null);
  assert.ok(
    sameTrip(
      parseSavedTrip(db.getItem(SAVED_TRIP_KEY), fixture())?.snapshot,
      snapshot,
    ),
  );
});
test("invalid/corrupt/unsupported records are rejected without altering storage", () => {
  const trip = fixture(),
    db = storage();
  saveBrowserTrip(db, tripSnapshot(trip, emptyDetailDraft()), null);
  const valid = db.getItem(SAVED_TRIP_KEY);
  for (const raw of [null, "{", "null", '{"version":99}'])
    assert.equal(parseSavedTrip(raw, trip), null);
  for (const corrupt of [
    (s) => s.snapshot.plans.splice(0),
    (s) => s.snapshot.plans[0].days.splice(0),
    (s) => (s.snapshot.plans[0].items[0].day = 999),
    (s) => (s.snapshot.currentPlanId = "missing"),
    (s) => (s.snapshot.configuration.travelers.child = -1),
    (s) => (s.snapshot.configuration.preferences.food.details = null),
    (s) => (s.snapshot.settings.startDate = "bad"),
    (s) => s.snapshot.draft.items.push({}),
  ]) {
    const value = JSON.parse(valid);
    corrupt(value);
    assert.equal(parseSavedTrip(JSON.stringify(value), trip), null);
  }
  assert.equal(db.getItem(SAVED_TRIP_KEY), valid);
});
test("rail responses and unsent booking messages survive explicit save and reject invalid data", () => {
  const trip = fixture();
  const draft = {
    ...emptyDetailDraft(),
    railResponses: { one: "later" },
    bookingMessages: { one: "请核对入住时间" },
  };
  const snapshot = tripSnapshot(trip, draft),
    db = storage();
  saveBrowserTrip(db, snapshot, null);
  const raw = db.getItem(SAVED_TRIP_KEY);
  assert.deepEqual(parseSavedTrip(raw, trip).snapshot.draft, draft);
  const invalid = JSON.parse(raw);
  invalid.snapshot.draft.railResponses.one = "auto-booked";
  assert.equal(parseSavedTrip(JSON.stringify(invalid), trip), null);
  const invalidMessage = JSON.parse(raw);
  invalidMessage.snapshot.draft.bookingMessages.one = { sent: true };
  assert.equal(parseSavedTrip(JSON.stringify(invalidMessage), trip), null);
});

test("reservation queue, channel confirmation and cancellation remain separate", () => {
  let state = fixture();
  const original = currentPlan(state).items.find((i) => !i.reservationRequired);
  state = tripReducer(state, { type: "queueReservation", id: original.id });
  let item = currentPlan(state).items.find((i) => i.id === original.id);
  assert.equal(item.reservationStatus, "pending");
  assert.equal(item.startTime, original.startTime);
  assert.equal(item.fixedTime, original.fixedTime);
  const provider = state.places.find((p) => p.id === item.placeId)
    .bookingOptions[0];
  state = tripReducer(state, {
    type: "provider",
    id: item.id,
    providerId: provider.providerId,
  });
  assert.equal(
    currentPlan(state).items.find((i) => i.id === item.id).reservationStatus,
    "booking",
  );
  state = tripReducer(state, {
    type: "complete",
    id: item.id,
    time: item.startTime,
  });
  const booked = currentPlan(state).items.find((i) => i.id === item.id);
  assert.ok(["booked", "ticketed"].includes(booked.reservationStatus));
  assert.equal(
    tripReducer(state, {
      type: "recordCancellation",
      id: item.id,
      externallyCancelled: false,
    }),
    state,
  );
  state = tripReducer(state, {
    type: "recordCancellation",
    id: item.id,
    externallyCancelled: true,
  });
  const cancelled = currentPlan(state).items.find((i) => i.id === item.id);
  assert.equal(cancelled.reservationStatus, "cancelled");
  assert.equal(cancelled.locked, true);
  assert.equal(cancelled.fixedTime, true);
  state = tripReducer(state, { type: "queueReservation", id: item.id });
  item = currentPlan(state).items.find((i) => i.id === item.id);
  assert.equal(item.reservationStatus, "pending");
  assert.equal(item.providerId, undefined);
});

test("hotel replacement protects confirmed stays and resets old booking data only after cancellation", () => {
  let state = fixture();
  const original = currentPlan(state).items.find((i) => i.type === "hotel");
  const replacement = state.places.find(
    (p) =>
      p.type === "hotel" &&
      p.id !== original.placeId &&
      !currentPlan(state).items.some((i) => i.placeId === p.id),
  );
  assert.ok(replacement);
  original.locked = true;
  original.fixedTime = true;
  original.reservationStatus = "booked";
  const rejected = tripReducer(state, {
    type: "replaceRailHotel",
    id: original.id,
    placeId: replacement.id,
  });
  assert.equal(
    currentPlan(rejected).items.find((i) => i.id === original.id).placeId,
    original.placeId,
  );
  state = tripReducer(state, {
    type: "recordCancellation",
    id: original.id,
    externallyCancelled: true,
  });
  state = tripReducer(state, {
    type: "replaceRailHotel",
    id: original.id,
    placeId: replacement.id,
  });
  const changed = currentPlan(state).items.find((i) => i.id === original.id);
  assert.equal(changed.placeId, replacement.id);
  assert.equal(changed.day, original.day);
  assert.equal(changed.endDay, original.endDay);
  assert.equal(changed.locked, false);
  assert.equal(changed.providerId, undefined);
  assert.notEqual(changed.reservationStatus, "booked");
});

test("quota failures and another tab's save never silently overwrite the prior copy", () => {
  const snapshot = tripSnapshot(fixture(), emptyDetailDraft()),
    db = storage();
  saveBrowserTrip(db, snapshot, null);
  const original = db.getItem(SAVED_TRIP_KEY);
  assert.throws(() => saveBrowserTrip(db, snapshot, null), /另一页面/);
  assert.throws(
    () =>
      saveBrowserTrip(
        {
          getItem: db.getItem,
          setItem: () => {
            throw new Error("quota");
          },
        },
        snapshot,
        original,
      ),
    /quota/,
  );
  assert.equal(db.getItem(SAVED_TRIP_KEY), original);
});
