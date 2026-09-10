import test from "node:test";
import assert from "node:assert/strict";
import "./register-planner-ts.mjs";
const prep = await import("../src/features/planner/model/trip-preparation.ts");
const lib = await import("../src/features/companions/companion-library.ts");
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan } =
  await import("../src/features/planner/model/trip-model.ts");
const { emptyDetailDraft, detailRailItems } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { tripSnapshot, parseSavedTrip, saveBrowserTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
function seed() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
const member = {
  id: "a",
  name: "临时成人",
  ageGroup: "adult",
  temporary: true,
};
const flight = {
  id: "f",
  direction: "outbound",
  from: "HND",
  to: "LHR",
  departure: "2026-04-10T23:00",
  arrival: "2026-04-11T06:00",
  departureZone: "+09:00",
  arrivalZone: "+01:00",
  number: "",
  note: "",
  status: "queued",
};
test("member groups deduplicate and preserve the self slot without copying private fields", () => {
  assert.equal(prep.mergeMembers([member], [member]).length, 1);
  assert.deepEqual(
    prep.memberSnapshot({
      id: "x",
      displayName: "A",
      ageGroup: "senior",
      privateNote: "secret",
      dateOfBirth: "1960-01-01",
    }),
    { id: "x", name: "A", ageGroup: "senior", temporary: false },
  );
});
test("same total with different ages is not accepted; correct adults match", () => {
  const s = seed();
  assert.equal(
    prep.memberMismatch(s, [member, { ...member, id: "b" }]).length,
    0,
  );
  assert.ok(
    prep.memberMismatch(s, [member, { ...member, id: "b", ageGroup: "child" }])
      .length,
  );
});
test("timezone and midnight calculation is explicit, invalid date and backwards flight rejected", () => {
  assert.equal(prep.flightError(flight), "");
  assert.equal(
    prep.flightInstant(flight.arrival, flight.arrivalZone) -
      prep.flightInstant(flight.departure, flight.departureZone),
    15 * 3600000,
  );
  assert.ok(prep.flightError({ ...flight, arrival: "2026-04-10T05:00" }));
  assert.ok(prep.flightError({ ...flight, departure: "2026-02-30T08:00" }));
  assert.ok(prep.flightError({ ...flight, to: "HND" }));
});
test("preparation persistence validates fields, IDs, statuses and no-flight contradictions", () => {
  const p = {
    ...prep.emptyPreparation(),
    members: [member],
    flights: [flight],
  };
  assert.ok(prep.validPreparations({ classic: p }));
  assert.equal(
    prep.validPreparations({ classic: { ...p, noFlight: true } }),
    false,
  );
  assert.equal(
    prep.validPreparations({ classic: { ...p, members: [member, member] } }),
    false,
  );
  assert.equal(
    prep.validPreparations({
      classic: { ...p, flights: [{ ...flight, status: "paid" }] },
    }),
    false,
  );
});
test("legacy saves remain valid; preparation and renamed plan round-trip in explicit browser save", () => {
  const s = seed(),
    d = emptyDetailDraft();
  currentPlan(s).name = "测试旅行";
  d.preparations = {
    [currentPlan(s).id]: {
      ...prep.emptyPreparation(),
      members: [member],
      flights: [flight],
    },
  };
  const saved = parseSavedTrip(
    JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      snapshot: tripSnapshot(s, d),
    }),
    s,
  );
  assert.equal(saved.snapshot.plans[0].name, "测试旅行");
  assert.equal(
    saved.snapshot.draft.preparations.classic.flights[0].status,
    "queued",
  );
  d.preparations.classic.flights[0].arrival = "bad";
  assert.equal(
    parseSavedTrip(
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        snapshot: tripSnapshot(s, d),
      }),
      s,
    ),
    null,
  );
});
test("completion receipt invalidates on edits but never on map selection", () => {
  const s = seed(),
    d = emptyDetailDraft(),
    p = prep.emptyPreparation();
  const key = prep.preparationFingerprint(s, d, p);
  s.ui.selectedTripItemId = "another";
  assert.equal(prep.preparationFingerprint(s, d, p), key);
  currentPlan(s).name = "updated";
  assert.notEqual(prep.preparationFingerprint(s, d, p), key);
});
test("full-trip issues preserve independent booking and conflict categories; confirmed flight clears only booking", () => {
  const s = seed(),
    p = { ...prep.emptyPreparation(), flights: [flight] };
  const items = currentPlan(s).days.flatMap((d) =>
    detailRailItems(s, d.day, [], []),
  );
  const issues = prep.preparationIssues(s, items, p);
  assert.ok(issues.some((i) => i.flightId === "f" && i.tone === "booking"));
  assert.ok(issues.some((i) => i.itemId));
  p.flights[0] = { ...flight, status: "confirmed" };
  assert.equal(
    prep
      .preparationIssues(s, items, p)
      .some((i) => i.flightId === "f" && i.tone === "booking"),
    false,
  );
});
test("no-flight is a deliberate alternative to missing flight information", () => {
  const s = seed();
  assert.ok(
    prep
      .preparationIssues(s, [], prep.emptyPreparation())
      .some((i) => i.id === "flight-missing"),
  );
  assert.equal(
    prep
      .preparationIssues(s, [], {
        ...prep.emptyPreparation(),
        noFlight: true,
      })
      .some((i) => i.id === "flight-missing"),
    false,
  );
});
const person = {
  id: "p",
  displayName: "Test",
  relationship: "本人",
  ageGroup: "adult",
  mobilityNeeds: [],
  diningNeeds: [],
  activityPreferences: [],
  isSelf: true,
};
test("shared companion library rejects invalid JSON and dangling group references", () => {
  assert.equal(lib.parseCompanionLibrary("bad"), null);
  assert.equal(
    lib.parseCompanionLibrary(
      JSON.stringify({
        version: 1,
        companions: [person],
        groups: [
          { id: "g", name: "G", description: "", companionIds: ["missing"] },
        ],
      }),
    ),
    null,
  );
});
test("companion writes are explicit, atomic and refuse another tab's edit", () => {
  let raw = null;
  const storage = {
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  };
  const data = { version: 1, companions: [person], groups: [] };
  const next = lib.writeCompanionLibrary(storage, data, null);
  assert.equal(lib.parseCompanionLibrary(next).companions[0].id, "p");
  assert.throws(
    () => lib.writeCompanionLibrary(storage, data, null),
    /另一页面/,
  );
  assert.equal(raw, next);
});
test("storage failure never reports a successful save or erases the previous record", () => {
  let raw = "old";
  const storage = {
    getItem: () => raw,
    setItem: () => {
      throw Error("quota");
    },
  };
  assert.throws(
    () =>
      lib.writeCompanionLibrary(
        storage,
        { version: 1, companions: [person], groups: [] },
        "old",
      ),
    /quota/,
  );
  assert.throws(
    () =>
      saveBrowserTrip(storage, tripSnapshot(seed(), emptyDetailDraft()), "old"),
    /quota/,
  );
  assert.equal(raw, "old");
});
