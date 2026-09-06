import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { createTripLibraryFixture } from "../src/features/trip-library/trip-library-data.ts";
import {
  cloneHistoryTripToDraft,
  deleteDraft,
  deriveDestinationOptions,
  favoriteCategoryFilters,
  filterDrafts,
  filterFavorites,
  filterHistory,
  filterTrips,
  groupHistoryByYear,
  newTripHref,
  plannerBridgeHref,
  removeFavorite,
  selectNextTrip,
  shouldShowNextTripHero,
  sortDrafts,
  sortTrips,
  toggleHistoryFavorite,
  tripLibraryTabs,
  tripSortOptions,
} from "../src/features/trip-library/trip-library-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("library exposes exactly the five frozen tabs in order", () => {
  assert.deepEqual(
    tripLibraryTabs.map(({ label }) => label),
    ["全部", "即将出发", "草稿", "历史", "收藏"],
  );
});

test("new trip and planner bridge routes are exact", () => {
  assert.equal(newTripHref, "/start?entry=step3");
  assert.equal(plannerBridgeHref, "/planner");
});

test("search matches trip name and destination", () => {
  const library = createTripLibraryFixture();
  assert.deepEqual(
    filterTrips(library.trips, "all", "食旅").map(({ id }) => id),
    ["trip-osaka-autumn"],
  );
  assert.deepEqual(
    filterTrips(library.trips, "all", "北海道").map(({ id }) => id),
    ["trip-hokkaido-snow"],
  );
});

test("destination filters trips drafts and history independently", () => {
  const library = createTripLibraryFixture();
  assert.deepEqual(
    filterTrips(library.trips, "upcoming", "", "京都").map(
      ({ destination }) => destination,
    ),
    ["京都"],
  );
  assert.deepEqual(
    filterDrafts(library.drafts, "", "东京").map(
      ({ destination }) => destination,
    ),
    ["东京"],
  );
  assert.deepEqual(
    filterHistory(library.history, "", "大阪").map(
      ({ destination }) => destination,
    ),
    ["大阪"],
  );
  assert.ok(deriveDestinationOptions(library).includes("濑户内"));
});

test("all four requested sort modes are stable", () => {
  const trips = createTripLibraryFixture().trips;
  assert.deepEqual(
    tripSortOptions.map(({ key }) => key),
    ["updatedDesc", "createdDesc", "departureAsc", "departureDesc"],
  );
  assert.equal(sortTrips(trips, "updatedDesc")[0].id, "trip-kyoto-spring");
  assert.equal(sortTrips(trips, "createdDesc")[0].id, "trip-osaka-autumn");
  assert.equal(sortTrips(trips, "departureAsc")[0].id, "trip-kyoto-spring");
  assert.equal(sortTrips(trips, "departureDesc")[0].id, "trip-hokkaido-snow");
});

test("draft sort supports recent edit and create without mutation", () => {
  const drafts = createTripLibraryFixture().drafts;
  const original = drafts.map(({ id }) => id);
  assert.equal(sortDrafts(drafts, "updatedDesc")[0].id, "draft-setouchi");
  assert.equal(sortDrafts(drafts, "createdDesc")[0].id, "draft-setouchi");
  assert.deepEqual(
    drafts.map(({ id }) => id),
    original,
  );
});

test("next-trip hero selects nearest upcoming and only shows in all or upcoming", () => {
  const trips = createTripLibraryFixture().trips;
  assert.equal(selectNextTrip(trips)?.id, "trip-kyoto-spring");
  assert.equal(shouldShowNextTripHero("all", trips), true);
  assert.equal(shouldShowNextTripHero("upcoming", trips), true);
  assert.equal(shouldShowNextTripHero("drafts", trips), false);
  assert.equal(shouldShowNextTripHero("history", trips), false);
  assert.equal(shouldShowNextTripHero("favorites", trips), false);
});

test("hero fixture contains completion categories and attention summary", () => {
  const hero = selectNextTrip(createTripLibraryFixture().trips);
  assert.equal(hero?.reservation.completion, 72);
  assert.deepEqual(
    hero?.reservation.categories.map(({ label }) => label),
    ["住宿", "门票", "餐饮", "交通"],
  );
  assert.equal(hero?.reservation.attentionLabel, "2项需要处理");
});

test("draft deletion never triggers partner cancellation", () => {
  const drafts = createTripLibraryFixture().drafts;
  const normal = deleteDraft(drafts, "draft-setouchi");
  const external = deleteDraft(drafts, "draft-tokyo-family");
  assert.equal(normal.partnerCancellationTriggered, false);
  assert.equal(external.partnerCancellationTriggered, false);
  assert.equal(
    external.drafts.some(({ id }) => id === "draft-tokyo-family"),
    false,
  );
});

test("history groups strictly by descending year", () => {
  const groups = groupHistoryByYear(createTripLibraryFixture().history);
  assert.deepEqual(
    groups.map(({ year }) => year),
    [2027, 2026, 2025],
  );
});

test("copy-to-new preserves the original history snapshot", () => {
  const original = createTripLibraryFixture().history[0];
  const before = structuredClone(original);
  const copy = cloneHistoryTripToDraft(original);
  assert.equal(copy.name, `${original.name}（副本）`);
  assert.equal(copy.destination, original.destination);
  assert.equal(copy.cover, original.cover);
  assert.equal(copy.hasExternalReservation, false);
  assert.deepEqual(original, before);
});

test("history favorite toggle is immutable", () => {
  const history = createTripLibraryFixture().history;
  const before = history[1].favorite;
  const next = toggleHistoryFavorite(history, history[1].id);
  assert.equal(history[1].favorite, before);
  assert.equal(next[1].favorite, !before);
});

test("favorites expose exactly six filters and can filter or remove", () => {
  assert.deepEqual(
    favoriteCategoryFilters.map(({ label }) => label),
    ["全部", "行程", "景点", "住宿", "餐饮", "活动"],
  );
  const favorites = createTripLibraryFixture().favorites;
  assert.equal(filterFavorites(favorites, "all").length, 5);
  assert.equal(
    filterFavorites(favorites, "dining")[0].id,
    "favorite-dining-gion",
  );
  assert.equal(removeFavorite(favorites, favorites[0].id).length, 4);
  assert.equal(favorites.length, 5);
});

test("route replaces the placeholder and page declares required UI boundaries", () => {
  const route = read("src/app/(account)/personal-center/trips/page.tsx");
  const page = read("src/features/trip-library/trip-library-page.tsx");
  const styles = read("src/features/trip-library/trip-library.module.css");
  assert.match(route, /<TripLibraryPage \/>/);
  assert.doesNotMatch(route, /PersonalPlaceholder/);
  assert.match(page, /data-trip-library-page/);
  assert.match(page, /data-active-tab=\{activeTab\}/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.draftCard:first-child/);
  assert.match(styles, /grid-column: 1 \/ -1/);
  for (const copy of [
    "Persistence: Mock / in-memory only",
    "WBS 5.18 Trip 数据聚合与映射：未实现",
    "WBS 5.19 预订同步：未实现",
    "A Trip Plan Contract：未集成",
    "Reservation Hub：未实现",
  ])
    assert.match(page, new RegExp(copy));
});

test("page includes empty states, external warning, recap and deferred booking", () => {
  const page = [
    read("src/features/trip-library/trip-library-page.tsx"),
    read("src/features/trip-library/trip-library-model.ts"),
  ].join("\n");
  for (const copy of [
    "还没有旅行",
    "没有未完成的草稿",
    "完成旅行后，它会出现在这里",
    "还没有收藏",
    "不会取消酒店、门票、餐厅或交通合作方的预订",
    "旅行回顾",
    "复制为新草稿",
    "价格与预订操作暂不可用",
  ])
    assert.match(page, new RegExp(copy));
});

test("all selected local assets exist", () => {
  for (const asset of [
    "hero-kyoto-sakura.webp",
    "trip-kyoto-gion.webp",
    "trip-osaka-castle.webp",
    "trip-hokkaido-winter.webp",
  ]) {
    assert.equal(
      existsSync(
        new URL(`../public/media/personal-center/${asset}`, import.meta.url),
      ),
      true,
      asset,
    );
  }
});

test("implementation adds no persistence network or partner-write surface", () => {
  const source = [
    read("src/features/trip-library/trip-library-page.tsx"),
    read("src/features/trip-library/trip-library-model.ts"),
    read("src/features/trip-library/trip-library-data.ts"),
  ].join("\n");
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|indexedDB|supabase|prisma|drizzle/,
  );
  assert.doesNotMatch(
    source,
    /POST|PUT|PATCH|DELETE.*https?:|cancelPartner|cancelReservation/,
  );
});
