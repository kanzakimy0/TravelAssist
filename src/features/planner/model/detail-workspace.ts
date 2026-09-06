import {
  currentPlan,
  isoDay,
  itemsForDay,
  mapView,
  minutes,
  pendingItems,
  reservationLabel,
} from "./trip-model";
import type { MapView, PlaceType, TripItem, TripState } from "./trip-model";

export type TripWorkspaceMode = "planner" | "detail";
export type AiJudgementStatus = "normal" | "warning" | "error";
export type ReservationJudgement = "confirmed" | "unknown" | "none";
export type DetailItemKind = PlaceType | "parking" | "task" | "custom";

export interface DetailDraftItem {
  id: string;
  day: number;
  title: string;
  startTime: string;
  endTime: string;
  type: DetailItemKind;
  note: string;
}

export interface DetailDraftState {
  items: DetailDraftItem[];
  completedIds: string[];
  version: 1;
}

export interface DetailRailItem {
  id: string;
  day: number;
  title: string;
  startTime: string;
  endTime: string;
  type: DetailItemKind;
  typeLabel: string;
  durationLabel: string;
  aiStatus: AiJudgementStatus;
  aiReason: string;
  reservation: ReservationJudgement;
  reservationLabel: string;
  fixed: boolean;
  locked: boolean;
  placeId?: string;
  note?: string;
  draft: boolean;
}

export interface DetailDaySummary {
  day: number;
  date: string;
  city: string;
  route: string;
  weather: string;
  startTime: string;
  endTime: string;
  activityMinutes: number;
  transportMinutes: number;
  walkingDistance: string;
  itemCount: number;
  hardConstraintCount: number;
  flexibleCount: number;
  aiCounts: Record<AiJudgementStatus, number>;
  reservationUnknownCount: number;
  expenses: {
    transport: number;
    parkingHighway: number;
    ticketsActivities: number;
    dining: number;
    lodging: number;
    other: number;
    total: number;
  };
}

export const DETAIL_DRAFT_STORAGE_KEY = "travelassist.detail-draft.v1";

const typeLabels: Record<DetailItemKind, string> = {
  attraction: "景点",
  restaurant: "餐饮",
  transport: "交通",
  hotel: "酒店",
  activity: "活动",
  parking: "停车",
  task: "任务",
  custom: "自定义",
};
const detailItemKinds = new Set<DetailItemKind>(
  Object.keys(typeLabels) as DetailItemKind[],
);

export function parseWorkspaceMode(value: string | null): TripWorkspaceMode {
  return value === "detail" ? "detail" : "planner";
}

export function parseDetailDay(value: string | null, totalDays: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= totalDays
    ? parsed
    : 1;
}

export function detailUrl(day: number) {
  return `/planner?view=detail&day=${day}`;
}

export function detailMapView(state: TripState, day: number): MapView {
  const totalDays = currentPlan(state).days.length;
  const selectedDay = Math.min(Math.max(day, 1), totalDays);
  const scopedState: TripState = {
    ...state,
    ui: {
      ...state.ui,
      rangeMode: "day",
      selectedDay,
      focusedDay: selectedDay,
    },
  };
  const active = mapView(scopedState);
  const activeRoute = active.routes.filter(
    (route) => route.id === `day-${selectedDay}`,
  );
  const adjacentRoutes = [selectedDay - 1, selectedDay + 1]
    .filter((adjacentDay) => adjacentDay >= 1 && adjacentDay <= totalDays)
    .flatMap((adjacentDay) => {
      const adjacent = mapView({
        ...scopedState,
        ui: {
          ...scopedState.ui,
          selectedDay: adjacentDay,
          focusedDay: adjacentDay,
          selectedTripItemId: null,
        },
      });
      return adjacent.routes
        .filter((route) => route.id === `day-${adjacentDay}`)
        .map((route) => ({
          ...route,
          id: `detail-context-${adjacentDay}`,
          context: true,
          color: "#77716c",
          label: `相邻 Day ${adjacentDay} 路线（示例上下文）`,
        }));
    });

  return {
    ...active,
    key: `detail:${active.key}`,
    routes: [...adjacentRoutes, ...activeRoute],
  };
}

function reservationStatus(item: TripItem): ReservationJudgement {
  if (!item.reservationRequired) return "none";
  return ["booked", "ticketed", "pay_on_site"].includes(item.reservationStatus)
    ? "confirmed"
    : "unknown";
}

function aiStatusForItem(
  item: TripItem,
  previous: TripItem | undefined,
): { status: AiJudgementStatus; reason: string } {
  if (
    previous &&
    item.type !== "hotel" &&
    minutes(item.startTime) < minutes(previous.endTime)
  ) {
    return {
      status: "error",
      reason: `与${previous.title}的时间重叠，需要调整后续行程。`,
    };
  }
  if (
    item.reservationRequired &&
    !["booked", "ticketed", "pay_on_site"].includes(item.reservationStatus)
  ) {
    return {
      status: "warning",
      reason: "预约状态仍需用户确认；当前仅为本地示例判断。",
    };
  }
  if (
    previous &&
    item.type !== "hotel" &&
    minutes(item.startTime) - minutes(previous.endTime) < 15
  ) {
    return {
      status: "warning",
      reason: "与上一项之间的缓冲少于 15 分钟。",
    };
  }
  return {
    status: "normal",
    reason: "本地规则未发现需要立即处理的结构问题。",
  };
}

export function detailRailItems(
  state: TripState,
  day: number,
  draftItems: DetailDraftItem[] = [],
  completedIds: string[] = [],
): DetailRailItem[] {
  const plan = currentPlan(state);
  const items = itemsForDay(plan, day);
  const canonical = items.map((item, index) => {
    const judgement = completedIds.includes(item.id)
      ? { status: "normal" as const, reason: "已在本地执行草稿中标记完成。" }
      : aiStatusForItem(item, items[index - 1]);
    const reservation = reservationStatus(item);
    return {
      id: item.id,
      day,
      title: item.title,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      typeLabel: typeLabels[item.type],
      durationLabel: `${Math.max(0, minutes(item.endTime) - minutes(item.startTime))} 分`,
      aiStatus: judgement.status,
      aiReason: judgement.reason,
      reservation,
      reservationLabel:
        reservation === "none" ? "无需预约" : reservationLabel(item),
      fixed: item.fixedTime,
      locked: item.locked,
      placeId: item.placeId,
      draft: false,
    } satisfies DetailRailItem;
  });
  const local = draftItems
    .filter((item) => item.day === day)
    .map(
      (item) =>
        ({
          ...item,
          typeLabel: typeLabels[item.type],
          durationLabel: `${Math.max(0, minutes(item.endTime) - minutes(item.startTime))} 分`,
          aiStatus: completedIds.includes(item.id) ? "normal" : "warning",
          aiReason: completedIds.includes(item.id)
            ? "已在本地执行草稿中标记完成。"
            : "本地新增项目尚未经过真实 Provider 或 AI 检查。",
          reservation: "none",
          reservationLabel: "本地草稿",
          fixed: false,
          locked: false,
          draft: true,
        }) satisfies DetailRailItem,
    );
  return [...canonical, ...local].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
}

export function detailDaySummary(
  state: TripState,
  day: number,
  railItems: DetailRailItem[],
): DetailDaySummary {
  const plan = currentPlan(state);
  const tripDay = plan.days.find((item) => item.day === day) ?? plan.days[0];
  const canonicalItems = itemsForDay(plan, day);
  const priceFor = (item: TripItem) =>
    state.places.find((place) => place.id === item.placeId)?.price ?? 0;
  const expense = (type: PlaceType) =>
    canonicalItems
      .filter((item) => item.type === type)
      .reduce((total, item) => total + priceFor(item), 0);
  const expenses = {
    transport: expense("transport"),
    parkingHighway: canonicalItems.some((item) => item.type === "transport")
      ? 1200
      : 0,
    ticketsActivities: expense("attraction") + expense("activity"),
    dining: expense("restaurant"),
    lodging: expense("hotel"),
    other: 800,
    total: 0,
  };
  expenses.total = Object.entries(expenses)
    .filter(([key]) => key !== "total")
    .reduce((total, [, value]) => total + value, 0);
  const startTime = railItems.at(0)?.startTime ?? "--:--";
  const endTime = railItems.at(-1)?.endTime ?? "--:--";
  const aiCounts = railItems.reduce(
    (counts, item) => ({
      ...counts,
      [item.aiStatus]: counts[item.aiStatus] + 1,
    }),
    { normal: 0, warning: 0, error: 0 },
  );
  return {
    day,
    date: isoDay(state.settings.startDate, day),
    city: tripDay.city,
    route: tripDay.title,
    weather: `${tripDay.weather[0] ?? "天气待确认"} · Mock sample`,
    startTime,
    endTime,
    activityMinutes: railItems
      .filter((item) => item.type !== "transport")
      .reduce(
        (total, item) =>
          total + Math.max(0, minutes(item.endTime) - minutes(item.startTime)),
        0,
      ),
    transportMinutes: railItems
      .filter((item) => item.type === "transport")
      .reduce(
        (total, item) =>
          total + Math.max(0, minutes(item.endTime) - minutes(item.startTime)),
        0,
      ),
    walkingDistance: `${Math.max(2, canonicalItems.filter((item) => item.next?.includes("步行")).length * 1.3).toFixed(1)} km · 示例`,
    itemCount: railItems.length,
    hardConstraintCount: railItems.filter((item) => item.fixed || item.locked)
      .length,
    flexibleCount: railItems.filter((item) => !item.fixed && !item.locked)
      .length,
    aiCounts,
    reservationUnknownCount: railItems.filter(
      (item) => item.reservation === "unknown",
    ).length,
    expenses,
  };
}

export function judgementPhase(
  tripStart: string,
  now: Date = new Date(),
): "planning" | "execution" {
  const start = Date.parse(`${tripStart}T09:00:00`);
  return start - now.getTime() <= 48 * 60 * 60 * 1000
    ? "execution"
    : "planning";
}

export function emptyDetailDraft(): DetailDraftState {
  return { items: [], completedIds: [], version: 1 };
}

export function parseDetailDraft(value: string | null): DetailDraftState {
  if (!value) return emptyDetailDraft();
  try {
    const parsed = JSON.parse(value) as Partial<DetailDraftState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return emptyDetailDraft();
    }
    return {
      items: parsed.items.filter((item): item is DetailDraftItem =>
        Boolean(
          item &&
          typeof item.id === "string" &&
          typeof item.day === "number" &&
          typeof item.title === "string" &&
          typeof item.startTime === "string" &&
          typeof item.endTime === "string" &&
          typeof item.type === "string" &&
          detailItemKinds.has(item.type as DetailItemKind),
        ),
      ),
      completedIds: Array.isArray(parsed.completedIds)
        ? parsed.completedIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      version: 1,
    };
  } catch {
    return emptyDetailDraft();
  }
}

export function pendingReservationCount(state: TripState) {
  return pendingItems(currentPlan(state)).length;
}
