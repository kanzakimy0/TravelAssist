import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./register-planner-ts.mjs";

const { initialPlannerSettings, plannerMockPlans } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { createPlannerStore, plannerStoreReducer, selectPlannerTrip } =
  await import("../src/features/planner/model/planner-store.ts");
const { selectPlannerStoreDirty, selectPlannerLocalRevision } =
  await import("../src/features/planner/model/planner-store-selectors.ts");
const { parsePlannerStoreSnapshot, projectPlannerStore } =
  await import("../src/features/planner/model/planner-store-persistence.ts");
const { SAVED_TRIP_KEY, saveBrowserTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const { archiveWorkingDraft, readWorkingDrafts, WORKING_DRAFTS_KEY } =
  await import("../src/features/planner/model/working-drafts.ts");
const { currentPlan } =
  await import("../src/features/planner/model/trip-model.ts");
const { makeTripState } =
  await import("../src/features/planner/model/trip-model.ts");

function seedTrip() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}

function seed() {
  return createPlannerStore(seedTrip());
}

function apply(state, ...actions) {
  return actions.reduce(plannerStoreReducer, state);
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("one Store owns working, UI, Detail draft and metadata without duplicate root facts", () => {
  const store = seed();
  assert.deepEqual(Object.keys(store).sort(), [
    "draft",
    "meta",
    "ui",
    "working",
  ]);
  assert.equal("plans" in store, false);
  assert.equal("configuration" in store, false);
  assert.equal("ui" in store.working, false);
  assert.equal(selectPlannerTrip(store).plans, store.working.plans);
  assert.equal(
    selectPlannerTrip(store).ui.currentPlanId,
    store.ui.currentPlanId,
  );
  assert.equal(store.meta.hydratedFrom, "seed");
});

test("day/range, selection and inspection are UI actions and do not make the itinerary dirty", () => {
  const initial = seed();
  const item = currentPlan(selectPlannerTrip(initial)).items.at(0);
  const itemId = item.id;
  const next = apply(
    initial,
    {
      type: "trip.apply",
      action: { type: "range", mode: "day", start: 1 },
    },
    { type: "trip.apply", action: { type: "select", id: itemId } },
    {
      type: "trip.apply",
      action: { type: "inspect", id: item.placeId, level: "quick" },
    },
  );
  assert.equal(selectPlannerStoreDirty(next), false);
  assert.equal(selectPlannerLocalRevision(next), 0);
  assert.equal(next.ui.selectedTripItemId, itemId);
});

test("domain actions are immutable, update local revision and preserve fixed/reservation protections", () => {
  const initial = seed();
  const trip = selectPlannerTrip(initial);
  const editable = currentPlan(trip).items.find(
    (item) => !item.fixedTime && !item.locked,
  );
  const protectedItem = currentPlan(trip).items.find(
    (item) => item.fixedTime || item.locked,
  );
  assert.ok(editable);
  assert.ok(protectedItem);
  const edited = apply(initial, {
    type: "trip.apply",
    action: {
      type: "detailEdit",
      id: editable.id,
      title: `${editable.title} · 已编辑`,
      startTime: editable.startTime,
      endTime: editable.endTime,
    },
  });
  assert.notEqual(edited, initial);
  assert.equal(
    currentPlan(selectPlannerTrip(initial)).items.find(
      (item) => item.id === editable.id,
    ).title,
    editable.title,
  );
  assert.equal(selectPlannerStoreDirty(edited), true);
  assert.equal(selectPlannerLocalRevision(edited), 1);
  const blocked = apply(edited, {
    type: "trip.apply",
    action: { type: "remove", id: protectedItem.id },
  });
  assert.equal(
    currentPlan(selectPlannerTrip(blocked)).items.some(
      (item) => item.id === protectedItem.id,
    ),
    true,
  );
});

test("settings and Detail draft mutations have explicit, separate Store actions", () => {
  const initial = seed();
  const trip = selectPlannerTrip(initial);
  const settings = apply(initial, {
    type: "trip.apply",
    action: { type: "level", key: "pace", value: 3 },
  });
  assert.equal(selectPlannerTrip(settings).configuration.pace, 3);
  const draft = {
    ...emptyDetailDraft(),
    items: [
      {
        id: "detail-local-1",
        day: 1,
        title: "领取行李",
        startTime: "18:00",
        endTime: "18:15",
        type: "task",
        note: "本地准备事项",
      },
    ],
    completedIds: ["detail-local-1"],
  };
  const next = apply(settings, { type: "draft.replace", draft });
  assert.equal(next.draft.items[0].title, "领取行李");
  assert.equal(selectPlannerTrip(next).configuration.pace, 3);
  assert.equal(
    selectPlannerTrip(initial).configuration.pace,
    trip.configuration.pace,
  );
});

test("persistence is a projection; UI and ephemeral values are absent", () => {
  const store = apply(seed(), {
    type: "trip.apply",
    action: {
      type: "ui",
      patch: { isMoreSettingsOpen: true, bookingOpen: true },
    },
  });
  const snapshot = projectPlannerStore(store);
  assert.equal("ui" in snapshot, false);
  assert.equal("notice" in snapshot, false);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
  assert.equal(selectPlannerStoreDirty(store), false);
});

test("validated browser snapshot hydrates once, marks its projection clean and rejects corrupt payloads", () => {
  const changed = apply(seed(), {
    type: "draft.replace",
    draft: {
      ...emptyDetailDraft(),
      items: [
        {
          id: "restore-me",
          day: 1,
          title: "恢复草稿",
          startTime: "13:00",
          endTime: "13:15",
          type: "task",
          note: "",
        },
      ],
    },
  });
  const snapshot = projectPlannerStore(changed);
  const restored = apply(seed(), {
    type: "hydrate",
    snapshot,
    source: "browser",
  });
  assert.equal(restored.draft.items[0].id, "restore-me");
  assert.equal(selectPlannerStoreDirty(restored), false);
  const invalid = apply(restored, {
    type: "hydrate",
    source: "browser",
    snapshot: { ...snapshot, currentPlanId: "missing-plan" },
  });
  assert.equal(invalid, restored);
  assert.equal(parsePlannerStoreSnapshot("{bad json", seedTrip()), null);
});

test("stale hydrate and late save acknowledgement cannot overwrite newer local work", () => {
  const clean = seed();
  const previous = projectPlannerStore(clean);
  const item = currentPlan(selectPlannerTrip(clean)).items.find(
    (entry) => !entry.fixedTime && !entry.locked,
  );
  const changed = apply(clean, {
    type: "trip.apply",
    action: {
      type: "detailEdit",
      id: item.id,
      title: `${item.title} newer`,
      startTime: item.startTime,
      endTime: item.endTime,
    },
  });
  const rejected = apply(changed, {
    type: "hydrate",
    snapshot: previous,
    source: "browser",
  });
  assert.equal(rejected, changed);
  const late = apply(changed, {
    type: "persistence.saved",
    snapshot: previous,
  });
  assert.equal(late, changed);
  const forced = apply(changed, {
    type: "hydrate",
    snapshot: previous,
    source: "browser",
    force: true,
  });
  assert.equal(selectPlannerStoreDirty(forced), false);
});

test("identical Store action replay is deterministic and never mutates the previous state", () => {
  const sequence = [
    { type: "trip.apply", action: { type: "range", mode: "day", start: 2 } },
    { type: "trip.apply", action: { type: "level", key: "budget", value: 2 } },
    {
      type: "draft.replace",
      draft: {
        ...emptyDetailDraft(),
        completedIds: ["classic-skytree"],
      },
    },
  ];
  const before = seed();
  const beforeJson = JSON.stringify(before);
  const first = apply(before, ...sequence);
  const second = apply(seed(), ...sequence);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(JSON.stringify(before), beforeJson);
});

test("working drafts archive and browser storage failures preserve the in-memory Store", () => {
  const store = seed();
  const snapshot = projectPlannerStore(store);
  const storage = memoryStorage({ [SAVED_TRIP_KEY]: null });
  assert.throws(
    () => saveBrowserTrip(storage, snapshot, "different"),
    /另一页面已更新/,
  );
  assert.equal(
    projectPlannerStore(store).currentPlanId,
    snapshot.currentPlanId,
  );
  const archived = archiveWorkingDraft(memoryStorage(), snapshot, seedTrip());
  assert.equal(archived.length, 1);
  const draftStorage = memoryStorage({
    [WORKING_DRAFTS_KEY]: JSON.stringify(archived),
  });
  assert.equal(
    readWorkingDrafts(draftStorage.getItem(WORKING_DRAFTS_KEY), seedTrip())
      .length,
    1,
  );
});

test("higher Engine-origin revision may reconcile through hydrate without pretending to create an Engine audit", () => {
  const baseline = seed();
  const snapshot = projectPlannerStore(baseline);
  const reconciled = apply(baseline, {
    type: "hydrate",
    snapshot,
    source: "canonical",
    canonicalRevision: 4,
  });
  assert.equal(reconciled.meta.canonicalRevision, 4);
  const older = apply(reconciled, {
    type: "hydrate",
    snapshot,
    source: "canonical",
    canonicalRevision: 3,
  });
  assert.equal(older, reconciled);
  assert.equal("audit" in reconciled.meta, false);
});

test("PlannerPage is wired to the Store while browser persistence keeps one current-trip key", async () => {
  const page = await readFile(
    new URL(
      "../src/features/planner/components/planner-page.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const hook = await readFile(
    new URL(
      "../src/features/planner/components/use-browser-trip.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(page, /useReducer\(\s*plannerStoreReducer/);
  assert.doesNotMatch(page, /useState\(emptyDetailDraft\)/);
  assert.match(hook, /parsePlannerStoreSnapshot/);
  assert.match(hook, /if \(hydrate\) hydrate\(snapshot/);
  assert.equal((hook.match(/SAVED_TRIP_KEY/g) ?? []).length >= 1, true);
});
