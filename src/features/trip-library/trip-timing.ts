import type {
  DraftTripViewModel,
  HistoryTripViewModel,
  TripCardViewModel,
  TripSortKey,
} from "./trip-library-model";

export type TripTiming = "next" | "upcoming" | "ongoing" | "completed";
export const tripTimingLabels: Record<TripTiming, string> = {
  next: "下一次旅行",
  upcoming: "即将出发",
  ongoing: "旅行进行中",
  completed: "已完成",
};

// Calendar dates only: UTC is used for integer day arithmetic, not a Trip timezone contract.
// Invalid or inverted dates are unclassified; never guess from display labels or system time.
function dayNumber(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString().slice(0, 10) !== value
  )
    return null;
  return milliseconds / 86_400_000;
}

export function getTripTiming(
  startDate: string,
  endDate: string,
  today: string,
): TripTiming | null {
  const start = dayNumber(startDate),
    end = dayNumber(endDate),
    current = dayNumber(today);
  if (start === null || end === null || current === null || end < start)
    return null;
  if (end < current) return "completed";
  const daysUntilStart = start - current;
  if (daysUntilStart < 2) return "ongoing";
  return daysUntilStart <= 30 ? "upcoming" : "next";
}

const priority: Record<TripTiming, number> = {
  ongoing: 0,
  upcoming: 1,
  next: 2,
  completed: 3,
};

export function selectHeroTrip(
  items: readonly (TripCardViewModel | DraftTripViewModel)[],
  today: string,
): TripCardViewModel | null {
  const candidates = items.flatMap((trip) => {
    if (!("phase" in trip) || trip.phase === "history") return [];
    const status = getTripTiming(trip.startDate, trip.endDate, today);
    return status && status !== "completed" ? [{ trip, status }] : [];
  });
  candidates.sort(
    (a, b) =>
      priority[a.status] - priority[b.status] ||
      a.trip.startDate.localeCompare(b.trip.startDate) ||
      a.trip.id.localeCompare(b.trip.id),
  );
  return candidates[0]?.trip ?? null;
}

export function asHistoryTrip(trip: TripCardViewModel): HistoryTripViewModel {
  return {
    ...trip,
    phase: "history",
    year: Number(trip.startDate.slice(0, 4)),
    favorite: false,
    recap: [
      trip.dateLabel,
      `${trip.destination} · ${trip.durationLabel}`,
      "Mock 行程摘要，未接入真实旅行回顾。",
    ],
  };
}

export function activeTrips(
  items: readonly TripCardViewModel[],
  today: string,
) {
  return items.filter(
    (trip) =>
      trip.phase !== "history" &&
      ["next", "upcoming", "ongoing"].includes(
        getTripTiming(trip.startDate, trip.endDate, today) ?? "",
      ),
  );
}

export type AllTripItem =
  | { kind: "trip"; item: TripCardViewModel }
  | { kind: "draft"; item: DraftTripViewModel };

export function buildAllTripItems(
  trips: readonly TripCardViewModel[],
  drafts: readonly DraftTripViewModel[],
  today: string,
  heroId?: string,
): AllTripItem[] {
  return [
    ...activeTrips(trips, today)
      .filter((trip) => trip.id !== heroId)
      .map((item) => ({ kind: "trip" as const, item })),
    ...drafts.map((item) => ({ kind: "draft" as const, item })),
  ];
}

export function sortAllTripItems(
  items: readonly AllTripItem[],
  sort: TripSortKey = "departureAsc",
) {
  return [...items].sort((a, b) => {
    if (sort === "updatedDesc" || sort === "createdDesc") {
      const key = sort === "updatedDesc" ? "updatedAt" : "createdAt";
      return (
        b.item[key].localeCompare(a.item[key]) ||
        a.item.id.localeCompare(b.item.id)
      );
    }
    const aDay = dayNumber(a.item.startDate),
      bDay = dayNumber(b.item.startDate);
    if (aDay === null && bDay === null)
      return (
        b.item.updatedAt.localeCompare(a.item.updatedAt) ||
        a.item.id.localeCompare(b.item.id)
      );
    if (aDay === null) return 1;
    if (bDay === null) return -1;
    return (
      (sort === "departureDesc" ? bDay - aDay : aDay - bDay) ||
      a.item.id.localeCompare(b.item.id)
    );
  });
}

export const ALL_TRIPS_PAGE_SIZE = 8;
export function paginateAllTrips(
  items: readonly AllTripItem[],
  requestedPage: number,
) {
  const pageCount = Math.max(1, Math.ceil(items.length / ALL_TRIPS_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  return {
    page,
    pageCount,
    total: items.length,
    items: items.slice(
      (page - 1) * ALL_TRIPS_PAGE_SIZE,
      page * ALL_TRIPS_PAGE_SIZE,
    ),
  };
}
