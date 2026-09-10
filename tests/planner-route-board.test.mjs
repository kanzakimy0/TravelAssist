import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const {
  makeTripState,
  currentPlan,
  tripReducer,
  mapView,
  dayTimeBand,
  changeTripDates,
} = await import("../src/features/planner/model/trip-model.ts");
const {
  plannerCandidates,
  plannerMovementLegs,
  movementKey,
  movementAssessment,
  transportModes,
} = await import("../src/features/planner/model/planner-route.ts");
const { emptyDetailDraft, detailRailItems } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { tripSnapshot, parseSavedTrip, restoreTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const fixture = () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
};
const editFor = (s, day = 1) => {
  const leg = plannerMovementLegs(currentPlan(s), day)[0];
  return {
    day,
    fromId: leg.from.id,
    toId: leg.to.id,
    mode: "taxi",
    duration: 25,
    buffer: 10,
  };
};

test("reserve round-trip preserves item metadata but invalidates the old outgoing route estimate", () => {
  const s = fixture(),
    before = structuredClone(s),
    item = currentPlan(s).items.find((i) => i.id === "classic-asakusa");
  const down = tripReducer(s, { type: "reserveSight", id: item.id });
  assert.deepEqual(s, before);
  assert.ok(!currentPlan(down).items.some((i) => i.id === item.id));
  assert.deepEqual(currentPlan(down).reserveItems[0], item);
  assert.ok(
    mapView(down).places.some(
      (p) => p.id === item.placeId && p.tripStatus === "recommended",
    ),
  );
  assert.equal(plannerCandidates(down, 1)[0].held.id, item.id);
  const up = tripReducer(down, {
    type: "promoteSight",
    placeId: item.placeId,
    day: 1,
  });
  assert.deepEqual(
    currentPlan(up).items.find((i) => i.id === item.id),
    { ...item, next: undefined },
  );
  assert.equal(currentPlan(up).reserveItems.length, 0);
  assert.ok(mapView(up).places.some((p) => p.tripItemId === item.id));
});
test("locks, fixed times and confirmed reservations cannot move to reserve", () => {
  for (const patch of [
    { locked: true },
    { fixedTime: true },
    { reservationStatus: "booked" },
    { reservationStatus: "ticketed" },
    { reservationStatus: "pay_on_site" },
    { reservationStatus: "booking" },
  ]) {
    const s = fixture(),
      p = currentPlan(s),
      item = p.items.find((i) => i.id === "classic-asakusa");
    Object.assign(item, patch);
    const next = tripReducer(s, { type: "reserveSight", id: item.id });
    assert.equal(next.plans, s.plans);
    assert.match(next.notice, /锁定|预约/);
  }
});
test("reserve candidates add once in free time without moving booked items or creating reservations", () => {
  const s = tripReducer(fixture(), {
      type: "reserveSight",
      id: "classic-asakusa",
    }),
    p = currentPlan(s),
    placeId = "alternative-1-1";
  const next = tripReducer(s, { type: "promoteSight", placeId, day: 1 });
  const added = currentPlan(next).items.find((i) => i.placeId === placeId);
  assert.ok(added);
  assert.equal(
    added.reservationStatus,
    s.places.find((p) => p.id === placeId).bookingRequired
      ? "pending"
      : "not_required",
  );
  assert.equal(added.reservationId, undefined);
  for (const item of p.items) {
    const updated = currentPlan(next).items.find((i) => i.id === item.id);
    assert.equal(updated.startTime, item.startTime);
    assert.equal(updated.endTime, item.endTime);
    assert.equal(updated.reservationStatus, item.reservationStatus);
    if (item.day === 1)
      assert.ok(
        added.startTime >= item.endTime || added.endTime <= item.startTime,
      );
  }
  assert.equal(
    currentPlan(
      tripReducer(next, { type: "promoteSight", placeId, day: 1 }),
    ).items.filter((i) => i.placeId === placeId).length,
    1,
  );
  assert.ok(mapView(next).places.some((p) => p.tripItemId === added.id));
});
test("full day rejects addition rather than hiding conflicts or displacing hotel check-in", () => {
  const s = fixture(),
    p = currentPlan(s);
  p.items = [
    {
      ...p.items[0],
      startTime: "00:00",
      endTime: "23:59",
      fixedTime: true,
      locked: true,
    },
  ];
  const next = tripReducer(s, {
    type: "promoteSight",
    placeId: "alternative-1-1",
    day: 1,
  });
  assert.equal(next.plans, s.plans);
  assert.match(next.notice, /没有足够空档/);
});
test("reserve shelves and movement overrides are isolated per plan", () => {
  const s = fixture(),
    p = currentPlan(s),
    other = s.plans[1];
  const next = tripReducer(
    tripReducer(s, { type: "reserveSight", id: "classic-ginza" }),
    { type: "editMovement", edit: editFor(s) },
  );
  assert.equal(
    next.plans.find((x) => x.id === other.id),
    other,
  );
  assert.equal(
    currentPlan({ ...next, ui: { ...next.ui, currentPlanId: other.id } }),
    other,
  );
  assert.equal(currentPlan(next).id, p.id);
});
test("traffic edits retain all project times and show an explicit conflict in detail", () => {
  const s = fixture(),
    edit = editFor(s),
    next = tripReducer(s, { type: "editMovement", edit });
  assert.deepEqual(currentPlan(next).items, currentPlan(s).items);
  const leg = plannerMovementLegs(currentPlan(next), 1)[0];
  assert.equal(leg.duration, 25);
  assert.equal(leg.buffer, 10);
  assert.equal(leg.conflict, true);
  assert.match(leg.label, /出租车.*手动估计/);
  assert.match(next.notice, /标记冲突/);
  assert.equal(
    detailRailItems(next, 1).find((i) => i.id === edit.toId).aiStatus,
    "error",
  );
  assert.ok(
    dayTimeBand(currentPlan(next), 1).segments.some(
      (i) => i.kind === "movement" && i.title.includes("出租车") && i.risk,
    ),
  );
});
test("invalid and stale non-adjacent movement edits cannot mutate a plan", () => {
  const s = fixture(),
    edit = editFor(s);
  for (const bad of [
    { ...edit, duration: -1 },
    { ...edit, buffer: 181 },
    { ...edit, mode: "teleport" },
    { ...edit, duration: NaN },
    { ...edit, day: 99 },
    { ...edit, toId: "classic-ginza" },
    { ...edit, day: 2 },
  ]) {
    assert.equal(
      tripReducer(s, { type: "editMovement", edit: bad }).plans,
      s.plans,
    );
  }
});
test("moving an endpoint clears stale traffic overrides and legacy connection descriptions", () => {
  const s = fixture(),
    edited = tripReducer(s, { type: "editMovement", edit: editFor(s) });
  const next = tripReducer(edited, {
    type: "reserveSight",
    id: "classic-asakusa",
  });
  assert.equal(Object.keys(currentPlan(next).movementLegs).length, 0);
  assert.equal(
    currentPlan(next).items.find((i) => i.id === "classic-arrival").next,
    undefined,
  );
});
test("multi-night nodes use the viewed day, not their starting day for movement keys", () => {
  const s = fixture(),
    p = currentPlan(s),
    hotel = p.items.find((i) => i.type === "hotel");
  hotel.endDay = 2;
  hotel.startTime = "06:30";
  hotel.endTime = "07:00";
  const leg = plannerMovementLegs(p, 2)[0];
  assert.equal(leg.from.id, hotel.id);
  assert.equal(leg.day, 2);
  const next = tripReducer(s, {
    type: "editMovement",
    edit: { ...editFor(s, 2), duration: 30 },
  });
  assert.ok(
    currentPlan(next).movementLegs[movementKey(2, leg.from.id, leg.to.id)],
  );
});
test("browser save/restore retains shelves and traffic edits; corrupted data is rejected", () => {
  const s = fixture();
  let next = tripReducer(s, { type: "reserveSight", id: "classic-ginza" });
  next = tripReducer(next, { type: "editMovement", edit: editFor(next) });
  const saved = {
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot: tripSnapshot(next, emptyDetailDraft()),
  };
  const parsed = parseSavedTrip(JSON.stringify(saved), s);
  assert.ok(parsed);
  assert.deepEqual(
    currentPlan(restoreTrip(s, parsed.snapshot)),
    JSON.parse(JSON.stringify(currentPlan(next))),
  );
  for (const corrupt of [
    (x) => {
      x.reserveItems[0].placeId = "unknown";
    },
    (x) => {
      x.reserveItems[0].id = x.items[0].id;
    },
    (x) => {
      Object.values(x.movementLegs)[0].buffer = -1;
    },
    (x) => {
      x.movementLegs.fake = Object.values(x.movementLegs)[0];
    },
  ]) {
    const copy = structuredClone(saved);
    corrupt(copy.snapshot.plans[0]);
    assert.equal(parseSavedTrip(JSON.stringify(copy), s), null);
  }
});
test("inspecting an extra reserve candidate adds a real catalog marker, without fabricated coordinates", () => {
  const s = fixture(),
    p = plannerCandidates(s, 1).find((x) => x.place.id === "place-18").place;
  const next = tripReducer(s, {
    type: "inspect",
    id: p.id,
    level: "quick",
    day: 1,
  });
  const marker = mapView(next).places.find((x) => x.id === p.id);
  assert.ok(marker);
  assert.deepEqual(marker.coordinates, p.coordinates);
});
test("shortening dates does not discard reserved projects outside the new range", () => {
  const s = fixture();
  const next = tripReducer(s, { type: "reserveSight", id: "classic-museum" });
  const changed = changeTripDates(next, {
    startDate: s.settings.startDate,
    endDate: s.settings.startDate,
  });
  assert.deepEqual(changed.plans, next.plans);
});

test("local movement risk distinguishes overlap, insufficient time, uncertainty and low margin", () => {
  const base = { gap: 60, duration: 30, buffer: 10, mode: "train" };
  for (const mode of Object.keys(transportModes)) {
    assert.equal(
      movementAssessment({ ...base, mode }).risk,
      mode === "undecided" ? "warning" : "normal",
    );
  }
  assert.equal(movementAssessment({ ...base, duration: null }).risk, "warning");
  assert.equal(
    movementAssessment({ ...base, gap: -5, duration: null }).risk,
    "error",
  );
  assert.equal(movementAssessment({ ...base, gap: 39 }).risk, "error");
  for (const gap of [40, 50, 54])
    assert.equal(movementAssessment({ ...base, gap }).risk, "warning");
  assert.equal(movementAssessment({ ...base, gap: 55 }).risk, "normal");
  assert.match(movementAssessment(base).riskReason, /仍需核对/);
});

test("itinerary time changes update risk without discarding unchanged adjacent manual estimates", () => {
  let s = fixture();
  const beforeLeg = plannerMovementLegs(currentPlan(s), 1)[1];
  const edit = {
    ...editFor(s),
    fromId: beforeLeg.from.id,
    toId: beforeLeg.to.id,
    duration: 10,
    buffer: 0,
    mode: "walk",
  };
  s = tripReducer(s, { type: "editMovement", edit });
  assert.equal(plannerMovementLegs(currentPlan(s), 1)[1].risk, "normal");
  for (const [endTime, risk] of [
    ["12:15", "warning"],
    ["12:25", "error"],
    ["11:30", "normal"],
  ]) {
    s = tripReducer(s, {
      type: "detailEdit",
      id: beforeLeg.from.id,
      title: beforeLeg.from.title,
      startTime: "10:00",
      endTime,
    });
    const leg = plannerMovementLegs(currentPlan(s), 1)[1];
    assert.equal(leg.risk, risk);
    assert.equal(leg.duration, 10);
    assert.deepEqual(currentPlan(s).movementLegs[beforeLeg.key], edit);
  }
});

test("canonical removal invalidates adjacent routes only, leaving other days and plans intact", () => {
  let s = fixture();
  for (const day of [1, 2])
    s = tripReducer(s, { type: "editMovement", edit: editFor(s, day) });
  const before = currentPlan(s),
    other = s.plans[1];
  s = tripReducer(s, { type: "remove", id: "classic-asakusa" });
  const leg = plannerMovementLegs(currentPlan(s), 1)[0];
  assert.equal(leg.to.id, "classic-lunch");
  assert.equal(leg.duration, null);
  assert.equal(leg.risk, "warning");
  assert.deepEqual(
    plannerMovementLegs(currentPlan(s), 2),
    plannerMovementLegs(before, 2),
  );
  assert.equal(s.plans[1], other);
  assert.equal(Object.keys(currentPlan(s).movementLegs).length, 1);
});

test("same-ID hotel replacement clears obsolete incoming estimates without clearing unrelated legs", () => {
  let s = fixture();
  const p = currentPlan(s),
    hotel = p.items.find((i) => i.type === "hotel" && i.day === 1);
  Object.assign(hotel, {
    reservationStatus: "cancelled",
    locked: false,
    fixedTime: false,
  });
  const replacement = s.places.find(
    (place) =>
      place.type === "hotel" &&
      !place.planningPlaceholder &&
      !p.items.some((i) => i.placeId === place.id),
  );
  assert.ok(replacement);
  const beforeLeg = plannerMovementLegs(p, 1).find(
    (leg) => leg.to.id === hotel.id,
  );
  const incoming = { ...editFor(s), fromId: beforeLeg.from.id, toId: hotel.id };
  s = tripReducer(s, { type: "editMovement", edit: editFor(s) });
  s = tripReducer(s, { type: "editMovement", edit: incoming });
  s = tripReducer(s, {
    type: "replaceRailHotel",
    id: hotel.id,
    placeId: replacement.id,
  });
  const leg = plannerMovementLegs(currentPlan(s), 1).find(
    (leg) => leg.to.id === hotel.id,
  );
  assert.equal(leg.to.placeId, replacement.id);
  assert.equal(leg.duration, null);
  assert.equal(leg.risk, "warning");
  assert.equal(leg.edited, false);
  assert.equal(Object.keys(currentPlan(s).movementLegs).length, 1);
  assert.equal(plannerMovementLegs(currentPlan(s), 1)[0].duration, 25);
});
