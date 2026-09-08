import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTripLibraryFixture } from "../src/features/trip-library/trip-library-data.ts";
import {
  cloneHistoryTripToDraft,
  deleteDraft,
  removeFavorite,
  toggleHistoryFavorite,
} from "../src/features/trip-library/trip-library-model.ts";
import {
  activeTrips,
  asHistoryTrip,
  buildAllTripItems,
  getTripTiming,
  paginateAllTrips,
  selectHeroTrip,
  sortAllTripItems,
  tripTimingLabels,
} from "../src/features/trip-library/trip-timing.ts";

const today = "2027-03-01";
const fixture = createTripLibraryFixture();
const trip = (id, startDate, endDate = startDate) => ({
  ...fixture.trips[0],
  id,
  startDate,
  endDate,
});
const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

for (const [description, start, end, expected] of [
  ["31 days", "2027-04-01", "2027-04-03", "next"],
  ["30 days", "2027-03-31", "2027-04-03", "upcoming"],
  ["2 days", "2027-03-03", "2027-03-04", "upcoming"],
  ["1 day", "2027-03-02", "2027-03-04", "ongoing"],
  ["departure today", today, "2027-03-04", "ongoing"],
  ["started, not ended", "2027-02-27", "2027-03-04", "ongoing"],
  ["last day inclusive", "2027-02-27", today, "ongoing"],
  ["ended yesterday", "2027-02-27", "2027-02-28", "completed"],
])
  test(`date-only boundary: ${description}`, () =>
    assert.equal(getTripTiming(start, end, today), expected));

test("calendar boundaries, leap dates, DST and invalid dates", () => {
  assert.equal(
    getTripTiming("2028-03-01", "2028-03-02", "2028-02-28"),
    "upcoming",
  );
  assert.equal(
    getTripTiming("2027-01-01", "2027-01-03", "2026-12-31"),
    "ongoing",
  );
  assert.equal(
    getTripTiming("2027-03-15", "2027-03-16", "2027-03-13"),
    "upcoming",
  );
  for (const dates of [
    ["2027-02-29", today, today],
    [today, "2027-02-28", today],
    [today, today, "bad"],
    ["2027-3-1", today, today],
  ])
    assert.equal(getTripTiming(...dates), null);
});

test("Hero prioritizes ongoing > upcoming > next, then earliest start, deterministic id tie", () => {
  const next = trip("next", "2027-05-01"),
    upcoming = trip("upcoming", "2027-03-10");
  const ongoing = trip("ongoing", "2027-02-28", "2027-03-02");
  assert.equal(selectHeroTrip([next, upcoming, ongoing], today)?.id, "ongoing");
  assert.equal(selectHeroTrip([next, upcoming], today)?.id, "upcoming");
  assert.equal(selectHeroTrip([next], today)?.id, "next");
  assert.equal(
    selectHeroTrip([next, trip("closer", "2027-04-01")], today)?.id,
    "closer",
  );
  assert.equal(
    selectHeroTrip([trip("b", "2027-03-03"), trip("a", "2027-03-03")], today)
      ?.id,
    "a",
  );
});

test("dated and undated Drafts, ended Trips and History never become Hero", () => {
  const draft = {
    ...fixture.drafts[0],
    startDate: today,
    endDate: "2027-03-03",
  };
  assert.equal(
    selectHeroTrip(
      [
        draft,
        fixture.drafts[1],
        trip("old", "2027-02-20"),
        { ...fixture.history[0], startDate: today, endDate: today },
      ],
      today,
    ),
    null,
  );
  assert.equal(selectHeroTrip([], today), null);
});

test("All includes active formal Trips + Draft, excludes history/favorites/completed and Hero", () => {
  const hero = selectHeroTrip(fixture.trips, today);
  const items = buildAllTripItems(
    [...fixture.trips, ...fixture.history, trip("ended", "2027-02-20")],
    fixture.drafts,
    today,
    hero.id,
  );
  assert.ok(items.some((entry) => entry.kind === "trip"));
  assert.equal(
    items.filter((entry) => entry.kind === "draft").length,
    fixture.drafts.length,
  );
  assert.ok(
    !items.some(
      ({ item }) =>
        item.id === hero.id ||
        item.id === "ended" ||
        item.id.startsWith("history-") ||
        item.id.startsWith("favorite-"),
    ),
  );
  assert.equal(
    buildAllTripItems([], fixture.drafts, today).length,
    fixture.drafts.length,
  );
  assert.deepEqual(activeTrips([trip("ended", "2027-02-20")], today), []);
});

test("default mixed dates ascending, no-date drafts last sorted updatedAt descending, inputs immutable", () => {
  const items = buildAllTripItems(fixture.trips, fixture.drafts, today);
  const snapshot = structuredClone(items);
  const sorted = sortAllTripItems(items);
  const dated = sorted.filter(({ item }) => item.startDate);
  assert.deepEqual(
    dated.map(({ item }) => item.startDate),
    dated.map(({ item }) => item.startDate).sort(),
  );
  const undated = sorted.filter(({ item }) => !item.startDate);
  assert.deepEqual(sorted.slice(-undated.length), undated);
  assert.deepEqual(
    undated.map(({ item }) => item.updatedAt),
    undated
      .map(({ item }) => item.updatedAt)
      .sort()
      .reverse(),
  );
  assert.ok(dated.some(({ kind }) => kind === "draft"));
  assert.deepEqual(items, snapshot);
  const mislabeled = {
    ...fixture.drafts[0],
    dateLabel: "2020-01-01",
    startDate: undefined,
  };
  assert.equal(
    sortAllTripItems(buildAllTripItems(fixture.trips, [mislabeled], today)).at(
      -1,
    ).item.id,
    mislabeled.id,
  );
});

test("eight actual cards per page, every ninth-plus card reachable, clamping and empties", () => {
  const items = buildAllTripItems(
    fixture.trips,
    fixture.drafts,
    today,
    selectHeroTrip(fixture.trips, today).id,
  );
  assert.ok(items.length > 8);
  const first = paginateAllTrips(items, 1),
    second = paginateAllTrips(items, 2);
  assert.equal(first.items.length, 8);
  assert.deepEqual([...first.items, ...second.items], items);
  assert.equal(
    new Set([...first.items, ...second.items].map(({ item }) => item.id)).size,
    items.length,
  );
  assert.equal(paginateAllTrips(items, 999).page, second.page);
  assert.equal(paginateAllTrips(items, -1).page, 1);
  assert.deepEqual(paginateAllTrips([], 3), {
    page: 1,
    pageCount: 1,
    total: 0,
    items: [],
  });
});

test("existing Draft delete, History clone and Favorites stay immutable and in-memory", () => {
  const before = structuredClone(fixture);
  const deleted = deleteDraft(fixture.drafts, "draft-tokyo-family");
  assert.equal(deleted.partnerCancellationTriggered, false);
  assert.equal(deleted.drafts.length, fixture.drafts.length - 1);
  const cloned = cloneHistoryTripToDraft(fixture.history[0]);
  assert.equal(cloned.hasExternalReservation, false);
  assert.equal(cloned.startDate, undefined);
  assert.equal(selectHeroTrip([cloned], today), null);
  assert.equal(
    toggleHistoryFavorite(fixture.history, fixture.history[0].id)[0].favorite,
    !fixture.history[0].favorite,
  );
  assert.equal(
    removeFavorite(fixture.favorites, fixture.favorites[0].id).length,
    fixture.favorites.length - 1,
  );
  assert.deepEqual(fixture, before);
  const ended = asHistoryTrip(trip("ended", "2027-02-20"));
  assert.equal(ended.phase, "history");
  assert.equal(
    getTripTiming(ended.startDate, ended.endDate, today),
    "completed",
  );
});

test("Home and library import the same portable helper; no persistence or business integration added", () => {
  const helper = read("src/features/trip-library/trip-timing.ts");
  assert.doesNotMatch(helper, /from ["']react|Date\.now|new Date\(\)/);
  for (const file of [
    "src/features/personal-center/components/personal-home-preview.tsx",
    "src/features/trip-library/trip-library-page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /selectHeroTrip/);
    assert.match(source, /tripTimingLabels/);
    assert.doesNotMatch(
      source,
      /localStorage|sessionStorage|document\.cookie|supabase|fetch\(/i,
    );
  }
  assert.deepEqual(tripTimingLabels, {
    next: "下一次旅行",
    upcoming: "即将出发",
    ongoing: "旅行进行中",
    completed: "已完成",
  });
});
