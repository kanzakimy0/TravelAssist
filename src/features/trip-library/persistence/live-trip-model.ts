import { TripLibraryApiError } from "../../../shared/contracts/trip-library/index";
import { getTripTiming } from "../trip-timing";
import type { TripLibraryTab, TripSortKey } from "../trip-library-model";
import type { TripLibraryPageV1, TripLibrarySummaryV1 } from "./resource";
export type TripSummary = TripLibrarySummaryV1;
export type TripPageReader = (query: {
  state: "all";
  limit: number;
  cursor?: string;
}) => Promise<TripLibraryPageV1>;
// Exhaust the accepted API cursor chain before presenting complete counts/filters.
// There is no client-side truncation at the API's 50-row page boundary.
export async function readAllTrips(
  readPage: TripPageReader,
  signal?: AbortSignal,
) {
  const records = new Map<string, TripSummary>(),
    cursors = new Set<string>();
  let cursor: string | undefined;
  while (true) {
    signal?.throwIfAborted();
    const page = await readPage({
      state: "all",
      limit: 50,
      ...(cursor ? { cursor } : {}),
    });
    signal?.throwIfAborted();
    for (const item of page.items) {
      const previous = records.get(item.id);
      if (!previous || item.storageRevision > previous.storageRevision)
        records.set(item.id, item);
    }
    if (page.nextCursor === null) return [...records.values()];
    if (cursors.has(page.nextCursor) || page.items.length === 0)
      throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
    cursor = page.nextCursor;
    cursors.add(cursor);
  }
}
export function belongsToTab(
  trip: TripSummary,
  tab: TripLibraryTab,
  today: string,
) {
  if (tab === "favorites") return false;
  if (tab === "all") return true;
  if (tab === "drafts") return trip.libraryState === "draft";
  if (tab === "history") return trip.libraryState === "history";
  return (
    trip.libraryState === "saved" &&
    getTripTiming(trip.departure ?? "", trip.returning ?? "", today) ===
      "upcoming"
  );
}
export function visibleTrips(
  items: readonly TripSummary[],
  tab: TripLibraryTab,
  today: string,
  query: string,
  destination: string,
  sort: TripSortKey,
) {
  const search = query.trim().toLocaleLowerCase("zh-CN");
  return items
    .filter(
      (trip) =>
        belongsToTab(trip, tab, today) &&
        (!search ||
          [trip.title ?? "", ...trip.destinations]
            .join(" ")
            .toLocaleLowerCase("zh-CN")
            .includes(search)) &&
        (destination === "all" || trip.destinations.includes(destination)),
    )
    .sort((a, b) => {
      if (sort === "updatedDesc" || sort === "createdDesc") {
        const key = sort === "updatedDesc" ? "updatedAt" : "createdAt";
        return b[key].localeCompare(a[key]) || a.id.localeCompare(b.id);
      }
      if (!a.departure || !b.departure)
        return !a.departure && !b.departure
          ? a.id.localeCompare(b.id)
          : !a.departure
            ? 1
            : -1;
      return (
        (sort === "departureDesc"
          ? b.departure.localeCompare(a.departure)
          : a.departure.localeCompare(b.departure)) || a.id.localeCompare(b.id)
      );
    });
}
export function selectLiveHero(items: readonly TripSummary[], today: string) {
  const priority = { ongoing: 0, upcoming: 1, next: 2 };
  return (
    items
      .flatMap((trip) => {
        if (trip.libraryState !== "saved") return [];
        const timing = getTripTiming(
          trip.departure ?? "",
          trip.returning ?? "",
          today,
        );
        return timing && timing !== "completed"
          ? [{ trip, rank: priority[timing] }]
          : [];
      })
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.trip.departure!.localeCompare(b.trip.departure!) ||
          a.trip.id.localeCompare(b.trip.id),
      )[0]?.trip ?? null
  );
}
export const libraryStateLabels = {
  draft: "草稿",
  saved: "已保存",
  history: "历史",
};
export const wizardPhaseLabels = {
  familiarity: "旅行熟悉度",
  preferences: "旅行偏好",
  trip_basics: "行程基础",
  generating: "生成方案",
  plan_selection: "方案选择",
};
export function tripDateLabel(trip: TripSummary) {
  return `${trip.departure ?? "出发日期未设置"} — ${trip.returning ?? "结束日期未设置"}`;
}
export function tripLibraryErrorMessage(cause: unknown) {
  if (cause instanceof TripLibraryApiError) {
    if (cause.code === "AUTH_REQUIRED") return "登录已失效，请重新登录。";
    if (
      ["STALE_TRIP_LIBRARY_REVISION", "TRIP_LIBRARY_STATE_CONFLICT"].includes(
        cause.code,
      )
    )
      return "行程已发生变化，请重新读取列表后再确认操作。";
    if (cause.code === "TRIP_LIBRARY_NOT_FOUND")
      return "这条行程已不可用，请重新读取列表。";
  }
  return "读取或操作失败，尚未确认操作成功；请重试。";
}
