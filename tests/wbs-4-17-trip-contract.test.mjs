import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/shared/contracts/trips")) {
      return nextResolve(
        new URL("../src/shared/contracts/trips/index.ts", import.meta.url).href,
        context,
      );
    }
    if (
      context.parentURL?.includes("/src/shared/contracts/trips/") &&
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { stepDraftToTripFacts, stepProgressToContract } =
  await import("../src/features/start-flow/model/trip-contract-adapter.ts");
const { createTripWizardDraft } =
  await import("../src/features/start-flow/model/start-flow-draft.ts");
const {
  parseTripDraftFacts,
  parseTripPlanSnapshot,
  parseWizardProgress,
  parsePlannerResume,
  summarizeTrip,
  knownCode,
  ITEM_KINDS,
  BOOKING_STATUSES,
  LOCK_LEVELS,
} = await import("../src/shared/contracts/trips/index.ts");
import {
  minimalDraftFixture,
  fullDraftFixture,
  progressFixture,
  minimalSnapshotFixture,
  fullSnapshotFixture,
  itemFixture,
} from "../src/shared/contracts/trips/fixtures.ts";

function reject(result, code) {
  assert.equal(result.ok, false);
  if (code) assert.equal(result.issue.code, code);
  assert.equal("value" in result, false);
}

const adapterContext = {
  title: "合成转换测试",
  defaultTimezone: "Asia/Tokyo",
  currency: "JPY",
  minorUnitExponent: 0,
  resolveDestinationId: () => null,
  resolveAnchorId: (localId) => `synthetic-${localId}`,
};

test("real Step draft producer maps facts without copying long-term preferences", () => {
  const input = createTripWizardDraft({
    familiarity: "first",
    likes: ["美食"],
    travelStyle: { pace: 5 },
    destinations: ["东京", "更多地区"],
    selectedPrefectures: ["京都府"],
    dateMode: "planned",
    plannedDeparture: "2027年春季",
    plannedReturn: "2027年4月上旬",
    party: { seniors: 1 },
    travelerDetails: { childAge: "6", stroller: true },
    budgetDetails: { totalBudget: "120000", diningPerDay: "0" },
    anchors: {
      hotels: [
        {
          id: "local-hotel",
          source: "manual",
          hotelName: "样例酒店",
          city: "东京",
          checkIn: "2027-04-10",
          checkOut: "2027-04-12",
          address: "手动地址",
        },
      ],
    },
  });
  const before = JSON.stringify(input);
  const result = stepDraftToTripFacts(input, adapterContext);
  assert.equal(result.ok, true);
  assert.equal(result.value.participants.seniors, 1);
  assert.equal(result.value.participantNeeds.childAgeInput, "6");
  assert.equal(result.value.participantNeeds.stroller, true);
  assert.equal(result.value.fixedArrangements.hotels[0].inputMethod, "manual");
  assert.equal(result.value.fixedArrangements.hotels[0].address, "手动地址");
  assert.equal(
    result.value.fixedArrangements.hotels[0].id,
    "synthetic-local-hotel",
  );
  assert.equal(result.value.dates.plannedDeparture.part, "spring");
  assert.equal(result.value.dates.departure, null);
  assert.equal(result.value.destinations.length, 2);
  assert.equal(result.value.budget.diningPerDayMinor, 0);
  assert.equal("likes" in result.value, false);
  assert.equal("familiarity" in result.value, false);
  assert.equal(JSON.stringify(input), before);
});

test("adapter requires explicit currency precision and does not round legacy amount text", () => {
  const draft = createTripWizardDraft({
    budgetDetails: { totalBudget: "12.34" },
  });
  reject(stepDraftToTripFacts(draft, adapterContext), "INVALID_MINOR_AMOUNT");
  const result = stepDraftToTripFacts(draft, {
    ...adapterContext,
    currency: "USD",
    minorUnitExponent: 2,
  });
  assert.equal(result.value.budget.totalMinor, 1234);
  reject(
    stepDraftToTripFacts(draft, {
      ...adapterContext,
      minorUnitExponent: undefined,
    }),
    "INVALID_CURRENCY_EXPONENT",
  );
});

test("adapter does not guess unknown planned dates or reuse unresolved anchor identity", () => {
  const draft = createTripWizardDraft({
    dateMode: "planned",
    plannedDeparture: "圣诞节",
  });
  reject(
    stepDraftToTripFacts(draft, adapterContext),
    "UNSUPPORTED_PLANNED_DATE",
  );
  draft.plannedDeparture = "";
  draft.anchors.activities = [
    {
      id: "local",
      source: "manual",
      activityName: "测试",
      date: "",
      time: "",
      location: "",
      fixed: false,
      nonCancellable: false,
    },
  ];
  reject(
    stepDraftToTripFacts(draft, {
      ...adapterContext,
      resolveAnchorId: () => "",
    }),
    "INVALID_STRING",
  );
});

test("real UI step index maps both 4/4 views without inventing completion", () => {
  assert.equal(
    stepProgressToContract(3, "generating").value.phase,
    "generating",
  );
  assert.equal(
    stepProgressToContract(3, "complete").value.phase,
    "plan_selection",
  );
  assert.deepEqual(stepProgressToContract(2, "idle").value.completedPhases, []);
  reject(stepProgressToContract(4, "idle"), "UNSUPPORTED_VALUE");
});

test("minimal/full draft, snapshot and five-view progress examples validate", () => {
  for (const fixture of [minimalDraftFixture(), fullDraftFixture()])
    assert.equal(parseTripDraftFacts(fixture).ok, true);
  for (const fixture of [minimalSnapshotFixture(), fullSnapshotFixture()])
    assert.equal(parseTripPlanSnapshot(fixture).ok, true);
  assert.equal(parseWizardProgress(progressFixture()).ok, true);
});

test("parsing makes a detached JSON value and never mutates the source", () => {
  const original = fullSnapshotFixture();
  const before = JSON.stringify(original);
  const parsed = parseTripPlanSnapshot(original);
  assert.equal(parsed.ok, true);
  parsed.value.plans[0].days[0].items[0].title = "changed";
  assert.equal(JSON.stringify(original), before);
});

test("required null differs from absent, blank, zero and an empty collection", () => {
  const draft = minimalDraftFixture();
  delete draft.title;
  reject(parseTripDraftFacts(draft), "MISSING_FIELD");
  draft.title = "";
  reject(parseTripDraftFacts(draft), "INVALID_STRING");
  draft.title = null;
  assert.equal(parseTripDraftFacts(draft).ok, true);
  const full = fullDraftFixture();
  assert.equal(parseTripDraftFacts(full).value.budget.diningPerDayMinor, 0);
});

for (const key of [
  "owner_user_id",
  "preferences",
  "snapshot",
  "mapbox",
  "access_token",
  "ui",
  "profile_settings",
  "generatedPlans",
]) {
  test(`draft rejects private/other-owner field ${key}`, () => {
    reject(
      parseTripDraftFacts({ ...minimalDraftFixture(), [key]: "private" }),
      "UNKNOWN_FIELD",
    );
  });
}

test("unknown fields cannot leak at nested boundaries either", () => {
  const fixture = fullSnapshotFixture();
  fixture.plans[0].days[0].items[0].booking.token = "DO_NOT_ECHO";
  const result = parseTripPlanSnapshot(fixture);
  reject(result, "UNKNOWN_FIELD");
  assert.equal(JSON.stringify(result).includes("DO_NOT_ECHO"), false);
});

for (const value of [
  null,
  [],
  3,
  "json",
  undefined,
  Object.create({ contractVersion: "1.0" }),
]) {
  test(`rejects non-JSON object input ${String(value)}`, () =>
    reject(parseTripDraftFacts(value)));
}

test("does not execute an input getter", () => {
  const value = minimalDraftFixture();
  Object.defineProperty(value, "title", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    },
  });
  reject(parseTripDraftFacts(value), "INVALID_JSON_VALUE");
});

test("unknown contract version fails closed before consumer projection", () => {
  const fixture = fullSnapshotFixture();
  fixture.contractVersion = "2.0";
  reject(summarizeTrip(fixture), "UNSUPPORTED_VALUE");
});

test("future enum codes display unknown, never a normal confirmation or unlocked permission", () => {
  const fixture = fullSnapshotFixture();
  fixture.trip.status = "future_state";
  const item = fixture.plans[0].days[0].items[0];
  item.kind = "future_kind";
  item.booking.status = "future_booking";
  item.lockLevel = "future_lock";
  item.assessment = "future_assessment";
  assert.equal(parseTripPlanSnapshot(fixture).ok, true);
  assert.equal(summarizeTrip(fixture).value.status, "unknown");
  assert.equal(summarizeTrip(fixture).value.needsAttention, 2);
  assert.equal(knownCode(item.kind, ITEM_KINDS), "unknown");
  assert.equal(knownCode(item.booking.status, BOOKING_STATUSES), "unknown");
  assert.equal(knownCode(item.lockLevel, LOCK_LEVELS), "unknown");
});

for (const date of [
  "2027-02-29",
  "2027-04-31",
  "0000-01-01",
  "2027-1-01",
  "tomorrow",
]) {
  test(`rejects invalid local date ${date}`, () => {
    const fixture = fullDraftFixture();
    fixture.dates.departure = date;
    reject(parseTripDraftFacts(fixture), "INVALID_LOCAL_DATE");
  });
}

test("exact date arithmetic checks order and inclusive duration", () => {
  const fixture = fullDraftFixture();
  fixture.dates.returning = "2027-04-09";
  reject(parseTripDraftFacts(fixture), "REVERSED_DATES");
  fixture.dates.returning = "2027-04-12";
  fixture.dates.durationDays = 2;
  reject(parseTripDraftFacts(fixture), "DURATION_MISMATCH");
});

test("approximate season remains approximate, not a guessed departure date", () => {
  const fixture = minimalDraftFixture();
  fixture.dates.mode = "planned";
  fixture.dates.plannedDeparture = { year: 2027, month: null, part: "spring" };
  assert.equal(parseTripDraftFacts(fixture).ok, true);
  fixture.dates.plannedDeparture.month = 4;
  reject(parseTripDraftFacts(fixture), "INVALID_APPROXIMATE_DATE");
  fixture.dates.plannedDeparture = { year: 2027, month: 4, part: "early" };
  fixture.dates.departure = "2027-04-01";
  reject(parseTripDraftFacts(fixture), "INACTIVE_DATE_FIELDS");
});

test("money and participant input do not coerce invalid or imprecise numbers", () => {
  for (const value of [
    -1,
    1.5,
    "1000",
    Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    const fixture = fullDraftFixture();
    fixture.budget.totalMinor = value;
    reject(parseTripDraftFacts(fixture), "INVALID_INTEGER");
  }
  const fixture = fullDraftFixture();
  fixture.participants.seniors = -1;
  reject(parseTripDraftFacts(fixture), "INVALID_INTEGER");
  fixture.participants.seniors = 0;
  fixture.budget.currency = "円";
  reject(parseTripDraftFacts(fixture), "INVALID_CURRENCY_CODE");
});

test("known coordinates are bounded; missing place facts stay null", () => {
  const fixture = fullDraftFixture();
  fixture.destinations[0].coordinates = { longitude: 181, latitude: 0 };
  reject(parseTripDraftFacts(fixture), "INVALID_LONGITUDE");
  fixture.destinations[0].coordinates = { longitude: 0, latitude: -91 };
  reject(parseTripDraftFacts(fixture), "INVALID_LATITUDE");
  fixture.destinations[0].coordinates = null;
  assert.equal(parseTripDraftFacts(fixture).ok, true);
});

test("fixed arrangements validate local time and hotel nights but do not claim booking", () => {
  const fixture = fullDraftFixture();
  fixture.fixedArrangements.flights[0].departureTime = "24:00";
  reject(parseTripDraftFacts(fixture), "INVALID_LOCAL_TIME");
  fixture.fixedArrangements.flights[0].departureTime = "00:00";
  fixture.fixedArrangements.hotels[0].checkOut = "2027-04-10";
  reject(parseTripDraftFacts(fixture), "INVALID_STAY_DATES");
});

test("duplicate entity identifiers and dangling active plan are rejected", () => {
  const fixture = fullSnapshotFixture();
  fixture.trip.activePlanId = "missing";
  reject(parseTripPlanSnapshot(fixture), "DANGLING_ACTIVE_PLAN");
  fixture.trip.activePlanId = "example-plan";
  fixture.plans[0].days[0].alternatives[0].id =
    fixture.plans[0].days[0].items[0].id;
  reject(parseTripPlanSnapshot(fixture), "DUPLICATE_ID");
});

test("draft arrangement IDs cannot collide across categories", () => {
  const fixture = fullDraftFixture();
  fixture.fixedArrangements.hotels[0].id =
    fixture.fixedArrangements.flights[0].id;
  reject(parseTripDraftFacts(fixture), "DUPLICATE_ID");
});

test("day ordering is explicit, not parsed from an ID or display label", () => {
  const fixture = fullSnapshotFixture();
  fixture.plans[0].days[1].dayNumber = 4;
  reject(parseTripPlanSnapshot(fixture), "INVALID_DAY_ORDER");
});

test("schedule must have an explicit offset and match its timezone", () => {
  const fixture = fullSnapshotFixture();
  const schedule = fixture.plans[0].days[0].items[0].schedule;
  schedule.start = "2027-04-10T10:00:00";
  reject(parseTripPlanSnapshot(fixture), "INVALID_INSTANT");
  schedule.start = "2027-04-10T10:00:00+08:00";
  schedule.end = "2027-04-10T12:00:00+09:00";
  reject(parseTripPlanSnapshot(fixture), "TIMEZONE_OFFSET_MISMATCH");
});

test("overnight transport has separate start/end zones and belongs to departure day", () => {
  const fixture = fullSnapshotFixture();
  const item = fixture.plans[0].days[0].items[0];
  item.kind = "flight";
  item.schedule = {
    start: "2027-04-10T23:00:00+09:00",
    end: "2027-04-11T14:00:00+01:00",
    startTimezone: "Asia/Tokyo",
    endTimezone: "Europe/London",
  };
  assert.equal(parseTripPlanSnapshot(fixture).ok, true);
  item.schedule.end = "2027-04-10T10:00:00+01:00";
  reject(parseTripPlanSnapshot(fixture), "INVALID_TIME_RANGE");
});

test("DST nonexistent local time is rejected; repeated time with explicit offset is valid", () => {
  const fixture = fullSnapshotFixture();
  const day = fixture.plans[0].days[0];
  day.timezone = "America/New_York";
  day.localDate = "2027-03-14";
  day.items[0].schedule = {
    start: "2027-03-14T02:30:00-05:00",
    end: "2027-03-14T04:30:00-04:00",
    startTimezone: day.timezone,
    endTimezone: day.timezone,
  };
  reject(parseTripPlanSnapshot(fixture), "TIMEZONE_OFFSET_MISMATCH");
  day.localDate = "2027-11-07";
  day.items[0].schedule = {
    start: "2027-11-07T01:30:00-04:00",
    end: "2027-11-07T01:30:00-05:00",
    startTimezone: day.timezone,
    endTimezone: day.timezone,
  };
  assert.equal(parseTripPlanSnapshot(fixture).ok, true);
});

test("booking status and assessment remain separate; confirmed requires normalized evidence", () => {
  const fixture = fullSnapshotFixture();
  const item = fixture.plans[0].days[0].items[0];
  item.booking.status = "confirmed";
  reject(parseTripPlanSnapshot(fixture), "MISSING_BOOKING_EVIDENCE");
  item.booking.referenceId = "synthetic-confirmation";
  item.booking.verifiedAt = "2026-09-08T00:00:00Z";
  item.assessment = "critical";
  assert.equal(parseTripPlanSnapshot(fixture).ok, true);
  assert.equal(summarizeTrip(fixture).value.needsAttention, 2);
});

test("Consumer summary excludes alternatives and hands back stable revisioned identity", () => {
  const result = summarizeTrip(
    JSON.parse(JSON.stringify(fullSnapshotFixture())),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.dayCount, 3);
  assert.equal(result.value.itemCount, 2);
  assert.deepEqual(result.value.resume, {
    contractVersion: "1.0",
    tripId: "example-trip",
    planId: "example-plan",
    tripRevision: 4,
    planRevision: 3,
  });
  assert.equal(parsePlannerResume(result.value.resume).ok, true);
  assert.equal(summarizeTrip(minimalSnapshotFixture()).value.resume, null);
});

test("resume rejects URLs, owner IDs and stale-version coercion; authorization stays server-side", () => {
  const resume = summarizeTrip(fullSnapshotFixture()).value.resume;
  reject(
    parsePlannerResume({ ...resume, url: "https://invalid.test" }),
    "UNKNOWN_FIELD",
  );
  reject(
    parsePlannerResume({ ...resume, tripRevision: "4" }),
    "INVALID_INTEGER",
  );
});

test("progress supports generating and results without inventing a 5/5 UI index", () => {
  const progress = progressFixture();
  progress.phase = "generating";
  assert.equal(parseWizardProgress(progress).ok, true);
  progress.completedPhases.push("generating");
  reject(parseWizardProgress(progress), "DUPLICATE_PHASE");
});

test("size limits reject oversized collections before nested parsing", () => {
  const fixture = fullSnapshotFixture();
  fixture.plans[0].days[0].items = Array(1001).fill(itemFixture());
  reject(parseTripPlanSnapshot(fixture), "INVALID_ARRAY");
});

test("canonical modules do not import React, a private feature, Provider SDK or DB client", async () => {
  const root = new URL("../src/shared/contracts/trips/", import.meta.url);
  for (const file of await readdir(root)) {
    if (!file.endsWith(".ts")) continue;
    const source = await readFile(new URL(file, root), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    assert.ok(
      imports.every((path) => path.startsWith("./")),
      `${file}: public contract imports private dependency`,
    );
  }
});
