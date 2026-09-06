import type {
  DraftTripViewModel,
  FavoriteViewModel,
  HistoryTripViewModel,
  TripCardViewModel,
  TripLibraryViewModel,
} from "./trip-library-model";

const categorySummary = (
  accommodation: [number, number],
  tickets: [number, number],
  dining: [number, number],
  transit: [number, number],
) => [
  {
    label: "住宿" as const,
    completed: accommodation[0],
    total: accommodation[1],
  },
  { label: "门票" as const, completed: tickets[0], total: tickets[1] },
  { label: "餐饮" as const, completed: dining[0], total: dining[1] },
  { label: "交通" as const, completed: transit[0], total: transit[1] },
];

const tripFixtures: TripCardViewModel[] = [
  {
    id: "trip-kyoto-spring",
    phase: "upcoming",
    name: "京都春日漫游",
    destination: "京都",
    dateLabel: "2027.03.18 - 03.23",
    startDate: "2027-03-18",
    endDate: "2027-03-23",
    durationLabel: "6天5晚",
    companionCount: 2,
    cover: "/media/personal-center/hero-kyoto-sakura.webp",
    coverPosition: "64% 50%",
    createdAt: "2026-08-18T09:00:00Z",
    updatedAt: "2026-09-06T05:30:00Z",
    reservation: {
      completion: 72,
      categories: categorySummary([3, 3], [5, 7], [2, 5], [1, 3]),
      attentionLabel: "2项需要处理",
      attentionTone: "warning",
    },
  },
  {
    id: "trip-osaka-autumn",
    phase: "upcoming",
    name: "大阪秋日食旅",
    destination: "大阪",
    dateLabel: "2027.11.12 - 11.15",
    startDate: "2027-11-12",
    endDate: "2027-11-15",
    durationLabel: "4天3晚",
    companionCount: 2,
    cover: "/media/personal-center/trip-osaka-castle.webp",
    coverPosition: "60% 45%",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-05T13:10:00Z",
    reservation: {
      completion: 84,
      categories: categorySummary([2, 2], [3, 4], [2, 3], [2, 2]),
      attentionLabel: "1项待确认",
      attentionTone: "pending",
    },
  },
  {
    id: "trip-hokkaido-snow",
    phase: "upcoming",
    name: "北海道雪原假期",
    destination: "北海道",
    dateLabel: "2028.01.08 - 01.13",
    startDate: "2028-01-08",
    endDate: "2028-01-13",
    durationLabel: "6天5晚",
    companionCount: 4,
    cover: "/media/personal-center/trip-hokkaido-winter.webp",
    createdAt: "2026-08-28T10:00:00Z",
    updatedAt: "2026-09-03T04:20:00Z",
    reservation: {
      completion: 46,
      categories: categorySummary([2, 3], [1, 4], [0, 4], [1, 3]),
      attentionLabel: "3项尚未预订",
      attentionTone: "danger",
    },
  },
];

const draftFixtures: DraftTripViewModel[] = [
  {
    id: "draft-setouchi",
    name: "濑户内艺术小旅行",
    destination: "濑户内",
    dateLabel: "2027.05 · 日期待定",
    progress: 38,
    reservationCount: 0,
    hasExternalReservation: false,
    lastEditedLabel: "今天 09:40 编辑",
    updatedAt: "2026-09-06T00:40:00Z",
    createdAt: "2026-09-02T09:10:00Z",
    cover: "/media/personal-center/trip-osaka-castle.webp",
  },
  {
    id: "draft-tokyo-family",
    name: "东京亲子周末",
    destination: "东京",
    dateLabel: "2027.07.16 - 07.18",
    progress: 61,
    reservationCount: 2,
    hasExternalReservation: true,
    lastEditedLabel: "昨天 21:15 编辑",
    updatedAt: "2026-09-05T12:15:00Z",
    createdAt: "2026-08-25T02:00:00Z",
    cover: "/media/personal-center/hero-kyoto-sakura.webp",
  },
];

const historyFixtures: HistoryTripViewModel[] = [
  {
    id: "history-hokkaido-2027",
    phase: "history",
    year: 2027,
    name: "北海道冬日列车",
    destination: "北海道",
    dateLabel: "2027.01.20 - 01.24",
    startDate: "2027-01-20",
    endDate: "2027-01-24",
    durationLabel: "5天4晚",
    companionCount: 2,
    cover: "/media/personal-center/trip-hokkaido-winter.webp",
    createdAt: "2026-05-05T07:00:00Z",
    updatedAt: "2027-01-25T03:00:00Z",
    reservation: {
      completion: 100,
      categories: categorySummary([2, 2], [4, 4], [3, 3], [3, 3]),
      attentionLabel: "✓ 预订完整",
      attentionTone: "complete",
    },
    favorite: true,
    recap: ["札幌雪祭与小樽运河", "完成 12 个行程节点", "保存 18 张旅行回忆"],
  },
  {
    id: "history-osaka-2026",
    phase: "history",
    year: 2026,
    name: "大阪城市周末",
    destination: "大阪",
    dateLabel: "2026.04.09 - 04.11",
    startDate: "2026-04-09",
    endDate: "2026-04-11",
    durationLabel: "3天2晚",
    companionCount: 3,
    cover: "/media/personal-center/trip-osaka-castle.webp",
    createdAt: "2026-01-11T05:00:00Z",
    updatedAt: "2026-04-12T06:00:00Z",
    reservation: {
      completion: 92,
      categories: categorySummary([1, 1], [2, 2], [3, 3], [1, 2]),
      attentionLabel: "1项同步失败",
      attentionTone: "warning",
    },
    favorite: false,
    recap: ["大阪城与中之岛散步", "体验 4 家当地小店", "完成 8 个行程节点"],
  },
  {
    id: "history-kyoto-2025",
    phase: "history",
    year: 2025,
    name: "京都秋色散策",
    destination: "京都",
    dateLabel: "2025.11.18 - 11.21",
    startDate: "2025-11-18",
    endDate: "2025-11-21",
    durationLabel: "4天3晚",
    companionCount: 1,
    cover: "/media/personal-center/trip-kyoto-gion.webp",
    createdAt: "2025-08-08T02:00:00Z",
    updatedAt: "2025-11-22T04:00:00Z",
    reservation: {
      completion: 100,
      categories: categorySummary([2, 2], [3, 3], [2, 2], [2, 2]),
      attentionLabel: "✓ 预订完整",
      attentionTone: "complete",
    },
    favorite: true,
    recap: ["东山红叶与清晨摄影", "完成 10 个行程节点", "收藏 6 个下次候选"],
  },
];

const favoriteFixtures: FavoriteViewModel[] = [
  {
    id: "favorite-trip-kyoto",
    category: "trip",
    name: "京都秋色散策",
    destination: "京都",
    summary: "4天3晚 · 摄影与历史街区",
    cover: "/media/personal-center/trip-kyoto-gion.webp",
  },
  {
    id: "favorite-attraction-castle",
    category: "attraction",
    name: "大阪城公园",
    destination: "大阪",
    summary: "历史建筑 · 公园散步",
    cover: "/media/personal-center/trip-osaka-castle.webp",
  },
  {
    id: "favorite-accommodation-otaru",
    category: "accommodation",
    name: "小樽运河旁住宿候选",
    destination: "北海道",
    summary: "交通方便 · 河景区域",
    cover: "/media/personal-center/trip-hokkaido-winter.webp",
  },
  {
    id: "favorite-dining-gion",
    category: "dining",
    name: "祇园当地料理小店",
    destination: "京都",
    summary: "当地料理 · 晚餐候选",
    cover: "/media/personal-center/hero-kyoto-sakura.webp",
  },
  {
    id: "favorite-activity-snow",
    category: "activity",
    name: "北海道雪原体验",
    destination: "北海道",
    summary: "户外活动 · 冬季限定",
    cover: "/media/personal-center/trip-hokkaido-winter.webp",
  },
];

function cloneTrip<T extends TripCardViewModel>(trip: T): T {
  return {
    ...trip,
    reservation: {
      ...trip.reservation,
      categories: trip.reservation.categories.map((category) => ({
        ...category,
      })),
    },
  };
}

export function createTripLibraryFixture(): TripLibraryViewModel {
  return {
    trips: tripFixtures.map(cloneTrip),
    drafts: draftFixtures.map((draft) => ({ ...draft })),
    history: historyFixtures.map((trip) => ({
      ...cloneTrip(trip),
      recap: [...trip.recap],
    })),
    favorites: favoriteFixtures.map((favorite) => ({ ...favorite })),
  };
}
