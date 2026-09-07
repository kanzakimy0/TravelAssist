export const tripLibraryTabs = [
  { key: "all", label: "全部" },
  { key: "upcoming", label: "即将出发" },
  { key: "drafts", label: "草稿" },
  { key: "history", label: "历史" },
  { key: "favorites", label: "收藏" },
] as const;

export type TripLibraryTab = (typeof tripLibraryTabs)[number]["key"];

export const favoriteCategoryFilters = [
  { key: "all", label: "全部" },
  { key: "trip", label: "行程" },
  { key: "attraction", label: "景点" },
  { key: "accommodation", label: "住宿" },
  { key: "dining", label: "餐饮" },
  { key: "activity", label: "活动" },
] as const;

export type FavoriteCategory = Exclude<
  (typeof favoriteCategoryFilters)[number]["key"],
  "all"
>;
export type FavoriteFilter = (typeof favoriteCategoryFilters)[number]["key"];

export const tripSortOptions = [
  { key: "updatedDesc", label: "最近编辑" },
  { key: "createdDesc", label: "最近创建" },
  { key: "departureAsc", label: "出发时间近 → 远" },
  { key: "departureDesc", label: "出发时间远 → 近" },
] as const;

export type TripSortKey = (typeof tripSortOptions)[number]["key"];

export const newTripHref = "/start?entry=step3";
export const plannerBridgeHref = "/planner";

export type ReservationCategorySummary = {
  label: "住宿" | "门票" | "餐饮" | "交通";
  completed: number;
  total: number;
};

export type ReservationSummaryViewModel = {
  completion: number;
  categories: ReservationCategorySummary[];
  attentionLabel: string;
  attentionTone: "complete" | "warning" | "danger" | "pending";
};

export type TripCardViewModel = {
  id: string;
  phase: "upcoming" | "history";
  name: string;
  destination: string;
  dateLabel: string;
  startDate: string;
  endDate: string;
  durationLabel: string;
  companionCount: number;
  cover: string;
  coverPosition?: string;
  createdAt: string;
  updatedAt: string;
  reservation: ReservationSummaryViewModel;
};

export type DraftTripViewModel = {
  id: string;
  name: string;
  destination: string;
  dateLabel: string;
  progress: number;
  reservationCount: number;
  hasExternalReservation: boolean;
  lastEditedLabel: string;
  updatedAt: string;
  createdAt: string;
  cover: string;
};

export type HistoryTripViewModel = TripCardViewModel & {
  phase: "history";
  year: number;
  favorite: boolean;
  recap: string[];
};

export type FavoriteViewModel = {
  id: string;
  category: FavoriteCategory;
  name: string;
  destination: string;
  summary: string;
  cover: string;
};

export type TripLibraryViewModel = {
  trips: TripCardViewModel[];
  drafts: DraftTripViewModel[];
  history: HistoryTripViewModel[];
  favorites: FavoriteViewModel[];
};

export const tripLibraryEmptyCopy = {
  all: {
    title: "还没有旅行",
    body: "开始规划下一次旅程，TravelAssist 会把行程、预订和收藏统一保存在这里。",
    action: "+ 新建旅程",
  },
  drafts: { title: "没有未完成的草稿" },
  history: { title: "完成旅行后，它会出现在这里。" },
  favorites: {
    title: "还没有收藏",
    body: "看到喜欢的旅行或地点时，点击 ♡ 就可以在这里找到。",
  },
} as const;

type Searchable = { name: string; destination: string };

export function matchesTripSearch(item: Searchable, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return true;
  return `${item.name} ${item.destination}`
    .toLocaleLowerCase("zh-CN")
    .includes(normalized);
}

export function filterTrips(
  trips: TripCardViewModel[],
  tab: "all" | "upcoming",
  query = "",
  destination = "all",
): TripCardViewModel[] {
  return trips.filter(
    (trip) =>
      (tab === "all" || trip.phase === "upcoming") &&
      (destination === "all" || trip.destination === destination) &&
      matchesTripSearch(trip, query),
  );
}

export function filterDrafts(
  drafts: DraftTripViewModel[],
  query = "",
  destination = "all",
): DraftTripViewModel[] {
  return drafts.filter(
    (draft) =>
      (destination === "all" || draft.destination === destination) &&
      matchesTripSearch(draft, query),
  );
}

export function filterHistory(
  history: HistoryTripViewModel[],
  query = "",
  destination = "all",
): HistoryTripViewModel[] {
  return history.filter(
    (trip) =>
      (destination === "all" || trip.destination === destination) &&
      matchesTripSearch(trip, query),
  );
}

export function sortTrips<T extends TripCardViewModel>(
  trips: T[],
  sort: TripSortKey,
): T[] {
  const copy = [...trips];
  return copy.sort((left, right) => {
    if (sort === "updatedDesc") {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    if (sort === "createdDesc") {
      return right.createdAt.localeCompare(left.createdAt);
    }
    if (sort === "departureAsc") {
      return left.startDate.localeCompare(right.startDate);
    }
    return right.startDate.localeCompare(left.startDate);
  });
}

export function sortDrafts(
  drafts: DraftTripViewModel[],
  sort: TripSortKey,
): DraftTripViewModel[] {
  const copy = [...drafts];
  if (sort === "createdDesc") {
    return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function selectNextTrip(
  trips: TripCardViewModel[],
): TripCardViewModel | undefined {
  return sortTrips(
    trips.filter((trip) => trip.phase === "upcoming"),
    "departureAsc",
  )[0];
}

export function shouldShowNextTripHero(
  tab: TripLibraryTab,
  trips: TripCardViewModel[],
): boolean {
  return (
    (tab === "all" || tab === "upcoming") && Boolean(selectNextTrip(trips))
  );
}

export function deriveDestinationOptions(
  library: TripLibraryViewModel,
): string[] {
  return [
    ...new Set([
      ...library.trips.map((trip) => trip.destination),
      ...library.drafts.map((draft) => draft.destination),
      ...library.history.map((trip) => trip.destination),
      ...library.favorites.map((favorite) => favorite.destination),
    ]),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function deleteDraft(
  drafts: DraftTripViewModel[],
  draftId: string,
): {
  drafts: DraftTripViewModel[];
  partnerCancellationTriggered: false;
} {
  return {
    drafts: drafts.filter((draft) => draft.id !== draftId),
    partnerCancellationTriggered: false,
  };
}

export function groupHistoryByYear(
  history: HistoryTripViewModel[],
): Array<{ year: number; trips: HistoryTripViewModel[] }> {
  const groups = new Map<number, HistoryTripViewModel[]>();
  for (const trip of history) {
    groups.set(trip.year, [...(groups.get(trip.year) ?? []), trip]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, trips]) => ({ year, trips }));
}

export function cloneHistoryTripToDraft(
  trip: HistoryTripViewModel,
): DraftTripViewModel {
  return {
    id: `draft-copy-${trip.id}`,
    name: `${trip.name}（副本）`,
    destination: trip.destination,
    dateLabel: "日期待定",
    progress: 18,
    reservationCount: 0,
    hasExternalReservation: false,
    lastEditedLabel: "刚刚复制",
    updatedAt: "2099-01-01T00:00:00Z",
    createdAt: "2099-01-01T00:00:00Z",
    cover: trip.cover,
  };
}

export function toggleHistoryFavorite(
  history: HistoryTripViewModel[],
  tripId: string,
): HistoryTripViewModel[] {
  return history.map((trip) =>
    trip.id === tripId ? { ...trip, favorite: !trip.favorite } : { ...trip },
  );
}

export function filterFavorites(
  favorites: FavoriteViewModel[],
  category: FavoriteFilter,
): FavoriteViewModel[] {
  return favorites.filter(
    (favorite) => category === "all" || favorite.category === category,
  );
}

export function removeFavorite(
  favorites: FavoriteViewModel[],
  favoriteId: string,
): FavoriteViewModel[] {
  return favorites.filter((favorite) => favorite.id !== favoriteId);
}
