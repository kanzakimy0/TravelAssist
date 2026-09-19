import assert from "node:assert/strict";
import test from "node:test";
import "./register-planner-ts.mjs";

const { fullSnapshotFixture } =
  await import("../src/shared/contracts/trips/fixtures.ts");
const { initialPlannerSettings, plannerMockPlans } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState } =
  await import("../src/features/planner/model/trip-model.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { tripSnapshot } =
  await import("../src/features/planner/model/browser-trip.ts");
const { canonicalFromPlannerTrip, plannerTripFromCanonical } =
  await import("../src/features/planner/model/planner-canonical.ts");
const { createPlannerStore, plannerStoreReducer, selectPlannerTrip } =
  await import("../src/features/planner/model/planner-store.ts");
const { selectPlannerStoreDirty } =
  await import("../src/features/planner/model/planner-store-selectors.ts");
const { plannerCanonicalClient, PlannerCanonicalClientError } =
  await import("../src/features/planner/persistence/canonical-trip-client.ts");

function seed() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
function canonical() {
  const value = fullSnapshotFixture();
  value.trip.id = "11111111-1111-4111-8111-111111111111";
  value.trip.activePlanId = "22222222-2222-4222-8222-222222222222";
  value.plans[0].id = value.trip.activePlanId;
  value.plans[0].days.forEach((day, dayIndex) => {
    day.id = `33333333-3333-4333-8333-${String(dayIndex + 1).padStart(12, "0")}`;
    for (const [itemIndex, item] of [
      ...day.items,
      ...day.alternatives,
    ].entries())
      item.id = `44444444-4444-4444-8444-${String(dayIndex * 10 + itemIndex + 1).padStart(12, "0")}`;
  });
  value.plans[1].id = "55555555-5555-4555-8555-555555555555";
  return value;
}

test("TASK-069 supported Canonical subset has a semantic Planner round-trip", () => {
  const source = canonical();
  const projected = plannerTripFromCanonical(source, seed());
  const restored = canonicalFromPlannerTrip(projected, emptyDetailDraft());
  assert.deepEqual(restored, source);
  assert.equal(projected.canonicalContext.snapshot.trip.id, source.trip.id);
  assert.equal(
    projected.places.some((place) => place.image),
    false,
  );
});

test("TASK-069 excludes Planner UI and Detail drafts from Canonical save payload", () => {
  const source = canonical();
  const projected = plannerTripFromCanonical(source, seed());
  projected.ui = {
    ...projected.ui,
    selectedDay: 3,
    rangeMode: "all",
    inspection: { id: "map-overlay", level: "detail" },
    bookingOpen: true,
  };
  const saved = canonicalFromPlannerTrip(projected, {
    ...emptyDetailDraft(),
    completedIds: ["local-only"],
  });
  assert.deepEqual(saved, source);
  assert.equal(JSON.stringify(saved).includes("local-only"), false);
  assert.equal(JSON.stringify(saved).includes("map-overlay"), false);
});

test("TASK-069 converts supported time, title, delete and UUID add edits into Canonical fields", () => {
  const source = canonical();
  const projected = plannerTripFromCanonical(source, seed());
  const plan = projected.plans[0];
  const edited = plan.items[0];
  edited.title = "已编辑 Canonical 项目";
  edited.startTime = "10:30";
  edited.endTime = "11:45";
  plan.items = plan.items.slice(0, 1);
  const place = projected.places[0];
  plan.items.push({
    ...edited,
    id: "66666666-6666-4666-8666-666666666666",
    title: "新增 Canonical 项目",
    placeId: place.id,
    startTime: "13:00",
    endTime: "14:00",
    locked: false,
    fixedTime: false,
    reservationStatus: "not_required",
    reservationRequired: false,
  });
  const saved = canonicalFromPlannerTrip(projected, emptyDetailDraft());
  assert.equal(saved.plans[0].days[0].items.length, 2);
  assert.equal(saved.plans[0].days[0].items[0].title, "已编辑 Canonical 项目");
  assert.match(
    saved.plans[0].days[0].items[0].schedule.start,
    /T10:30:00\+09:00$/,
  );
  assert.equal(
    saved.plans[0].days[0].items[1].id,
    "66666666-6666-4666-8666-666666666666",
  );
});

test("TASK-069 Store refuses a late Canonical hydrate or acknowledgement over local edits", () => {
  const source = canonical();
  const canonicalTrip = plannerTripFromCanonical(source, seed());
  const canonicalSnapshot = tripSnapshot(canonicalTrip, emptyDetailDraft());
  const hydrated = plannerStoreReducer(createPlannerStore(seed()), {
    type: "hydrate",
    source: "canonical",
    trip: canonicalTrip,
    snapshot: canonicalSnapshot,
    canonicalRevision: source.trip.revision,
  });
  assert.equal(hydrated.meta.canonicalRevision, source.trip.revision);
  assert.equal(selectPlannerStoreDirty(hydrated), false);
  const editable = selectPlannerTrip(hydrated).plans[0].items[0];
  const dirty = plannerStoreReducer(hydrated, {
    type: "trip.apply",
    action: {
      type: "detailEdit",
      id: editable.id,
      title: editable.title + " 本地编辑",
      startTime: editable.startTime,
      endTime: editable.endTime,
    },
  });
  const late = plannerStoreReducer(dirty, {
    type: "hydrate",
    source: "canonical",
    trip: canonicalTrip,
    snapshot: canonicalSnapshot,
    canonicalRevision: source.trip.revision + 1,
  });
  assert.equal(late, dirty);
  assert.equal(
    plannerStoreReducer(dirty, {
      type: "persistence.saved",
      snapshot: canonicalSnapshot,
    }),
    dirty,
  );
});

test("TASK-069 client validates payload and revision acknowledgement before hydrate", async () => {
  const source = canonical();
  const calls = [];
  const client = plannerCanonicalClient(async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true, data: source }), {
      status: 200,
      headers: { ETag: `\"${source.trip.revision}\"` },
    });
  });
  const read = await client.read(source.trip.id);
  const saved = await client.save(source.trip.id, source);
  assert.equal(read.revision, source.trip.revision);
  assert.equal(saved.snapshot.trip.id, source.trip.id);
  assert.equal(calls[0].url, `/api/planner/trips/${source.trip.id}`);
  assert.equal(calls[1].init.method, "PUT");
  assert.match(calls[1].init.body, /schemaVersion/);
  const broken = plannerCanonicalClient(
    async () =>
      new Response(JSON.stringify({ ok: true, data: source }), { status: 200 }),
  );
  await assert.rejects(
    () => broken.read(source.trip.id),
    (error) =>
      error instanceof PlannerCanonicalClientError &&
      error.code === "CANONICAL_TRIP_UNAVAILABLE",
  );
});
