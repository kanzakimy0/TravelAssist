import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readAllTrips,
  belongsToTab,
  visibleTrips,
  selectLiveHero,
  tripDateLabel,
  tripLibraryErrorMessage,
} from "../src/features/trip-library/persistence/live-trip-model.ts";
const summary = (i, extra = {}) => ({
  id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
  libraryState: "draft",
  canonicalTripId: null,
  storageRevision: 1,
  title: "京都 Trip " + i,
  destinations: ["京都"],
  departure: null,
  returning: null,
  participantCount: 1,
  wizardPhase: "trip_basics",
  planStatus: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  frozenAt: null,
  ...extra,
});
const page = (items, nextCursor = null) => ({
  schemaVersion: "1.0",
  items,
  nextCursor,
});
test("TASK-061 API pagination includes row 51 and keeps highest revision for duplicate IDs", async () => {
  const first = Array.from({ length: 50 }, (_, i) => summary(i)),
    calls = [];
  const result = await readAllTrips(async (query) => {
    calls.push(query);
    return query.cursor
      ? page([
          summary(49, { storageRevision: 2, title: "Updated" }),
          summary(50),
          summary(51),
        ])
      : page(first, "next_A");
  });
  assert.equal(result.length, 52);
  assert.equal(result.find((r) => r.id === summary(49).id).title, "Updated");
  assert.deepEqual(calls, [
    { state: "all", limit: 50 },
    { state: "all", limit: 50, cursor: "next_A" },
  ]);
  assert.equal(first[49].title, "京都 Trip 49");
});
test("TASK-061 cursor loops, empty continuation and abort reject rather than exposing incomplete counts", async () => {
  await assert.rejects(
    () => readAllTrips(async () => page([summary(1)], "loop")),
    { code: "TRIP_LIBRARY_UNAVAILABLE" },
  );
  await assert.rejects(() => readAllTrips(async () => page([], "next")), {
    code: "TRIP_LIBRARY_UNAVAILABLE",
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () =>
      readAllTrips(async () => {
        throw new Error("must not request");
      }, controller.signal),
    { name: "AbortError" },
  );
  const during = new AbortController();
  await assert.rejects(
    () =>
      readAllTrips(async () => {
        during.abort();
        return page([summary(1)]);
      }, during.signal),
    { name: "AbortError" },
  );
});
test("TASK-061 persisted history membership is independent of date timing; unknowns remain unclassified", () => {
  const futureHistory = summary(1, {
    libraryState: "history",
    departure: "2030-01-01",
    returning: "2030-01-03",
  });
  const pastSaved = summary(2, {
    libraryState: "saved",
    departure: "2025-01-01",
    returning: "2025-01-03",
  });
  assert.equal(belongsToTab(futureHistory, "history", "2026-09-13"), true);
  assert.equal(belongsToTab(pastSaved, "history", "2026-09-13"), false);
  for (const trip of [futureHistory, pastSaved, summary(3)])
    assert.equal(belongsToTab(trip, "all", "2026-09-13"), true);
  assert.equal(belongsToTab(summary(4), "upcoming", "2026-09-13"), false);
  assert.equal(belongsToTab(futureHistory, "favorites", "2026-09-13"), false);
  assert.match(tripDateLabel(summary(4)), /未设置/);
});
test("TASK-061 real text/destination filters and stable date sorts retain nulls without mutating server records", () => {
  const items = [
      summary(1, { departure: "2026-10-01" }),
      summary(2, { departure: "2026-09-15" }),
      summary(3),
      summary(4, { destinations: ["東京"] }),
    ],
    before = structuredClone(items);
  const select = (sort) =>
    visibleTrips(items, "all", "2026-09-13", "TRIP", "京都", sort).map(
      (r) => r.id,
    );
  assert.deepEqual(select("departureAsc"), [
    summary(2).id,
    summary(1).id,
    summary(3).id,
  ]);
  assert.deepEqual(select("departureDesc"), [
    summary(1).id,
    summary(2).id,
    summary(3).id,
  ]);
  assert.deepEqual(items, before);
  assert.equal(
    visibleTrips(items, "all", "2026-09-13", "東京", "all", "updatedDesc")
      .length,
    1,
  );
});
test("TASK-061 hero uses canonical timing, excludes drafts/history/unknown dates, and prioritizes ongoing saved trips", () => {
  const ongoing = summary(1, {
    libraryState: "saved",
    departure: "2026-09-12",
    returning: "2026-09-14",
  });
  const next = summary(2, {
    libraryState: "saved",
    departure: "2026-12-01",
    returning: "2026-12-03",
  });
  const history = summary(3, {
    ...ongoing,
    id: summary(3).id,
    libraryState: "history",
  });
  const draft = summary(4, {
    ...ongoing,
    id: summary(4).id,
    libraryState: "draft",
  });
  assert.equal(
    selectLiveHero([next, draft, history, summary(5), ongoing], "2026-09-13")
      .id,
    ongoing.id,
  );
  assert.equal(
    selectLiveHero([history, draft, summary(5)], "2026-09-13"),
    null,
  );
});
test("TASK-061 UI errors never expose transport internals", () => {
  assert.doesNotMatch(
    tripLibraryErrorMessage(new Error("secret-url-and-token")),
    /secret|token/,
  );
});
