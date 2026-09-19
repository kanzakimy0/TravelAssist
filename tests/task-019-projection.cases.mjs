import assert from "node:assert/strict";
import { test } from "node:test";
import {
  snapshotFixture,
  boundaryFixture,
  semanticSnapshot,
} from "./task-019-fixtures.mjs";
import {
  validatedSnapshot,
  itemToRow,
  rowsToSnapshot,
  zonedInstant,
} from "../src/server/trips/projection.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { knownCode } from "../src/shared/contracts/trips/index.ts";

function mockRows(s) {
  const audit = {
    createdAt: new Date(),
    updatedAt: new Date(),
    revisionTxid: 1n,
  };
  return {
    trip: {
      ...s.trip,
      ...audit,
      ownerUserId: "unused",
      provenance: s.provenance,
    },
    plans: s.plans.map((p, position) => ({
      ...p,
      ...audit,
      tripId: s.trip.id,
      position,
    })),
    days: s.plans.flatMap((p) =>
      p.days.map((d) => ({ ...d, ...audit, planId: p.id })),
    ),
    items: s.plans.flatMap((p) =>
      p.days.flatMap((d) => [
        ...d.items.map((i, n) => ({
          ...itemToRow(i, d.id, "scheduled", n),
          ...audit,
        })),
        ...d.alternatives.map((i, n) => ({
          ...itemToRow(i, d.id, "alternative", n),
          ...audit,
        })),
      ]),
    ),
  };
}
for (const [name, fixture] of [
  ["minimum", () => snapshotFixture(false)],
  ["full / multi-plan / multi-day / buckets", snapshotFixture],
  ["booking / unknown / DST / cross-zone / repeated date", boundaryFixture],
])
  test(`projection round-trip ${name}`, () => {
    const s = validatedSnapshot(fixture());
    const rows = mockRows(s);
    assert.deepEqual(
      semanticSnapshot(rowsToSnapshot(rows)),
      semanticSnapshot(s),
    );
    assert.equal(rowsToSnapshot(rows).trip.activePlanId, s.trip.activePlanId);
  });
test("DB-authored root timestamp and revision survive read", () => {
  const rows = mockRows(snapshotFixture());
  rows.trip.revision = 42;
  rows.plans[0].revision = 9;
  const s = rowsToSnapshot(rows);
  assert.equal(s.trip.revision, 42);
  assert.equal(s.plans[0].revision, 9);
  assert.equal(s.updatedAt, rows.trip.updatedAt.toISOString());
});
for (const [name, change, code] of [
  ["legacy ID", (s) => (s.trip.id = "example-trip"), "UUID_REQUIRED"],
  [
    "duplicate day",
    (s) => (s.plans[0].days[1].dayNumber = 1),
    "INVALID_CONTRACT",
  ],
  [
    "duplicate item",
    (s) => s.plans[0].days[0].alternatives.push(s.plans[0].days[0].items[0]),
    "INVALID_CONTRACT",
  ],
  [
    "dangling active",
    (s) => (s.trip.activePlanId = "missing"),
    "INVALID_CONTRACT",
  ],
  [
    "confirmed missing evidence",
    (s) => (s.plans[0].days[0].items[0].booking.status = "confirmed"),
    "INVALID_CONTRACT",
  ],
  [
    "invalid timezone",
    (s) => (s.trip.defaultTimezone = "Moon/Example"),
    "INVALID_CONTRACT",
  ],
  ["private field", (s) => (s.secret = "do-not-save"), "INVALID_CONTRACT"],
])
  test(`reject ${name} before DB access`, async () => {
    const s = snapshotFixture();
    change(s);
    const repo = createTripRepository(
      { auth: { getUser: () => assert.fail("Auth must not run") } },
      () => assert.fail("DB must not run"),
    );
    await assert.rejects(repo.create(s), (e) => e.code === code);
  });
test("new trees require revision 1 (existing revisions are not silently reset)", async () => {
  const s = snapshotFixture();
  s.trip.revision = 4;
  await assert.rejects(
    createTripRepository({}, () => assert.fail()).create(s),
    (e) => e.code === "INITIAL_REVISION_REQUIRED",
  );
});
test("unauthenticated cannot open DAL connection", async () => {
  const repo = createTripRepository(
    { auth: { getUser: async () => ({ data: { user: null }, error: null }) } },
    () => assert.fail(),
  );
  await assert.rejects(
    repo.read(snapshotFixture(false).trip.id),
    (e) => e.code === "UNAUTHENTICATED",
  );
});
test("future status fallback remains conservative", () =>
  assert.equal(knownCode("future_status", ["ok"]), "unknown"));
test("subsecond instant and DST zone output retain actual instant", () => {
  for (const [at, zone] of [
    ["2027-11-07T05:30:00.123Z", "America/New_York"],
    ["2027-11-07T06:30:00.123Z", "America/New_York"],
    ["2027-01-01T00:00:00.999Z", "Asia/Kathmandu"],
  ])
    assert.equal(Date.parse(zonedInstant(new Date(at), zone)), Date.parse(at));
});
test("invalid persisted contract fails closed", () => {
  const rows = mockRows(snapshotFixture());
  rows.days[0].timezone = "Moon/Example";
  assert.throws(
    () => rowsToSnapshot(rows),
    (e) => e.code === "INVALID_DB_STATE",
  );
});
